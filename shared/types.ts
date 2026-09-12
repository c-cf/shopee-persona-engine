export type Group = "core" | "market" | "explorer";
export type Status = "pending" | "running" | "complete" | "failed";
export interface Product {
  title: string;
  description: string;
  price: number | null;
  image: string;
  url: string;
  demo: boolean;
}
export interface BuyerEvidence {
  source: "frozen-persona-artifact";
  excerpts: string[];
  reviewIds: string[];
  evidenceIds?: string[];
  note: string;
}
export interface BuyerLegacyMetrics {
  version: "smart-plug-v1";
  beerDiaper: number;
  productJobBridge: number;
  marketOpportunity: { score: number; bucket: string; confidence: string };
}
export interface BuyerMetricDimension {
  score: number;
  descriptionZh: string;
}
export interface BuyerFinalMetrics {
  version: "four-factor-v2";
  productJobBridge: BuyerMetricDimension;
  beerDiaper: BuyerMetricDimension;
  marketOpportunity: BuyerMetricDimension & { llmEstimated: true };
  storyHook: BuyerMetricDimension;
  finalScore: number;
}
export type BuyerMetrics = BuyerLegacyMetrics | BuyerFinalMetrics;
export type PersonaLayoutFamily =
  | "routine-timeline"
  | "remote-control-split"
  | "safety-path"
  | "monitoring-command-center"
  | "morning-ritual"
  | "care-reassurance";
export interface BuyerDesignProfile {
  profileId: string;
  layoutFamily: PersonaLayoutFamily;
  palette: {
    paletteId: string;
    backgroundColor: string;
    surfaceColor: string;
    accentColor: string;
    textColor: string;
    mutedTextColor: string;
    accentTextColor: string;
  };
  heroArrangement: string;
  benefitModulesOrder: string[];
  ctaTreatment: string;
  visualMotif: string;
  groundingSummaryZh: string;
  designRationaleZh: string;
}
export interface BuyerPageCopy {
  hero: { eyebrow: string; title: string; subtitle: string };
  benefitBullets: Array<{ title: string; description: string; citedProductFactIds: string[] }>;
  scenario: { heading: string; body: string };
  ctaLabel: string;
  purchaseBarrierReassurance: {
    barrier: string;
    reassurance: string;
    citedProductFactIds: string[];
    sourceEvidenceIds: string[];
  };
  shortListingCopy: string;
}
export interface Buyer {
  id: string;
  group: Group;
  name: string;
  context: string;
  need: string;
  angle: string;
  objection: string;
  positioning?: "Exploratory Buyer";
  evidence?: BuyerEvidence;
  metrics?: BuyerMetrics;
  profile?: {
    shortDescription: string | null;
    basicStory: string | null;
    workContext: string | null;
    interests: string[] | null;
    preferences: string[] | null;
    objections: string[] | null;
  };
  listingProjection?: {
    title: string;
    description: string;
    angle: string;
    citedProductFacts: string[];
    sourceEvidenceIds: string[];
  };
  designProfile?: BuyerDesignProfile;
  pageCopy?: BuyerPageCopy;
  demoImage?: {
    publicPath: string;
    sha256: string;
    width: number;
    height: number;
    altZh: string;
  };
}
export interface Variant {
  id: string;
  buyerId: string;
  title: string;
  description: string;
  originalTitle: string;
  originalDescription: string;
  favorite: boolean;
  status: Status;
  error?: string;
  provider: "template" | "model" | "artifact";
  imageUrl?: string;
  imageStatus?: Status | "disabled";
  imageError?: string;
  imageModel?: string;
}
export interface Project {
  id: string;
  product: Product;
  buyers: Buyer[];
  selected: string[];
  variants: Variant[];
  archivedVariants?: Variant[];
  engines: Record<Group, Status>;
  phase: "analyzing" | "audiences" | "generating" | "previews";
  createdAt: number;
  expiresAt: number;
  generationMode: "template" | "model";
  imageGenerationMode?: "model" | "disabled";
}
export const GROUPS: {
  id: Group;
  name: string;
  subtitle: string;
  letter: string;
}[] = [
  {
    id: "explorer",
    name: "探索型買家",
    subtitle: "以 1,500 組全量 LLM 配對發現的非直覺機會",
    letter: "E",
  },
];
export const DEMO_PRODUCT: Product = {
  title: "Amazon Smart Plug",
  price: 29.99,
  image: "https://m.media-amazon.com/images/I/21Mcpu+FwAL._AC_.jpg",
  url: "",
  demo: true,
  description:
    "當燈具、風扇或其他插座設備需要在早晨、夜間或外出期間依時段運作時，Amazon Smart Plug 可透過 Alexa App 設定排程與例行程序，讓設備自動開啟或關閉，也可搭配 Alexa 語音控制。",
};
