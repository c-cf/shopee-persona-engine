import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Compass, Copy, FileText, Heart, History, ImagePlus, Info, Link2, LoaderCircle, Monitor, Package, PencilLine, Plus, RefreshCw, RotateCcw, Search, ShoppingBag, Smartphone, Sparkles, Users, X, Columns2 } from 'lucide-react';
import type { Buyer, Group, Product, Project, Variant } from '../shared/types';
import { DEMO_PRODUCT, GROUPS } from '../shared/types';
import { buildListingPageJson } from '../shared/listing-export';
import { api, expiration, money, readDrafts, type Draft } from './api';
import ListingPreview, { ProductImage } from './ListingPreview';

const EMPTY: Product = { title: '', description: '', price: null, image: '', url: '', demo: false };
const groupIcon = { core: Users, market: Search, explorer: Compass };
type Page = 'input' | 'audiences' | 'previews';

export default function App() {
  const [page, setPage] = useState<Page>('input');
  const [product, setProduct] = useState<Product>(EMPTY);
  const [inputMode, setInputMode] = useState<'link' | 'manual'>('link');
  const [project, setProject] = useState<Project | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [activeVariant, setActiveVariant] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [inputError, setInputError] = useState('');
  const [history, setHistory] = useState<Project[] | null>(null);
  const [about, setAbout] = useState(false);
  const [detail, setDetail] = useState<Buyer | null>(null);
  const [mobile, setMobile] = useState(false);
  const [compare, setCompare] = useState(false);
  const [compareId, setCompareId] = useState('original');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [drafts, setDrafts] = useState(readDrafts);
  const [saveStatus, setSaveStatus] = useState('已儲存');
  const [restore, setRestore] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const saveQueues = useRef<Record<string, Promise<unknown>>>({});
  const selectedRef = useRef<string[]>([]);
  const selectionTouched = useRef(false);
  const selectionQueue = useRef<Promise<unknown>>(Promise.resolve());
  const imageInput = useRef<HTMLInputElement>(null);
  const notice = useCallback((message: string) => setToast(message), []);

  const enterProject = useCallback((value: Project) => {
    setProject(value); setProduct(value.product); setSelected(value.selected);
    selectedRef.current = value.selected; selectionTouched.current = false;
    setActiveVariant(value.variants.find(v => v.status === 'complete')?.id || value.variants[0]?.id || '');
    setPage(value.variants.length ? 'previews' : 'audiences'); setHistory(null); setOnlyFavorites(false); setCompare(false); setCompareId('original');
    localStorage.setItem('persona-current-project', value.id);
  }, []);

  useEffect(() => {
    localStorage.setItem('persona-drafts', JSON.stringify(readDrafts()));
    const id = localStorage.getItem('persona-current-project');
    if (id) api<Project>(`/projects/${id}`).then(enterProject).catch(() => notice('暫時無法恢復專案，可從「最近專案」重新開啟。'));
  }, [enterProject]);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 5000); return () => clearTimeout(timer); } }, [toast]);
  useEffect(() => { window.scrollTo({ top: 0, left: 0 }); }, [page]);
  useEffect(() => { if (compareId === activeVariant) setCompareId('original'); }, [activeVariant, compareId]);
  const modalOpen = history !== null || !!detail || about || restore;
  useEffect(() => {
    if (!modalOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const modal = document.querySelector<HTMLElement>('[role="dialog"]');
    const focusable = () => [...(modal?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea, [tabindex="0"]') || [])];
    focusable()[0]?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const elements = focusable(), first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', trapFocus);
    return () => { document.removeEventListener('keydown', trapFocus); previousFocus?.focus(); };
  }, [modalOpen]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setHistory(null); setDetail(null); setAbout(false); setRestore(false); } };
    window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close);
  }, []);
  useEffect(() => {
    if (!project || (!Object.values(project.engines).some(s => s === 'pending' || s === 'running') && project.phase !== 'generating')) return;
    let cancelled = false;
    const timer = setInterval(() => {
      api<Project>(`/projects/${project.id}`).then(value => {
        if (cancelled) return;
        setProject(value);
        if (!selectionTouched.current) { selectedRef.current = value.selected; setSelected(value.selected); }
        if (!activeVariant && value.variants.length) setActiveVariant(value.variants[0].id);
      }).catch(error => { if (!cancelled) notice(error.message); });
    }, 700);
    return () => { cancelled = true; clearInterval(timer); };
  }, [project?.id, project?.phase, JSON.stringify(project?.engines), activeVariant, notice, selected.length]);

  async function readProduct() {
    if (!product.url.trim()) { setInputError('請先貼上商品網址，或使用右側的示範商品。'); return; }
    setBusy(true); setInputError('');
    try { setProduct(await api<Product>('/parse', 'POST', { url: product.url })); setInputMode('manual'); notice('已讀入商品資訊，請確認後開始分析。'); }
    catch (error) { setInputError((error as Error).message); setInputMode('manual'); }
    finally { setBusy(false); }
  }
  async function analyze() {
    if (product.title.trim().length < 2 || product.description.trim().length < 8) { setInputError('請填寫商品名稱，以及至少 8 個字的用途、規格或商品描述。'); setInputMode('manual'); return; }
    setBusy(true); setInputError('');
    try { enterProject(await api<Project>('/projects', 'POST', { product })); }
    catch (error) { setInputError((error as Error).message); }
    finally { setBusy(false); }
  }
  function loadDemo() { setProduct({ ...DEMO_PRODUCT }); setInputMode('manual'); setInputError(''); notice('已載入示範商品，可修改資訊或直接開始分析。'); }
  function newProject() { setPage('input'); setProduct(EMPTY); setProject(null); setInputMode('link'); setSelected([]); selectedRef.current = []; selectionTouched.current = false; setActiveVariant(''); setInputError(''); setCompare(false); localStorage.removeItem('persona-current-project'); }
  async function uploadImage(file?: File) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1300000) { notice('請選擇小於 1.3 MB 的 PNG、JPG 或 WebP 圖片。'); return; }
    const reader = new FileReader(); reader.onload = () => setProduct(p => ({ ...p, image: String(reader.result), demo: false })); reader.readAsDataURL(file);
  }
  function toggleBuyer(id: string) {
    const previous = selectedRef.current;
    if (!previous.includes(id) && previous.length >= 10) { notice('最多選擇十個受眾方向。'); return; }
    const next = previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id];
    selectedRef.current = next; selectionTouched.current = true;
    setSelected(next);
    if (project) {
      const projectId = project.id;
      selectionQueue.current = selectionQueue.current.catch(() => {}).then(() => api(`/projects/${projectId}/selection`, 'PATCH', { selected: next })).catch(error => notice(error.message));
    }
  }
  async function generate() {
    if (!project) return;
    const next = selectedRef.current;
    if (project.variants.length === next.length && project.variants.every(variant => next.includes(variant.buyerId))) { setPage('previews'); return; }
    setBusy(true);
    try { await selectionQueue.current; enterProject(await api<Project>(`/projects/${project.id}/generate`, 'POST', { selected: next })); }
    catch (error) { notice((error as Error).message); }
    finally { setBusy(false); }
  }
  function getVariant(variant: Variant) { return { ...variant, ...drafts[variant.id] }; }
  function editVariant(variant: Variant, patch: Partial<Draft>) {
    if (!project) return;
    const updated = { title: getVariant(variant).title, description: getVariant(variant).description, ...patch, expiresAt: project.expiresAt };
    const id = project.id;
    setDrafts(previous => { const next = { ...previous, [variant.id]: updated }; try { localStorage.setItem('persona-drafts', JSON.stringify(next)); } catch { notice('瀏覽器儲存空間不足，請先複製目前的文案。'); } return next; });
    setSaveStatus('儲存中…'); clearTimeout(timers.current[variant.id]);
    timers.current[variant.id] = setTimeout(() => {
      const payload = { title: updated.title, description: updated.description };
      saveQueues.current[variant.id] = (saveQueues.current[variant.id] || Promise.resolve()).catch(() => {}).then(() => api(`/projects/${id}/variants/${variant.id}`, 'PATCH', payload)).then(() => setSaveStatus('已儲存')).catch(error => { setSaveStatus('尚未同步'); notice(error.message); });
    }, 450);
  }
  async function favorite(variant: Variant) {
    if (!project) return;
    try { const saved = await api<Variant>(`/projects/${project.id}/variants/${variant.id}`, 'PATCH', { favorite: !variant.favorite }); setProject(previous => previous ? { ...previous, variants: previous.variants.map(v => v.id === saved.id ? saved : v) } : previous); }
    catch (error) { notice((error as Error).message); }
  }
  async function copy(variant: Variant) {
    const value = getVariant(variant);
    try { await navigator.clipboard.writeText(`${value.title}\n\n${value.description}`); notice('已複製標題與文案，可以貼到你的工作文件。'); }
    catch { notice('瀏覽器未允許複製，請在編輯欄選取文字後複製。'); }
  }
  async function copyPageJson(variant: Variant) {
    if (!project) return;
    const buyer = project.buyers.find(value => value.id === variant.buyerId);
    const data = buildListingPageJson(project.product, buyer, getVariant(variant), window.location.origin);
    try { await navigator.clipboard.writeText(JSON.stringify(data, null, 2)); notice('已複製此頁 JSON，包含標題、文案、專屬圖片連結、商品資訊與受眾。'); }
    catch { notice('瀏覽器未允許複製，請允許剪貼簿後重試。'); }
  }
  async function retry() {
    if (!project) return;
    try { setProject(await api<Project>(`/projects/${project.id}/retry`, 'POST')); }
    catch (error) { notice((error as Error).message); }
  }
  async function openHistory() { try { setHistory(await api<Project[]>('/projects')); } catch (error) { notice((error as Error).message); } }

  const current = project?.variants.find(v => v.id === activeVariant) || project?.variants[0];
  const currentBuyer = project?.buyers.find(b => b.id === current?.buyerId);
  const completed = project?.variants.filter(v => v.status === 'complete').length || 0;
  const compareVariant = project?.variants.find(v => v.id === compareId);
  const step = page === 'input' ? 0 : page === 'audiences' ? 1 : 2;
  const selectionChanged = !!project && (project.variants.length !== selected.length || project.variants.some(variant => !selected.includes(variant.buyerId)));

  return <div className={`app ${page === 'previews' ? 'preview-app' : ''}`}>
    <header className="app-header"><button className="brand" onClick={() => { if (page !== 'input') newProject(); }} aria-label="Persona Engine 商品工作台"><img src="/favicon.svg" width="40" height="40" alt="" aria-hidden="true" /><span>Persona Engine<small>商品受眾工作台</small></span></button><nav><button className="demo-badge" onClick={() => setAbout(true)}><span className="status-dot" />示範模式<Info size={13} /></button><button className="header-button" aria-label="最近專案" onClick={openHistory}><History size={17} /><span>最近專案</span></button>{page !== 'input' && <button className="new-button" aria-label="新增商品" onClick={newProject}><Plus size={16} /><span>新增商品</span></button>}</nav></header>
    <div className="step-bar"><div className="steps">{['帶入商品', '探索受眾', '商品頁預覽'].map((label, i) => <button key={label} className={`step ${step === i ? 'active' : ''} ${step > i ? 'done' : ''}`} disabled={(i === 1 && !project) || (i === 2 && !project?.variants.length)} onClick={() => setPage((['input', 'audiences', 'previews'] as Page[])[i])}><span>{step > i ? <Check size={13} /> : i + 1}</span>{label}{i !== 2 && <ChevronRight className="step-chevron" size={15} />}</button>)}</div><span className="step-caption">一件商品，多一種被看見的可能。</span></div>

    {page === 'input' && <main className="input-main">
      <div className="page-heading"><div><span className="section-label"><Package size={15} />從一件商品開始</span><h1>你的商品，還能打動誰？</h1><p>找到不同的受眾，把同一件商品寫成不同的故事。<br className="desktop-break" />直接預覽它們在商品頁上呈現的樣子。</p></div><div className="journey-mini"><Users size={18} /><span>找受眾</span><ChevronRight size={13} /><FileText size={18} /><span>寫文案</span><ChevronRight size={13} /><ShoppingBag size={18} /><span>看預覽</span></div></div>
      <div className="entry-grid"><section className="input-panel"><div className="panel-heading"><h2>帶入你的商品</h2><span>每次分析一件</span></div><div className="input-tabs"><button className={inputMode === 'link' ? 'active' : ''} onClick={() => setInputMode('link')}><Link2 size={16} />貼上商品連結</button><button className={inputMode === 'manual' ? 'active' : ''} onClick={() => setInputMode('manual')}><PencilLine size={16} />手動輸入</button></div>
        {inputMode === 'link' && <div className="url-entry"><label htmlFor="product-url">Shopee 商品網址</label><div className="url-field"><Link2 size={17} /><input id="product-url" placeholder="https://shopee.tw/你的商品連結" value={product.url} onChange={e => setProduct(p => ({ ...p, url: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') void readProduct(); }} /></div><button className="primary wide" onClick={readProduct} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />}讀取商品資訊</button><p className="field-help">讀入後可檢查與修改。若商品頁無法讀取，也能手動貼上資訊。</p></div>}
        {inputMode === 'manual' && <div className="product-form"><label htmlFor="product-title">商品名稱 <span className="required">*</span></label><input id="product-title" value={product.title} placeholder="例：開放式耳機" maxLength={200} onChange={e => setProduct(p => ({ ...p, title: e.target.value }))} /><label htmlFor="product-description">商品規格與描述 <span className="required">*</span></label><textarea id="product-description" rows={6} value={product.description} placeholder="貼上原商品的材質、尺寸、用途與特色。這些資訊會成為每個版本的依據。" maxLength={12000} onChange={e => setProduct(p => ({ ...p, description: e.target.value }))} /><div className="form-bottom"><div><label htmlFor="product-price">價格 <span className="optional">選填</span></label><div className="price-input"><span>NT$</span><input id="product-price" type="number" min="0" value={product.price ?? ''} placeholder="未提供" onChange={e => setProduct(p => ({ ...p, price: e.target.value === '' ? null : Number(e.target.value) }))} /></div></div><button className="upload-button" onClick={() => imageInput.current?.click()}><ImagePlus size={18} />{product.image ? '更換商品圖片' : '上傳商品圖片'}</button><input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => void uploadImage(e.target.files?.[0])} /></div><button className="primary wide" onClick={analyze} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}開始探索受眾<ArrowRight size={17} /></button><p className="field-help">保留商品事實，改變溝通角度。{product.demo ? '目前使用示範商品資料，詳細規格請再確認。' : '缺圖或價格時會以待補充狀態展示。'}</p></div>}
        {inputError && <div role="alert" className="inline-error"><Info size={17} />{inputError}</div>}
        <div className="input-footer"><Clock3 size={15} /><span>免登入使用，專案自建立起保存 7 天</span></div>
      </section>
      <aside className="demo-panel"><div className="demo-image"><ProductImage src={product.image || DEMO_PRODUCT.image} /><span className="demo-image-tag">{product.image && !product.demo ? '你的商品' : '示範商品'}</span><div className="floating-insight"><span className="avatar core"><Users size={17} /></span><div><small>換個受眾，換個說法</small><strong>從「開放式聆聽」<br />到「需要環境感知的照護日常」</strong></div><ArrowUpRight size={18} /></div></div><div className="demo-info"><div><span className="section-label">先體驗一次完整流程</span><h3>開放式耳機</h3><p>父母／照護者 · Missed Buyer<br />13 則命中，全部 Verified Purchase<br /><span className="source-attribution">使用者提供的單一商品證據摘要</span></p></div><button className="secondary" onClick={loadDemo}>載入示範商品<ArrowRight size={16} /></button></div></aside></div>
      <div className="entry-note"><span className="line" /><span>從商品事實出發，讓溝通更有方向</span><span className="line" /></div>
    </main>}

    {page === 'audiences' && project && <main className="audience-main"><div className="page-heading compact"><div><span className="section-label">受眾探索</span><h1>同一件商品，15 種看見它的方式。</h1><p>選擇你想對話的受眾，我們會為每個方向生成一個商品頁。</p></div><button className="text-button" onClick={() => setPage('input')}><PencilLine size={15} />檢查商品資訊</button></div>
      <div className="product-strip"><ProductImage src={project.product.image} /><div><strong>{project.product.title}</strong><span>{money(project.product.price)}<i />商品事實會套用至所有版本</span></div><span className="mode-note"><Info size={14} />{project.buyers.some(buyer => buyer.evidence) ? '含使用者提供的評論摘要，原文待補' : '示範受眾，尚未接入真實評論'}</span></div>
      <div className="audience-toolbar"><div><strong>{project.buyers.length}<span> / 15 個受眾方向</span></strong>{Object.values(project.engines).some(s => s !== 'complete') ? <span className="progress-copy"><LoaderCircle size={14} className="spin" />正在載入示範情境</span> : <span className="progress-copy"><CheckCircle2 size={14} />三組示範情境已就緒</span>}</div><span>點卡片選擇，點「了解這個受眾」看溝通方向</span></div>
      <div className="audience-columns">{GROUPS.map(group => { const Icon = groupIcon[group.id]; return <section key={group.id} className={`audience-group ${group.id}`}><div className="group-heading"><span className={`group-icon ${group.id}`}><Icon size={20} /></span><div><h2>{group.name}<span>{project.buyers.filter(b => b.group === group.id).length}</span></h2><p>{group.subtitle}</p></div></div>{project.buyers.filter(b => b.group === group.id).map((buyer, index) => <article key={buyer.id} className={`buyer-card ${selected.includes(buyer.id) ? 'selected' : ''}`}><button className="buyer-select" role="checkbox" aria-checked={selected.includes(buyer.id)} aria-label={`選擇${buyer.name}`} onClick={() => toggleBuyer(buyer.id)}><div className="buyer-top"><span className={`avatar ${buyer.group}`}>{buyer.name.slice(0, 1)}</span><span className="buyer-number">{group.letter}{String(index + 1).padStart(2, '0')}</span><span className="checkbox">{selected.includes(buyer.id) && <Check size={13} />}</span></div><h3>{buyer.name}</h3><p>{buyer.context}</p><div className="buyer-need">{buyer.need}</div>{buyer.evidence && <span className="buyer-evidence"><strong>Missed Buyer</strong><span>{buyer.evidence.matchedReviews} 則命中 · 全部 Verified Purchase</span><small>使用者提供的證據摘要</small></span>}</button><button className="buyer-detail" onClick={() => setDetail(buyer)}>了解這個受眾<ChevronRight size={13} /></button></article>)}{project.engines[group.id] !== 'complete' && <div className="group-loading"><LoaderCircle size={20} className="spin" />正在準備受眾情境…</div>}</section>; })}</div>
      <div className="selection-dock"><div><span className="selected-count">{selected.length}</span><div><strong>個受眾已選擇</strong><small>{project.variants.length ? '更新後保留既有文案與修改，可重新勾回' : '至少 5 個，最多 10 個 · 一個受眾，一個版本'}</small></div></div><button className="primary" disabled={busy || selected.length < 5 || selected.length > 10 || (selectionChanged && project.phase === 'generating')} onClick={generate}>{busy ? <LoaderCircle size={17} className="spin" /> : <Sparkles size={17} />}{project.phase === 'generating' && selectionChanged ? '目前文案與圖片生成中…' : project.variants.length ? (selectionChanged ? `更新 ${selected.length} 個商品頁` : '查看商品頁預覽') : `生成 ${selected.length} 個商品頁`}<ArrowRight size={17} /></button></div>
    </main>}

    {page === 'previews' && project && <main className="preview-main"><div className="preview-heading"><div><h1>讓不同買家，看見不同的價值。</h1><p>{project.product.title}<span>／</span>{completed} 個預覽已就緒{project.phase === 'generating' && <LoaderCircle size={14} className="spin" />}</p></div><span className="save-state"><CheckCircle2 size={14} />{saveStatus}<span>· 保存至 {expiration(project)}</span></span></div>
      <div className={`preview-workspace ${compare ? 'comparing' : ''}`}><aside className="variant-sidebar"><div className="sidebar-title"><h2>文案版本 <span>{project.variants.length}</span></h2><button className={`icon-button ${onlyFavorites ? 'favorited' : ''}`} aria-label="只看喜歡的版本" aria-pressed={onlyFavorites} onClick={() => setOnlyFavorites(!onlyFavorites)}><Heart size={16} fill={onlyFavorites ? 'currentColor' : 'none'} /></button></div><div className="variant-items">{project.variants.filter(v => !onlyFavorites || v.favorite).map((variant, index) => { const buyer = project.buyers.find(b => b.id === variant.buyerId)!; return <button key={variant.id} className={`variant-item ${current?.id === variant.id ? 'active' : ''}`} onClick={() => setActiveVariant(variant.id)}><div className="variant-item-top"><span className={`tiny-dot ${buyer.group}`} /><small>{GROUPS.find(g => g.id === buyer.group)?.name}</small>{variant.favorite ? <Heart size={13} className="favorited" fill="currentColor" /> : <span className="variant-index">{String(index + 1).padStart(2, '0')}</span>}</div><strong>{buyer.name}</strong><p>{variant.status === 'complete' ? getVariant(variant).title.split('｜')[0] : variant.status === 'failed' ? '生成未完成' : '正在準備文案…'}</p>{variant.status === 'complete' && !variant.imageUrl && project.imageGenerationMode === 'model' && <span className="variant-state">{variant.imageStatus === 'failed' ? '圖片可重試' : variant.imageStatus === 'running' ? <><LoaderCircle size={12} className="spin" />圖片生成中</> : '圖片待生成'}</span>}{variant.status !== 'complete' && <span className="variant-state">{variant.status === 'failed' ? '可重試' : <LoaderCircle size={12} className="spin" />}</span>}</button>; })}{onlyFavorites && !project.variants.some(v => v.favorite) && <div className="empty-favorites"><Heart size={25} /><p>還沒有喜歡的版本</p><button onClick={() => setOnlyFavorites(false)}>查看全部</button></div>}</div><button className="back-to-buyers" onClick={() => setPage('audiences')}><ChevronLeft size={14} />回看受眾方向</button><div className="sidebar-foot"><Info size={13} /><span>{project.generationMode === 'model' ? 'AI 文案，請核對商品事實。' : '示範模式：以情境樣板生成文案。'}</span></div></aside>
        <section className="preview-stage"><div className="preview-toolbar"><div className="device-toggle"><button className={!mobile ? 'active' : ''} onClick={() => setMobile(false)} aria-label="桌機預覽" aria-pressed={!mobile}><Monitor size={16} /><span>桌機</span></button><button className={mobile ? 'active' : ''} onClick={() => setMobile(true)} aria-label="手機預覽" aria-pressed={mobile}><Smartphone size={16} /><span>手機</span></button></div><div className="preview-tools">{project.imageGenerationMode === 'model' && project.variants.some(v => v.status === 'complete' && !v.imageUrl) && <button className="json-button" disabled={project.phase === 'generating'} onClick={retry}><ImagePlus size={15} />補齊受眾圖片</button>}<button className="json-button" disabled={!current || current.status !== 'complete'} onClick={() => current && copyPageJson(current)}><FileText size={15} />複製此頁 JSON</button><button className={`compare-button ${compare ? 'active' : ''}`} onClick={() => setCompare(!compare)}><Columns2 size={16} />{compare ? '結束比較' : '比較版本'}</button></div></div>
          {current?.status === 'complete' && !current.imageUrl && project.imageGenerationMode === 'model' && <div className="image-progress" role="status">{current.imageStatus === 'failed' ? <Info size={14} /> : <ImagePlus size={14} />}<span>{current.imageStatus === 'failed' ? current.imageError || '圖片未完成，請重試。' : current.imageStatus === 'running' ? '正在依這個受眾的標題與文案生成專屬圖片，完成後會自動顯示。' : '專屬圖片待生成，目前顯示商品原圖。'}</span></div>}{current?.status === 'complete' ? <div className={`preview-canvas ${compare ? 'compare-canvas' : ''}`}><div className="canvas-item"><div className="canvas-label"><span>{currentBuyer?.name}</span><span>{current.imageUrl ? '受眾專屬圖片' : '版本預覽'}</span></div><ListingPreview product={project.product} title={getVariant(current).title} description={getVariant(current).description} imageUrl={current.imageUrl} mobile={mobile || compare} /></div>{compare && <div className="canvas-item"><label className="compare-select"><select aria-label="選擇對照版本" value={compareId} onChange={e => setCompareId(e.target.value)}><option value="original">原商品內容</option>{project.variants.filter(v => v.status === 'complete' && v.id !== current.id).map(v => <option value={v.id} key={v.id}>{project.buyers.find(b => b.id === v.buyerId)?.name}</option>)}</select></label><ListingPreview product={project.product} title={compareVariant ? getVariant(compareVariant).title : project.product.title} description={compareVariant ? getVariant(compareVariant).description : project.product.description} imageUrl={compareVariant?.imageUrl} mobile /></div>}</div> : <div className="preview-loading">{current?.status === 'failed' ? <><RefreshCw size={32} /><h3>這個版本還沒準備好</h3><p>其他版本已保留，可以先查看與修改。</p><button className="primary" onClick={retry}>重試未完成版本</button></> : <><div className="loading-orbit"><Sparkles size={28} /></div><h3>正在寫出新的溝通方向</h3><p>{currentBuyer?.name}的商品頁準備中<br />完成的版本會直接出現在左側。</p><span>{completed} / {project.variants.length} 已完成</span></>}</div>}
          {project.variants.some(v => v.status === 'failed' || v.imageStatus === 'failed') && <div className="retry-banner"><span>有文案或圖片未完成，成功內容已保留。</span><button onClick={retry} disabled={project.phase === 'generating'}><RefreshCw size={14} />重試失敗項目</button></div>}
        </section>
        {!compare && <aside className="editor-panel"><div className="editor-heading"><PencilLine size={17} /><h2>把文案調成你的語氣</h2></div>{current && current.status === 'complete' && currentBuyer ? <><div className={`audience-context ${currentBuyer.group}`}><span className="section-label">這個版本，寫給</span><h3>{currentBuyer.name}</h3><p>{currentBuyer.need}</p><span className="context-angle">{currentBuyer.angle}</span>{currentBuyer.evidence && <p className="provided-evidence"><strong>Missed Buyer</strong><br />{currentBuyer.evidence.matchedReviews} 則命中 · 全部 Verified Purchase<br /><small>使用者提供的單一代表商品摘要</small></p>}</div><div className="editor-fields"><label htmlFor="variant-title">商品標題<span>{getVariant(current).title.length}/200</span></label><textarea id="variant-title" value={getVariant(current).title} maxLength={200} rows={4} onChange={e => editVariant(current, { title: e.target.value })} /><label htmlFor="variant-description">商品文案<span>即時預覽</span></label><textarea id="variant-description" value={getVariant(current).description} maxLength={12000} rows={12} onChange={e => editVariant(current, { description: e.target.value })} /><button className="restore-button" onClick={() => setRestore(true)}><RotateCcw size={13} />還原最初生成的文字</button></div><div className="editor-actions"><button className={`secondary favorite-button ${current.favorite ? 'favorited' : ''}`} onClick={() => favorite(current)} aria-label={current.favorite ? '取消喜歡這個版本' : '喜歡這個版本'}><Heart size={17} fill={current.favorite ? 'currentColor' : 'none'} />{current.favorite ? '已標記喜歡' : '喜歡這個版本'}</button><button className="primary wide" onClick={() => copy(current)}><Copy size={16} />複製標題與文案</button></div></> : <div className="editor-waiting"><FileText size={26} /><p>文案完成後，就能在這裡編輯。</p></div>}</aside>}
      </div>
    </main>}

    <footer className="app-footer"><span>Persona Engine</span><span>把商品事實，轉成有方向的溝通。</span><span>Hackathon preview</span></footer>
    {toast && <div className="toast" role="status"><Info size={17} /><span>{toast}</span><button aria-label="關閉提示" onClick={() => setToast('')}><X size={15} /></button></div>}
    {history !== null && <div className="modal-backdrop" onClick={() => setHistory(null)}><section className="modal history-modal" role="dialog" aria-modal="true" aria-labelledby="history-title" onClick={e => e.stopPropagation()}><div className="modal-heading"><div><h2 id="history-title">最近專案</h2><p>同一瀏覽器可回訪，建立後保存七天。</p></div><button className="icon-button" aria-label="關閉最近專案" onClick={() => setHistory(null)}><X size={20} /></button></div>{history.length ? history.map(item => <button className="history-item" key={item.id} onClick={() => enterProject(item)}><ProductImage src={item.product.image} /><div><strong>{item.product.title}</strong><span>{item.variants.filter(v => v.status === 'complete').length} 個預覽 · 保存至 {expiration(item)}</span></div><ArrowUpRight size={18} /></button>) : <div className="empty-history"><History size={32} /><h3>第一個專案，從一件商品開始。</h3><p>分析過的商品會出現在這裡。</p></div>}</section></div>}
    {detail && <div className="modal-backdrop" onClick={() => setDetail(null)}><section className={`modal detail-modal ${detail.group}`} role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={e => e.stopPropagation()}><div className="modal-heading"><span className={`avatar ${detail.group}`}><Users size={23} /></span><button className="icon-button" aria-label="關閉受眾詳情" onClick={() => setDetail(null)}><X size={20} /></button></div><span className="section-label">{GROUPS.find(g => g.id === detail.group)?.name} · 示範情境</span><h2 id="detail-title">{detail.name}</h2><p className="detail-context">{detail.context}</p><dl><dt>他在意什麼</dt><dd>{detail.need}</dd><dt>文案可以這樣切入</dt><dd>{detail.angle}</dd><dt>下單前的疑問</dt><dd>{detail.objection}</dd></dl><div className="detail-hook">「{detail.hook}」</div><p className="evidence-note"><Info size={14} />{detail.evidence ? `${detail.evidence.matchedReviews} 則命中，${detail.evidence.verifiedPurchases} 則 Verified Purchase。${detail.evidence.note}` : '此為示範情境，尚未連接真實評論或驗證市場成效。'}</p><button className="primary wide" onClick={() => { toggleBuyer(detail.id); setDetail(null); }}>{selected.includes(detail.id) ? '移除這個受眾' : '選擇這個受眾'}</button></section></div>}
    {about && <div className="modal-backdrop" onClick={() => setAbout(false)}><section className="modal about-modal" role="dialog" aria-modal="true" aria-labelledby="about-title" onClick={e => e.stopPropagation()}><div className="modal-heading"><h2 id="about-title">關於這個第一版</h2><button className="icon-button" aria-label="關閉說明" onClick={() => setAbout(false)}><X size={20} /></button></div><p>這是可操作的黑客松原型：帶入商品、選受眾、比較商品頁，以及編輯和複製文案。</p><div className="about-note"><Sparkles size={20} /><p>受眾採用示範情境；開放式耳機的父母／照護者方向附有使用者提供的 13 則 Verified Purchase 摘要。尚未載入評論原文、向量檢索或 10K Persona 推論；未設定模型時使用文案樣板。</p></div><p>模擬商品頁不會連接蝦皮帳號或實際上架。耳機圖片為外觀示意；品牌、型號、價格與詳細規格待補充。</p><button className="primary wide" onClick={() => setAbout(false)}>繼續體驗</button></section></div>}
    {restore && current && <div className="modal-backdrop" onClick={() => setRestore(false)}><section className="modal small-modal" role="dialog" aria-modal="true" aria-labelledby="restore-title" onClick={e => e.stopPropagation()}><h2 id="restore-title">還原這個版本的文字？</h2><p>目前修改的標題與文案將替換為最初生成稿，其他版本保持原樣。</p><div className="modal-actions"><button className="secondary" onClick={() => setRestore(false)}>保留修改</button><button className="primary" onClick={() => { editVariant(current, { title: current.originalTitle, description: current.originalDescription }); setRestore(false); }}>還原文字</button></div></section></div>}
  </div>;
}
