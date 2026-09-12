import { config } from 'dotenv';
import express from 'express';
import { z } from 'zod';
import { mkdir, readFile, writeFile, rename, readdir, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Project, Product, Group } from '../shared/types.js';
import { DEMO_PRODUCT } from '../shared/types.js';
import { isValidRequiredPrice } from '../shared/product-price.js';
import { buildBuyers, defaultSelection, templateCopy, validateSelection } from './engine.js';
import { reconcileVariants } from './variants.js';
import { generateVariant, needsGeneration } from './generation.js';
import { imageFilePath, imageGenerationEnabled, imageModel, imageUrlFor, isImageId } from './images.js';
import { artifactModeEnabled, buyersFromFourFactorArtifact, loadExploratoryBuyers } from './persona-data.js';
import { migrateSmartPlugDemoImages } from './demo-migration.js';

// Explicit project settings take priority over credentials inherited from the launcher.
config({ override: true, quiet: true });

const app = express();
app.use(express.json({ limit: '3mb' }));
app.use((_req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); next(); });
const productSchema = z.object({
  title: z.string().trim().min(2).max(200), description: z.string().trim().min(8).max(12000),
  price: z.number().refine(isValidRequiredPrice, 'Price must be a finite positive number with at most two decimal places.'),
  image: z.string().max(2000000).refine(s => !s || ['/demo-bottle.svg', '/demo-headphones.svg'].includes(s) || /^https:\/\//i.test(s) || /^data:image\/(png|jpeg|webp);base64,/.test(s)),
  url: z.string().max(2000), demo: z.boolean(),
});
type Stored = Project & { owner: string; selectionEdited?: boolean; sourceJobId?: string };
const projects = new Map<string, Stored>();
const dataDir = resolve('.data');
const dataFile = resolve(dataDir, 'projects.json');
const imageDirectory = resolve(dataDir, 'images');
await mkdir(dataDir, { recursive: true });
try {
  for (const project of JSON.parse(await readFile(dataFile, 'utf8')) as Stored[]) {
    if (project.expiresAt > Date.now()) projects.set(project.id, project);
  }
} catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.error('Could not read saved projects:', error); }
let saveQueue = Promise.resolve();
function persist() {
  saveQueue = saveQueue.then(async () => {
    await writeFile(`${dataFile}.tmp`, JSON.stringify([...projects.values()]), 'utf8');
    await rename(`${dataFile}.tmp`, dataFile);
  }).catch(error => console.error('Could not save project:', error));
  return saveQueue;
}
const publicProject = ({ owner: _owner, ...project }: Stored) => ({ ...project, imageGenerationMode: imageGenerationEnabled() ? 'model' : 'disabled' });
async function cleanExpiredImages() {
  const retained = new Set([...projects.values()].flatMap(project => [...project.variants, ...(project.archivedVariants || [])].map(variant => `${variant.id}.png`)));
  try {
    for (const name of await readdir(imageDirectory)) {
      if (name.endsWith('.png') && isImageId(name.slice(0, -4)) && !retained.has(name)) await unlink(imageFilePath(imageDirectory, name.slice(0, -4)));
    }
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.error('Could not clean expired images.'); }
}
const running = new Set<string>();
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function analyze(project: Stored) {
  if (running.has(project.id)) return;
  running.add(project.id);
  try {
    const artifactBuyers = await loadExploratoryBuyers();
    const all = artifactBuyers.length ? artifactBuyers : buildBuyers(project.product).filter(buyer => buyer.group === 'explorer');
    project.engines.core = 'complete'; project.engines.market = 'complete';
    for (const group of ['explorer'] as Group[]) {
      if (project.engines[group] === 'complete') continue;
      project.engines[group] = 'running'; await persist();
      await wait(650);
      project.buyers = [...project.buyers.filter(b => b.group !== group), ...all.filter(b => b.group === group)];
      project.engines[group] = 'complete';
      const initialGroup = 'explorer';
      if (group === initialGroup && !project.selectionEdited && !project.selected.length) project.selected = defaultSelection(project.buyers);
      await persist();
    }
    if (project.phase === 'analyzing') project.phase = 'audiences';
  } finally { running.delete(project.id); await persist(); }
}
const generating = new Set<string>();
async function generate(project: Stored) {
  if (generating.has(project.id)) return;
  generating.add(project.id);
  try {
    for (const variant of project.variants) {
      if (project.expiresAt <= Date.now()) break;
      if (!needsGeneration(variant, imageGenerationEnabled())) continue;
      const buyer = project.buyers.find(b => b.id === variant.buyerId)!;
      await generateVariant(project.product, buyer, variant, project.id, imageDirectory, persist);
    }
    project.phase = 'previews';
  } finally { generating.delete(project.id); await persist(); }
}

app.get('/api/health', async (_req, res) => {
  const artifactBuyers = await loadExploratoryBuyers();
  res.json({ ok: true, audienceMode: artifactModeEnabled() ? 'frozen-exploratory-artifact' : 'demo-fallback', loadedBuyers: artifactBuyers.length, generationMode: process.env.OPENROUTER_API_KEY ? 'model' : 'template', imageGenerationMode: imageGenerationEnabled() ? 'model' : 'disabled', imageModel: imageModel() });
});
// Shareable image URLs contain random IDs, never a workspace key. Expire with the project.
app.get('/api/images/:projectId/:variantId.png', (req, res) => {
  const { projectId, variantId } = req.params;
  const project = projects.get(projectId);
  const variant = project && [...project.variants, ...(project.archivedVariants || [])].find(value => value.id === variantId);
  if (!isImageId(projectId) || !isImageId(variantId) || !project || project.expiresAt <= Date.now() || variant?.imageUrl !== imageUrlFor(projectId, variantId)) {
    res.status(404).json({ error: '圖片不存在或已到期。' }); return;
  }
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.sendFile(imageFilePath(imageDirectory, variantId), { dotfiles: 'allow' }, error => { if (error && !res.headersSent) res.status(404).json({ error: '圖片不存在或已到期。' }); });
});
app.post('/api/parse', async (req, res) => {
  const input = z.object({ url: z.string().url().max(2000) }).safeParse(req.body);
  if (!input.success) { res.status(400).json({ error: '請貼上完整的 Shopee 商品網址。' }); return; }
  let url = new URL(input.data.url);
  const allowed = (value: URL) => value.protocol === 'https:' && ['shopee.tw', 'www.shopee.tw'].includes(value.hostname) && !value.username && !value.password && !value.port;
  if (!allowed(url)) { res.status(400).json({ error: '第一版支援 shopee.tw 商品連結，也可以直接手動輸入。' }); return; }
  try {
    let response: Response | undefined;
    for (let i = 0; i < 3; i++) {
      response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(6000), headers: { 'User-Agent': 'PersonaEngine-Preview/0.1' } });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location'); if (!location) throw new Error();
        url = new URL(location, url); if (!allowed(url)) throw new Error();
      } else break;
    }
    if (!response?.ok) throw new Error();
    const html = await response.text(); if (html.length > 5000000) throw new Error();
    const { load } = await import('cheerio');
    const $ = load(html);
    let title = $('meta[property="og:title"]').attr('content') || '';
    const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
    const image = $('meta[property="og:image"]').attr('content') || '';
    title = title.replace(/\s*[|｜-]\s*蝦皮.*$/, '').trim();
    if (title.length < 3 || /驗證|驗证|登入|登录|蝦皮購物|Shopee Taiwan|Shopee 台灣/i.test(title)) throw new Error();
    res.json({ title: title.slice(0, 200), description: description.slice(0, 12000), image: image.startsWith('https://') ? image : '', price: null, url: input.data.url, demo: false } satisfies Product);
  } catch { res.status(422).json({ error: '這個商品頁暫時讀不到。請在下方貼上標題與商品描述，也可以上傳原商品圖片。' }); }
});

app.use('/api/projects', (req, res, next) => {
  const owner = req.header('X-Workspace-Key');
  // Frozen Amazon demo projects are read-only share links. User-entered
  // projects remain private to their workspace key.
  if (req.method === 'GET' && /^\/[a-f0-9-]{36}$/.test(req.path)) {
    res.locals.owner = owner || '';
    res.locals.allowPublicDemoRead = true;
    next(); return;
  }
  if (!owner || !/^[a-f0-9-]{36}$/.test(owner)) { res.status(401).json({ error: '請重新整理以建立工作區。' }); return; }
  res.locals.owner = owner;
  next();
});
app.get('/api/projects', (req, res) => {
  res.json([...projects.values()].filter(p => p.owner === res.locals.owner && p.expiresAt > Date.now()).sort((a, b) => b.createdAt - a.createdAt).map(publicProject));
});
app.post('/api/projects', async (req, res) => {
  const result = productSchema.safeParse(req.body.product);
  if (!result.success) { res.status(400).json({ error: '請提供商品名稱、至少 8 個字的商品資訊，以及大於 0 且最多兩位小數的價格；圖片需為 PNG、JPG、WebP 或 HTTPS 連結。' }); return; }
  if (artifactModeEnabled() && (!result.data.demo || result.data.title !== DEMO_PRODUCT.title)) {
    res.status(422).json({ error: '目前部署版只載入 Amazon Smart Plug 的 1,500 次全量評估。新商品必須先完成相同的全 Persona LLM 配對，不能沿用這批結果。' }); return;
  }
  const id = randomUUID(), now = Date.now();
  const project: Stored = { id, owner: res.locals.owner, product: result.data, createdAt: now, expiresAt: now + 7 * 86400000, buyers: [], selected: [], variants: [], engines: { core: 'pending', market: 'pending', explorer: 'pending' }, phase: 'analyzing', generationMode: process.env.OPENROUTER_API_KEY ? 'model' : 'template' };
  projects.set(id, project); await persist();
  res.status(201).json(publicProject(project)); void analyze(project);
});
app.post('/api/projects/from-realtime', async (req, res) => {
  const parsed = z.object({
    jobId: z.string().uuid(),
    product: productSchema,
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Realtime job 或商品資料格式不正確。' }); return; }
  const existing = [...projects.values()].find(
    (project) => project.owner === res.locals.owner && project.sourceJobId === parsed.data.jobId && project.expiresAt > Date.now(),
  );
  if (existing) { res.json(publicProject(existing)); return; }
  const base = (process.env.REALTIME_API_BASE || 'http://127.0.0.1:3010/api/realtime').replace(/\/$/, '');
  let response: Response;
  try {
    response = await fetch(`${base}/jobs/${parsed.data.jobId}/result`, {
      headers: { 'X-Workspace-Key': res.locals.owner },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    res.status(502).json({ error: '暫時無法讀取已完成的 realtime 結果。' }); return;
  }
  if (!response.ok) {
    res.status(response.status === 409 ? 409 : 502).json({ error: response.status === 409 ? 'Realtime mapping 尚未完成。' : 'Realtime 結果驗證失敗。' }); return;
  }
  try {
    const buyers = await buyersFromFourFactorArtifact(await response.json());
    const id = randomUUID(), now = Date.now();
    const project: Stored = {
      id,
      owner: res.locals.owner,
      sourceJobId: parsed.data.jobId,
      product: parsed.data.product,
      createdAt: now,
      expiresAt: now + 7 * 86400000,
      buyers,
      selected: defaultSelection(buyers),
      variants: [],
      engines: { core: 'complete', market: 'complete', explorer: 'complete' },
      phase: 'audiences',
      generationMode: process.env.OPENROUTER_API_KEY ? 'model' : 'template',
    };
    projects.set(id, project); await persist();
    res.status(201).json(publicProject(project));
  } catch (error) {
    console.error('Rejected realtime result:', (error as Error).message);
    res.status(502).json({ error: 'Realtime 結果不符合 1,500 Persona 四維評分合約。' });
  }
});
app.use('/api/projects/:id', (req, res, next) => {
  const project = projects.get(req.params.id);
  const publicDemoRead = res.locals.allowPublicDemoRead && project?.product.demo && project.product.title === DEMO_PRODUCT.title;
  if (!project || (!publicDemoRead && project.owner !== res.locals.owner) || project.expiresAt <= Date.now()) { res.status(404).json({ error: '找不到這個專案，或七天保存期限已到。' }); return; }
  res.locals.project = project; next();
});
app.get('/api/projects/:id', (_req, res) => res.json(publicProject(res.locals.project)));
app.post('/api/projects/:id/generate', async (req, res) => {
  const project = res.locals.project as Stored;
  const result = z.object({ selected: z.array(z.string()) }).safeParse(req.body);
  if (!result.success || !validateSelection(project.buyers, result.data.selected)) { res.status(400).json({ error: '請選擇 1–15 個不同的受眾方向。' }); return; }
  if (generating.has(project.id) || project.phase === 'generating') { res.status(409).json({ error: '這批文案與圖片仍在生成，完成後即可套用新的受眾選擇。' }); return; }
  project.selected = result.data.selected;
  project.selectionEdited = true;
  Object.assign(project, reconcileVariants(project.variants, project.archivedVariants || [], project.selected));
  const pending = project.variants.some(variant => needsGeneration(variant, imageGenerationEnabled()));
  project.phase = pending ? 'generating' : 'previews'; await persist();
  res.json(publicProject(project)); if (pending) void generate(project);
});
app.patch('/api/projects/:id/selection', async (req, res) => {
  const project = res.locals.project as Stored;
  const result = z.array(z.string()).max(15).safeParse(req.body.selected);
  if (!result.success || new Set(result.data).size !== result.data.length || result.data.some(id => !project.buyers.some(b => b.id === id))) { res.status(400).json({ error: '請選擇最多 15 個不同的受眾。' }); return; }
  project.selected = result.data; project.selectionEdited = true; await persist(); res.json({ ok: true });
});
app.patch('/api/projects/:id/variants/:variantId', async (req, res) => {
  const project = res.locals.project as Stored;
  const variant = [...project.variants, ...(project.archivedVariants || [])].find(v => v.id === req.params.variantId);
  const result = z.object({ title: z.string().min(1).max(200).optional(), description: z.string().min(1).max(12000).optional(), favorite: z.boolean().optional() }).safeParse(req.body);
  if (!variant || variant.status !== 'complete' || !result.success) { res.status(400).json({ error: '文字不可空白，標題限 200 字，描述限 12,000 字。' }); return; }
  Object.assign(variant, result.data); await persist(); res.json(variant);
});
app.post('/api/projects/:id/retry', async (_req, res) => {
  const project = res.locals.project as Stored;
  if (generating.has(project.id)) { res.status(409).json({ error: '正在生成，請稍候。' }); return; }
  if (!project.variants.some(v => needsGeneration(v, imageGenerationEnabled()))) { res.json(publicProject(project)); return; }
  project.phase = 'generating'; await persist(); res.json(publicProject(project)); void generate(project);
});
app.use(express.static(resolve('dist')));
app.get('/{*path}', (req, res) => {
  if (req.path.startsWith('/api/')) { res.status(404).json({ error: '找不到此操作。' }); return; }
  res.sendFile(resolve('dist/index.html'));
});
app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error.message); res.status(400).json({ error: '請確認輸入內容，圖片需小於 1.3 MB。' });
});
const expiryTimer = setInterval(() => {
  for (const [id, project] of projects) if (project.expiresAt <= Date.now()) projects.delete(id);
  void persist();
  void cleanExpiredImages();
}, 60000);
expiryTimer.unref();
// Reconcile already-saved Smart Plug demo projects with the current frozen
// artifact projection. Persona IDs are stable, so selections and variants keep
// their identity while stale duplicated presentation labels are corrected.
if (artifactModeEnabled()) {
  const canonicalBuyers = await loadExploratoryBuyers();
  const legacyDemoDescription = 'Works with Alexa to add voice control to an outlet. Supports remote control and automatic schedules for compatible lights, fans, and appliances through the Alexa app. No smart-home hub required. Demo facts are from the audited product profile.';
  for (const project of projects.values()) {
    if (!project.product.demo || project.product.title !== DEMO_PRODUCT.title) continue;
    if (project.product.image === '/demo-bottle.svg') project.product.image = DEMO_PRODUCT.image;
    project.product.price = DEMO_PRODUCT.price;
    if (project.product.description === legacyDemoDescription) project.product.description = DEMO_PRODUCT.description;
    if (canonicalBuyers.every((buyer) => buyer.demoImage)) {
      migrateSmartPlugDemoImages(project, canonicalBuyers);
      continue;
    }
    project.buyers = canonicalBuyers;
    project.selected = project.selected.filter((id) => canonicalBuyers.some((buyer) => buyer.id === id));
    for (const variant of project.variants) {
      const buyer = canonicalBuyers.find((value) => value.id === variant.buyerId);
      if (!buyer || !['template', 'artifact'].includes(variant.provider)) continue;
      const edited = variant.title !== variant.originalTitle || variant.description !== variant.originalDescription;
      const refreshed = buyer.listingProjection
        ? { title: buyer.listingProjection.title, description: buyer.listingProjection.description }
        : templateCopy(project.product, buyer);
      variant.originalTitle = refreshed.title;
      variant.originalDescription = refreshed.description;
      variant.provider = buyer.listingProjection ? 'artifact' : 'template';
      if (!edited) {
        variant.title = refreshed.title;
        variant.description = refreshed.description;
      }
    }
  }
}
await persist();
await cleanExpiredImages();
for (const project of projects.values()) {
  if (Object.values(project.engines).some(s => s !== 'complete')) void analyze(project);
  if (project.phase === 'generating') void generate(project);
}
const server = app.listen(Number(process.env.PORT || 3001), '127.0.0.1', () => {
  const address = server.address();
  console.log(`Persona Engine API: http://127.0.0.1:${typeof address === 'object' && address ? address.port : 3001}`);
});
