#!/usr/bin/env node
/**
 * SYNTHETIC data generator — clearly labeled, never part of the case-packet
 * analysis. Produces a listings CSV in the packet's 13-column schema at any
 * size (default 27,000 rows — Flent's real pull), with realistic mess baked
 * in: spelling-variant societies, broker cross-posts, stale rows, bait and
 * aspirational asks, reversed dates and mislabels. Deterministic via seed.
 *
 *   node scripts/synth.mjs [rows] [seed]   → writes synthetic/synthetic-<rows>.csv
 *
 * Every id is prefixed SYN- so synthetic rows can never masquerade as packet
 * evidence.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const mulberry32 = seed => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const SNAPSHOT = Date.UTC(2026, 7, 18) / 86_400_000;
const iso = ord => new Date(ord * 86_400_000).toISOString().slice(0, 10);

const FAMILIES = [
  { names: ['Lakeview Residences', 'Lake View Residency', 'Lakeview Res.', 'Lakeview Residences Phase 1'], base: 50, share: 8 },
  { names: ['Palm Meadows', 'PalmMeadows', 'Palm Meadows Residency'], base: 55, share: 6 },
  { names: ['Cedar Court', 'CedarCourt', 'Cedar Court Apartments'], base: 44, share: 6 },
  { names: ['Silver Oak Enclave', 'SilverOak Enclave'], base: 48, share: 5 },
  { names: ['Golden Palm Towers', 'Golden Palms Tower'], base: 60, share: 5 },
  { names: ['Meadow Brook', 'Meadowbrook Residency'], base: 42, share: 5 },
  { names: ['Riverside Grove', 'River Side Grove'], base: 52, share: 5 },
  { names: ['Sunrise Heights', 'Sun Rise Hts'], base: 46, share: 5 },
];
// remaining share spread over single-spelling societies
for (let s = 0; s < 40; s++) FAMILIES.push({ names: [`Society ${String.fromCharCode(65 + (s % 26))}${s}`], base: 38 + (s % 20), share: 1 });

const LOCALITIES = ['Harlur-Sarjapur Road', 'Haralur', 'Harlur Road', 'Kasavanahalli', 'Sarjapur Road', 'HSR Layout', 'Bellandur'];
const SOURCES = ['CommonFloor', 'Housing', 'NoBroker', 'MagicBricks'];
const FURNISHING = ['semi-furnished', 'semi-furnished', 'fully furnished', 'unfurnished'];

export function generateSyntheticCsv(rows = 27000, seed = 20260818) {
  const rand = mulberry32(seed);
  const pick = arr => arr[Math.floor(rand() * arr.length)];
  const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
  const totalShare = FAMILIES.reduce((s, f) => s + f.share, 0);

  const out = ['listing_id,source,posted_date,last_seen_date,society,locality,bhk,furnishing,area_sqft,rent,deposit,photo_count,poster_type'];
  const record = [];
  let id = 0;
  const push = r => {
    id += 1;
    out.push(
      [`SYN-${String(id).padStart(5, '0')}`, r.source, r.posted, r.seen, r.society, r.locality, r.bhk, r.furn, r.area ?? '', r.rent, r.deposit ?? '', r.photos, r.poster].join(','),
    );
    record.push(r);
  };

  while (id < rows) {
    // weighted family choice
    let roll = rand() * totalShare;
    const fam = FAMILIES.find(f => (roll -= f.share) <= 0) ?? FAMILIES[0];
    const bhk = pick([1, 2, 2, 2, 3]);
    const furn = pick(FURNISHING);
    const area = bhk === 1 ? int(400, 850) : bhk === 2 ? int(700, 1450) : int(950, 2100);
    const psf = fam.base + int(-6, 8) + (furn === 'fully furnished' ? 8 : furn === 'unfurnished' ? -6 : 0);
    let rent = Math.round((area * psf) / 500) * 500;
    const postedOrd = SNAPSHOT - int(1, 150);
    let seenOrd = Math.min(SNAPSHOT - int(0, 12), postedOrd + int(1, 120));
    if (seenOrd < postedOrd) seenOrd = postedOrd + 1;
    const r = {
      source: pick(SOURCES),
      posted: iso(postedOrd),
      seen: iso(seenOrd),
      society: pick(fam.names),
      locality: pick(LOCALITIES),
      bhk,
      furn: rand() < 0.005 ? 'semi furnished' : furn,
      area: rand() < 0.02 ? null : area,
      rent,
      deposit: rand() < 0.2 ? null : rent * pick([2, 3, 3, 4, 5, 6]),
      photos: int(0, 18),
      poster: pick(['owner', 'broker', 'broker', 'unknown']),
    };
    // planted mess, all labeled by construction:
    const mess = rand();
    if (mess < 0.02) r.rent = Math.round(rent * 0.2); // bait / data error
    else if (mess < 0.03) { r.seen = iso(postedOrd - int(2, 6)); } // reversed dates
    else if (mess < 0.045) { r.bhk = bhk === 2 ? 3 : 1; } // mislabel candidate
    push(r);
    // broker cross-posts of the same unit (the duplicate load)
    if (id < rows && rand() < 0.18) {
      const copies = int(1, 3);
      for (let c = 0; c < copies && id < rows; c++) {
        push({
          ...r,
          source: pick(SOURCES),
          society: pick(fam.names),
          rent: rand() < 0.5 ? r.rent : r.rent + 500,
          posted: iso(postedOrd + int(0, 2)),
          seen: iso(seenOrd - int(0, 2) < postedOrd ? seenOrd : seenOrd - int(0, 2)),
          photos: int(0, 18),
          poster: 'broker',
        });
      }
    }
  }
  return out.join('\n');
}

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (invokedDirectly) {
  const rows = Number(process.argv[2] ?? 27000);
  const seed = Number(process.argv[3] ?? 20260818);
  const csv = generateSyntheticCsv(rows, seed);
  mkdirSync(new URL('../synthetic/', import.meta.url), { recursive: true });
  const path = new URL(`../synthetic/synthetic-${rows}.csv`, import.meta.url);
  writeFileSync(path, csv + '\n');
  console.log(`wrote synthetic/synthetic-${rows}.csv (${rows} rows, seed ${seed}) — SYNTHETIC, labeled by SYN- ids`);
}
