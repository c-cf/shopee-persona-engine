# Homepage audit / 首頁盤點

[Docs](README.md) · [English](../README.md) · [繁體中文](../README.zh-TW.md)

**Audit date:** 2026-09-12

**Source commit:** `de9bb9ab292df74fbf035e86512fa0d6c7f35fec`

**Scope:** documentation and visual assets; application behavior is unchanged.

## Inventory / 現況

| Area | Finding / 發現 | Editorial decision / 文件處理 |
| --- | --- | --- |
| Original README | Traditional Chinese only; setup, features, evidence, image API and persistence details interleaved／僅繁中，操作與細節交錯 | English main page, aligned zh-TW page, focused operational guides／英文主版、對齊繁中與獨立指南 |
| Product | Working React/Express review workflow／可操作的審閱流程 | Lead with product → audiences → 5–10 editable previews／先呈現使用者完成的任務 |
| Audience engine | Two seeded arrays, grouped into Core/Market/Explorer／兩組固定情境種子 | Label as demo, document the actual selection rule／明示 demo 並解釋真實預選規則 |
| Evidence | One user-provided 13/13 review summary, limited to the exact headphone demo／單一商品摘要，原文待補 | Preserve attribution and scope beside the demo／於 demo 旁保留來源與限制 |
| Models | Optional OpenRouter copy and OpenAI Images integration／可選用的文案及圖片接點 | Explain independence, data sent and real-key verification boundary／說明模式、資料與未驗證範圍 |
| Architecture | Shared TypeScript types, in-process jobs and local JSON storage／共用型別、程序內工作與本機 JSON | Show current runtime; avoid inventing databases or vector services／只畫現有架構 |
| Demo media | Bundled illustrations, no committed screenshots or recording／原有示意圖，無產品截圖或錄影 | Capture four real app states; label recording placeholder／補四張實際畫面，錄影明確佔位 |
| Brand | App favicon exists, no README identity kit／已有 favicon，缺首頁品牌組合 | Add original SVG mark, wordmark, bilingual hero/workflow／新增原創標誌與雙語視覺 |
| Team | User identifies it as a Shopee hackathon project; no roster in repo／無成員與屆次資料 | Keep known context and link contribution history／保留已知背景，不補造成員 |
| License | No LICENSE file／無授權檔案 | Explicitly leave the decision to maintainers／待維護者決定 |
| CI | No committed GitHub Actions workflow／無 workflow | Use descriptive badges, no invented passing CI badge／使用狀態標章，不宣稱 CI 通過 |

## Style reference / 風格參考

The user's [Polish Open-Source Prose repository](https://github.com/ting-hong-shieh/polish-open-source-prose)
was inspected for its centered SVG hero, compact navigation, restrained badges,
concrete description, runnable setup and separate supporting documentation. Its
source was used as a structural reference, not as product claims or copied artwork.

參考其置中 SVG hero、精簡導覽、克制的 badges、具體產品敘述與可執行操作；不移植其產品主張或圖形。

## Information architecture / 資訊架構

The homepage follows the questions a new reader needs answered:

1. **What is it?** Hero, one-sentence purpose and visible demo behavior.
2. **Why use it?** The listing problem and the review workflow.
3. **What will I see?** A real screenshot, sample scenario and its evidence limits.
4. **How do I run it?** Keyless setup first, provider configuration as an option.
5. **What exists?** Features, runtime architecture and project structure.
6. **What does the method mean?** Persona/Explorer scope and the exact selection rule.
7. **What remains?** Status, roadmap, team context, contributing and license.

首頁依序回答用途、問題、實際畫面、啟動方式、已有功能、方法意義與尚待完成項目。詳細設定、資料流與研究界線另立文件；歷史訪談與 ADR 保留原位。

## Source map / 事實依據

| Claim | Source |
| --- | --- |
| Scripts and stack | [`package.json`](../package.json), [`vite.config.ts`](../vite.config.ts) |
| Input validation, local binding, persistence, expiry | [`server/index.ts`](../server/index.ts) |
| Scenario count, evidence, default-selection rule | [`server/engine.ts`](../server/engine.ts), [`shared/types.ts`](../shared/types.ts) |
| Edited-version recovery | [`server/variants.ts`](../server/variants.ts) |
| Copy/image checkpoints | [`server/generation.ts`](../server/generation.ts) |
| Image prompt, request format and default model | [`server/images.ts`](../server/images.ts), [`.env.example`](../.env.example) |
| JSON schema and UI export | [`shared/listing-export.ts`](../shared/listing-export.ts), [`src/App.tsx`](../src/App.tsx) |
| Research work deferred | [ADR-0002](adr/0002-hackathon-first-version.md), [`CONTEXT.md`](../CONTEXT.md) |
| Local demo screens | [Capture provenance](demo.md) |

## Verification / 驗證

At the source commit above, using Node.js 26.5.0 and npm 11.17.0:

- `npm ci` completed using the lockfile.
- `npm test` passed **11/11** tests, including selection limits, reselection,
  evidence scope, JSON export, copy preservation and mocked image integration.
- `npm run build` passed TypeScript checking and the Vite production build.
- The production-built local app was opened at `127.0.0.1:3001`, with both provider
  keys empty. Browser automation loaded the headphone demo, observed 15 audiences,
  generated five previews, selected parents/caregivers, compared with the original
  and switched to mobile preview. Four screenshots were saved; no browser page
  errors were observed in that walkthrough.
- New and rewritten documentation was checked for local link targets, heading
  anchors, balanced code fences and valid SVG XML. Legacy design-note links were
  outside this check; the historical user-journey note references a skill path
  absent from the repository.
- Both homepages were rendered in a local Markdown preview at 1200 px and 390 px.
  At 390 px, the page width remained 390 px and no broken images were reported.
  Hero, workflow, wordmark and product captures were visually inspected. This is
  a local rendering check, not a claim that the change was published on GitHub.
- A semantic comparison checked the English and Traditional Chinese versions for
  matching numbers, commands, feature scope, evidence attribution and limitations.

此驗證不涵蓋真實模型呼叫、Shopee 商品頁擷取成功率、公開部署或 10K 研究引擎。圖片整合測試使用 mock 供應商，不等於真實金鑰驗證。未宣稱延遲、成本、轉換率或市場成效。

## Decisions still needed / 待確認事項

- Maintainer choice of license for code and assets／程式與資產授權。
- Verified team roster, roles and event edition／團隊、分工與活動屆次。
- Review source text, product identity and links for the supplied summary／摘要的評論原文與商品來源。
- Recording and any public demo URL／操作錄影與公開 demo。
- Research ranking and evaluation design／研究排序及評估方式。

These missing facts are stated in the deliverables; none were filled with invented
names, scores, dates or legal terms.
