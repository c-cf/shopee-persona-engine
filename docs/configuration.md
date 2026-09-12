# Configuration / 設定

[Docs](README.md) · [English](../README.md) · [繁體中文](../README.zh-TW.md)

## Local modes / 本機模式

The copy and image providers are independent. Audience discovery remains a demo in all modes.

文案與圖片供應商可分別啟用，所有模式的受眾探索皆為示範。

| Copy key | Image key | Result / 結果 |
| --- | --- | --- |
| Not set | Not set | Template copy, original image／樣板文案、原商品圖片 |
| Set | Not set | OpenRouter copy, original image／模型文案、原商品圖片 |
| Not set | Set | Template copy, generated scene／樣板文案、生成情境圖 |
| Set | Set | OpenRouter copy, generated scene／模型文案、生成情境圖 |

Copy `.env.example` to `.env`, edit the needed settings, then restart the server.
The server loads `.env` with `override: true`, so it takes precedence over inherited
variables. If your shell already has provider keys, running without a `.env` does
not disable them. To force a keyless demo, put empty assignments for both keys in
`.env`.

將 `.env.example` 複製為 `.env` 後設定所需欄位，再重啟後端。`.env` 會覆蓋啟動環境中的同名變數；如果 shell 已有金鑰，省略 `.env` 並不會停用模型。要明確使用無金鑰 demo，可在 `.env` 把兩個金鑰設為空值。

```dotenv
OPENROUTER_API_KEY=
OPENAI_API_KEY=
```

| Variable | Default / 預設 | Purpose / 用途 |
| --- | --- | --- |
| `PORT` | `3001` | Express port; the Vite proxy targets 3001／後端埠；Vite 代理固定指向 3001 |
| `OPENROUTER_API_KEY` | Unset | Enables model-written copy／啟用模型文案 |
| `OPENROUTER_MODEL` | `openai/gpt-4o-mini` | Copy model identifier／文案模型識別名稱 |
| `OPENAI_API_KEY` | Unset | Enables scene images／啟用情境圖片 |
| `OPENAI_IMAGE_MODEL` | `gpt-image-2.5-sunburst` | Image model identifier／圖片模型識別名稱 |

These are **repository defaults**, not a statement of current model availability
or account access. Check your provider's available models before enabling calls.
Changing copy settings is best exercised in a new project; existing completed
copy is preserved rather than automatically regenerated.

上表記錄程式目前的預設值，不保證供應商仍提供該模型或帳號具有權限。啟用前請確認可用模型。修改文案設定後可建立新專案驗證；既有完成稿會保留，不會自動重寫。

## Provider inputs / 送出的資料

- **OpenRouter:** product title, description/specifications, price and the selected
  buyer object, including any evidence summary. Product images and workspace keys
  are not part of this request. The prompt requests Traditional Chinese JSON copy
  and prohibits inventing product facts; the result still needs human review.
- **OpenAI Images:** product title and description, audience name/context/need/angle,
  and the listing title and description. The call requests one 1024 × 1024 PNG at
  `medium` quality. It uses text prompts, not the original product image.

OpenRouter 會收到商品標題、描述／規格、價格及選定受眾物件（包含已有的證據摘要）；此請求不含商品圖與工作區金鑰。提示要求繁體中文 JSON 文案且不得編造事實，但產出仍需人工核對。

OpenAI Images 會收到商品標題與描述、受眾名稱／情境／需求／切入角度，以及商品頁標題與文案。每次要求一張 1024 × 1024、`medium` 品質的 PNG；目前不以原商品圖片作為圖像輸入。

Provider keys are read by the server and are not included in the page export.
Configured calls may incur provider charges. The keyless demo makes no paid model
calls, although loading a remote product image or parsing a product URL still uses
the network.

金鑰由後端讀取，不納入單頁匯出。啟用供應商後可能產生 API 費用。無金鑰 demo 不會發出付費模型請求，但讀取遠端商品圖或商品網址仍會使用網路。

## Checkpoints and retries / 進度與重試

Copy completes before its image starts. Each variant has separate copy and image
statuses, so an image failure leaves completed copy editable. “重試失敗項目” retries
unfinished work; “補齊受眾圖片” fills missing images. Successful copy, edits and images
are preserved. An image retry uses the text saved at that time. Editing text does
not automatically regenerate a completed image.

每個版本先完成文案再開始圖片，兩者分別記錄狀態。圖片失敗時仍可編輯文案。「重試失敗項目」重試未完成工作，「補齊受眾圖片」補上缺圖；已成功的文案、改稿與圖片會保留。圖片重試使用當時已儲存的文字；修改文案不會自動重做完成的圖片。

The current loop processes variants sequentially, including each image request.
Do not infer full-batch latency from the speed of the template-only demo.

目前逐一處理各版本及其圖片請求，不能用純樣板 demo 的速度推估模型整批生成時間。

## Storage and access / 保存與存取

| Data | Location / 位置 | Lifetime / 期限 |
| --- | --- | --- |
| Projects, selections, edits and progress | `.data/projects.json` | Seven days after project creation／建立後七天 |
| Generated images | `.data/images/<variant-id>.png` | Expire with the project／隨專案到期 |
| Workspace key and local drafts | Browser local storage／瀏覽器 local storage | Browser-managed／由瀏覽器保存狀態決定 |

The project API uses `X-Workspace-Key` for same-browser access. Generated image
routes `/api/images/<project-id>/<variant-id>.png` do **not** require this key;
valid links grant image access until expiry. IDs are random, not an authentication
system. The server rejects expired image requests and periodically removes expired
projects and orphaned image files; cleanup also runs at startup.

專案 API 使用 `X-Workspace-Key` 支援同瀏覽器存取。圖片路徑 `/api/images/<project-id>/<variant-id>.png` **不需要**此金鑰；持有有效連結即可在到期前讀取。隨機 ID 不等於身分驗證。後端拒絕到期圖片請求，並定期移除到期專案及無所屬的圖片；啟動時也會清理。

## Input and deployment limits / 輸入與部署限制

- URL parsing accepts HTTPS URLs on `shopee.tw` or `www.shopee.tw`, with redirects
  restricted to those hosts. It reads public metadata; there is no browser login,
  CAPTCHA handling or anti-bot bypass. Failed parsing falls back to manual entry.
- Uploaded images are limited to 1.3 MB PNG, JPG or WebP. Missing prices and
  specifications must be supplied by the seller, not inferred from demo content.
- The server binds to `127.0.0.1`. For local development use ports 5173/3001; after
  `npm run build`, `npm start` serves the frontend and API at port 3001.
- A future deployment must keep `.data` persistent and serve/proxy `/api` on the
  same origin. There is no production authentication, external queue or documented
  multi-process storage strategy. Decide these before treating it as a hosted service.

網址只接受上述台灣 Shopee 網域的 HTTPS 公開 metadata，重新導向也限於相同允許清單；沒有登入、驗證碼處理或反爬繞過。讀取失敗可改手動輸入。上傳僅支援最多 1.3 MB 的 PNG、JPG、WebP；缺價與缺規格需由賣家補齊。

後端僅綁定 `127.0.0.1`。未來部署需保留 `.data`，並由同源提供或代理 `/api`；正式身分驗證、外部工作佇列與多程序儲存策略仍待決定。

## Troubleshooting / 疑難排解

| Symptom / 現象 | Next step / 處理 |
| --- | --- |
| Vite cannot start on 5173 | Stop the conflicting process; Vite uses `strictPort`／先處理佔用埠的程序 |
| Frontend works but API fails | Check that Express uses 3001; the development proxy is fixed to that port／確認後端使用 3001 |
| URL cannot be read | Use manual input／改用手動輸入 |
| New key appears inactive | Restart the backend and check `.env` precedence／重啟並檢查 `.env` 優先順序 |
| Image authorization/quota error | Check provider access or quota, then retry; saved copy remains／確認供應商權限或額度後重試，已存文案會保留 |
| Old project cannot be opened | Check seven-day expiry and the same browser's workspace state／確認七天期限與原瀏覽器的工作區狀態 |
