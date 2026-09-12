# Architecture / 架構

[Docs](README.md) · [English](../README.md) · [繁體中文](../README.zh-TW.md)

## Module map / 模組對照

| Module | Responsibility / 責任 |
| --- | --- |
| [`src/App.tsx`](../src/App.tsx) | Product input, audience selection, comparison and editing／商品輸入、受眾選擇、比較與編輯 |
| [`src/ListingPreview.tsx`](../src/ListingPreview.tsx) | Simulated desktop/mobile product page／桌機與手機模擬商品頁 |
| [`src/api.ts`](../src/api.ts) | API calls, browser workspace key and local drafts／API、瀏覽器工作區金鑰與本機草稿 |
| [`server/index.ts`](../server/index.ts) | Validation, metadata parsing, project routes, background loops and persistence／驗證、metadata、專案路由、背景流程與保存 |
| [`server/engine.ts`](../server/engine.ts) | Seed scenarios, default selection, template/OpenRouter copy／情境種子、預選與文案 |
| [`server/variants.ts`](../server/variants.ts) | Reconcile selections while retaining edited and archived variants／調整選擇並保留既有改稿 |
| [`server/generation.ts`](../server/generation.ts) | Separate copy/image checkpoints and retries／文案與圖片分別記錄進度及重試 |
| [`server/images.ts`](../server/images.ts) | Text prompts, image requests and PNG persistence／文字提示、圖片請求與保存 |
| [`shared/types.ts`](../shared/types.ts) | Product, Buyer, Variant, Project and demo data／共用型別與 demo 資料 |
| [`shared/listing-export.ts`](../shared/listing-export.ts) | Current-page JSON schema／目前單頁的 JSON 結構 |

## Runtime flow / 執行流程

1. The browser submits product facts. Express validates them and creates a project
   with a seven-day expiry and browser workspace owner.
2. An in-process task prepares the three demo groups and records progress in JSON.
   The browser polls unfinished work at 700 ms intervals.
3. A selection of 5–10 audiences is reconciled with existing variants. Removed
   variants are archived within the project so reselection can restore edits,
   favorites and IDs.
4. The generation loop handles each pending variant: copy first, then an optional
   image. Separate checkpoints preserve completed copy when an image fails.
5. The browser renders previews and saves edits. The export helper produces only
   the active page, using its current text.

瀏覽器送出商品事實後，後端驗證、建立七天期限專案，再於程序內準備三組示範受眾。前端每 700 ms 輪詢未完成工作。選定 5–10 個受眾後，後端對照既有版本；移除的版本仍保存在專案內，重新勾回即可恢復改稿、喜歡標記與 ID。生成逐一先處理文案、再處理選用圖片，分別保存進度。前端呈現與保存改稿，匯出只取目前單頁。

The JSON store is an in-memory map with serialized writes to disk. Startup loads
unexpired projects and resumes incomplete analysis or generation. A single-process
local workflow is the current operating model; this is not a distributed queue or
a transactional multi-user database.

JSON 儲存由記憶體中的 map 搭配依序寫入磁碟完成。啟動時載入未到期專案，接續未完成的分析或生成；目前以本機單程序為運作模式。

## Export contract / 匯出契約

“複製此頁 JSON” emits `schemaVersion: "1.1"`, `type: "listing_preview"` and
`isSimulation: true`. It includes the current `title` and `description`, generated
`imageUrl` (or `null`), `imageStatus`, `imageModel`, the product facts and the active
audience, including any evidence summary. It is not a batch export or a Shopee
publishing payload.

「複製此頁 JSON」輸出版本為 `1.1`，包含上述欄位與目前單頁的商品、受眾資料，不是整批匯出或 Shopee 發布格式。

The UI converts a generated image path to an absolute URL at copy time. A localhost
URL remains local; it does not turn the image into a public asset. Original product
images remain in `product.image`. Generated image links expire with the project.

介面複製時會將生成圖片路徑轉為完整網址；localhost 網址仍只能在本機環境使用，不會自動變成公開資產。原圖保留於 `product.image`，生成圖片隨專案到期。

See [configuration](configuration.md) for provider inputs and image-link access,
and [methodology](methodology.md) for the distinction between demo groups and
planned research engines.
