import { createHash } from "node:crypto";
import type { Buyer, Project, Variant } from "../shared/types.js";
import { templateCopy } from "./engine.js";

export function stableDemoVariantId(projectId: string, personaId: string) {
  const hex = createHash("sha256")
    .update(`smartplug-demo-page-v1:${projectId}:${personaId}`)
    .digest("hex")
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Installs the locked Demo's complete 15-image set. This is intentionally
 * separate from the dynamic product flow: no generation or network request is
 * performed, and an incomplete/mismatched image set aborts the migration.
 */
export function migrateSmartPlugDemoImages(project: Project, buyers: Buyer[]) {
  if (
    buyers.length !== 15 ||
    new Set(buyers.map((buyer) => buyer.id)).size !== 15 ||
    buyers.some((buyer) => !buyer.demoImage) ||
    new Set(buyers.map((buyer) => buyer.demoImage!.publicPath)).size !== 15 ||
    new Set(buyers.map((buyer) => buyer.demoImage!.sha256)).size !== 15
  ) throw new Error("Smart Plug Demo image migration requires 15 exact, unique Persona images.");

  const savedByBuyer = new Map(
    [...(project.archivedVariants || []), ...project.variants].map((variant) => [variant.buyerId, variant]),
  );
  const variants: Variant[] = buyers.map((buyer) => {
    const saved = savedByBuyer.get(buyer.id);
    const canonical = buyer.pageCopy
      ? { title: buyer.pageCopy.hero.title, description: buyer.pageCopy.shortListingCopy }
      : buyer.listingProjection
      ? { title: buyer.listingProjection.title, description: buyer.listingProjection.description }
      : templateCopy(project.product, buyer);
    const edited = Boolean(saved && (
      saved.title !== saved.originalTitle || saved.description !== saved.originalDescription
    ));
    return {
      id: saved?.id || stableDemoVariantId(project.id, buyer.id),
      buyerId: buyer.id,
      title: edited ? saved!.title : canonical.title,
      description: edited ? saved!.description : canonical.description,
      originalTitle: canonical.title,
      originalDescription: canonical.description,
      favorite: saved?.favorite || false,
      status: "complete",
      provider: buyer.listingProjection ? "artifact" : "template",
      imageUrl: buyer.demoImage!.publicPath,
      imageStatus: "complete",
      imageModel: "built-in-image_gen",
    };
  });

  project.buyers = buyers;
  project.selected = buyers.map((buyer) => buyer.id);
  project.variants = variants;
  project.archivedVariants = [];
  project.phase = "previews";
  return project;
}
