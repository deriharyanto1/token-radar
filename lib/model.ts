// The token radar's model (radar-3): one snapshot of the protocol universe in, one ranked board out.
//
// The board covers every slug in the snapshot's watchlist (the floor, never a ceiling) and adds the
// pre-token protocols below the floor that pass the watchlist's own product rule: the early rows the
// radar exists to find. A protocol is pre-token when its record carries no token (no market cap, no
// CoinGecko id, no symbol); the snapshot's live-token protocols are kept apart and shown with the
// market's own values, never mixed into the ranked board.
//
// Implied value is a comparables valuation: it starts from what the market already pays for the
// same kind of protocol, then adjusts that multiple for the protocol's own record. The formula is:
//
//   multiple   = median(mcap_usd / tvl_usd) over the live-token protocols in the same category
//                (at least 3 of them, each with tvl_usd >= $10,000,000), else the global median
//                over all such live-token protocols
//   growth     = clamp(change_7d, -50, 150) per cent
//   growthMult    = 1 + (growth / 100) x 0.6
//   maturity     = 0.55 + 0.65 x (1 - exp(-age_days / 730))        (age_days unknown: 300)
//   chainFactor  = 1 + min(chains.length - 1, 4) x 0.04
//   implied      = max(1, round(min(tvl_usd x multiple x growthMult x maturity x chainFactor,
//                100,000,000,000)))
//
// Why these shapes, in plain words. A token's value is best anchored to what the market pays for
// comparable tokens, so the base multiple is the median market-cap-to-TVL ratio of the live-token
// protocols in the same category — the market's own valuation for that kind of protocol, computed
// from the sealed snapshot at run time, never a number written into the code. A median, not a mean,
// because one outlier token (a tiny TVL with a huge market cap, or the reverse) would drag a mean
// anywhere; the median is the middle protocol of the category, and it takes at least three of them
// for a category multiple to be trusted — fewer than that, and the row falls back to the global
// median across all live-token protocols, which is the honest answer when a category has no
// comparable history of its own. Seven-day growth is clamped hard, because a single week's spike
// (one protocol in this snapshot grew 4,448% in seven days) is a data artefact, not a trend; the
// clamp is what makes the growth response concave — beyond the bounds the factor stops moving, so
// an extreme week cannot carry a row. Age is saturating, not linear: the value of having run
// longer with no token rises steeply in the first year and then plateaus, because a protocol that
// survived four years without a token is proven, and a fifth year adds little over the fourth; an
// unknown listing date is read as 300 days, not as zero. Chain diversity matters because a
// protocol live on more chains reaches more users and a larger addressable base for its token:
// each extra chain (up to four) adds 4%, capped at 1.16 for five or more chains, and a protocol
// with no chain listed reads as one chain. The factor follows only from the snapshot's own
// `chains` field, never from a name list.
// No protocol name is ever special-cased: the same function scores every row, and the multiples
// it uses are recomputed from the snapshot every run.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  comparable_min_count: number;
  comparable_tvl_floor_usd: number;
  implied_value_cap_usd: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_half_life_days: number;
  unknown_age_days: number;
  chain_step: number;
  chain_cap: number;
}

export const MODEL: ModelConstants = {
  comparable_min_count: 3,
  comparable_tvl_floor_usd: 10_000_000,
  implied_value_cap_usd: 100_000_000_000,
  growth_weight: 0.6,
  growth_floor: -50,
  growth_cap: 150,
  maturity_floor: 0.55,
  maturity_range: 0.65,
  maturity_half_life_days: 730,
  unknown_age_days: 300,
  chain_step: 0.04,
  chain_cap: 4,
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-3';

/** How many pre-token protocols below the watchlist floor the early radar carries, by implied value. */
export const EARLY_ROWS = 160;

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    category_multiple: number;
    comparables_count: number;
    comparables_source: 'category' | 'global';
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    chain_multiplier: number;
    chain_count: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with the farm plan generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  category_multiple: number;
  comparables_count: number;
  comparables_source: 'category' | 'global';
  growth_multiplier: number;
  maturity_multiplier: number;
  chain_multiplier: number;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** The comparables summary the dashboard shows: the global median and each category's multiple. */
export interface ComparablesSummary {
  global_multiple: number;
  global_count: number;
  categories: CategoryMultiple[];
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  comparables: ComparablesSummary;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/**
 * The chain-diversity factor: each extra chain a protocol is live on adds `chain_step` to its
 * implied value, up to `chain_cap` extra chains, because more chains means a wider reach and a
 * larger addressable user base for a launch. A protocol with no chain listed reads as one chain.
 */
export function chainMultiplier(chains: string[], model: ModelConstants): number {
  return 1 + Math.min(Math.max(chains.length - 1, 0), model.chain_cap) * model.chain_step;
}

/** One category's comparable multiple: the median market-cap-to-TVL ratio of its live tokens. */
export interface CategoryMultiple {
  category: string;
  multiple: number;
  count: number;
}

/** The comparables the model values against: a median multiple per category, plus the global fallback. */
export interface Comparables {
  byCategory: Map<string, CategoryMultiple>;
  globalMultiple: number;
  globalCount: number;
}

/** The median of a list of numbers: the middle value, or the mean of the two middles. */
export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/**
 * The comparables, computed from the snapshot at run time: for every category with at least
 * `model.comparable_min_count` live-token protocols at or above `model.comparable_tvl_floor_usd`,
 * the median of their market-cap-to-TVL ratios; and the global median over all such protocols as
 * the fallback for categories with too few comparables (and for protocols with no category). The
 * multiples are the market's own valuations, recomputed every run, never numbers written here.
 */
export function computeComparables(snapshot: Snapshot, model: ModelConstants): Comparables {
  const live = snapshot.protocols.filter(
    (p) => p.mcap_usd !== null && p.tvl_usd >= model.comparable_tvl_floor_usd,
  );
  const byCategory = new Map<string, CategoryMultiple>();
  const groups = new Map<string, number[]>();
  for (const p of live) {
    if (p.category === null) continue;
    const list = groups.get(p.category) ?? [];
    list.push(p.mcap_usd! / p.tvl_usd);
    groups.set(p.category, list);
  }
  for (const [category, ratios] of groups) {
    if (ratios.length >= model.comparable_min_count) {
      byCategory.set(category, { category, multiple: median(ratios), count: ratios.length });
    }
  }
  const globalMultiple = median(live.map((p) => p.mcap_usd! / p.tvl_usd));
  return { byCategory, globalMultiple, globalCount: live.length };
}

/** The multiple one protocol is valued at: its category's median, or the global median. */
export function comparablesFor(
  protocol: SnapshotProtocol,
  comparables: Comparables,
): { multiple: number; count: number; source: 'category' | 'global' } {
  const entry = protocol.category !== null ? comparables.byCategory.get(protocol.category) : undefined;
  if (entry !== undefined) return { multiple: entry.multiple, count: entry.count, source: 'category' };
  return { multiple: comparables.globalMultiple, count: 0, source: 'global' };
}

/** The multipliers and the implied value one protocol gets under `model` and `comparables`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
  comparables: Comparables,
): { implied: number; categoryMultiple: number; comparablesCount: number; comparablesSource: 'category' | 'global'; growthPct: number; growthMult: number; maturityMult: number; chainMult: number; chainCount: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult =
    model.maturity_floor +
    model.maturity_range * (1 - Math.exp(-Math.max(ageForModel, 0) / model.maturity_half_life_days));
  const chainMult = chainMultiplier(protocol.chains, model);
  const comp = comparablesFor(protocol, comparables);
  const raw = protocol.tvl_usd * comp.multiple * growthMult * maturityMult * chainMult;
  const implied = Math.max(1, Math.round(Math.min(raw, model.implied_value_cap_usd)));
  return { implied, categoryMultiple: comp.multiple, comparablesCount: comp.count, comparablesSource: comp.source, growthPct, growthMult, maturityMult, chainMult, chainCount: protocol.chains.length, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** A whole word wrapped, staked or staking in a name: a product of a token that already trades. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;

/**
 * Categories whose products are not launches of their own: bridges move another chain's assets, liquid
 * staking and restaking wrap a staking token that already trades, and a CEX is an exchange, not a
 * protocol waiting on a token. These are the watchlist's own exclusions, applied below the floor too.
 */
const PRODUCT_CATEGORIES = new Set([
  'Bridge',
  'Canonical Bridge',
  'Liquid Staking',
  'Liquid Restaking',
  'Restaked BTC',
  'CEX',
]);

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Whether a protocol is one the board may rank: pre-token, and not a wrapped, staked or bridged
 * product of a token that already trades. The rule reads only the snapshot's own fields (category and
 * name), never a list of slugs.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  return (
    isPreToken(p) &&
    p.category !== null &&
    !PRODUCT_CATEGORIES.has(p.category) &&
    !VERSIONED.test(p.name) &&
    !WRAPPED_WORD.test(p.name)
  );
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const comparables = computeComparables(snapshot, model);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries (it cannot, but the
  // board's coverage is the gate's row and is never gambled on a missing record). A watchlist protocol
  // is ranked whatever its category, because the house's own rule already vetted it.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: pre-token protocols below the watchlist floor that pass the product rule, scored
  // by the same model and taken strongest first. Never a replacement for a watchlist row: a chosen
  // protocol stays chosen.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd)
    .map((p) => ({ p, value: impliedValue(p, snapshot.as_of, model, comparables).implied }))
    .sort((a, b) => b.value - a.value || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0))
    .slice(0, EARLY_ROWS);
  for (const e of early) chosen.set(e.p.slug, e.p);

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, model, comparables);
    return { p, ...v };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      category_multiple: s.categoryMultiple,
      comparables_count: s.comparablesCount,
      comparables_source: s.comparablesSource,
      growth_pct: s.growthPct,
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      chain_multiplier: round4(s.chainMult),
      chain_count: s.chainCount,
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 1_000_000_000) return 200;
  if (p.tvl_usd >= 100_000_000) return 120;
  return 60;
}

/** How long to hold, from the protocol's age: younger protocols need a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 60;
  if (age < 180) return 90;
  if (age < 365) return 60;
  return 45;
}

/** The category's core action, in words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) {
    return `Lend $${capital} of USDC on ${name} (${chain}) and leave the supply open so it earns yield.`;
  }
  if (c.includes('dex') || c.includes('amm') || c.includes('swap')) {
    return `Add $${capital} of liquidity to ${name}'s deepest pool on ${chain} and keep the LP tokens.`;
  }
  if (c.includes('yield aggregator') || c.includes('yield') || c.includes('vault')) {
    return `Deposit $${capital} of USDC into a ${name} vault on ${chain} and hold the vault shares.`;
  }
  if (c.includes('basis')) {
    return `Deposit $${capital} of USDC into ${name}'s basis vault on ${chain} and hold the position.`;
  }
  if (c.includes('bridge')) {
    return `Bridge $${capital} of USDC onto ${chain} through ${name}, then use the bridged funds in its app.`;
  }
  if (c.includes('staking') || c.includes('restak')) {
    return `Stake $${capital} of the chain's native asset through ${name} on ${chain} and keep the receipt token.`;
  }
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('options')) {
    return `Post $${capital} of USDC as margin on ${name} (${chain}) and open one small hedged position.`;
  }
  if (c.includes('prediction')) {
    return `Fund ${name} with $${capital} and take one position in a live market on ${chain}.`;
  }
  if (c.includes('curator') || c.includes('allocator') || c.includes('risk')) {
    return `Allocate $${capital} to a ${name} vault on ${chain} and keep the allocation for the full term.`;
  }
  if (c.includes('stable')) {
    return `Mint or hold $${capital} of the stable asset through ${name} on ${chain}.`;
  }
  if (c.includes('rwa')) {
    return `Buy $${capital} of ${name}'s tokenised yield asset on ${chain} and hold it.`;
  }
  if (c.includes('insurance')) {
    return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy active.`;
  }
  if (c.includes('launchpad') || c.includes('launch')) {
    return `Stake $${capital} in ${name}'s launch pool on ${chain} and join one token sale.`;
  }
  if (c.includes('liquidity manager')) {
    return `Deposit $${capital} into a ${name} managed range on ${chain} and let it rebalance.`;
  }
  if (c.includes('leveraged farm') || c.includes('farm')) {
    return `Open a $${capital} leveraged position on ${name} (${chain}) at low leverage and keep it open.`;
  }
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** The category's weekly action: one small on-chain touch that keeps the position counted. */
function weeklyFor(p: SnapshotProtocol): string {
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) {
    return `Top up or repay a small amount, or vote in one governance poll.`;
  }
  if (c.includes('dex') || c.includes('amm') || c.includes('swap')) {
    return `Swap a small amount through the pool or add a little more liquidity.`;
  }
  if (c.includes('yield') || c.includes('vault') || c.includes('curator') || c.includes('allocator')) {
    return `Claim or compound the vault's rewards once.`;
  }
  if (c.includes('staking') || c.includes('restak')) {
    return `Restake the rewards or add a small amount to the stake.`;
  }
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('options')) {
    return `Open or close one small hedge.`;
  }
  if (c.includes('prediction')) {
    return `Take one small position in a new market.`;
  }
  if (c.includes('bridge')) {
    return `Bridge a small amount and use it in the destination app.`;
  }
  return `Do one on-chain action: a deposit, a swap, a vote or a borrow.`;
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time. The plan is derived from
 * the protocol's own record (category, chains, TVL, age), never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  const weekly = weeklyFor(p);
  return [
    {
      text: `Set up a fresh wallet for this farm only, fund it with $${capital + 10} of USDC on ${chain}, and store the seed phrase offline.`,
      cost: 'about $2 of gas for the funding transfer',
      time: '10 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and about $${capital >= 200 ? 8 : 5} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: `Once a week, ${weekly.charAt(0).toLowerCase()}${weekly.slice(1)}`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Keep the position open for at least ${hold} days, so it is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before withdrawing, check the protocol's own points or rewards page, and claim only from a link the protocol itself publishes.`,
      cost: 'free to check, and never pay anyone to claim',
      time: '10 minutes',
    },
    {
      text: `Log the wallet, the dates and every transaction hash, then plan the exit: unwind in two steps so a failed withdrawal is easy to retry.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    category_multiple: row.model.category_multiple,
    comparables_count: row.model.comparables_count,
    comparables_source: row.model.comparables_source,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    chain_multiplier: row.model.chain_multiplier,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const comparables = computeComparables(snapshot, model);
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    comparables: {
      global_multiple: round4(comparables.globalMultiple),
      global_count: comparables.globalCount,
      categories: [...comparables.byCategory.values()]
        .sort((a, b) => b.count - a.count || (a.category < b.category ? -1 : a.category > b.category ? 1 : 0))
        .map((c) => ({ category: c.category, multiple: round4(c.multiple), count: c.count })),
    },
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
