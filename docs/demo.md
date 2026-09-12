# Demo guide / Demo 指南

[Docs](README.md) · [English](../README.md) · [繁體中文](../README.zh-TW.md)

## Walkthrough / 操作流程

Start the app using the homepage quick start. With both provider keys unset, the
following walkthrough uses bundled data, template copy and the original illustration.

依首頁快速開始啟動，兩個供應商金鑰皆不設定時，以下流程使用內附資料、樣板文案與原商品示意圖。

1. Click **「載入示範商品」** (Load demo product), inspect the missing specifications,
   then click **「開始探索受眾」** (Explore audiences).
2. Inspect Core, Market and Explorer: 15 scenarios in total. Read the evidence note
   on **父母／照護者** (parents/caregivers). Keep the five preselected directions or
   select 5–10 distinct audiences.
3. Click **「生成 5 個商品頁」** (the number follows the selection). Open the
   parents/caregivers version and inspect its title and description.
4. Edit the title, mark the version as a favorite and compare it with the original
   using **「比較版本」**. Try **「手機」** to inspect the mobile listing layout.
5. Copy text or **「複製此頁 JSON」**. Verify the copy contains the latest edit.
   Refresh to check saved state. Return to **「回看受眾方向」**, change a selection,
   then update the pages; reselect a removed audience to recover its edited version.

依序載入商品、檢查待補規格、探索受眾，再生成 5–10 個商品頁。閱讀父母／照護者的證據限制，修改標題、標記喜歡、比較原文並切換手機版。最後複製文字或單頁 JSON，確認是最新改稿；重新整理確認保存，再返回受眾頁測試增減與恢復。

## Screenshots / 截圖

The PNG files below are **actual screenshots**, not UI concepts. They were captured
from source commit `de9bb9ab292df74fbf035e86512fa0d6c7f35fec` on 2026-09-12 using a
1440 × 1000 browser viewport, with full-page capture. Copy mode: `template`. Image
mode: `disabled`. All product pictures are the repository's original illustration.
No generated model output or live Shopee data was used for these captures.

以下 PNG 是實際程式截圖，來源與環境如上。全部使用樣板文案、停用圖片生成；商品圖為原始示意圖，未使用模型產出或即時 Shopee 資料。

| File | Shows / 內容 |
| --- | --- |
| [Audience explorer](assets/screenshots/audience-explorer.png) | All three groups, selection state and evidence note／三組受眾、選取狀態與證據註記 |
| [Listing workspace](assets/screenshots/listing-workspace.png) | Parents/caregivers version and editor／父母與照護者版本及編輯區 |
| [Original comparison](assets/screenshots/compare-original.png) | Candidate versus original product text／候選稿與原商品內容比較 |
| [Mobile preview](assets/screenshots/mobile-preview.png) | Mobile listing format inside a desktop workspace／桌機工作區內的手機商品頁版型 |

The last image demonstrates the app's mobile-preview toggle, not a capture from a
physical phone. UI text remains Traditional Chinese in both READMEs.

最後一張展示程式的手機預覽切換，不是實體手機截圖；兩版 README 均使用原生繁中介面畫面。

## Reserved recording slot / 錄影預留位置

**Status: no recording yet.** Reserve `docs/assets/screenshots/demo-walkthrough.gif`
for a real recording of the walkthrough above. This path is a future asset name,
not a link to an existing file. A poster placeholder is provided below; it is
explicitly labeled and is not presented as a working demo.

**狀態：尚未錄製。** 上述路徑預留給實際操作錄影，不是現有檔案連結。下方為明確標示的封面佔位，不代表已有可播放 demo。

![Recording placeholder: load product, choose audiences, compare and edit; no recording yet](assets/screenshots/recording-placeholder.svg)

Suggested sequence: load demo → show evidence boundary → select audiences → generate
five previews → compare with original → edit title → copy current-page JSON. Keep
labels readable, omit idle waits, avoid keys or private customer data, and retain
the visible demo labels. If a GIF becomes too large, publish an MP4 recording and
use a screenshot as its linked poster. Replace this placeholder only after the
recording exists, and document whether template or model generation was used.

建議依序錄下商品載入、證據限制、選受眾、生成五頁、原文比較、改標題及複製 JSON。保留 demo 標示，略過空等並維持文字可讀。GIF 過大時可使用 MP4 搭配截圖封面；錄製完成後才替換佔位，並註明使用樣板或模型模式。
