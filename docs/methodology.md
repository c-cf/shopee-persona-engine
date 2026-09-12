# Methodology and ranking / 方法與排序

[Docs](README.md) · [English](../README.md) · [繁體中文](../README.zh-TW.md)

## Pitch methodology / 簡報方法

The [team deck](https://claude.ai/code/artifact/460a9183-01f2-422d-bec5-9afa4009abb9)
frames Persona Engine around “Who else needs it?” The research workflow is:

1. **Persona registry (slide 4):** Amazon Reviews 2023 → needs → embeddings → clusters
   and retained outliers → a shared, versioned registry of contexts, jobs and source references.
2. **Explorer (slide 5):** pair one product profile with each persona, ask an LLM for
   plausible uses within the product's capabilities, then return a story, scores and JSON.
3. **Listing workflow (slide 7):** choose audiences, create a listing for each,
   compare, edit and copy. Keep product facts and price as the common reference.

簡報主張是「誰還需要它？」：先由評論建立可重用的人物樣態集合，再進行商品 × persona 的用途探索，最後讓賣家選方向、產生商品頁並審閱。Embedding、分群與離群值保留屬於簡報的研究流程，不代表目前 checkout 已包含這條管線。

The **1,500-persona** scale is illustrative in the deck; its appendix says corpus
scope and validated registry size await confirmation. Older design notes mention
10,000 as a target. Keep that as historical planning rather than a current scale
claim. The deployed UI separately labels its Smart Plug results as 1,500 historical
evaluations and 15 experiment-selected personas. UI labels alone do not validate
the corpus or prove that a new visitor triggers a full inference run.

簡報附錄將 1,500 筆規模、向量與分群標為示意；corpus 範圍及經驗證的集合大小仍待確認。舊文件的 10,000 筆是歷史目標。部署版另標示智慧插座結果來自 1,500 次歷史評估、實驗選定 15 個 personas；這些介面文字不等於 corpus 驗證，也不代表每次瀏覽都重跑全量推論。

## Proposed exploration score / 提案探索分數

| Dimension | Weight | Meaning / 意義 |
| --- | --- | --- |
| Product–Job Bridge | 30% | Can the product do the job?／商品能否完成任務 |
| Beer–Diaper Index | 30% | Unexpected yet plausible／出乎意料且合理的連結 |
| Market Opportunity | 20% | Breadth estimated by an LLM／LLM 估計的機會廣度 |
| Story Hook | 20% | Sensory impact and memorability／畫面感與記憶點 |

For each input on a 0–100 scale, slide 8 proposes a weighted geometric mean:

```text
Final Score = 100 × (Bridge / 100)^0.30
                  × (Beer–Diaper / 100)^0.30
                  × (Market / 100)^0.20
                  × (Hook / 100)^0.20
```

The formula prioritizes exploration hypotheses. It is not a conversion model,
market-size measurement or sales-lift estimate. The deck explicitly labels it
**proposed**, says it does not rescore historical results, and identifies the
slide 6 scores as team-reported with raw JSON pending. Group overlap and qualification
rules remain to be documented. Do not treat an apparent numeric match as proof of
how historical scores were calculated.

此公式用於探索假說的優先順序，不是轉換模型、市場規模量測或銷售提升估計。簡報明示為提案、不回溯重算歷史結果；第六頁數字屬團隊回報，原始 JSON、分組重疊與合格規則仍待補。即使數字看似吻合，也不能據此推定歷史計算方式。

“Beer–diaper” is a familiar metaphor, not verified retail history. The aquarium
case is a team-reported Smart Plug result; the headphone and USB-C Hub examples
are team scenarios. The deck's listing comparison is a concept layout, not an A/B
test or verified photography. Smart plugs control power, not cameras or monitoring;
compatibility and electrical ratings need model-specific confirmation.

「啤酒與尿布」是比喻，不是已查證零售歷史。水族案例為團隊回報結果，耳機及 Hub 為情境示例；文案對照圖不是 A/B 測試或實拍證據。插座只控制供電，相容性與額定值需另行核對。

## Deployment and source / 部署與原始碼

On 2026-09-12 the [public demo](http://165.22.106.67/) showed 15 Smart Plug Explorer
personas with four sub-scores and Final Score, plus 10 saved listing previews.
The remote `main` revision was still `de9bb9a`; no published branch containing the
newer evaluation workflow was found at that check. Its runtime source and evaluation
artifacts therefore remain to be mapped to the repository.

2026-09-12，線上 demo 已可查看上述分數與預覽，但遠端 main 仍為 `de9bb9a`，當時未找到包含新評估流程的公開分支；部署程式與評估產物仍待對應至 repo。

The sections below describe **the checked-in baseline**, including its seeded demo
and UI preselection rule. That rule is not the research ranking formula above.

以下說明目前 repo 基準版，包括預設 demo 及介面預選規則；此規則不同於上方研究排序公式。

## What the code does / 實際程式行為

[`buildBuyers`](../server/engine.ts) selects between two fixed arrays of 15
scenarios. Titles matching `開放式.*耳機` or `open[ -]?ear` use headphone scenarios;
other titles use general scenarios. A hydration-related title makes a small
substitution to the first general scenario's need. This is deterministic branching,
not retrieval from reviews or a learned persona model.

`buildBuyers` 從兩組固定的十五個情境中選擇。標題符合上述耳機規則時使用耳機情境，其餘使用一般情境；與杯、水瓶、保溫、保冷相關的標題，會微調第一個一般情境的需求。這是固定規則分支，不是評論檢索或學習出的人物樣態模型。

Each array contains five `core`, five `market` and five `explorer` entries. The
server prepares the groups in that order, with a 650 ms wait per group. This delay
simulates progressive delivery; it is not a research-engine benchmark.

每組各有五個 Core、Market、Explorer，後端依此順序準備，每組等待 650 ms。此延遲用於示範漸進顯示，不是研究引擎效能量測。

## Current ranking formula / 目前排序公式

There is no numeric market-fit ranking. [`defaultSelection`](../server/engine.ts)
implements only:

```text
priority(b) = Number(Boolean(b.evidence))
ordered = stable_sort(buyers, priority descending)
selected = ordered.slice(0, 5).map(b => b.id)
```

This is a presence check: it does not consider the count, verification status,
recency, representativeness or quality of evidence. Ties retain input order.

目前沒有市場契合排序分數。上述規則只檢查 `evidence` 是否存在，不看數量、驗證狀態、時間、代表性或品質；同分時維持輸入順序。

[`analyze`](../server/index.ts) decides *when* to apply it:

- For the exact built-in headphone demo (`demo === true` and a title equal to
  `DEMO_PRODUCT.title`), it initializes after Market is prepared. Available entries
  are the five Core and five Market scenarios. Parents/caregivers has an evidence
  object, so it is selected first; the first four Core entries follow.
- For other products, it initializes after Core is prepared and picks those five.
- It only initializes when selection is empty and has not been edited. Later groups
  do not overwrite user changes. Generation requires 5–10 unique known IDs.

指定耳機 demo 需同時符合 `demo === true` 與標題完全相符，才會在 Market 準備完成時初始化。當時有五個 Core 與五個 Market，父母／照護者因附證據物件而優先，其後為前四個 Core。其他商品在 Core 完成時預選五個。只有選擇為空且尚未編輯時才初始化；生成時要求 5–10 個不重複且已知的受眾 ID。

## Evidence scope / 證據範圍

The special headphone demo carries this structured summary:

```json
{
  "source": "user-provided-summary",
  "scope": "single-representative-product",
  "matchedReviews": 13,
  "verifiedPurchases": 13
}
```

The accompanying note says that the review text, links and product model have not
been supplied. “Verified Purchase” is part of the supplied summary, not a check
performed by this app. The evidence is attached only to the parents/caregivers
entry in the exact demo; other products must not inherit it.

摘要註記尚缺評論原文、連結與商品型號。「Verified Purchase」來自使用者提供的摘要，並非服務自行查驗；只有指定 demo 的父母／照護者方向會附帶此資料，不能延伸套用至其他商品。

A review-supported need, a proposed audience and a proven purchasing response are
three different claims. None of the current demo scores purchase likelihood or
measures conversion lift.

評論反映某種需求、推導出某個受眾、證明購買反應，是三種不同主張。目前 demo 不評分購買機率，也不衡量轉換率提升。
