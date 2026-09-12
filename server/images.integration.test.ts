import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import type { Project } from '../shared/types.js';
import { DEMO_PRODUCT } from '../shared/types.js';
import { buildListingPageJson } from '../shared/listing-export.js';

test('HTTP generation, image links, retry, JSON persistence and expiry work together', { timeout: 20_000 }, async t => {
  const directory = await mkdtemp(join(tmpdir(), 'persona-image-api-'));
  const entry = pathToFileURL(resolve('server/index.ts')).href;
  const runner = join(directory, 'server.mjs');
  await writeFile(join(directory, '.env'), 'OPENAI_API_KEY=test-from-project-env\n');
  const tsx = resolve('node_modules/tsx/dist/cli.mjs');
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=';
  await writeFile(runner, `
    import { writeFileSync } from 'node:fs';
    let calls = 0;
    globalThis.fetch = async (url, init) => {
      if (url !== 'https://api.openai.com/v1/images/generations') throw new Error('Unexpected network request');
      if (init.headers.Authorization !== 'Bearer test-from-project-env') throw new Error('Project .env must override inherited credentials');
      calls++;
      writeFileSync('calls.json', JSON.stringify(calls));
      await new Promise(resolve => setTimeout(resolve, 30));
      if (calls === 1) return Response.json({ error: { code: 'rate_limit_exceeded' } }, { status: 429 });
      return Response.json({ data: [{ b64_json: '${png}' }] });
    };
    await import(${JSON.stringify(entry)});
  `);
  let child: ChildProcess | undefined;
  async function stop() {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit'); child.kill(); await exited;
    }
  }
  t.after(async () => { await stop(); await rm(directory, { recursive: true, force: true }); });
  async function start() {
    child = spawn(process.execPath, [tsx, runner], { cwd: directory, windowsHide: true, env: { ...process.env, PORT: '0', OPENAI_API_KEY: 'test-only', OPENROUTER_API_KEY: '', DOTENV_CONFIG_PATH: join(directory, 'missing.env') }, stdio: ['ignore', 'pipe', 'pipe'] });
    return await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('API startup timeout')), 5000);
      let output = '';
      child!.stdout!.on('data', data => {
        output += data.toString();
        const match = output.match(/Persona Engine API: (http:\/\/127\.0\.0\.1:\d+)/);
        if (match) { clearTimeout(timeout); resolve(match[1]); }
      });
      child!.once('error', error => { clearTimeout(timeout); reject(error); });
      child!.once('exit', () => { clearTimeout(timeout); reject(new Error('API stopped during startup')); });
    });
  }
  let origin = await start();
  const owner = randomUUID();
  async function request(path: string, method = 'GET', body?: unknown) {
    const response = await fetch(origin + '/api' + path, { method, headers: { 'Content-Type': 'application/json', 'X-Workspace-Key': owner }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    assert.ok(response.ok, `${method} ${path}: ${response.status}`);
    return await response.json();
  }
  async function waitFor(projectId: string, predicate: (project: Project) => boolean) {
    for (let i = 0; i < 120; i++) {
      const project = await request('/projects/' + projectId) as Project;
      if (predicate(project)) return project;
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    throw new Error('Project did not finish');
  }
  const created = await request('/projects', 'POST', { product: DEMO_PRODUCT }) as Project;
  const analyzed = await waitFor(created.id, p => p.phase === 'audiences');
  const selection = analyzed.buyers.slice(0, 5).map(b => b.id);
  await request(`/projects/${created.id}/generate`, 'POST', { selected: selection });
  const partial = await waitFor(created.id, p => p.phase === 'previews');
  assert.equal(partial.variants.filter(v => v.status === 'complete').length, 5);
  assert.equal(partial.variants.filter(v => v.imageStatus === 'complete').length, 4);
  const failed = partial.variants.find(v => v.imageStatus === 'failed')!;
  await request(`/projects/${created.id}/variants/${failed.id}`, 'PATCH', { title: '保留我的人工改稿', favorite: true });
  await request(`/projects/${created.id}/retry`, 'POST');
  const completed = await waitFor(created.id, p => p.phase === 'previews');
  assert.equal(completed.variants.filter(v => v.imageUrl).length, 5);
  assert.equal(new Set(completed.variants.map(v => v.imageUrl)).size, 5);
  assert.equal(completed.variants[0].title, '保留我的人工改稿');
  assert.equal(completed.variants[0].favorite, true);
  assert.equal(JSON.parse(await readFile(join(directory, 'calls.json'), 'utf8')), 6);
  const variant = completed.variants[0];
  const imageUrl = buildListingPageJson(completed.product, completed.buyers[0], variant, origin).imageUrl!;
  const image = await fetch(imageUrl);
  assert.equal(image.status, 200);
  assert.equal(image.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), Buffer.from(png, 'base64'));
  assert.equal((await fetch(origin + `/api/images/${randomUUID()}/${variant.id}.png`)).status, 404);
  assert.equal((await fetch(origin + '/api/images/invalid/path.png')).status, 404);
  assert.equal((await fetch(origin + `/api/projects/${created.id}`)).status, 401);
  await request(`/projects/${created.id}/generate`, 'POST', { selected: selection });
  assert.equal(JSON.parse(await readFile(join(directory, 'calls.json'), 'utf8')), 6);
  const dataFile = join(directory, '.data', 'projects.json');
  const stored = JSON.parse(await readFile(dataFile, 'utf8'));
  assert.equal(stored[0].variants[0].imageUrl, variant.imageUrl);
  assert.ok(!JSON.stringify(completed).includes('test-only'));

  // A restart serves saved images and does not start another paid generation.
  await stop(); origin = await start();
  assert.equal((await fetch(origin + variant.imageUrl!)).status, 200);
  assert.equal((await request(`/projects/${created.id}`)).variants[0].title, '保留我的人工改稿');
  assert.equal(JSON.parse(await readFile(join(directory, 'calls.json'), 'utf8')), 6);
  // Expired projects lose both link access and their stored image files.
  await stop(); stored[0].expiresAt = Date.now() - 1;
  await writeFile(dataFile, JSON.stringify(stored));
  origin = await start();
  assert.equal((await fetch(origin + variant.imageUrl!)).status, 404);
  await assert.rejects(readFile(join(directory, '.data', 'images', `${variant.id}.png`)), { code: 'ENOENT' });
});
