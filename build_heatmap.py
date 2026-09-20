#!/usr/bin/env python3
"""Fetch GitHub public contributions and render a self-hosted heatmap.svg.
Zero external requests on the page: this runs at build time, output is a static SVG.
Usage: python3 build_heatmap.py [github_username]   (default: taynotfound)
"""
import sys, re, urllib.request, datetime as dt

USER = sys.argv[1] if len(sys.argv) > 1 else "taynotfound"
# Site palette (warm ink) — NOT github green, matches the portfolio.
PALETTE = ["#241f1d", "#5c3a2e", "#a8503a", "#e2704a", "#ff8f5c"]  # level 0..4
CELL, GAP, R = 11, 3, 2
TOP, LEFT = 20, 30  # room for month + weekday labels

def fetch(user):
    req = urllib.request.Request(
        f"https://github.com/users/{user}/contributions",
        headers={"User-Agent": "Mozilla/5.0 heatmap-build"})
    html = urllib.request.urlopen(req, timeout=20).read().decode("utf-8")
    # each day cell: data-date="YYYY-MM-DD" ... data-level="N"
    days = []
    for m in re.finditer(r'data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d)"', html):
        days.append((m.group(1), int(m.group(2))))
    # some layouts put level before date — try the reverse too if empty
    if not days:
        for m in re.finditer(r'data-level="(\d)"[^>]*data-date="(\d{4}-\d{2}-\d{2})"', html):
            days.append((m.group(2), int(m.group(1))))
    # total contributions from the header text
    tm = re.search(r'([\d,]+)\s+contribution', html)
    total = tm.group(1) if tm else str(sum(1 for _, l in days if l > 0))
    return days, total

def render(days, total, user):
    # group into weeks (columns). GitHub weeks start Sunday.
    days.sort()
    # build columns keyed by ISO week position relative to first date
    first = dt.date.fromisoformat(days[0][0])
    # align first column to the Sunday on/before first date
    start = first - dt.timedelta(days=(first.weekday() + 1) % 7)
    cols = {}
    month_at = {}
    for date_s, lvl in days:
        d = dt.date.fromisoformat(date_s)
        col = (d - start).days // 7
        row = (d.weekday() + 1) % 7  # Sun=0
        cols.setdefault(col, {})[row] = lvl
        if d.day <= 7 and row == 0:
            month_at[col] = d.strftime("%b")
    ncols = max(cols) + 1
    W = LEFT + ncols * (CELL + GAP) + 4
    H = TOP + 7 * (CELL + GAP) + 4
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
           f'viewBox="0 0 {W} {H}" role="img" aria-label="{total} GitHub contributions in the last year">']
    out.append(f'<title>{total} contributions · @{user}</title>')
    out.append(f'<rect width="{W}" height="{H}" fill="none"/>')
    # month labels
    for col, name in sorted(month_at.items()):
        x = LEFT + col * (CELL + GAP)
        out.append(f'<text x="{x}" y="12" fill="#8b7d74" font-size="9" '
                   f'font-family="ui-monospace,monospace">{name}</text>')
    # weekday labels (Mon/Wed/Fri)
    for row, lbl in [(1, "Mon"), (3, "Wed"), (5, "Fri")]:
        y = TOP + row * (CELL + GAP) + CELL - 2
        out.append(f'<text x="0" y="{y}" fill="#8b7d74" font-size="9" '
                   f'font-family="ui-monospace,monospace">{lbl}</text>')
    # cells
    for col in range(ncols):
        for row in range(7):
            lvl = cols.get(col, {}).get(row)
            if lvl is None:
                continue
            x = LEFT + col * (CELL + GAP)
            y = TOP + row * (CELL + GAP)
            out.append(f'<rect x="{x}" y="{y}" width="{CELL}" height="{CELL}" '
                       f'rx="{R}" fill="{PALETTE[lvl]}"/>')
    out.append('</svg>')
    return "\n".join(out)

if __name__ == "__main__":
    days, total = fetch(USER)
    assert days, "no contribution cells parsed — GitHub layout changed?"
    assert 300 <= len(days) <= 380, f"expected ~365 day cells, got {len(days)}"
    svg = render(days, total, USER)
    with open("heatmap.svg", "w") as f:
        f.write(svg)
    print(f"wrote heatmap.svg — {len(days)} days, {total} contributions for @{USER}")
