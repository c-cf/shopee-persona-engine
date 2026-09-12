import type { Product } from "./types.js";

export const MAX_PRODUCT_PRICE = 100_000_000;

export function isValidRequiredPrice(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= MAX_PRODUCT_PRICE &&
    Math.abs(value * 100 - Math.round(value * 100)) < 1e-8
  );
}

export function productCurrency(product: Product): "USD" | "TWD" {
  return product.demo ? "USD" : "TWD";
}

export function formatProductPrice(product: Product): string {
  if (product.price === null) return "價格未提供";
  if (productCurrency(product) === "USD") return `US$${product.price.toFixed(2)}`;
  return `NT$ ${product.price.toLocaleString("zh-TW", { maximumFractionDigits: 2 })}`;
}
