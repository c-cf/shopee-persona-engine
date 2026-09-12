import type { Buyer, Product, Variant } from './types.js';
import { productCurrency } from './product-price.js';

export function buildListingPageJson(product: Product, buyer: Buyer | undefined, variant: Variant, baseUrl?: string) {
  return {
    schemaVersion: '1.1',
    type: 'listing_preview',
    title: variant.title,
    description: variant.description,
    imageUrl: variant.imageUrl ? (baseUrl ? new URL(variant.imageUrl, baseUrl).href : variant.imageUrl) : null,
    imageStatus: variant.imageStatus || (variant.imageUrl ? 'complete' : 'pending'),
    imageModel: variant.imageModel || null,
    product: { name: product.title, price: product.price, currency: productCurrency(product), specifications: product.description, image: product.image || null, sourceUrl: product.url || null },
    audience: buyer ? { id: buyer.id, name: buyer.name, group: buyer.group, context: buyer.context, need: buyer.need, positioning: buyer.positioning || null, evidence: buyer.evidence || null } : null,
    isSimulation: true,
  };
}
