#!/usr/bin/env python3
"""Build a self-hosted, on-brand WakaTime badge (no page-time external requests).
Reads the API key from ~/.wakatime.cfg, fetches all-time total, writes waka-badge.svg.
Re-run to refresh: python3 build_badge.py
"""
import os, re, json, urllib.request, configparser

CFG = os.path.expanduser("~/.wakatime.cfg")
PAL = dict(bg="#1b1917", line="#443c38", coral="#ff5c66", txt="#f2ece7", dim="#8b7d74")

def api_key():
    cp = configparser.ConfigParser()
    cp.read(CFG)
    return cp["settings"]["api_key"]

def total_text(key):
    req = urllib.request.Request(
        "https://wakatime.com/api/v1/users/current/all_time_since_today",
        headers={"Authorization": "Basic " + _b64(key + ":")})
    d = json.load(urllib.request.urlopen(req, timeout=20))["data"]
    hrs = int(d["total_seconds"] // 3600)
    start_year = d["range"]["start_date"][:4]
    return f"{hrs:,} hrs coded", f"since {start_year}"

def _b64(s):
    import base64
    return base64.b64encode(s.encode()).decode()

def render(main, sub):
    # monospace ~6.6px/char at 12px; measure the two text runs
    label = "wakatime"
    W_pad, H = 12, 28
    cw = 6.7
    lw = len(label) * cw + 26           # clock glyph + label
    rw = (len(main) + len(sub) + 1) * cw + 16
    W = int(W_pad + lw + rw + W_pad)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" role="img" aria-label="wakatime: {main} {sub}">
<rect x="0.5" y="0.5" width="{W-1}" height="{H-1}" rx="8" fill="{PAL['bg']}" stroke="{PAL['line']}"/>
<circle cx="18" cy="14" r="5.2" fill="none" stroke="{PAL['coral']}" stroke-width="1.6"/>
<path d="M18 11.2 V14 L20 15.4" stroke="{PAL['coral']}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
<text x="28" y="18" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="12" fill="{PAL['dim']}">{label}</text>
<line x1="{28+len(label)*cw+8:.0f}" y1="7" x2="{28+len(label)*cw+8:.0f}" y2="{H-7}" stroke="{PAL['line']}"/>
<text x="{28+len(label)*cw+16:.0f}" y="18" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="12"><tspan fill="{PAL['coral']}" font-weight="700">{main}</tspan><tspan fill="{PAL['dim']}"> {sub}</tspan></text>
</svg>'''
    return svg

if __name__ == "__main__":
    key = api_key()
    assert key.startswith("waka"), "no wakatime api key in ~/.wakatime.cfg"
    main, sub = total_text(key)
    assert "hrs" in main and re.match(r"since \d{4}", sub)
    open("waka-badge.svg", "w").write(render(main, sub))
    print(f"wrote waka-badge.svg — {main} {sub}")
