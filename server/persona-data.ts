import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import type { Buyer } from "../shared/types.js";

type CardField<T> = { value: T };
type PersonaCard = {
  persona_id: string;
  display_name?: CardField<string>;
  short_description?: CardField<string>;
  evidence?: Array<{ review_id: string; verbatim_excerpt: string }>;
};
type LegacyMatch = {
  persona_id: string;
  display_name: string;
  usage_context: string;
  job_to_be_done: string;
  qualified: boolean;
  ranking_score: number;
  unsupported_claims: string[];
  beer_diaper_index: { score: number };
  product_job_bridge: { score: number; pass: boolean; rationale: string };
  market_size_estimate: { score: number; bucket: string; confidence: string };
};
type V2Dimension = { score: number; description_zh: string };
type V2Match = {
  persona_id: string;
  qualified: boolean;
  final_score: number;
  product_job_bridge: V2Dimension & { pass: boolean };
  beer_diaper: V2Dimension;
  market_opportunity: V2Dimension & {
    bucket: string;
    confidence: string;
    llm_estimated: true;
  };
  story_hook: V2Dimension;
  persona: {
    display_name: string;
    archetype_name: string;
    short_description: string;
    basic_story: string;
    work_context: string;
    interests: string[];
    job_to_be_done: string;
    usage_context: string;
  };
};
type FourFactorPayload = {
  schema_version?: string;
  evaluated_persona_count?: number;
  evaluation_count?: number;
  top_matches: V2Match[];
};
type LocalizedField<T> = {
  value: T | null;
  grounding: string;
  source_evidence_ids: string[];
};
type DemoEnrichedMatch = {
  persona_id: string;
  qualified: boolean;
  historical_selection_rank: number;
  final_score: number;
  product_job_bridge: V2Dimension & { pass: boolean };
  beer_diaper: V2Dimension;
  market_opportunity: V2Dimension & { bucket: string; confidence: string; llm_estimated: true };
  story_hook: V2Dimension;
  persona: {
    display_name_zh: LocalizedField<string>;
    short_description_zh: LocalizedField<string>;
    usage_context_zh: LocalizedField<string>;
    job_to_be_done_zh: LocalizedField<string>;
    basic_story_zh: LocalizedField<string>;
    work_context_zh: LocalizedField<string>;
    interests_zh: LocalizedField<string[]>;
    preferences_zh: LocalizedField<string[]>;
    objection_zh: LocalizedField<string[]>;
  };
  listing_projection: {
    title_zh: string;
    description_zh: string;
    angle_zh: string;
    cited_product_facts: string[];
    source_evidence_ids: string[];
  };
  evidence: Array<{ evidence_id: string; verbatim_excerpt: string }>;
};
type DemoEnrichmentPayload = {
  schema_version: "smartplug-top15-demo-enrichment-v1";
  selection_status: "experimental_selected_15";
  selection_count: 15;
  source_universe_evaluation_count: 1500;
  top_matches: DemoEnrichedMatch[];
};
type DisplayNamePayload = {
  schema_version: "smartplug-top15-display-name-enrichment-v1";
  source_sha256: string;
  names: Array<{
    persona_id: string;
    display_name_zh: string;
    rationale_zh: string;
  }>;
};
type DesignProfilePayload = {
  schema_version: string;
  profiles: Array<{
    persona_id: string;
    profile_id: string;
    historical_selection_rank: number;
    display_name_zh: string;
    source_grounding: {
      job_to_be_done_zh: string;
      usage_context_zh: string;
      listing_angle_zh: string;
      source_evidence_ids: string[];
      cited_product_fact_ids: string[];
    };
    design: {
      layout_family: "routine-timeline" | "remote-control-split" | "safety-path" | "monitoring-command-center" | "morning-ritual" | "care-reassurance";
      palette: {
        palette_id: string;
        background_color: string;
        surface_color: string;
        accent_color: string;
        text_color: string;
        muted_text_color: string;
        accent_text_color: string;
      };
      hero_arrangement: string;
      benefit_modules_order: string[];
      cta_treatment: string;
      visual_motif: string;
      grounded_product_fact_ids: string[];
      grounding_summary_zh: string;
      design_rationale_zh: string;
    };
  }>;
};
type PersonaImagePayload = {
  schema_version: string;
  count: number;
  items: Array<{
    persona_id: string;
    public_path: string;
    sha256: string;
    width: number;
    height: number;
    alt_zh: string;
    qa: {
      subject_match: boolean;
      distinct_composition: boolean;
      no_readable_text: boolean;
      no_logo: boolean;
      no_watermark: boolean;
      safe_supported_use: boolean;
    };
  }>;
};
type ProductPageCopyPayload = {
  schema_version: string;
  scope: string;
  product: { price_usd: number; audited_product_facts: Array<{ fact_id: string; value: string }> };
  content_guardrails: { demo_only: boolean };
  pages: Array<{
    persona_id: string;
    profile_id: string;
    historical_selection_rank: number;
    display_name_zh: string;
    page_copy_zh: {
      hero: { eyebrow: string; title: string; subtitle: string };
      benefit_bullets: Array<{ title: string; description: string; cited_product_fact_ids: string[] }>;
      scenario: { heading: string; body: string };
      cta: { label: string };
      purchase_barrier_reassurance: { barrier: string; reassurance: string; cited_product_fact_ids: string[]; source_evidence_ids: string[] };
      short_listing_copy: string;
    };
  }>;
};

const scoreInRange = (value: number) =>
  Number.isFinite(value) && value >= 0 && value <= 100;

/** Final v2 score helper. The legacy Smart Plug v1 artifact does not call it. */
export function computeFinalScore(match: {
  product_job_bridge: { score: number };
  beer_diaper_index: { score: number };
  market_opportunity: { score: number };
  story_hook_internal: { score: number };
}) {
  const dimensions = [
    match.product_job_bridge.score,
    match.beer_diaper_index.score,
    match.market_opportunity.score,
    match.story_hook_internal.score,
  ];
  if (!dimensions.every(scoreInRange))
    throw new Error("Final Score dimensions must be finite values from 0 to 100.");
  return (
    100 *
    (dimensions[0] / 100) ** 0.3 *
    (dimensions[1] / 100) ** 0.3 *
    (dimensions[2] / 100) ** 0.2 *
    (dimensions[3] / 100) ** 0.2
  );
}

const hasFourFactorScore = (match: LegacyMatch | V2Match): match is V2Match =>
  "story_hook" in match && "beer_diaper" in match;

function assertV2Dimension(label: string, dimension: V2Dimension) {
  if (
    !dimension ||
    !scoreInRange(dimension.score) ||
    !dimension.description_zh?.trim() ||
    !/[\u3400-\u9fff]/u.test(dimension.description_zh)
  )
    throw new Error(`${label} must have a valid score and Traditional Chinese description.`);
}

function relativeLuminance(hex: string) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`Invalid palette color ${hex}.`);
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(first: string, second: string) {
  const [light, dark] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

// These are presentation labels grounded in each v1 match's JTBD/context. They
// do not add demographics or rewrite either frozen artifact.
const groundedDemoNames: Record<string, string> = {
  "persona-seed-b250262ac4351253bb3a": "Everyday Device Scheduler",
  "persona-seed-6ba013d255e58c900adb": "Timed Shutoff Guardian",
  "persona-seed-f64f8278e2d743cd9498": "Gecko Lamp Scheduler",
  "persona-seed-422447964e3e3dd68a6e": "Hard-to-Reach Lamp Controller",
  "persona-seed-1a70d614f73a430ae97d": "Pre-Arrival Cooling Planner",
  "persona-seed-59a4580899e1982c5145": "Before-Entry Light Starter",
  "persona-seed-337a93fb8dcd14be3164": "Alexa Control Consolidator",
  "persona-seed-00535e514d88dbf34f7e": "Remote Camera Power Keeper",
  "persona-seed-62327a63c53afb3e9157": "Late-Return Lighting Planner",
  "persona-seed-17bf4aef4c9150aaa053": "Travel Presence Lighting Planner",
  "persona-seed-374412942747f30b7bf0": "Dark-House Arrival Avoider",
  "persona-seed-42e0d37b4d8ed01aec96": "Adaptive Away-Lamp Controller",
  "persona-seed-d3ff2a0ab7a3e6a26ed7": "Coffee Timer Replacer",
  "persona-seed-2bd8611aed647369882b": "Morning Coffee Scheduler",
  "persona-seed-bef5388bbd737ca16a2f": "Remote Dog-Light Coordinator",
};

let cache: Buyer[] | undefined;

async function loadCards(path: string) {
  const cards = new Map<string, PersonaCard>();
  const lines = createInterface({
    input: createReadStream(path),
    crlfDelay: Infinity,
  });
  for await (const line of lines) {
    if (!line.trim()) continue;
    const card = JSON.parse(line) as PersonaCard;
    cards.set(card.persona_id, card);
  }
  return cards;
}

export async function buyersFromFourFactorArtifact(
  payload: FourFactorPayload,
): Promise<Buyer[]> {
  const cardsPath = process.env.PERSONA_CARDS_FILE;
  const cards = cardsPath ? await loadCards(cardsPath) : new Map<string, PersonaCard>();
  const evaluatedCount = payload.evaluated_persona_count ?? payload.evaluation_count;
  if (evaluatedCount !== 1500)
    throw new Error("Four-factor artifact must declare exactly 1,500 evaluated Personas.");
  if (!Array.isArray(payload.top_matches))
    throw new Error("Four-factor artifact must contain top_matches.");
  const buyers = payload.top_matches
    .filter((match) => match.qualified && match.product_job_bridge.pass)
    .map((match) => {
      assertV2Dimension("Product–Job Bridge", match.product_job_bridge);
      assertV2Dimension("Beer–Diaper", match.beer_diaper);
      assertV2Dimension("Market Opportunity", match.market_opportunity);
      assertV2Dimension("Story Hook", match.story_hook);
      if (match.market_opportunity.llm_estimated !== true)
        throw new Error("Market Opportunity must be marked as an LLM estimate.");
      const recomputed = computeFinalScore({
        product_job_bridge: match.product_job_bridge,
        beer_diaper_index: match.beer_diaper,
        market_opportunity: match.market_opportunity,
        story_hook_internal: match.story_hook,
      });
      if (!scoreInRange(match.final_score) || Math.abs(recomputed - match.final_score) > 0.05)
        throw new Error(`Invalid Final Score for ${match.persona_id}.`);
      const card = cards.get(match.persona_id);
      const evidence = card?.evidence || [];
      return {
        id: match.persona_id,
        group: "explorer",
        name: match.persona.display_name || match.persona.archetype_name,
        context: match.persona.usage_context,
        need: match.persona.job_to_be_done,
        angle: match.product_job_bridge.description_zh,
        objection: "商品與設備相容性、平台使用條件及商品頁規格是否符合實際情境？",
        positioning: "Exploratory Buyer",
        evidence: {
          source: "frozen-persona-artifact",
          excerpts: evidence.map((item) => item.verbatim_excerpt),
          reviewIds: evidence.map((item) => item.review_id),
          note: "評論原文來自凍結 Persona artifact；人物敘事屬推論，與觀察證據分開呈現。",
        },
        metrics: {
          version: "four-factor-v2",
          productJobBridge: { score: match.product_job_bridge.score, descriptionZh: match.product_job_bridge.description_zh },
          beerDiaper: { score: match.beer_diaper.score, descriptionZh: match.beer_diaper.description_zh },
          marketOpportunity: { score: match.market_opportunity.score, descriptionZh: match.market_opportunity.description_zh, llmEstimated: true },
          storyHook: { score: match.story_hook.score, descriptionZh: match.story_hook.description_zh },
          finalScore: recomputed,
        },
      } satisfies Buyer;
    })
    .sort((a, b) => b.metrics.finalScore - a.metrics.finalScore)
    .slice(0, 15);
  if (buyers.length < 15 || new Set(buyers.map((buyer) => buyer.id)).size !== 15)
    throw new Error("Four-factor artifact must provide 15 unique qualified Personas.");
  const seen = new Map<string, number>();
  for (const buyer of buyers) {
    const count = (seen.get(buyer.name) || 0) + 1;
    seen.set(buyer.name, count);
    if (count > 1) buyer.name = `${buyer.name} · ${buyer.id.slice(-4)}`;
  }
  return buyers;
}

function requireChinese(label: string, value: string | null): string {
  if (!value?.trim() || !/[\u3400-\u9fff]/u.test(value))
    throw new Error(`${label} must be present in Traditional Chinese.`);
  return value;
}

export function buyersFromDemoEnrichment(
  payload: DemoEnrichmentPayload,
  displayNames?: DisplayNamePayload,
  designProfiles?: DesignProfilePayload,
  personaImages?: PersonaImagePayload,
  productPageCopy?: ProductPageCopyPayload,
): Buyer[] {
  if (
    payload.schema_version !== "smartplug-top15-demo-enrichment-v1" ||
    payload.selection_status !== "experimental_selected_15" ||
    payload.selection_count !== 15 ||
    payload.source_universe_evaluation_count !== 1500 ||
    payload.top_matches?.length !== 15
  ) throw new Error("Smart Plug demo enrichment provenance is invalid.");
  const buyers: Buyer[] = payload.top_matches.map((match, index) => {
    if (!match.qualified || !match.product_job_bridge.pass || match.historical_selection_rank !== index + 1)
      throw new Error(`Smart Plug enrichment order/gate failed for ${match.persona_id}.`);
    assertV2Dimension("Product–Job Bridge", match.product_job_bridge);
    assertV2Dimension("Beer–Diaper", match.beer_diaper);
    assertV2Dimension("Market Opportunity", match.market_opportunity);
    assertV2Dimension("Story Hook", match.story_hook);
    if (match.market_opportunity.llm_estimated !== true)
      throw new Error("Market Opportunity must be marked as an LLM estimate.");
    const finalScore = computeFinalScore({
      product_job_bridge: match.product_job_bridge,
      beer_diaper_index: match.beer_diaper,
      market_opportunity: match.market_opportunity,
      story_hook_internal: match.story_hook,
    });
    if (Math.abs(finalScore - match.final_score) > 0.05)
      throw new Error(`Invalid Final Score for ${match.persona_id}.`);
    const name = requireChinese("Persona display name", match.persona.display_name_zh.value);
    const shortDescription = requireChinese("Persona short description", match.persona.short_description_zh.value);
    const context = requireChinese("Persona usage context", match.persona.usage_context_zh.value);
    const need = requireChinese("Persona JTBD", match.persona.job_to_be_done_zh.value);
    const basicStory = requireChinese("Persona basic story", match.persona.basic_story_zh.value);
    const title = requireChinese("Listing title", match.listing_projection.title_zh);
    const description = requireChinese("Listing description", match.listing_projection.description_zh);
    const angle = requireChinese("Listing angle", match.listing_projection.angle_zh);
    const objections = match.persona.objection_zh.value;
    const preferences = match.persona.preferences_zh.value;
    if (!objections?.every((value) => /[\u3400-\u9fff]/u.test(value)) || !preferences?.every((value) => /[\u3400-\u9fff]/u.test(value)))
      throw new Error(`Persona preference/objection localization failed for ${match.persona_id}.`);
    return {
      id: match.persona_id,
      group: "explorer",
      name,
      context,
      need,
      angle,
      objection: objections.join("；"),
      positioning: "Exploratory Buyer",
      profile: {
        shortDescription,
        basicStory,
        workContext: match.persona.work_context_zh.value,
        interests: match.persona.interests_zh.value,
        preferences,
        objections,
      },
      listingProjection: {
        title,
        description,
        angle,
        citedProductFacts: match.listing_projection.cited_product_facts,
        sourceEvidenceIds: match.listing_projection.source_evidence_ids,
      },
      evidence: {
        source: "frozen-persona-artifact",
        excerpts: match.evidence.map((item) => item.verbatim_excerpt),
        reviewIds: [],
        evidenceIds: match.evidence.map((item) => item.evidence_id),
        note: "以下保留英文評論原文；繁中 Persona 內容為具來源引用的實驗投射。",
      },
      metrics: {
        version: "four-factor-v2",
        productJobBridge: { score: match.product_job_bridge.score, descriptionZh: match.product_job_bridge.description_zh },
        beerDiaper: { score: match.beer_diaper.score, descriptionZh: match.beer_diaper.description_zh },
        marketOpportunity: { score: match.market_opportunity.score, descriptionZh: match.market_opportunity.description_zh, llmEstimated: true },
        storyHook: { score: match.story_hook.score, descriptionZh: match.story_hook.description_zh },
        finalScore,
      },
    } satisfies Buyer;
  });
  if (new Set(buyers.map((buyer) => buyer.id)).size !== 15)
    throw new Error("Smart Plug enrichment requires 15 unique Persona IDs.");
  if (displayNames) {
    if (
      displayNames.schema_version !== "smartplug-top15-display-name-enrichment-v1" ||
      displayNames.source_sha256 !== "8116fbc4c2148dd0f513b252691c899af16c8aaac8b3e48c7e335a14ac21cae8" ||
      displayNames.names?.length !== 15
    ) throw new Error("Smart Plug display-name enrichment provenance is invalid.");
    const nameMap = new Map(displayNames.names.map((row) => [row.persona_id, row.display_name_zh]));
    if (nameMap.size !== 15 || buyers.some((buyer) => !nameMap.has(buyer.id)))
      throw new Error("Smart Plug display-name enrichment must match all 15 Persona IDs.");
    for (const buyer of buyers) {
      const displayName = requireChinese("Persona disambiguated display name", nameMap.get(buyer.id) || null);
      if (/\d|類型[一二三四五六七八九十]|[A-Z]\d/i.test(displayName))
        throw new Error(`Artificial display-name discriminator for ${buyer.id}.`);
      buyer.name = displayName;
    }
    if (new Set(buyers.map((buyer) => buyer.name)).size !== 15)
      throw new Error("Smart Plug display names must be unique for all 15 Personas.");
  }
  if (designProfiles) {
    if (designProfiles.profiles?.length !== 15)
      throw new Error("Smart Plug design profiles must contain exactly 15 profiles.");
    const profileMap = new Map(designProfiles.profiles.map((profile) => [profile.persona_id, profile]));
    if (profileMap.size !== 15 || buyers.some((buyer) => !profileMap.has(buyer.id)))
      throw new Error("Smart Plug design profiles must match all 15 Persona IDs.");
    if (new Set(designProfiles.profiles.map((profile) => profile.profile_id)).size !== 15)
      throw new Error("Smart Plug design profile IDs must be unique.");
    if (new Set(designProfiles.profiles.map((profile) => profile.design.layout_family)).size < 4)
      throw new Error("Smart Plug design profiles require at least four layout families.");
    for (const buyer of buyers) {
      const profile = profileMap.get(buyer.id)!;
      if (profile.display_name_zh !== buyer.name)
        throw new Error(`Design profile display-name mismatch for ${buyer.id}.`);
      if (profile.design.benefit_modules_order.length !== 3)
        throw new Error(`Design profile benefit-module count failed for ${buyer.id}.`);
      const palette = profile.design.palette;
      for (const [foreground, background, label] of [
        [palette.text_color, palette.background_color, "page text"],
        [palette.text_color, palette.surface_color, "surface text"],
        [palette.muted_text_color, palette.background_color, "muted text"],
        [palette.accent_text_color, palette.accent_color, "accent text"],
      ] as const) {
        if (contrastRatio(foreground, background) < 4.5)
          throw new Error(`${label} contrast failed for ${buyer.id}.`);
      }
      buyer.designProfile = {
        profileId: profile.profile_id,
        layoutFamily: profile.design.layout_family,
        palette: {
          paletteId: palette.palette_id,
          backgroundColor: palette.background_color,
          surfaceColor: palette.surface_color,
          accentColor: palette.accent_color,
          textColor: palette.text_color,
          mutedTextColor: palette.muted_text_color,
          accentTextColor: palette.accent_text_color,
        },
        heroArrangement: profile.design.hero_arrangement,
        benefitModulesOrder: profile.design.benefit_modules_order,
        ctaTreatment: profile.design.cta_treatment,
        visualMotif: profile.design.visual_motif,
        groundingSummaryZh: requireChinese("Design grounding summary", profile.design.grounding_summary_zh),
        designRationaleZh: requireChinese("Design rationale", profile.design.design_rationale_zh),
      };
    }
  }
  if (personaImages) {
    if (
      personaImages.schema_version !== "smartplug.persona_images.v1" ||
      personaImages.count !== 15 ||
      personaImages.items?.length !== 15
    )
      throw new Error("Smart Plug Persona image manifest must contain exactly 15 images.");
    const imageMap = new Map(personaImages.items.map((item) => [item.persona_id, item]));
    if (imageMap.size !== 15 || buyers.some((buyer) => !imageMap.has(buyer.id)))
      throw new Error("Smart Plug Persona images must match all 15 Persona IDs.");
    if (new Set(personaImages.items.map((item) => item.public_path)).size !== 15 || new Set(personaImages.items.map((item) => item.sha256)).size !== 15)
      throw new Error("Smart Plug Persona image URLs and hashes must be unique.");
    for (const buyer of buyers) {
      const item = imageMap.get(buyer.id)!;
      if (
        item.public_path !== `/persona-images/smartplug-top15-v1/${buyer.id}.png` ||
        !/^[a-f0-9]{64}$/.test(item.sha256) ||
        item.width <= 0 ||
        item.height <= 0
      )
        throw new Error(`Persona image metadata failed for ${buyer.id}.`);
      const qaPassed = [
        item.qa.subject_match,
        item.qa.distinct_composition,
        item.qa.no_readable_text,
        item.qa.no_logo,
        item.qa.no_watermark,
        item.qa.safe_supported_use,
      ].every((passed) => passed === true);
      if (!requireChinese("Persona image alt", item.alt_zh) || !qaPassed)
        throw new Error(`Persona image QA failed for ${buyer.id}.`);
      buyer.demoImage = { publicPath: item.public_path, sha256: item.sha256, width: item.width, height: item.height, altZh: item.alt_zh };
    }
  }
  if (productPageCopy) {
    if (
      productPageCopy.schema_version !== "smartplug-top15-product-page-copy-v1" ||
      productPageCopy.scope !== "Amazon Smart Plug demo page only" ||
      productPageCopy.content_guardrails?.demo_only !== true ||
      productPageCopy.product?.price_usd !== 29.99 ||
      productPageCopy.pages?.length !== 15
    ) throw new Error("Smart Plug product-page copy provenance is invalid.");
    const validFacts = new Set(productPageCopy.product.audited_product_facts.map((fact) => fact.fact_id));
    const pageMap = new Map(productPageCopy.pages.map((page) => [page.persona_id, page]));
    if (pageMap.size !== 15 || buyers.some((buyer) => !pageMap.has(buyer.id)))
      throw new Error("Smart Plug product-page copy must match all 15 Persona IDs.");
    const uniqueFields = [
      productPageCopy.pages.map((page) => page.page_copy_zh.hero.title),
      productPageCopy.pages.map((page) => page.page_copy_zh.hero.subtitle),
      productPageCopy.pages.map((page) => page.page_copy_zh.scenario.body),
      productPageCopy.pages.map((page) => page.page_copy_zh.cta.label),
    ];
    if (uniqueFields.some((values) => new Set(values).size !== 15))
      throw new Error("Smart Plug product-page hero, scenario and CTA copy must be unique.");
    for (const [index, buyer] of buyers.entries()) {
      const page = pageMap.get(buyer.id)!;
      const copy = page.page_copy_zh;
      if (
        page.historical_selection_rank !== index + 1 ||
        page.display_name_zh !== buyer.name ||
        (buyer.designProfile && page.profile_id !== buyer.designProfile.profileId) ||
        ![copy.hero.eyebrow, copy.hero.title, copy.hero.subtitle, copy.scenario.heading, copy.scenario.body, copy.cta.label, copy.purchase_barrier_reassurance.barrier, copy.purchase_barrier_reassurance.reassurance, copy.short_listing_copy]
          .every((value) => /[\u3400-\u9fff]/u.test(value)) ||
        copy.benefit_bullets.length < 3 || copy.benefit_bullets.length > 5 ||
        copy.benefit_bullets.some((benefit) => !benefit.cited_product_fact_ids.length || benefit.cited_product_fact_ids.some((id) => !validFacts.has(id))) ||
        copy.purchase_barrier_reassurance.cited_product_fact_ids.some((id) => !validFacts.has(id))
      ) throw new Error(`Smart Plug product-page copy validation failed for ${buyer.id}.`);
      buyer.pageCopy = {
        hero: copy.hero,
        benefitBullets: copy.benefit_bullets.map((benefit) => ({ title: benefit.title, description: benefit.description, citedProductFactIds: benefit.cited_product_fact_ids })),
        scenario: copy.scenario,
        ctaLabel: copy.cta.label,
        purchaseBarrierReassurance: {
          barrier: copy.purchase_barrier_reassurance.barrier,
          reassurance: copy.purchase_barrier_reassurance.reassurance,
          citedProductFactIds: copy.purchase_barrier_reassurance.cited_product_fact_ids,
          sourceEvidenceIds: copy.purchase_barrier_reassurance.source_evidence_ids,
        },
        shortListingCopy: copy.short_listing_copy,
      };
    }
  }
  return buyers;
}

export async function loadExploratoryBuyers(): Promise<Buyer[]> {
  if (cache) return cache;
  const matchesPath = process.env.PERSONA_MATCHES_FILE;
  const cardsPath = process.env.PERSONA_CARDS_FILE;
  if (!matchesPath || !cardsPath) return [];
  const cards = await loadCards(cardsPath);
  const payload = JSON.parse(await readFile(matchesPath, "utf8")) as {
    schema_version?: string;
    evaluated_persona_count?: number;
    top_matches: Array<LegacyMatch | V2Match>;
  };
  if (!Array.isArray(payload.top_matches))
    throw new Error("Persona match artifact must contain top_matches.");
  if (payload.schema_version === "smartplug-top15-demo-enrichment-v1") {
    const displayNamesPath = process.env.PERSONA_DISPLAY_NAMES_FILE;
    if (!displayNamesPath)
      throw new Error("PERSONA_DISPLAY_NAMES_FILE is required for the Smart Plug demo enrichment.");
    const displayNames = JSON.parse(await readFile(displayNamesPath, "utf8")) as DisplayNamePayload;
    const designProfilesPath = process.env.PERSONA_DESIGN_PROFILES_FILE;
    const personaImagesPath = process.env.PERSONA_IMAGES_MANIFEST_FILE;
    const productPageCopyPath = process.env.PERSONA_PRODUCT_PAGE_COPY_FILE;
    const [designProfiles, personaImages, productPageCopy] = await Promise.all([
      designProfilesPath ? readFile(designProfilesPath, "utf8").then(JSON.parse) as Promise<DesignProfilePayload> : undefined,
      personaImagesPath ? readFile(personaImagesPath, "utf8").then(JSON.parse) as Promise<PersonaImagePayload> : undefined,
      productPageCopyPath ? readFile(productPageCopyPath, "utf8").then(JSON.parse) as Promise<ProductPageCopyPayload> : undefined,
    ]);
    cache = buyersFromDemoEnrichment(payload as unknown as DemoEnrichmentPayload, displayNames, designProfiles, personaImages, productPageCopy);
    return cache;
  }
  if (payload.top_matches[0] && hasFourFactorScore(payload.top_matches[0])) {
    cache = await buyersFromFourFactorArtifact({
      ...payload,
      top_matches: payload.top_matches.filter(hasFourFactorScore),
    });
    return cache;
  }
  const legacyMatches = payload.top_matches.filter(
    (match): match is LegacyMatch => !hasFourFactorScore(match),
  );
  const eligible = legacyMatches
    .filter(
      (match) =>
        match.qualified &&
        match.product_job_bridge.pass &&
        !match.unsupported_claims.length,
    )
    .sort((a, b) => b.ranking_score - a.ranking_score);
  if (eligible.length < 15)
    throw new Error(
      "Persona match artifact must contain at least 15 eligible Exploratory Buyers.",
    );
  cache = eligible.slice(0, 15).map((match) => {
    const card = cards.get(match.persona_id);
    const evidence = card?.evidence || [];
    return {
      id: match.persona_id,
      group: "explorer",
      name:
        groundedDemoNames[match.persona_id] ||
        card?.display_name?.value ||
        match.display_name,
      context: match.usage_context,
      need: match.job_to_be_done,
      angle: match.product_job_bridge.rationale,
      objection:
        "商品與設備相容性、Alexa 使用條件及商品頁規格是否符合實際情境？",
      positioning: "Exploratory Buyer",
      evidence: {
        source: "frozen-persona-artifact",
        excerpts: evidence.map((item) => item.verbatim_excerpt),
        reviewIds: evidence.map((item) => item.review_id),
        note: "評論原文來自凍結 Persona artifact；人物敘事屬推論，與觀察證據分開呈現。",
      },
      metrics: {
        version: "smart-plug-v1",
        beerDiaper: match.beer_diaper_index.score,
        productJobBridge: match.product_job_bridge.score,
        marketOpportunity: {
          score: match.market_size_estimate.score,
          bucket: match.market_size_estimate.bucket,
          confidence: match.market_size_estimate.confidence,
        },
      },
    } satisfies Buyer;
  });
  return cache;
}

export const artifactModeEnabled = () =>
  Boolean(process.env.PERSONA_MATCHES_FILE && process.env.PERSONA_CARDS_FILE);
