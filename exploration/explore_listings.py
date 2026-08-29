#!/usr/bin/env python3
"""Day-1 exploration of case-packet/listings.csv.

Read-only reconnaissance: census every field, surface the planted traps, and
preview how the median moves under candidate cleaning rules, so thresholds can
be chosen from evidence. Stdlib only, deterministic.
"""
from __future__ import annotations

import csv
import re
import statistics
from collections import Counter, defaultdict
from datetime import date
from itertools import combinations
from pathlib import Path

SNAPSHOT = date(2026, 8, 18)
CSV_PATH = Path(__file__).resolve().parents[2] / "case-packet" / "listings.csv"


def parse_date(s: str) -> date:
    y, m, d = s.split("-")
    return date(int(y), int(m), int(d))


def load_rows():
    with open(CSV_PATH, newline="") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        r["posted"] = parse_date(r["posted_date"])
        r["last_seen"] = parse_date(r["last_seen_date"])
        r["rent_i"] = int(r["rent"])
        r["bhk_i"] = int(r["bhk"])
        r["area_i"] = int(r["area_sqft"]) if r["area_sqft"].strip() else None
        r["deposit_i"] = int(r["deposit"]) if r["deposit"].strip() else None
        r["photos_i"] = int(r["photo_count"])
        r["days_dark"] = (SNAPSHOT - r["last_seen"]).days
        r["live_window"] = (r["last_seen"] - r["posted"]).days
        r["age_posted"] = (SNAPSHOT - r["posted"]).days
    return rows


def society_family(name: str) -> str:
    """Collapse spelling variants into a family key (phase kept separate)."""
    s = re.sub(r"[^a-z0-9 ]", "", name.lower())
    s = re.sub(r"\bres(idences|idency|idence)?\b", "res", s)
    s = re.sub(r"\s+", " ", s).strip()
    phase = ""
    m = re.search(r"\bphase\s*(\d+)\b", s)
    if m:
        phase = f" phase{m.group(1)}"
        s = re.sub(r"\bphase\s*\d+\b", "", s)
    return re.sub(r"\s+", "", s) + phase


def fmt_row(r) -> str:
    return (
        f"{r['listing_id']} {r['source']:<12} {r['society']:<28} {r['locality']:<22} "
        f"{r['bhk']}BHK {r['furnishing']:<15} {str(r['area_i'] or '—'):>5}sf "
        f"₹{r['rent_i']:>6,} dep={str(r['deposit_i'] or '—'):>7} "
        f"ph={r['photos_i']:>2} {r['poster_type']:<7} "
        f"live {r['posted_date']}→{r['last_seen_date']} (dark {r['days_dark']}d, win {r['live_window']}d)"
    )


def med(values):
    return statistics.median(values) if values else None


def section(title):
    print(f"\n{'=' * 78}\n{title}\n{'=' * 78}")


def main():
    rows = load_rows()
    print(f"Loaded {len(rows)} rows. Snapshot date {SNAPSHOT}.")

    # ---------------------------------------------------------------- censuses
    section("1. SOCIETY / LOCALITY SPELLING CENSUS")
    for name, n in Counter(r["society"] for r in rows).most_common():
        print(f"  {n:>3}  {name}   -> family: {society_family(name)}")
    print("  --- localities ---")
    for name, n in Counter(r["locality"] for r in rows).most_common():
        print(f"  {n:>3}  {name}")

    section("2. SEGMENT CENSUS (family x BHK x furnishing)")
    seg = Counter((society_family(r["society"]), r["bhk_i"], r["furnishing"]) for r in rows)
    for (fam, bhk, furn), n in sorted(seg.items(), key=lambda kv: -kv[1]):
        rents = [r["rent_i"] for r in rows
                 if society_family(r["society"]) == fam and r["bhk_i"] == bhk and r["furnishing"] == furn]
        print(f"  {n:>3}  {fam:<24} {bhk}BHK {furn:<16} median ₹{med(rents):>8,.0f}  "
              f"range ₹{min(rents):,}–₹{max(rents):,}")

    print("  --- source / poster / photos ---")
    print("   sources:", dict(Counter(r["source"] for r in rows)))
    print("   posters:", dict(Counter(r["poster_type"] for r in rows)))
    print("   photo_count:", dict(sorted(Counter(r["photos_i"] for r in rows).items())))
    blank_area = sum(1 for r in rows if r["area_i"] is None)
    blank_dep = sum(1 for r in rows if r["deposit_i"] is None)
    print(f"   blank area: {blank_area}, blank deposit: {blank_dep}")

    # --------------------------------------------------------------- staleness
    section("3. STALENESS (days since last_seen) AND LIVE WINDOWS")
    buckets = [(0, 3), (4, 7), (8, 14), (15, 30), (31, 60), (61, 999)]
    for lo, hi in buckets:
        n = sum(1 for r in rows if lo <= r["days_dark"] <= hi)
        print(f"  dark {lo:>2}–{hi:<3}d: {n:>3}  {'#' * n}")
    print("  oldest disappearances:")
    for r in sorted(rows, key=lambda r: -r["days_dark"])[:8]:
        print("   ", fmt_row(r))
    print("  longest-lived still-fresh listings (posted long ago, seen recently — sitting unrented?):")
    for r in sorted((r for r in rows if r["days_dark"] <= 7), key=lambda r: -r["age_posted"])[:8]:
        print("   ", fmt_row(r))

    # -------------------------------------------------------------- duplicates
    section("4. DUPLICATE / CROSS-POST CLUSTERS")
    parent = {r["listing_id"]: r["listing_id"] for r in rows}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        parent[find(a)] = find(b)

    def windows_overlap(a, b, slack=5):
        return a["posted"] <= b["last_seen"] and b["posted"] <= a["last_seen"] or \
            abs((a["last_seen"] - b["posted"]).days) <= slack or \
            abs((b["last_seen"] - a["posted"]).days) <= slack

    for a, b in combinations(rows, 2):
        if society_family(a["society"]).replace(" phase1", "") != society_family(b["society"]).replace(" phase1", ""):
            continue
        if a["bhk_i"] != b["bhk_i"]:
            continue
        area_close = (a["area_i"] and b["area_i"] and abs(a["area_i"] - b["area_i"]) <= 30) or \
                     (a["area_i"] is None or b["area_i"] is None)
        rent_close = abs(a["rent_i"] - b["rent_i"]) / max(a["rent_i"], b["rent_i"]) <= 0.06
        if area_close and rent_close and windows_overlap(a, b):
            union(a["listing_id"], b["listing_id"])

    clusters = defaultdict(list)
    for r in rows:
        clusters[find(r["listing_id"])].append(r)
    dup_clusters = {k: v for k, v in clusters.items() if len(v) > 1}
    n_extra = sum(len(v) - 1 for v in dup_clusters.values())
    print(f"  {len(dup_clusters)} clusters covering {sum(len(v) for v in dup_clusters.values())} rows "
          f"({n_extra} probable extra copies)")
    for k, members in sorted(dup_clusters.items(), key=lambda kv: -len(kv[1])):
        rents = [m["rent_i"] for m in members]
        print(f"  cluster ({len(members)} rows, rent spread ₹{min(rents):,}–₹{max(rents):,}):")
        for m in sorted(members, key=lambda m: m["posted"]):
            print("   ", fmt_row(m))

    # --------------------------------------------------------------- mislabels
    section("5. MISLABEL HUNT")
    print("  3BHK rows compared against 2BHK rows (clone with wrong label?):")
    two = [r for r in rows if r["bhk_i"] == 2]
    for r3 in (r for r in rows if r["bhk_i"] == 3):
        print("   3BHK:", fmt_row(r3))
        for r2 in two:
            same_area = r3["area_i"] and r2["area_i"] and abs(r3["area_i"] - r2["area_i"]) <= 30
            same_rent = abs(r3["rent_i"] - r2["rent_i"]) <= 1500
            same_dep = (r3["deposit_i"] or 0) == (r2["deposit_i"] or -1)
            if (same_area and same_rent) or (same_rent and same_dep and r3["deposit_i"]):
                print("     ~ matches 2BHK:", fmt_row(r2))
    print("  BHK vs area sanity (2BHK <650sf or >1500sf; 3BHK <900sf):")
    for r in rows:
        if r["area_i"] and ((r["bhk_i"] == 2 and not 650 <= r["area_i"] <= 1500) or
                            (r["bhk_i"] == 3 and r["area_i"] < 900)):
            print("   ", fmt_row(r))
    print("  furnishing inversions inside lakeview family (unfurnished priced >= fully furnished median):")
    lv = [r for r in rows if society_family(r["society"]).startswith("lakeviewres") and r["bhk_i"] == 2]
    ff_med = med([r["rent_i"] for r in lv if r["furnishing"] == "fully furnished"])
    for r in lv:
        if r["furnishing"] == "unfurnished" and ff_med and r["rent_i"] >= ff_med:
            print("   ", fmt_row(r))

    # ----------------------------------------------------------- price anomalies
    section("6. PRICE ANOMALIES WITHIN SEGMENTS")
    for r in rows:
        fam = society_family(r["society"])
        peers = [p["rent_i"] for p in rows
                 if p is not r and society_family(p["society"]) == fam
                 and p["bhk_i"] == r["bhk_i"] and p["furnishing"] == r["furnishing"]]
        if len(peers) >= 4:
            m = med(peers)
            dev = (r["rent_i"] - m) / m
            if abs(dev) >= 0.12:
                tag = "LOW (bait?)" if dev < 0 else "HIGH (aspirational?)"
                print(f"   {dev:+.0%} vs peer median ₹{m:,.0f}  {tag}")
                print("    ", fmt_row(r))
    print("  rent per sqft extremes (where area present):")
    persf = sorted((r for r in rows if r["area_i"]), key=lambda r: r["rent_i"] / r["area_i"])
    for r in persf[:4] + persf[-4:]:
        print(f"    ₹{r['rent_i'] / r['area_i']:.1f}/sf ", fmt_row(r))

    # ------------------------------------------------------------------ deposits
    section("7. DEPOSIT PATTERNS")
    ratio_bins = Counter()
    exact3 = []
    for r in rows:
        if r["deposit_i"]:
            ratio = r["deposit_i"] / r["rent_i"]
            ratio_bins[round(ratio)] += 1
            if abs(ratio - 3.0) < 0.001:
                exact3.append(r)
    print("   deposit/rent ratio (rounded):", dict(sorted(ratio_bins.items())))
    print(f"   exactly 3.0x rent (template smell): {len(exact3)} rows")
    for r in exact3[:10]:
        print("    ", fmt_row(r))

    # ------------------------------------------------------------- median walk
    section("8. MEDIAN WALK (provisional rules — thresholds to be ratified)")
    steps = []
    pool = rows[:]
    steps.append(("Raw pull, everything", pool))
    pool = [r for r in pool if r["bhk_i"] == 2]
    steps.append(("2BHK only", pool))
    pool = [r for r in pool if r["days_dark"] <= 14]
    steps.append(("… seen in last 14 days", pool))
    reps = []
    seen_cluster = set()
    for r in pool:
        c = find(r["listing_id"])
        if c in seen_cluster:
            continue
        seen_cluster.add(c)
        members = [m for m in clusters[c] if m in pool]
        owners = [m for m in members if m["poster_type"] == "owner"]
        pick = sorted(owners or members, key=lambda m: -m["last_seen"].toordinal())[0]
        reps.append(pick)
    pool = reps
    steps.append(("… one row per duplicate cluster", pool))
    pool = [r for r in pool if society_family(r["society"]).startswith("lakeviewres")]
    steps.append(("… Lakeview family only (any phase)", pool))
    pool_semi = [r for r in pool if r["furnishing"] == "semi-furnished"]
    steps.append(("… semi-furnished (subject config)", pool_semi))
    for label, p in steps:
        rents = [r["rent_i"] for r in p]
        if rents:
            print(f"   {label:<38} N={len(p):>3}  median ₹{med(rents):>8,.0f}  "
                  f"range ₹{min(rents):,}–₹{max(rents):,}")
    print("\n   Tier-1 survivors:")
    for r in sorted(pool_semi, key=lambda r: r["rent_i"]):
        print("    ", fmt_row(r))
    rents = sorted(r["rent_i"] for r in pool_semi)
    if len(rents) >= 3:
        base = med(rents)
        swings = []
        for i in range(len(rents)):
            loo = rents[:i] + rents[i + 1:]
            swings.append(abs(med(loo) - base))
        print(f"   leave-one-out max swing on median: ₹{max(swings):,.0f}")

    # ---------------------------------------------------------- thin segments
    section("9. THIN SEGMENTS (failure-case candidates)")
    for label, pred in [
        ("Lakeview family fully furnished 2BHK", lambda r: society_family(r["society"]).startswith("lakeviewres") and r["bhk_i"] == 2 and r["furnishing"] == "fully furnished"),
        ("Lakeview family unfurnished 2BHK", lambda r: society_family(r["society"]).startswith("lakeviewres") and r["bhk_i"] == 2 and r["furnishing"] == "unfurnished"),
        ("Any 3BHK", lambda r: r["bhk_i"] == 3),
        ("Non-Lakeview societies (all)", lambda r: not society_family(r["society"]).startswith("lakeviewres")),
    ]:
        subset = [r for r in rows if pred(r)]
        fresh = [r for r in subset if r["days_dark"] <= 14]
        print(f"   {label:<42} N={len(subset):>3}  fresh(≤14d dark)={len(fresh)}")


if __name__ == "__main__":
    main()
