import { DEMO_PRODUCT, type Product } from "../shared/types.js";

export const DEMO_FORM_BUTTON_LABEL = "填入 Amazon Smart Plug 示範資料";

export function demoFormProduct(): Product {
  return { ...DEMO_PRODUCT };
}
