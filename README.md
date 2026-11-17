# Token Radar

[![token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/deriharyanto1/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/deriharyanto1/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01)

A radar for token launches, built for [make.fun/bounty/token-radar-01](https://make.fun/bounty/token-radar-01).

The entry reads a sealed snapshot of 758 DefiLlama protocols (snapshot 2026-11-14), ranks every
pre-token protocol on the watchlist — plus the strongest pre-token protocols below the $50M floor —
by an implied value, and gives each one a concrete farm plan.

## The model (radar-2)

Implied value follows only from the snapshot's own figures — a protocol's TVL, its seven-day
growth, and how long it has run with no token. No protocol name is ever special-cased.

```
implied = round( tvl_usd x 0.20
               x clamp((tvl_usd / 1e9) ^ -0.15, 0.5, 2.0)
               x (1 + clamp(change_7d, -50, 150) / 100 x 0.6)
               x (0.55 + min(age_days, 1460) / 1460 x 0.65) )
```

- **Size:** a token is worth a fifth of the value locked in its protocol.
- **Scale:** value grows slower than TVL, so large protocols count less per dollar.
- **Growth:** seven-day growth is clamped hard, so a one-week spike cannot carry a row.
- **Maturity:** age is the time since first listing; an unknown age reads as 300 days.
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
