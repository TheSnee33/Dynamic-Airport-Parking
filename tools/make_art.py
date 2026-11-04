#!/usr/bin/env python3
"""Generates the original placeholder illustrations in assets/img/.
Swap these for real photos any time; pages reference the file names only."""
import os, random

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "img")
os.makedirs(OUT, exist_ok=True)
random.seed(7)

RED, RED2, BLUE = "#b91c1c", "#dc2626", "#58a6ff"


def car(x, y, s=1.0, color="#394150", glow=False):
    """Simple side-view sedan, base line at y."""
    w, h = 150 * s, 44 * s
    parts = [
        f'<g transform="translate({x},{y - h})">',
        f'<path d="M0 {h*0.62} Q0 {h*0.45} {w*0.1} {h*0.42} L{w*0.2} {h*0.4} Q{w*0.3} 0 {w*0.45} 0 L{w*0.66} 0 '
        f'Q{w*0.78} 0 {w*0.85} {h*0.4} L{w*0.95} {h*0.45} Q{w} {h*0.5} {w} {h*0.7} L{w} {h*0.86} L0 {h*0.86} Z" fill="{color}"/>',
        f'<path d="M{w*0.27} {h*0.4} Q{w*0.34} {h*0.08} {w*0.45} {h*0.08} L{w*0.64} {h*0.08} Q{w*0.73} {h*0.1} {w*0.8} {h*0.4} Z" fill="#0b1018" opacity=".85"/>',
        f'<circle cx="{w*0.24}" cy="{h*0.88}" r="{h*0.22}" fill="#0a0d12"/><circle cx="{w*0.24}" cy="{h*0.88}" r="{h*0.1}" fill="#6b7482"/>',
        f'<circle cx="{w*0.78}" cy="{h*0.88}" r="{h*0.22}" fill="#0a0d12"/><circle cx="{w*0.78}" cy="{h*0.88}" r="{h*0.1}" fill="#6b7482"/>',
    ]
    if glow:
        parts.append(f'<rect x="{w*0.94}" y="{h*0.5}" width="{w*0.06}" height="{h*0.12}" fill="#ffe9a8"/>')
    parts.append("</g>")
    return "".join(parts)


def stars(n, w, h):
    return "".join(
        f'<circle cx="{random.randint(0,w)}" cy="{random.randint(0,int(h))}" r="{random.choice([0.6,0.9,1.2])}" fill="#fff" opacity="{random.choice([.4,.6,.9])}"/>'
        for _ in range(n)
    )


def mountains(w, base, color, hmax, seed):
    random.seed(seed)
    pts = [(0, base)]
    x = 0
    while x < w:
        x += random.randint(60, 140)
        pts.append((x, base - random.randint(int(hmax * .35), hmax)))
        x += random.randint(40, 110)
        pts.append((x, base - random.randint(int(hmax * .1), int(hmax * .5))))
    pts.append((w, base)); pts.append((w, base + 2)); pts.append((0, base + 2))
    return f'<polygon points="{" ".join(f"{a},{b}" for a,b in pts)}" fill="{color}"/>'


def lamp(x, base, top, glow=True):
    g = (f'<ellipse cx="{x+30}" cy="{top+8}" rx="170" ry="120" fill="url(#lampglow)"/>' if glow else "")
    return (f'{g}<rect x="{x-3}" y="{top}" width="6" height="{base-top}" fill="#1a212b"/>'
            f'<rect x="{x}" y="{top}" width="60" height="5" fill="#1a212b"/>'
            f'<rect x="{x+44}" y="{top+5}" width="26" height="7" rx="2" fill="#ffe9a8"/>')


def camera(x, y):
    return (f'<rect x="{x}" y="{y}" width="26" height="12" rx="3" fill="#222a35"/>'
            f'<circle cx="{x+24}" cy="{y+6}" r="4" fill="#0b1018" stroke="{BLUE}" stroke-width="1.4"/>'
            f'<circle cx="{x+3}" cy="{y+3}" r="2" fill="{RED2}"><animate attributeName="opacity" values="1;.2;1" dur="1.6s" repeatCount="indefinite"/></circle>')


def write(name, w, h, body, defs=""):
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" preserveAspectRatio="xMidYMid slice">'
           f'<defs>{defs}</defs>{body}</svg>')
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(svg)


# 1 ── Night lot (hero) ───────────────────────────────────────────────
W, H = 1600, 800
defs = f'''
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070c"/><stop offset=".6" stop-color="#101a2c"/><stop offset="1" stop-color="#26324a"/></linearGradient>
<radialGradient id="lampglow"><stop offset="0" stop-color="#ffd98a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient>
<linearGradient id="asph" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a212b"/><stop offset="1" stop-color="#0d1117"/></linearGradient>'''
b = [f'<rect width="{W}" height="{H}" fill="url(#sky)"/>', stars(90, W, 360),
     f'<circle cx="1290" cy="150" r="42" fill="#e9eef7" opacity=".92"/><circle cx="1305" cy="140" r="42" fill="#0e1626"/>',
     mountains(W, 470, "#0e1522", 230, 3), mountains(W, 480, "#0a101a", 170, 9),
     f'<rect y="470" width="{W}" height="{H-470}" fill="url(#asph)"/>']
# fence
b.append(f'<rect y="455" width="{W}" height="3" fill="#2a3340"/><rect y="500" width="{W}" height="2" fill="#2a3340"/>')
for x in range(0, W, 26):
    b.append(f'<line x1="{x}" y1="455" x2="{x+26}" y2="502" stroke="#232b37" stroke-width="1"/><line x1="{x+26}" y1="455" x2="{x}" y2="502" stroke="#232b37" stroke-width="1"/>')
for x in range(0, W + 1, 260):
    b.append(f'<rect x="{x}" y="448" width="5" height="58" fill="#2f3948"/>')
# lamps + camera
for x in (180, 620, 1060, 1480):
    b.append(lamp(x, 505, 250))
b.append(camera(700, 300))
b.append(f'<rect x="709" y="312" width="4" height="190" fill="#1a212b"/>')
# parking lines + cars
for row, (y, sc, line) in enumerate([(590, 1.0, "#3a4454"), (700, 1.35, "#4a5566")]):
    for i in range(0, 12):
        x = 40 + i * (190 * sc)
        b.append(f'<rect x="{x-8}" y="{y-44*sc}" width="3" height="{50*sc}" fill="{line}"/>')
    cols = ["#6b2323", "#2d3a4f", "#394150", "#4a5a6e", "#51302f", "#2c3b33", "#3d4a5f"]
    for i in range(0, 11):
        if random.random() < .22:
            continue
        b.append(car(40 + i * (190 * sc) + 6, y, sc * 1.08, random.choice(cols), glow=random.random() < .3))
b.append(f'<rect width="{W}" height="{H}" fill="#000" opacity=".08"/>')
write("hero-lot.svg", W, H, "".join(b), defs)

# 2 ── Shuttle on road ───────────────────────────────────────────────
W, H = 900, 560
defs = '''
<linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2540"/><stop offset=".55" stop-color="#7a3b4a"/><stop offset="1" stop-color="#e08a4f"/></linearGradient>
<linearGradient id="road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#262d38"/><stop offset="1" stop-color="#10151c"/></linearGradient>'''
b = [f'<rect width="{W}" height="{H}" fill="url(#dusk)"/>',
     f'<circle cx="640" cy="330" r="70" fill="#ffd9a0" opacity=".9"/>',
     mountains(W, 400, "#2a2238", 150, 4), mountains(W, 410, "#171421", 110, 12),
     # terminal
     '<g transform="translate(560,330)"><rect width="260" height="70" fill="#1a1f2b"/><rect y="-16" width="260" height="16" fill="#232a38"/>'
     + "".join(f'<rect x="{12+i*40}" y="14" width="26" height="30" fill="#ffd98a" opacity=".85"/>' for i in range(6))
     + '<rect x="205" y="-52" width="10" height="36" fill="#1a1f2b"/><rect x="195" y="-62" width="30" height="14" fill="#232a38"/></g>',
     f'<rect y="400" width="{W}" height="{H-400}" fill="url(#road)"/>',
     f'<rect y="478" width="{W}" height="4" fill="#cfd6e0" opacity=".25"/>']
for x in range(0, W, 90):
    b.append(f'<rect x="{x}" y="500" width="50" height="5" fill="#e6edf3" opacity=".55"/>')
# bus
b.append('''<g transform="translate(110,300)">
<rect x="0" y="20" width="390" height="130" rx="22" fill="#e6edf3"/>
<rect x="0" y="100" width="390" height="22" fill="#b91c1c"/>
<rect x="0" y="122" width="390" height="28" rx="0" fill="#c9d1da"/>''' +
     "".join(f'<rect x="{22+i*58}" y="36" width="44" height="50" rx="8" fill="#16202e"/><rect x="{26+i*58}" y="40" width="14" height="42" rx="4" fill="#58a6ff" opacity=".35"/>' for i in range(6)) +
     '''<rect x="352" y="34" width="30" height="66" rx="6" fill="#16202e"/>
<text x="26" y="116" font-family="Outfit,Arial,sans-serif" font-weight="800" font-size="17" fill="#fff" letter-spacing="2">AIRPORT SHUTTLE</text>
<circle cx="86" cy="150" r="26" fill="#0a0d12"/><circle cx="86" cy="150" r="12" fill="#7b8594"/>
<circle cx="304" cy="150" r="26" fill="#0a0d12"/><circle cx="304" cy="150" r="12" fill="#7b8594"/>
<rect x="384" y="112" width="12" height="9" rx="2" fill="#ffe9a8"/>
</g>''')
b.append('<ellipse cx="300" cy="460" rx="230" ry="12" fill="#000" opacity=".28"/>')
write("shuttle.svg", W, H, "".join(b), defs)

# 3 ── Shop bay (service while you're away) ──────────────────────────
W, H = 900, 560
defs = '''
<linearGradient id="bay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1119"/><stop offset="1" stop-color="#1b2431"/></linearGradient>
<radialGradient id="tube"><stop offset="0" stop-color="#9fd0ff" stop-opacity=".5"/><stop offset="1" stop-color="#9fd0ff" stop-opacity="0"/></radialGradient>'''
b = [f'<rect width="{W}" height="{H}" fill="url(#bay)"/>',
     '<rect y="430" width="900" height="130" fill="#10161f"/><rect y="430" width="900" height="3" fill="#2a3340"/>']
for x in (120, 450, 780):
    b.append(f'<ellipse cx="{x}" cy="40" rx="260" ry="150" fill="url(#tube)"/><rect x="{x-90}" y="30" width="180" height="8" rx="4" fill="#dcefff"/>')
# tool wall
for i in range(9):
    b.append(f'<rect x="{40+i*38}" y="110" width="26" height="140" rx="3" fill="#161e29" stroke="#222c3a"/>')
b.append('<rect x="30" y="270" width="360" height="12" fill="#222c3a"/>')
# red tool chest
b.append(f'<g transform="translate(700,300)"><rect width="150" height="130" rx="8" fill="{RED}"/>' +
         "".join(f'<rect x="12" y="{14+i*28}" width="126" height="20" rx="4" fill="#8f1515"/><rect x="62" y="{20+i*28}" width="26" height="6" rx="3" fill="#d9a3a3"/>' for i in range(4)) + '</g>')
# lift + raised car
b.append('<rect x="258" y="260" width="12" height="170" fill="#3a4454"/><rect x="590" y="260" width="12" height="170" fill="#3a4454"/>')
b.append('<rect x="240" y="400" width="380" height="12" rx="3" fill="#586274"/>')
b.append(car(300, 396, 2.0, "#394150", glow=True))
b.append('<rect x="230" y="268" width="50" height="8" rx="3" fill="#586274"/><rect x="580" y="268" width="50" height="8" rx="3" fill="#586274"/>')
# status chip
b.append(f'<g transform="translate(60,330)"><rect width="190" height="48" rx="12" fill="#161b22" stroke="#30363d"/><circle cx="26" cy="24" r="7" fill="#3fb950"/>'
         '<text x="44" y="29" font-family="Inter,Arial,sans-serif" font-size="15" font-weight="700" fill="#e6edf3">Approved by text</text></g>')
write("shop-bay.svg", W, H, "".join(b), defs)

# 4 ── Plane / PVU runway ─────────────────────────────────────────────
W, H = 900, 560
defs = '''
<linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1830"/><stop offset=".6" stop-color="#2d4670"/><stop offset="1" stop-color="#f1a56a"/></linearGradient>'''
b = [f'<rect width="{W}" height="{H}" fill="url(#sky2)"/>', stars(40, W, 220),
     mountains(W, 400, "#1a2438", 190, 21), mountains(W, 420, "#0f1522", 120, 5),
     f'<rect y="420" width="{W}" height="{H-420}" fill="#10151c"/>',
     f'<polygon points="0,520 {W},470 {W},500 0,560" fill="#1a212b"/>']
for i in range(10):
    b.append(f'<rect x="{40+i*86}" y="{505-i*3.4}" width="44" height="4" fill="#e6edf3" opacity=".6"/>')
b.append('<g transform="translate(250,120) rotate(-8)"><rect width="300" height="40" rx="20" fill="#e6edf3"/>'
         '<polygon points="120,22 40,-70 70,-70 190,22" fill="#cfd6e0"/><polygon points="120,22 40,110 70,110 190,22" fill="#b9c2ce"/>'
         '<polygon points="20,10 -20,-48 6,-48 46,10" fill="#cfd6e0"/>'
         + "".join(f'<rect x="{150+i*20}" y="12" width="9" height="10" rx="3" fill="#16202e"/>' for i in range(5)) +
         f'<rect x="0" y="26" width="300" height="5" fill="{RED}"/></g>')
write("airport.svg", W, H, "".join(b), defs)

# 5 ── Simple icons (shared) ─────────────────────────────────────────
print("wrote art to", os.path.abspath(OUT))
