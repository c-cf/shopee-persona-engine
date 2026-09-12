# Methodology and ranking / 方法與排序

[Docs](README.md) · [English](../README.md) · [繁體中文](../README.zh-TW.md)

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

## Persona Engine / Explorer Engine

The original design describes a versioned Persona Universe with a target of 10,000
personas, a Persona Factory and broader Core, Market and Explorer analysis. The
[accepted first-version decision](adr/0002-hackathon-first-version.md) defers the
review corpus, vector retrieval and complete Explorer. The terms remain useful as
research concepts, but only their demo groupings exist in the running app.

原始設計提到目標為 10,000 筆、有版本的人物樣態集合、Persona Factory，以及較完整的 Core、Market、Explorer 分析。第一版決策延後評論 corpus、向量檢索與完整 Explorer。目前程式只實作其示範分組。

Before introducing a research ranking, document its inputs, weights, normalization,
missing-evidence behavior and evaluation set. Keep evidence coverage separate from
hypothesis novelty, and report latency/cost using actual provider runs. These are
proposed acceptance questions, not an existing algorithm or a promised roadmap date.

接入研究排序前，需先記錄輸入、權重、正規化、缺證據處理與評估資料，分開呈現證據覆蓋程度及假說新穎性，並以真實供應商執行紀錄量測時間與成本。這些是後續驗收建議，不是已存在的演算法或時程承諾。
