export type Group = 'core' | 'market' | 'explorer';
export type Status = 'pending' | 'running' | 'complete' | 'failed';
export interface Product { title: string; description: string; price: number | null; image: string; url: string; demo: boolean }
export interface BuyerEvidence { source: 'user-provided-summary'; scope: 'single-representative-product'; matchedReviews: number; verifiedPurchases: number; note: string }
export interface Buyer { id: string; group: Group; name: string; context: string; need: string; angle: string; hook: string; objection: string; positioning?: 'Missed Buyer'; evidence?: BuyerEvidence }
export interface Variant { id: string; buyerId: string; title: string; description: string; originalTitle: string; originalDescription: string; favorite: boolean; status: Status; error?: string; provider: 'template' | 'model' }
export interface Project { id: string; product: Product; buyers: Buyer[]; selected: string[]; variants: Variant[]; archivedVariants?: Variant[]; engines: Record<Group, Status>; phase: 'analyzing' | 'audiences' | 'generating' | 'previews'; createdAt: number; expiresAt: number; generationMode: 'template' | 'model' }
export const GROUPS: { id: Group; name: string; subtitle: string; letter: string }[] = [
  { id: 'core', name: '核心受眾', subtitle: '從商品用途，找到直接契合的需求', letter: 'A' },
  { id: 'market', name: '需求延伸', subtitle: '換個使用角度，發現遺漏的需求', letter: 'B' },
  { id: 'explorer', name: '探索機會', subtitle: '跨出熟悉場景，想像新的可能', letter: 'C' },
];
export const DEMO_PRODUCT: Product = {
  title: '開放式耳機', price: null, image: '/demo-headphones.svg', url: '', demo: true,
  description: '商品品項：開放式耳機\n聆聽形式：開放式設計\n品牌、型號、續航與詳細規格：待補充\n圖片為外觀示意，實際商品資訊待確認。',
};
