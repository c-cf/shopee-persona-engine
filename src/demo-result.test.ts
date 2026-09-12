import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DEMO_RESULT_PATH } from "./demo-result.js";
import { DEMO_FORM_BUTTON_LABEL, demoFormProduct } from "./demo-form.js";
import { DEMO_PRODUCT } from "../shared/types.js";

test("demo entry is a direct public result link with no create or realtime click handler", async () => {
  assert.equal(
    DEMO_RESULT_PATH,
    "/projects/59238ee8-2286-460c-b2dd-8383459e45f3/personas",
  );
  const appSource = await readFile(new URL("./App.tsx", import.meta.url), "utf8");
  assert.match(
    appSource,
    /<a className="secondary" href=\{DEMO_RESULT_PATH\}>\s*查看示範分析/,
  );
  assert.doesNotMatch(appSource, /function loadDemo\s*\(/);
});

test("Shopee URL reader is an accessible coming-soon control with no parse handler", async () => {
  const appSource = await readFile(new URL("./App.tsx", import.meta.url), "utf8");
  assert.match(appSource, /id="product-url"[\s\S]*?disabled[\s\S]*?aria-disabled="true"[\s\S]*?aria-describedby="product-url-coming-soon"/);
  assert.match(appSource, /讀取商品資訊 · 即將推出/);
  assert.doesNotMatch(appSource, /function readProduct\s*\(/);
  assert.doesNotMatch(appSource, /api<Product>\("\/parse"/);
});

test("full-universe Search is a disabled coming-soon control with no realtime handler", async () => {
  const appSource = await readFile(new URL("./App.tsx", import.meta.url), "utf8");
  assert.match(appSource, /Search 1,500 Personas · Coming Soon／即將推出/);
  assert.match(appSource, /aria-describedby="product-search-coming-soon product-price-help"/);
  assert.doesNotMatch(appSource, /function analyze\s*\(/);
  assert.doesNotMatch(appSource, /runRealtimeMapping\s*\(/);
  assert.doesNotMatch(appSource, /realtimeApi/);
});

test("manual demo button fills the canonical Smart Plug fields locally and cannot start analysis", async () => {
  const filled = demoFormProduct();
  assert.deepEqual(filled, DEMO_PRODUCT);
  assert.notEqual(filled, DEMO_PRODUCT);
  assert.equal(filled.title, "Amazon Smart Plug");
  assert.equal(filled.description, DEMO_PRODUCT.description);
  assert.equal(filled.price, 29.99);
  assert.equal(filled.image, "https://m.media-amazon.com/images/I/21Mcpu+FwAL._AC_.jpg");
  assert.equal(filled.demo, true);

  const appSource = await readFile(new URL("./App.tsx", import.meta.url), "utf8");
  assert.match(appSource, /type="button"[\s\S]*?className="secondary demo-form-fill"[\s\S]*?setProduct\(demoFormProduct\(\)\)/);
  assert.match(appSource, /\{DEMO_FORM_BUTTON_LABEL\}/);
  assert.equal(DEMO_FORM_BUTTON_LABEL, "填入 Amazon Smart Plug 示範資料");
  assert.doesNotMatch(appSource, /demoFormProduct\(\)[\s\S]{0,200}(api|navigate|runRealtimeMapping)/);
});

test("persona selection accepts 1–15 choices and enables the next step for any non-empty selection", async () => {
  const appSource = await readFile(new URL("./App.tsx", import.meta.url), "utf8");
  assert.match(appSource, /previous\.length >= 15/);
  assert.match(appSource, /selected\.length < 1/);
  assert.match(appSource, /selected\.length > 15/);
  assert.match(appSource, /可選 1–15 個/);
  assert.doesNotMatch(appSource, /previous\.length >= 10/);
  assert.doesNotMatch(appSource, /selected\.length < 5/);
});
