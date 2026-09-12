# shopee-persona-engine

TypeScript 全端的 Persona Engine 黑客松原型。帶入一件商品，選擇 5–10 個受眾，生成模擬 Shopee 商品頁，再比較、編輯、收藏與複製文案。

## 本機啟動

```bash
npm install
npm run dev
```

開啟 http://127.0.0.1:5173，按「載入示範商品」即可體驗。前端使用 React + Vite + TypeScript；後端使用 Express + TypeScript，API 位於 3001。

## 第一版已完成

- 商品網址讀取（支援台灣 Shopee 公開 metadata；遇阻擋會明確導向手動輸入）、商品文字與原圖補充。
- 三組、共十五個清楚標示的示範受眾；選五至十個，每個受眾對應一個預覽。生成後可返回增減受眾，再按「更新商品頁」套用；保留既有改稿，取消後重新勾選也能恢復。
- 逐項生成、桌機／手機模擬頁、兩版本或原文比較。
- 文字即時修改、自動保存、還原原稿、喜歡標記、複製。預覽工具列的「複製此頁 JSON」只匯出目前單頁，包含最新的 `title`、`description`、`imageUrl`、商品資訊及受眾。
- 設定圖片金鑰後，每個受眾先生成文案，再以新標題、描述、商品事實與受眾情境生成一張專屬圖片；文案先開放編輯，圖片完成後自動顯示。原文比較仍使用商品原圖。
- 同瀏覽器免登入回訪，專案建立後保存七天；後端資料寫在忽略版控的 `.data/projects.json`，重啟會載入未到期專案與恢復未完成工作。
- 個別生成失敗可重試，已成功與已編輯版本保留。

## 示範資料與模型

預設 demo 為開放式耳機，優先展示需要保持環境感知的父母／照護者（Missed Buyer）。這個方向附使用者提供的單一代表商品證據摘要：13 則命中，全部 Verified Purchase；尚未提供評論原文、連結與品牌型號，並非本服務自行查驗。價格及未提供的規格保持待補，圖片為外觀示意。

其餘受眾為本地情境樣板，文案以提供的商品事實組合。尚未接入評論 corpus、向量搜尋、Persona Factory 或完整 10K Explorer；樣板探索不代表市場驗證。

如需真實模型撰寫文案，複製 `.env.example` 為 `.env`，設定 `OPENROUTER_API_KEY` 與選用的 `OPENROUTER_MODEL`，重啟後建立新專案。金鑰僅由後端讀取，只有商品標題、規格、價格與選定受眾送到模型；受眾探索仍為示範模式。未配置金鑰不會發出付費模型請求。模型文案接入已實作，尚未以真實金鑰驗證。

商品網址讀取不能保證成功，無瀏覽器登入、驗證碼或反爬繞過；上傳圖片限 1.3 MB 的 PNG、JPG、WebP。服務僅綁定本機，尚未部署。

### 受眾專屬圖片

在 `.env` 設定 `OPENAI_API_KEY` 即啟用，預設使用 `gpt-image-2.5-sunburst`；可用 `OPENAI_IMAGE_MODEL` 指定模型。後端呼叫 OpenAI Images API，每個受眾請求一張 1024 × 1024、medium 品質的 PNG。金鑰不會送到瀏覽器或放入匯出 JSON；未設定圖片金鑰時不呼叫圖片 API，預覽使用原圖。文案仍依既有 OpenRouter 設定選擇模型或樣板。

後端啟動時以專案 `.env` 的設定為優先，覆蓋啟動環境中的同名變數。更換金鑰後請重新啟動 `npm run dev` 或 `npm start`，單純重新整理網頁不會重新載入 `.env`。

圖片依標題與文案生成情境示意，目前不以商品原圖作為圖像輸入；原圖保留在 `product.image`。手動修改文字不會自動重新產圖。圖片失敗可用「重試失敗項目」，舊專案可用「補齊受眾圖片」補上圖片；已完成的文案、改稿與圖片會保留，圖片重試使用當時已儲存的文字。重啟會恢復生成中的工作。

圖片儲存在 `.data/images/<variant-id>.png`，由 `/api/images/<project-id>/<variant-id>.png` 提供；連結可直接開啟，不需要工作區金鑰，並隨專案七天期限到期，過期檔案會清除。JSON 版本為 `1.1`，新增頂層 `imageUrl`（複製時轉成目前網站的完整網址，未完成為 `null`）、`imageStatus` 與 `imageModel`。本機網址僅能在本機使用；部署後需保持 `.data` 持久化並由同一網域代理 `/api`。

API 規格：[圖片生成](https://developers.openai.com/api/docs/guides/image-generation)、[GPT Image 2.5 Sunburst](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst)。

## 驗證與正式建置

```bash
npm test
npm run build
npm start
```

建置後 `npm start` 由 http://127.0.0.1:3001 同時提供前端與 API。本機已使用 Node.js 24 驗證。

規劃見 [User journey](docs/user-journey.md)、[領域詞彙表](CONTEXT.md) 與 [範圍決策](docs/adr/0001-in-service-listing-previews.md)。
