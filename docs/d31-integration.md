# D31 exploratory-persona integration

This integration pins upstream commit `c7ed2afbfdfe47157411959550250027ee2d3d2b` and replaces the demo audience source with the frozen D31 artifacts.

The deployment pins Cheerio 1.0.0 so the upstream URL parser remains compatible with Ubuntu 24.04's Node.js 18 runtime. The service should move to a supported Node.js LTS before public launch.

## Runtime data contract

- `PERSONA_MATCHES_FILE` points to a `top_matches.json` produced after all 1,500 Personas were evaluated by the small LLM using the final four-factor score contract. The payload must declare `schema_version=product-persona-evaluation-v2`, `evaluated_persona_count=1500`, and contain at least 15 eligible rows.
- `PERSONA_CARDS_FILE` points to `persona_cards.jsonl`, used to join the selected Persona IDs to their original review excerpts.
- Only records that are `qualified`, pass Product–Job Bridge, and have no unsupported claims are eligible; the adapter recomputes and sorts Final Score before taking 15.
- Online product matching is not performed with embeddings. This deployed proof uses the already completed 1,500-pair Amazon Smart Plug run.
- Story Hook is neither returned by the API nor rendered by the client.

The UI shows Final Score, Beer–Diaper Index, Product–Job Bridge and LLM-estimated Market Opportunity. Story Hook participates in Final Score but its individual value is never returned to the client. Evidence Support and Expected Uplift are not seller-facing dimensions. Frozen evidence fields remain available for offline provenance/QA and do not require online comment-embedding retrieval.

```text
Final Score = 100
× (Product–Job Bridge / 100)^0.30
× (Beer–Diaper / 100)^0.30
× (Market Opportunity / 100)^0.20
× (Story Hook / 100)^0.20
```

## VM layout

```text
/srv/shopee-persona-engine/
  app/releases/<release>/
  app/current -> releases/<release>
  app/shared-data/                 # mutable seven-day demo projects/images
  app-data/releases/<release>/
  app-data/current -> releases/<release>
```

The systemd service binds to `127.0.0.1:3001`. Nginx exposes it on port 80 at `http://165.22.106.67/`; port 3001 remains private. There is no domain or certificate, so HTTPS is intentionally not claimed.

## Known gap

The integration is a product-specific result adapter for the final contract. The existing Amazon Smart Plug v1 output is a historical artifact and lacks the required Story Hook dimension, so it cannot be truthfully recomputed into the final score. A new compatible evaluation/reconsolidation output is required before the aligned adapter can be deployed. A new Shopee listing still needs the full-universe batch runner to evaluate all 1,500 Personas and atomically publish a new `top_matches.json`; this app must not introduce an embedding or comment-retrieval shortcut.

To prevent cross-product leakage, artifact mode rejects creation of non-demo products instead of reusing the Amazon Smart Plug results.

The upstream repository currently has no visible `LICENSE` file. Confirm redistribution/deployment authority before exposing it outside the team.
