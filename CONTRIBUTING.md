# Contributing / 參與貢獻

[English homepage](README.md) · [繁體中文首頁](README.zh-TW.md)

This repository is a local hackathon prototype. Start with a bounded change that
can be checked against the existing seller workflow. The repository has no license
file yet; maintainers need to resolve reuse and contribution terms. This guide does
not grant a license or create a contributor agreement.

本專案是本機黑客松原型，建議從能依現有賣家流程驗證的小範圍修改開始。目前尚無授權檔案，重用及貢獻條款仍需由維護者確認；本指南不授予授權，也不構成貢獻者協議。

## Report a problem / 回報問題

Use the [issue tracker](https://github.com/c-cf/shopee-persona-engine/issues). Include
the action that failed, steps to reproduce, expected and actual behavior, and your
Node/browser versions. State whether you used template copy, OpenRouter or image
generation. A minimal synthetic product is preferable to private seller data. Do
not include API keys, workspace keys or `.data` files containing private content.

在 issue 說明失敗操作、重現步驟、預期及實際結果，以及 Node／瀏覽器版本；註明是否啟用文案或圖片模型。盡量使用最小的合成商品範例，勿附金鑰或私人資料。

## Prepare a change / 準備修改

1. Create a branch from the repository's current default branch.
2. Keep changes focused. Describe the user-visible behavior and why it changes.
3. For code changes, run `npm ci`, `npm test` and `npm run build`. Exercise the affected
   UI flow where relevant. Add tests for meaningful behavior changes, especially
   selection preservation, retry checkpoints and exports.
4. For documentation-only changes, check both language versions, relative links,
   image rendering and code-backed claims. For asset changes, inspect the rendered
   result in the README at a narrow width as well as on desktop.
5. Open a pull request with the scope, verification results and anything not tested.
   Do not label mocked provider tests as real-key verification.

從目前預設分支建立工作分支，讓修改範圍集中。程式修改需執行既有測試及建置，並視影響檢查介面流程；文件修改則核對雙語一致性、連結、圖片及事實。PR 說明範圍、驗證結果及未驗證項目，mock 測試不能寫成真實模型驗證。

## Evidence and language / 證據與文字

- Keep current implementation separate from research plans. Seed scenarios are not
  verified customers; an evidence summary is not the review corpus itself.
- Do not invent product facts, metrics, team members, benchmark results or license
  terms. Label unknowns and add traceable sources when available.
- Edit `README.md` and `README.zh-TW.md` together when behavior changes. Preserve
  commands, numbers, limitations and data-handling details across translations.
- Use Taiwan Traditional Chinese in the localized README. Keep searchable UI labels
  and identifiers intact, including Core, Market, Explorer and Missed Buyer.
- Keep reusable visuals under `docs/assets/brand/`; put actual captures under
  `docs/assets/screenshots/` and record their source and generation mode in `docs/demo.md`.

區分現行實作與研究計畫，不把示範受眾寫成已驗證客戶，也不補造商品事實、指標、成員或授權。功能變更需同步雙語首頁，保留命令、數字、限制與資料處理條件。繁中使用台灣用語，UI 標籤及識別名稱維持可搜尋；資產依上述目錄分類並記錄來源。
