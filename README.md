# Token Radar

[![token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/deriharyanto1/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/deriharyanto1/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01)

A radar for token launches, built for [make.fun/bounty/token-radar-01](https://make.fun/bounty/token-radar-01).

The entry reads a sealed snapshot of 758 DefiLlama protocols (snapshot 2026-11-14), ranks every
pre-token protocol on the watchlist — plus the strongest pre-token protocols below the $50M floor —
by an implied value, and gives each one a concrete farm plan.

## The model (radar-3)

Implied value is a comparables valuation: it starts from what the market already pays for the
same kind of protocol, then adjusts that multiple for the protocol's own record. The multiples
are computed from the sealed snapshot at run time — the median market-cap-to-TVL ratio of the
live-token protocols in the same category (at least 3 of them, each with TVL of $10M or more),
else the global median across all 114 such protocols. No protocol name is ever special-cased,
and no multiple is written into the code.

```
implied = round( min( tvl_usd x category_multiple
                    x (1 + clamp(change_7d, -50, 150) / 100 x 0.6)
                    x (0.55 + 0.65 x (1 - exp(-age_days / 730)))
                    x (1 + min(chains - 1, 4) x 0.04), 100,000,000,000 ) )
```

- **Comparables:** the base multiple is the market's own valuation for the category — Dexs
  trade near 0.34x TVL, Lending near 0.13x, Privacy near 0.97x. A median, not a mean, so one
  outlier token cannot carry a row; fewer than 3 comparables in a category, and the row uses
  the global median (0.1315).
- **Growth:** seven-day growth is clamped hard, so a one-week spike cannot carry a row; beyond
  the bounds the factor stops moving.
- **Maturity:** age is saturating, not linear — the value of having run longer with no token
  rises steeply in the first year and then plateaus. An unknown age reads as 300 days.
- **Separation:** protocols whose token already trades are set aside in a Live token view with
  their market caps, never ranked as launches. The early radar below the floor passes the same
  product rule as the watchlist itself (no bridges, liquid staking, restaking, CEX, versioned
  pools or wrapped/staked products).

## The board

- 178 rows: all 40 watchlist protocols plus 138 pre-token protocols below the floor, ranked
  1..178 by implied value, each with a six-step farm plan (what to do, what it costs, how long
  it takes).
- The dashboard is a static page with no network: a sortable, filterable board (search, category,
  chain, pre-token / live-token tabs), a top-5 spotlight, a detail panel for every protocol with
  the model's own inputs and its farm plan, and the formula in plain words.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

`main.ts` (Node 22, standard library only) writes `board.json`, `data.js`, copies `dashboard/`
and `screenshots/` to the output directory, and writes `dossier.json` with the vendored
`vendor/makefun-board.ts` library. Both runs write the same bytes.
