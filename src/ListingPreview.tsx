import { ShoppingBag, ChevronRight, ImageOff, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '../shared/types';
import { money } from './api';

export function ProductImage({ src, className = '' }: { src: string; className?: string }) {
  const [failed, setFailed] = useState('');
  return src && failed !== src ? <img className={className} src={src} alt="商品圖片" onError={() => setFailed(src)} /> : <div className={`image-placeholder ${className}`}><ImageOff size={32} /><span>商品圖片待補充</span></div>;
}

export default function ListingPreview({ product, title, description, mobile = false }: { product: Product; title: string; description: string; mobile?: boolean }) {
  return <div className={`listing-preview ${mobile ? 'mobile-preview' : ''}`}>
    <div className="shop-top"><span><ShoppingBag size={22} />蝦皮商品頁</span><small>模擬預覽</small></div>
    <div className="shop-body">
      <div className="shop-breadcrumb">商品 <ChevronRight size={11} /> 商品詳情</div>
      <div className="shop-product">
        <ProductImage src={product.image} className="shop-image" />
        <div className="shop-summary"><span className="shop-label">商品介紹</span><h3>{title}</h3><div className="shop-price">{money(product.price)}</div><div className="shop-fact"><span>商品規格</span><p>{product.description.split('\n').slice(0, 3).join(' ／ ')}</p></div><div className="shop-quantity"><span>數量</span><div>−<b>1</b>＋</div></div><div className="shop-actions"><button disabled><ShoppingCart size={16} />加入購物車</button><button disabled>直接購買</button></div><small className="shop-note">展示商品頁樣貌，按鈕不會建立訂單。</small></div>
      </div>
      <div className="shop-description"><h4>商品詳情</h4><p>{description}</p></div>
    </div>
  </div>;
}
