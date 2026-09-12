import type { Buyer, Product, Variant } from './types.js';

export function buildListingPageJson(product: Product, buyer: Buyer | undefined, variant: Variant) {
  return {
    schemaVersion: '1.0',
    type: 'listing_preview',
    title: variant.title,
    description: variant.description,
    product: { name: product.title, price: product.price, currency: 'TWD', specifications: product.description, image: product.image || null, sourceUrl: product.url || null },
    audience: buyer ? { id: buyer.id, name: buyer.name, group: buyer.group, context: buyer.context, need: buyer.need, positioning: buyer.positioning || null, evidence: buyer.evidence || null } : null,
    isSimulation: true,
  };
}
