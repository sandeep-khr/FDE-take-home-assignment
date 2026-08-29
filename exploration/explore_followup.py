#!/usr/bin/env python3
"""Follow-up exploration: strict duplicate pairs, planted-row inspection,
furnishing census, and a corrected median walk under candidate thresholds."""
from __future__ import annotations

import statistics
from collections import Counter, defaultdict
from itertools import combinations

from explore_listings import SNAPSHOT, fmt_row, load_rows, med, section, society_family


def furnishing_norm(s: str) -> str:
    return s.lower().replace("-", " ").strip()


def strict_pair(a, b) -> bool:
    """Clone rule: same-looking unit cross-posted. Tight on purpose."""
    if a["bhk_i"] != b["bhk_i"]:
        return False
    area_ok = a["area_i"] and b["area_i"] and abs(a["area_i"] - b["area_i"]) <= 25
    dep_ok = a["deposit_i"] and b["deposit_i"] and a["deposit_i"] == b["deposit_i"]
    rent_ok = abs(a["rent_i"] - b["rent_i"]) / max(a["rent_i"], b["rent_i"]) <= 0.02
    dates_ok = abs((a["posted"] - b["posted"]).days) <= 3 and abs((a["last_seen"] - b["last_seen"]).days) <= 3
    return dates_ok and ((area_ok and (dep_ok or rent_ok)) or (dep_ok and rent_ok))


def main():
    rows = load_rows()
    by_id = {r["listing_id"]: r for r in rows}

    section("A. FURNISHING STRING CENSUS")
    print("  ", dict(Counter(r["furnishing"] for r in rows)))

    section("B. THE PLANTED BLOCK — CP-0069..CP-0086 IN FULL")
    for r in rows:
        if int(r["listing_id"].split("-")[1]) >= 69:
            print("  ", fmt_row(r))

    section("C. STRICT DUPLICATE (CLONE) PAIRS + WHICH NAMES THEY BRIDGE")
    pairs = [(a, b) for a, b in combinations(rows, 2) if strict_pair(a, b)]
    bridges = set()
    dup_extra = set()
    for a, b in pairs:
        fa, fb = society_family(a["society"]), society_family(b["society"])
        tag = "" if fa == fb else "  << BRIDGES NAMES"
        if fa != fb:
            bridges.add(tuple(sorted((fa, fb))))
        print(f"   {a['listing_id']} ({a['society']}) ≡ {b['listing_id']} ({b['society']})"
              f"  rents ₹{a['rent_i']:,}/₹{b['rent_i']:,}{tag}")
        # mark the non-preferred copy as the duplicate
        pref = sorted([a, b], key=lambda r: (r["poster_type"] != "owner", -r["last_seen"].toordinal(), r["listing_id"]))[0]
        dup_extra.add((a if pref is b else b)["listing_id"])
    print(f"   -> {len(pairs)} clone pairs; name bridges: {sorted(bridges)}")

    # Lakeview merged family, evidence-bridged
    def lakeview(r):
        return society_family(r["society"]).replace(" phase1", "") == "lakeviewres"

    hard_exclusions = {
        "CP-0082": "impossible rent ₹12,000 (₹10.9/sf) — data error or bait",
        "CP-0083": "₹185,000 (₹157/sf) — error or non-comparable luxury outlier",
        "CP-0085": "1BHK at 2,100 sf — attribute mislabel; also dark 106d",
        "CP-0081": "matches subject deal (1,175sf, ₹2.8L dep) with wrong BHK — circular",
    }
    section("D. HARD-EXCLUSION CANDIDATES (for ratification)")
    for lid, why in hard_exclusions.items():
        print(f"   {lid}: {why}")
        print("    ", fmt_row(by_id[lid]))

    section("E. CORRECTED MEDIAN WALK (strict dedup, candidate thresholds)")

    def walk(stale_cutoff):
        pool = [r for r in rows if r["bhk_i"] == 2]
        steps = [("2BHK only", list(pool))]
        pool = [r for r in pool if r["listing_id"] not in hard_exclusions]
        steps.append(("minus hard exclusions", list(pool)))
        pool = [r for r in pool if r["days_dark"] <= stale_cutoff]
        steps.append((f"seen within {stale_cutoff}d of snapshot", list(pool)))
        pool = [r for r in pool if r["listing_id"] not in dup_extra]
        steps.append(("strict dedup (drop clone copies)", list(pool)))
        lv = [r for r in pool if lakeview(r)]
        steps.append(("Lakeview family (bridged names)", lv))
        lv_semi = [r for r in lv if furnishing_norm(r["furnishing"]) == "semi furnished"]
        steps.append(("… semi-furnished = TIER 1", lv_semi))
        mm_semi = [r for r in pool if furnishing_norm(r["furnishing"]) == "semi furnished"]
        steps.append(("micromarket semi-furnished (all societies) = TIER 2 pool", mm_semi))
        print(f"\n   --- staleness cutoff {stale_cutoff} days ---")
        for label, p in steps:
            rents = sorted(r["rent_i"] for r in p)
            if rents:
                print(f"   {label:<44} N={len(p):>3}  median ₹{med(rents):>8,.0f}  "
                      f"range ₹{min(rents):,}–₹{max(rents):,}")
        return lv_semi, mm_semi

    for cutoff in (14, 21, 30):
        lv_semi, mm_semi = walk(cutoff)

    section("F. TIER-1 SET AT CUTOFF 21 — ROWS + LEAVE-ONE-OUT")
    lv_semi, mm_semi = walk(21)
    rents = sorted(r["rent_i"] for r in lv_semi)
    base = med(rents)
    for r in sorted(lv_semi, key=lambda r: r["rent_i"]):
        loo = [x["rent_i"] for x in lv_semi if x is not r]
        print(f"   drop→median ₹{med(loo):>8,.0f}  ", fmt_row(r))
    swings = [abs(med([x for j, x in enumerate(rents) if j != i]) - base) for i in range(len(rents))]
    print(f"   base median ₹{base:,.0f}; max LOO swing ₹{max(swings):,.0f}")
    print(f"   aspirational watch (live window >60d & still listed): "
          f"{[r['listing_id'] for r in lv_semi if r['live_window'] > 60 and r['days_dark'] <= 7]}")

    section("G. FAILURE-CASE SEGMENT — LAKEVIEW FULLY FURNISHED AFTER CLEANING (cutoff 21)")
    ff = [r for r in rows if lakeview(r) and r["bhk_i"] == 2
          and furnishing_norm(r["furnishing"]) == "fully furnished"
          and r["listing_id"] not in hard_exclusions]
    for r in ff:
        status = []
        if r["days_dark"] > 21:
            status.append("STALE")
        if r["listing_id"] in dup_extra:
            status.append("CLONE COPY")
        print(f"   [{', '.join(status) or 'survives'}] ", fmt_row(r))
    surv = [r for r in ff if r["days_dark"] <= 21 and r["listing_id"] not in dup_extra]
    print(f"   -> survivors: {len(surv)}; rents {sorted(r['rent_i'] for r in surv)}")

    section("H. GRAY-ZONE ROWS (dark 15–30d) — grade B vs exclude?")
    for r in rows:
        if 15 <= r["days_dark"] <= 30 and r["bhk_i"] == 2:
            print("   ", fmt_row(r))


if __name__ == "__main__":
    main()
