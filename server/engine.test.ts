import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBuyers, defaultSelection, templateCopy, validateSelection } from './engine.js';
import { DEMO_PRODUCT } from '../shared/types.js';
import { reconcileVariants } from './variants.js';
import { buildListingPageJson } from '../shared/listing-export.js';
import type { Variant } from '../shared/types.js';
import { isValidRequiredPrice } from '../shared/product-price.js';

test('requires 1–15 distinct known buyers, and keeps all fallback cards in D31 exploratory scope', () => {
  const buyers = buildBuyers(DEMO_PRODUCT);
  assert.equal(buyers.length, 15);
  assert.equal(buyers.every(buyer => buyer.group === 'explorer'), true);
  assert.equal(validateSelection(buyers, buyers.slice(0, 1).map(b => b.id)), true);
  assert.equal(validateSelection(buyers, buyers.slice(0, 5).map(b => b.id)), true);
  assert.equal(validateSelection(buyers, buyers.slice(0, 15).map(b => b.id)), true);
  assert.equal(validateSelection(buyers, []), false);
  assert.equal(validateSelection(buyers, Array(5).fill('buyer-1')), false);
  assert.equal(validateSelection([...buyers, { ...buyers[0], id: 'buyer-16' }], [...buyers.map(b => b.id), 'buyer-16']), false);
});

test('changing selected audiences preserves edits, favorites and IDs when selected again', () => {
  const original = reconcileVariants([], [], ['a', 'b', 'c', 'd', 'e']);
  const edited: Variant = { ...original.variants[0], title: '人工改寫「標題」', description: '第一行\n第二行', originalTitle: '原始標題', originalDescription: '原始文案', favorite: true, status: 'complete' };
  original.variants[0] = edited;
  const removed = reconcileVariants(original.variants, [], ['b', 'c', 'd', 'e', 'f']);
  assert.equal(removed.variants.length, 5);
  assert.equal(removed.archivedVariants[0].id, edited.id);
  assert.equal(removed.variants.find(v => v.buyerId === 'f')?.status, 'pending');
  const restored = reconcileVariants(removed.variants, removed.archivedVariants, ['a', 'b', 'c', 'd', 'e', 'f']);
  assert.deepEqual(restored.variants[0], edited);
  assert.equal(new Set(restored.variants.map(v => v.id)).size, 6);
  const unchanged = reconcileVariants(restored.variants, restored.archivedVariants, ['a', 'b', 'c', 'd', 'e', 'f']);
  assert.deepEqual(unchanged.variants, restored.variants);
});

test('public buyer shape does not expose an internal story hook', () => {
  const buyers = buildBuyers(DEMO_PRODUCT);
  assert.equal(buyers.some(buyer => 'hook' in buyer), false);
  assert.equal(defaultSelection(buyers).length, 5);
  assert.equal(DEMO_PRODUCT.price, 29.99);
});

test('single-page JSON uses the currently edited copy, preserves demo USD price and includes only one page', () => {
  const buyers = buildBuyers(DEMO_PRODUCT);
  const buyer = buyers[0];
  const variant = { ...reconcileVariants([], [], [buyer.id]).variants[0], title: '最新「修改」標題', description: '編輯後第一行\n第二行', status: 'complete' as const };
  const value = JSON.parse(JSON.stringify(buildListingPageJson(DEMO_PRODUCT, buyer, variant)));
  assert.equal(value.title, variant.title);
  assert.equal(value.description, variant.description);
  assert.equal(value.product.price, 29.99);
  assert.equal(value.product.currency, 'USD');
  assert.equal('hook' in value.audience, false);
  assert.equal(value.isSimulation, true);
  assert.equal(Array.isArray(value), false);
  assert.equal('variants' in value || 'archivedVariants' in value || 'owner' in value, false);
});
test('new analysis prices must be finite, positive and have at most two decimals', () => {
  for (const valid of [0.01, 29.99, 100, 999.9]) assert.equal(isValidRequiredPrice(valid), true);
  for (const invalid of [null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.001]) assert.equal(isValidRequiredPrice(invalid), false);
});
test('copy preserves supplied facts, has distinct hooks, and never invents a missing price', () => {
  const product = { ...DEMO_PRODUCT, price: null, description: '唯一規格：容量 731ml。' };
  const copies = buildBuyers(product).map(b => templateCopy(product, b));
  assert.equal(new Set(copies.map(c => c.title)).size, 15);
  for (const copy of copies) { assert.ok(copy.description.includes(product.description)); assert.ok(!copy.description.includes('NT$')); }
});
