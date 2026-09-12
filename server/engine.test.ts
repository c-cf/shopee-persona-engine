import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBuyers, defaultSelection, templateCopy, validateSelection } from './engine.js';
import { DEMO_PRODUCT } from '../shared/types.js';
import { reconcileVariants } from './variants.js';
import { buildListingPageJson } from '../shared/listing-export.js';
import type { Variant } from '../shared/types.js';

test('requires 5–10 distinct known buyers, and emits five per source group', () => {
  const buyers = buildBuyers(DEMO_PRODUCT);
  for (const group of ['core', 'market', 'explorer']) assert.equal(buyers.filter(b => b.group === group).length, 5);
  assert.equal(validateSelection(buyers, buyers.slice(0, 5).map(b => b.id)), true);
  assert.equal(validateSelection(buyers, buyers.slice(0, 10).map(b => b.id)), true);
  assert.equal(validateSelection(buyers, buyers.slice(0, 4).map(b => b.id)), false);
  assert.equal(validateSelection(buyers, Array(5).fill('buyer-1')), false);
  assert.equal(validateSelection(buyers, buyers.slice(0, 11).map(b => b.id)), false);
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

test('headphone demo prioritizes the supplied Missed Buyer evidence without inventing source reviews', () => {
  const buyers = buildBuyers(DEMO_PRODUCT);
  const caregiver = buyers.find(b => b.name === '父母／照護者')!;
  assert.equal(caregiver.group, 'market');
  assert.equal(caregiver.positioning, 'Missed Buyer');
  assert.equal(caregiver.evidence?.matchedReviews, 13);
  assert.equal(caregiver.evidence?.verifiedPurchases, 13);
  assert.equal(caregiver.evidence?.source, 'user-provided-summary');
  assert.equal(caregiver.evidence?.scope, 'single-representative-product');
  assert.equal(defaultSelection(buyers)[0], caregiver.id);
  assert.equal(buildBuyers({ ...DEMO_PRODUCT, demo: false }).some(b => b.evidence), false);
  assert.equal(DEMO_PRODUCT.price, null);
});

test('single-page JSON uses the currently edited copy, preserves null price and includes only one page', () => {
  const buyers = buildBuyers(DEMO_PRODUCT);
  const caregiver = buyers.find(b => b.evidence)!;
  const variant = { ...reconcileVariants([], [], [caregiver.id]).variants[0], title: '最新「修改」標題', description: '編輯後第一行\n第二行', status: 'complete' as const };
  const value = JSON.parse(JSON.stringify(buildListingPageJson(DEMO_PRODUCT, caregiver, variant)));
  assert.equal(value.title, variant.title);
  assert.equal(value.description, variant.description);
  assert.equal(value.product.price, null);
  assert.equal(value.audience.evidence.matchedReviews, 13);
  assert.equal(value.isSimulation, true);
  assert.equal(Array.isArray(value), false);
  assert.equal('variants' in value || 'archivedVariants' in value || 'owner' in value, false);
});
test('copy preserves supplied facts, has distinct hooks, and never invents a missing price', () => {
  const product = { ...DEMO_PRODUCT, price: null, description: '唯一規格：容量 731ml。' };
  const copies = buildBuyers(product).map(b => templateCopy(product, b));
  assert.equal(new Set(copies.map(c => c.title)).size, 15);
  for (const copy of copies) { assert.ok(copy.description.includes(product.description)); assert.ok(!copy.description.includes('NT$')); }
});
