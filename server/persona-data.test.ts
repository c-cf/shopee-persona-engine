import test from "node:test";
import assert from "node:assert/strict";
import { buyersFromDemoEnrichment, computeFinalScore, loadExploratoryBuyers } from "./persona-data.js";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

test("computes the Owner-confirmed four-factor geometric Final Score", () => {
  const score = computeFinalScore({
    product_job_bridge: { score: 80 },
    beer_diaper_index: { score: 70 },
    market_opportunity: { score: 60 },
    story_hook_internal: { score: 50 },
  });
  const expected = 100 * 0.8 ** 0.3 * 0.7 ** 0.3 * 0.6 ** 0.2 * 0.5 ** 0.2;
  assert.ok(Math.abs(score - expected) < 1e-12);
});

test("rejects invalid Final Score dimensions", () => {
  assert.throws(
    () =>
      computeFinalScore({
        product_job_bridge: { score: 101 },
        beer_diaper_index: { score: 70 },
        market_opportunity: { score: 60 },
        story_hook_internal: { score: 50 },
      }),
    /0 to 100/,
  );
});

test("Smart Plug v1 joins 15 stable, distinct persona cards without exposing a fake v2 score", async () => {
  process.env.PERSONA_MATCHES_FILE = resolve(
    "../../data/interim/product-persona-match-amazon-smart-plug-v1/top_matches.json",
  );
  process.env.PERSONA_CARDS_FILE = resolve(
    "../../data/interim/persona-card-projection-v1/persona_cards.jsonl",
  );
  const buyers = await loadExploratoryBuyers();
  assert.equal(buyers.length, 15);
  assert.equal(new Set(buyers.map((buyer) => buyer.id)).size, 15);
  assert.equal(new Set(buyers.map((buyer) => buyer.name)).size, 15);
  assert.ok(buyers.every((buyer) => buyer.need && buyer.context && buyer.evidence?.excerpts.length));
  assert.ok(buyers.every((buyer) => !("finalScore" in (buyer.metrics || {}))));
});

test("Smart Plug selected-15 enrichment is complete, localized and artifact-grounded", async () => {
  const payload = JSON.parse(await readFile(resolve(
    "../../data/interim/smartplug-top15-demo-enrichment-v1/top15_enriched.json",
  ), "utf8"));
  const displayNames = JSON.parse(await readFile(resolve(
    "../../data/interim/smartplug-top15-display-name-enrichment-v1/display_names.json",
  ), "utf8"));
  const buyers = buyersFromDemoEnrichment(payload, displayNames);
  assert.equal(buyers.length, 15);
  assert.equal(new Set(buyers.map((buyer) => buyer.id)).size, 15);
  assert.equal(new Set(buyers.map((buyer) => buyer.name)).size, 15);
  for (const buyer of buyers) {
    assert.match(buyer.name, /[\u3400-\u9fff]/u);
    assert.match(buyer.context, /[\u3400-\u9fff]/u);
    assert.match(buyer.need, /[\u3400-\u9fff]/u);
    assert.match(buyer.profile?.shortDescription || "", /[\u3400-\u9fff]/u);
    assert.match(buyer.profile?.basicStory || "", /[\u3400-\u9fff]/u);
    assert.match(buyer.listingProjection?.title || "", /[\u3400-\u9fff]/u);
    assert.match(buyer.listingProjection?.description || "", /[\u3400-\u9fff]/u);
    assert.equal(buyer.metrics?.version, "four-factor-v2");
    assert.ok(buyer.evidence?.excerpts.length);
  }
});

test("Smart Plug Persona images join 1:1 by stable Persona ID and match every asset hash", async () => {
  const payload = JSON.parse(await readFile(resolve(
    "../../data/interim/smartplug-top15-demo-enrichment-v1/top15_enriched.json",
  ), "utf8"));
  const displayNames = JSON.parse(await readFile(resolve(
    "../../data/interim/smartplug-top15-display-name-enrichment-v1/display_names.json",
  ), "utf8"));
  const manifestPath = resolve("public/persona-images/smartplug-top15-v1/manifest.json");
  const images = JSON.parse(await readFile(manifestPath, "utf8"));
  const buyers = buyersFromDemoEnrichment(payload, displayNames, undefined, images);

  assert.equal(images.schema_version, "smartplug.persona_images.v1");
  assert.equal(buyers.length, 15);
  assert.equal(new Set(buyers.map((buyer) => buyer.id)).size, 15);
  assert.equal(new Set(buyers.map((buyer) => buyer.demoImage?.publicPath)).size, 15);
  assert.equal(new Set(buyers.map((buyer) => buyer.demoImage?.sha256)).size, 15);
  for (const buyer of buyers) {
    const image = buyer.demoImage!;
    assert.equal(image.publicPath, `/persona-images/smartplug-top15-v1/${buyer.id}.png`);
    assert.match(image.altZh, /[\u3400-\u9fff]/u);
    const bytes = await readFile(resolve("public", image.publicPath.slice(1)));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), image.sha256);
  }

  const missing = structuredClone(images);
  missing.items.pop();
  missing.count = 14;
  assert.throws(
    () => buyersFromDemoEnrichment(payload, displayNames, undefined, missing),
    /exactly 15 images/,
  );
  const mismatched = structuredClone(images);
  mismatched.items[0].persona_id = "persona-seed-not-in-demo";
  assert.throws(
    () => buyersFromDemoEnrichment(payload, displayNames, undefined, mismatched),
    /must match all 15 Persona IDs/,
  );
});

test("Smart Plug Demo joins 15 unique grounded product-page copy sets", async () => {
  const payload = JSON.parse(await readFile(resolve("../../data/interim/smartplug-top15-demo-enrichment-v1/top15_enriched.json"), "utf8"));
  const names = JSON.parse(await readFile(resolve("../../data/interim/smartplug-top15-display-name-enrichment-v1/display_names.json"), "utf8"));
  const designs = JSON.parse(await readFile(resolve("../../data/interim/smartplug-top15-design-profiles-v1/design_profiles.json"), "utf8"));
  const images = JSON.parse(await readFile(resolve("public/persona-images/smartplug-top15-v1/manifest.json"), "utf8"));
  const copy = JSON.parse(await readFile(resolve("../../data/interim/smartplug-top15-product-page-copy-v1/product_page_copy.json"), "utf8"));
  const buyers = buyersFromDemoEnrichment(payload, names, designs, images, copy);
  assert.equal(buyers.length, 15);
  assert.equal(new Set(buyers.map((buyer) => buyer.pageCopy?.hero.title)).size, 15);
  assert.equal(new Set(buyers.map((buyer) => buyer.pageCopy?.hero.subtitle)).size, 15);
  assert.equal(new Set(buyers.map((buyer) => buyer.pageCopy?.scenario.body)).size, 15);
  assert.equal(new Set(buyers.map((buyer) => buyer.pageCopy?.ctaLabel)).size, 15);
  assert.ok(buyers.every((buyer) => buyer.pageCopy?.benefitBullets.every((benefit) => benefit.citedProductFactIds.length)));
});
