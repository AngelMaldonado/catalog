#!/usr/bin/env python3
"""Summarises metrics.jsonl: one row per run (median fps across turns, worst p95, jank, memory)."""
import json, statistics, sys
from collections import defaultdict

runs = defaultdict(lambda: {"turns": [], "mem": None, "ready": None})
for line in open(sys.argv[1] if len(sys.argv) > 1 else "metrics.jsonl"):
    line = line.strip()
    if not line:
        continue
    d = json.loads(line)
    r = runs[d["run"]]
    if d["type"] == "turn":
        r["turns"].append(d)
    elif d["type"] == "mem":
        r["mem"] = d["chromePssKB"]
    elif d["type"] == "ready":
        r["ready"] = d["ms"]

print(f"{'run':40} {'n':>2} {'fps med':>7} {'fps min':>7} {'p95 ms':>7} {'jank %':>6} {'ready':>6} {'PSS MB':>7}")
for name, r in runs.items():
    t = r["turns"][1:] if len(r["turns"]) > 2 else r["turns"]  # first turn includes warm-up raster
    if not t:
        continue
    fps = [x["fps"] for x in t]
    print(
        f"{name:40} {len(t):>2} {statistics.median(fps):>7.1f} {min(fps):>7.1f} "
        f"{statistics.median([x['p95ms'] for x in t]):>7.1f} {statistics.median([x['jankPct'] for x in t]):>6.1f} "
        f"{(r['ready'] or 0):>6} {((r['mem'] or 0) / 1024):>7.0f}"
    )
