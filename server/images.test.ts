import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildBuyers } from './engine.js';
import { reconcileVariants } from './variants.js';
import { generateImage, DEFAULT_IMAGE_MODEL, imageFilePath, ImageGenerationError } from './images.js';
import { generateVariant, needsGeneration } from './generation.js';
import { buildListingPageJson } from '../shared/listing-export.js';
import { DEMO_PRODUCT } from '../shared/types.js';

const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=';
const buyer = buildBuyers(DEMO_PRODUCT)[0];
const freshVariant = () => reconcileVariants([], [], [buyer.id]).variants[0];

test('image API receives the new copy and audience, stores a PNG and reuses it on recovery', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'persona-image-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const previousKey = process.env.OPENAI_API_KEY, previousModel = process.env.OPENAI_IMAGE_MODEL;
  process.env.OPENAI_API_KEY = 'test-key'; delete process.env.OPENAI_IMAGE_MODEL;
  t.after(() => {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.OPENAI_IMAGE_MODEL; else process.env.OPENAI_IMAGE_MODEL = previousModel;
  });
  const variant = { ...freshVariant(), title: '新生成標題', description: '新文案第一行\n第二行' };
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url: string | URL | Request, init?: RequestInit) => {
    assert.equal(url, 'https://api.openai.com/v1/images/generations');
    const request = JSON.parse(String(init?.body));
    assert.equal(request.model, DEFAULT_IMAGE_MODEL);
    assert.equal(request.n, 1);
    assert.equal(request.output_format, 'png');
    assert.equal(request.size, '1024x1024');
    assert.ok(request.prompt.includes(variant.title));
    assert.ok(request.prompt.includes(buyer.context));
    assert.ok(request.prompt.includes(JSON.stringify(variant.description)));
    assert.ok(!request.prompt.includes('test-key'));
    assert.ok(init?.signal instanceof AbortSignal);
    return Response.json({ data: [{ b64_json: png }] });
  });
  const result = await generateImage(DEMO_PRODUCT, buyer, variant, 'project', directory);
  assert.equal(result.imageUrl, `/api/images/project/${variant.id}.png`);
  assert.deepEqual(await readFile(imageFilePath(directory, variant.id)), Buffer.from(png, 'base64'));
  assert.deepEqual(await generateImage(DEMO_PRODUCT, buyer, variant, 'project', directory), result);
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.throws(() => imageFilePath(directory, '../projects.json'));
});

test('image API rejects errors and invalid bytes without exposing upstream content', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'persona-image-errors-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';
  t.after(() => { if (previousKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previousKey; });
  let response = Response.json({ error: 'secret-test-key' }, { status: 401 });
  t.mock.method(globalThis, 'fetch', async () => response);
  for (const status of [401, 403, 429, 500]) {
    response = Response.json({ error: 'secret-test-key' }, { status });
    await assert.rejects(generateImage(DEMO_PRODUCT, buyer, freshVariant(), 'project', directory), error => error instanceof ImageGenerationError && !error.message.includes('test-key'));
  }
  for (const data of [{ data: [] }, { data: [{ url: 'https://example.com/temporary.png' }] }, { data: [{ b64_json: 'bm90LWFuLWltYWdl' }] }]) {
    response = Response.json(data);
    await assert.rejects(generateImage(DEMO_PRODUCT, buyer, freshVariant(), 'project', directory), ImageGenerationError);
  }
});

test('image failure keeps copy editable, retries only the image and preserves successful outputs', async () => {
  const variant = freshVariant();
  let copies = 0, images = 0;
  const states: string[] = [];
  const dependencies = {
    imageGenerationEnabled: () => true,
    generateCopy: async () => { copies++; return { title: '已生成標題', description: '已生成文案', provider: 'model' as const }; },
    generateImage: async (_product: unknown, _buyer: unknown, snapshot: typeof variant) => {
      images++;
      assert.equal(snapshot.title, images === 1 ? '已生成標題' : '人工改稿');
      if (images === 1) throw new Error('secret upstream payload');
      return { imageUrl: '/api/images/test/image.png', imageModel: DEFAULT_IMAGE_MODEL };
    },
  };
  const save = async () => { states.push(`${variant.status}/${variant.imageStatus}`); };
  await generateVariant(DEMO_PRODUCT, buyer, variant, 'project', 'unused', save, dependencies);
  assert.equal(variant.status, 'complete');
  assert.equal(variant.imageStatus, 'failed');
  assert.ok(!variant.imageError?.includes('secret'));
  assert.ok(states.includes('complete/running'));
  variant.title = '人工改稿'; variant.favorite = true;
  assert.equal(needsGeneration(variant, true), true);
  await generateVariant(DEMO_PRODUCT, buyer, variant, 'project', 'unused', save, dependencies);
  assert.equal(variant.title, '人工改稿');
  assert.equal(variant.originalTitle, '已生成標題');
  assert.equal(variant.favorite, true);
  assert.equal(variant.imageStatus, 'complete');
  assert.equal(variant.imageError, undefined);
  assert.equal(needsGeneration(variant, true), false);
  await generateVariant(DEMO_PRODUCT, buyer, variant, 'project', 'unused', save, dependencies);
  assert.equal(copies, 1); assert.equal(images, 2);
  const exported = buildListingPageJson(DEMO_PRODUCT, buyer, variant, 'https://example.com');
  assert.equal(exported.imageUrl, 'https://example.com/api/images/test/image.png');
  assert.equal(exported.product.image, DEMO_PRODUCT.image);
  assert.equal(exported.title, '人工改稿');
});

test('no image calls without a key; old copy and interrupted image work can be resumed', async () => {
  const variant = { ...freshVariant(), title: '舊稿', description: '已保存文案', status: 'complete' as const };
  let enabled = false, calls = 0;
  const dependencies = {
    imageGenerationEnabled: () => enabled,
    generateCopy: async () => { throw new Error('Must not regenerate old copy'); },
    generateImage: async () => { calls++; return { imageUrl: '/api/images/resumed.png', imageModel: DEFAULT_IMAGE_MODEL }; },
  };
  const save = async () => {};
  await generateVariant(DEMO_PRODUCT, buyer, variant, 'project', 'unused', save, dependencies);
  assert.equal(variant.imageStatus, 'disabled'); assert.equal(calls, 0);
  assert.equal(needsGeneration(variant, false), false);
  enabled = true; variant.imageStatus = 'running';
  assert.equal(needsGeneration(variant, true), true);
  await generateVariant(DEMO_PRODUCT, buyer, variant, 'project', 'unused', save, dependencies);
  assert.equal(variant.imageStatus, 'complete'); assert.equal(calls, 1);
  assert.equal(variant.title, '舊稿');
});

test('failed copy never triggers an image request', async () => {
  const variant = freshVariant();
  await generateVariant(DEMO_PRODUCT, buyer, variant, 'project', 'unused', async () => {}, {
    imageGenerationEnabled: () => true,
    generateCopy: async () => { throw new Error('copy failure'); },
    generateImage: async () => { assert.fail('Image requested before copy completed'); },
  });
  assert.equal(variant.status, 'failed');
  assert.equal(variant.imageUrl, undefined);
  assert.equal(buildListingPageJson(DEMO_PRODUCT, buyer, variant).imageUrl, null);
});
