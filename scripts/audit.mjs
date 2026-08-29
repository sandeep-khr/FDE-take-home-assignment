#!/usr/bin/env node
/**
 * Human-readable audit of the full pipeline result, for verification against
 * data/listings.csv by hand. Reads the golden run — after changing code or
 * config, refresh it first:  npm test && npm run golden && npm run audit
 */
import { readFileSync } from 'node:fs';

const g = JSON.parse(
  readFileSync(new URL('../pipeline/test/fixtures/golden-run.json', import.meta.url), 'utf8'),
);
const inr = n => '₹' + n.toLocaleString('en-IN');
const line = c => console.log(c ?? '');
const head = t => line(`\n${'='.repeat(74)}\n${t}\n${'='.repeat(74)}`);

head('CONFIG (every tunable — pipeline/src/types.ts DEFAULT_CONFIG)');
const { subject, ladder, bhkAreaBoundsSf, ...rest } = g.config;
for (const [k, v] of Object.entries(rest)) line(`  ${k} = ${JSON.stringify(v)}`);
line(`  bhkAreaBoundsSf = ${JSON.stringify(bhkAreaBoundsSf)}`);
line(`  ladder = ${JSON.stringify(ladder)}`);
line(`  subject = ${JSON.stringify(subject)}`);

head('FUNNEL');
const two = g.listings.filter(l => l.bhk === 2);
const has = (id, code) => g.trust[id].reasons.some(r => r.code === code);
const quarantined = id => g.trust[id].reasons.some(r => r.effect === 'quarantine');
const afterQ = two.filter(l => !quarantined(l.listingId));
const alive = afterQ.filter(l => !has(l.listingId, 'stale-dead'));
const units = alive.filter(l => !has(l.listingId, 'duplicate-copy'));
line(`  raw ${g.listings.length} → 2BHK ${two.length} → credible ${afterQ.length} → alive ${alive.length} → units ${units.length}`);

head('EVERY LISTING — grade · weight · reasons  (verify any row against data/listings.csv)');
for (const l of g.listings) {
  const t = g.trust[l.listingId];
  const codes = t.reasons.map(r => r.code).join(', ') || 'clean';
  line(
    `  ${l.listingId}  ${t.grade}  w=${String(t.weight).padEnd(4)} ${inr(l.rent).padStart(10)}  ` +
      `${l.society} · ${l.bhk}BHK ${l.furnishingNorm} · dark ${l.daysDark}d win ${l.liveWindowDays}d  [${codes}]`,
  );
}

head('DUPLICATE CLUSTERS (physical units) — ● kept representative');
for (const c of g.unitClusters) {
  line(`  ${c.id}: rent ${inr(c.rentMin)}–${inr(c.rentMax)} · names: ${c.nameKeys.join(' / ')}`);
  for (const id of c.memberIds) line(`     ${id === c.representativeId ? '●' : '○'} ${id}`);
}

head('CROSS-FAMILY SUSPECTS (never auto-merged — human decides)');
for (const s of g.suspects) line(`  ${s.aId} ~ ${s.bId}  evidence: ${s.evidence.join('; ')}`);

head('ALIAS DECISIONS + STRING SUGGESTIONS');
for (const a of g.aliases)
  line(`  [${a.status}] ${a.stem}: ${a.nameKeys.join(' + ')} — ${a.independentBridges} bridge(s)`);
for (const s of g.aliasSuggestions) line(`  [suggestion only] ${s.a} ↔ ${s.b} (${s.heuristic})`);

head('SEGMENTS — contributing rows are the estimate; verify medians by hand');
for (const s of g.segments) {
  const rows = s.contributingIds
    .map(id => ({ id, rent: g.listings.find(l => l.listingId === id).rent, w: g.trust[id].weight }))
    .sort((a, b) => a.rent - b.rent);
  const effN = rows.reduce((x, r) => x + r.w, 0);
  line(`\n  ${s.segmentId} — ${s.label}`);
  line(`    n=${s.n} effN=${effN} sources=${s.distinctSources} medianAge=${s.medianAgeDays}d`);
  line(`    weightedMedian=${s.weightedMedian ? inr(s.weightedMedian) : '—'} unweighted=${s.unweightedMedian ? inr(s.unweightedMedian) : '—'} range=${s.range ? `${inr(s.range[0])}–${inr(s.range[1])}` : '—'} LOO=${s.looSwing ?? '—'} → ${s.confidence.toUpperCase()}`);
  if (rows.length) line(`    rows: ${rows.map(r => `${r.id} ${inr(r.rent)}×${r.w}`).join(' · ')}`);
  for (const c of s.collectNext) line(`    collect → ${c}`);
}

head('VERDICT');
for (const r of g.verdict.readings)
  line(`  ${r.assumption}: ${inr(r.comparedAsk)} vs benchmark → ${(r.deviationPct * 100).toFixed(1)}% ${r.direction}`);
for (const a of g.verdict.asterisks) line(`  * ${a}`);
line();
