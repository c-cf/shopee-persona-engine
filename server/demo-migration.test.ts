import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Project } from "../shared/types.js";
import { DEMO_PRODUCT } from "../shared/types.js";
import { buyersFromDemoEnrichment } from "./persona-data.js";
import { migrateSmartPlugDemoImages, stableDemoVariantId } from "./demo-migration.js";

async function fixtureBuyers() {
  const payload = JSON.parse(await readFile(resolve(
    "../../data/interim/smartplug-top15-demo-enrichment-v1/top15_enriched.json",
  ), "utf8"));
  const names = JSON.parse(await readFile(resolve(
    "../../data/interim/smartplug-top15-display-name-enrichment-v1/display_names.json",
  ), "utf8"));
  const images = JSON.parse(await readFile(resolve(
    "public/persona-images/smartplug-top15-v1/manifest.json",
  ), "utf8"));
  const designs = JSON.parse(await readFile(resolve(
    "../../data/interim/smartplug-top15-design-profiles-v1/design_profiles.json",
  ), "utf8"));
  const copy = JSON.parse(await readFile(resolve(
    "../../data/interim/smartplug-top15-product-page-copy-v1/product_page_copy.json",
  ), "utf8"));
  return buyersFromDemoEnrichment(payload, names, designs, images, copy);
}

test("Demo-only migration creates 15 deterministic pages with exact Persona images", async () => {
  const buyers = await fixtureBuyers();
  const firstId = "dd21ab75-1428-4aff-8641-844467752b3a";
  const project: Project = {
    id: "59238ee8-2286-460c-b2dd-8383459e45f3",
    product: { ...DEMO_PRODUCT },
    buyers: [],
    selected: [],
    variants: [{
      id: firstId,
      buyerId: buyers[0].id,
      title: "舊標題",
      description: "舊描述",
      originalTitle: "舊標題",
      originalDescription: "舊描述",
      favorite: true,
      status: "complete",
      provider: "artifact",
    }],
    archivedVariants: [],
    engines: { core: "complete", market: "complete", explorer: "complete" },
    phase: "audiences",
    createdAt: 1,
    expiresAt: 2,
    generationMode: "template",
  };
  migrateSmartPlugDemoImages(project, buyers);

  assert.equal(project.buyers.length, 15);
  assert.deepEqual(project.selected, buyers.map((buyer) => buyer.id));
  assert.equal(project.variants.length, 15);
  assert.equal(new Set(project.variants.map((variant) => variant.id)).size, 15);
  assert.equal(new Set(project.variants.map((variant) => variant.imageUrl)).size, 15);
  assert.equal(project.variants[0].id, firstId, "existing shareable page ID is preserved");
  assert.equal(project.variants[1].id, stableDemoVariantId(project.id, buyers[1].id));
  assert.equal(project.variants[1].id, stableDemoVariantId(project.id, buyers[1].id));
  for (const variant of project.variants) {
    const buyer = buyers.find((candidate) => candidate.id === variant.buyerId)!;
    assert.equal(variant.imageUrl, buyer.demoImage?.publicPath);
    assert.equal(variant.imageStatus, "complete");
    assert.equal(variant.imageModel, "built-in-image_gen");
    assert.equal(variant.provider, "artifact");
    assert.equal(variant.title, buyer.pageCopy?.hero.title);
    assert.equal(variant.description, buyer.pageCopy?.shortListingCopy);
  }
});

test("Demo-only migration fails closed when any Persona image is absent", async () => {
  const buyers = await fixtureBuyers();
  delete buyers[0].demoImage;
  const project = { id: "project", product: DEMO_PRODUCT } as Project;
  assert.throws(
    () => migrateSmartPlugDemoImages(project, buyers),
    /requires 15 exact, unique Persona images/,
  );
});
