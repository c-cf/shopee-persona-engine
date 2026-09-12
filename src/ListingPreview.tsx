import { ShoppingBag, ChevronRight, ImageOff, ShoppingCart } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import type { Buyer, Product } from '../shared/types';
import { money } from './api';

export function ProductImage({ src, className = '', alt = '商品圖片', loading = 'eager' }: { src: string; className?: string; alt?: string; loading?: 'eager' | 'lazy' }) {
  const [failed, setFailed] = useState('');
  return src && failed !== src ? <img className={className} src={src} alt={alt} loading={loading} onError={() => setFailed(src)} /> : <div className={`image-placeholder ${className}`} role="img" aria-label={alt}><ImageOff size={32} /><span>商品圖片待補充</span></div>;
}

const benefitLabels: Record<string, { title: string; copy: string }> = {
  'schedule-automation': { title: '排程自動化', copy: '透過 Alexa App 設定排程與例行程序。' },
  'remote-control': { title: '遠端控制', copy: '在使用情境需要時從應用程式控制插座。' },
  'voice-control': { title: 'Alexa 語音控制', copy: '以 Alexa 語音開啟或關閉連接設備。' },
  'easy-setup': { title: '簡易設定', copy: '依商品既有設定流程連接並開始使用。' },
  'no-hub-routines': { title: '不需額外中樞', copy: '透過 Alexa App 建立例行程序。' },
  'compact-outlet-fit': { title: '插座使用配置', copy: '依實際插座與設備規格確認安裝空間。' },
  'physical-access-relief': { title: '減少實體觸及', copy: '以 Alexa 語音控制難以直接觸及的插座設備。' },
};
const ctaLabels: Record<string, string> = {
  'schedule-first-demo': '先看看排程情境',
  'remote-check-prompt': '檢查遠端控制方式',
  'voice-command-demo': '查看語音控制情境',
  'setup-confidence': '確認設定步驟',
  'routine-builder': '建立我的例行構想',
  'care-reassurance': '看看安心照護情境',
};

export default function ListingPreview({ product, title, description, imageUrl, mobile = false, buyer, imageLoading = 'eager' }: { product: Product; title: string; description: string; imageUrl?: string; mobile?: boolean; buyer?: Buyer; imageLoading?: 'eager' | 'lazy' }) {
  const design = buyer?.designProfile;
  const style = design ? {
    '--pd-bg': design.palette.backgroundColor,
    '--pd-surface': design.palette.surfaceColor,
    '--pd-accent': design.palette.accentColor,
    '--pd-text': design.palette.textColor,
    '--pd-muted': design.palette.mutedTextColor,
    '--pd-accent-text': design.palette.accentTextColor,
  } as CSSProperties : undefined;
  const benefits = buyer?.pageCopy?.benefitBullets.map((benefit, index) => ({ id: `artifact-${index}`, title: benefit.title, copy: benefit.description })) || design?.benefitModulesOrder.map((id) => ({ id, ...(benefitLabels[id] || { title: id, copy: product.description }) })) || [];
  return <div
    className={`listing-preview ${mobile ? 'mobile-preview' : ''} ${design ? `persona-designed design-${design.layoutFamily} hero-${design.heroArrangement}` : ''}`}
    style={style}
    data-design-profile={design?.profileId}
    data-layout-family={design?.layoutFamily}
  >
    <div className="shop-top"><span><ShoppingBag size={22} />蝦皮商品頁</span><small>模擬預覽</small></div>
    <div className="shop-body">
      <div className="shop-breadcrumb">商品 <ChevronRight size={11} /> 商品詳情</div>
      {design && <div className="persona-design-context"><small>{buyer?.pageCopy?.hero.eyebrow || design.visualMotif}</small><strong>{buyer?.name}</strong><span>{buyer?.pageCopy?.hero.subtitle || design.groundingSummaryZh}</span></div>}
      <div className="shop-product">
        <div className="shop-media"><ProductImage src={imageUrl || product.image} className="shop-image" alt={buyer?.demoImage?.altZh || 'Amazon Smart Plug 商品圖片'} loading={imageLoading} />{imageUrl && <small className="shop-note">AI 受眾情境示意圖，實際商品外觀請以原圖為準。</small>}</div>
        <div className="shop-summary"><span className="shop-label">商品介紹</span><h3>{title}</h3><div className="shop-price">{money(product)}</div><div className="shop-fact"><span>商品規格</span><p>{product.description.split('\n').slice(0, 3).join(' ／ ')}</p></div><div className="shop-quantity"><span>數量</span><div>−<b>1</b>＋</div></div><div className="shop-actions"><button disabled><ShoppingCart size={16} />儲存商品</button><button disabled>{buyer?.pageCopy?.ctaLabel || (design ? ctaLabels[design.ctaTreatment] || '查看使用情境' : '直接購買')}</button></div><small className="shop-note">展示商品頁樣貌，按鈕不會建立訂單。</small></div>
      </div>
      {design && <section className="persona-benefits" aria-label="商品重點"><header><small>依這個使用情境排序</small><h4>你可能最先在意</h4></header><div>{benefits.map((benefit, index) => <article key={benefit.id}><b>{String(index + 1).padStart(2, '0')}</b><strong>{benefit.title}</strong><p>{benefit.copy}</p></article>)}</div></section>}
      {buyer?.pageCopy && <section className="persona-scenario"><div><small>{buyer.pageCopy.scenario.heading}</small><p>{buyer.pageCopy.scenario.body}</p></div><div><small>購買前可能在意</small><strong>{buyer.pageCopy.purchaseBarrierReassurance.barrier}</strong><p>{buyer.pageCopy.purchaseBarrierReassurance.reassurance}</p></div></section>}
      <div className="shop-description"><h4>商品詳情</h4><p>{description}</p></div>
    </div>
  </div>;
}
