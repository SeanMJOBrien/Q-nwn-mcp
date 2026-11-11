#!/usr/bin/env python3
"""Builds src/data/pc-appearance.json (TODO #34): which heads exist for each PC race and gender, and which skin and hair colours
hand-built creatures actually use.

Heads: the base game's key file lists every head model (p<m|f><race letter>0_head###). Colours: the Color_Skin / Color_Hair values of
standard-race humanoid blueprints (Appearance_Type 0-6, Race 0-6, Gender 0/1) in the nasher `*.utc.json` files under the given
folders, counted per appearance row and gender. Phenotype: how often the standard normal (0) and big (2) bodies are used. Only values used by at least 2 creatures and 1.5 % of the group are kept, as weights.
No creature names or resrefs are recorded.

Usage: scripts/build-pc-appearance.py <nwn_base.key> <folder> [<folder> ...]
"""
import collections, glob, json, os, re, struct, sys

key, folders = sys.argv[1], sys.argv[2:]
d = open(key, "rb").read()
nkey, offk = struct.unpack("<II", d[12:16] + d[20:24])
heads = collections.defaultdict(list)
for i in range(nkey):
    rr, typ, _ = struct.unpack("<16sHI", d[offk + i * 22: offk + i * 22 + 22])
    rr = rr.split(b"\0")[0].decode()
    m = re.match(r"^p([mf])([a-z])0_head(\d{3})$", rr)
    if typ == 2002 and m:
        heads[m.group(2).upper() + m.group(1)].append(int(m.group(3)))
st = collections.defaultdict(lambda: {"skin": collections.Counter(), "hair": collections.Counter(), "n": 0})
pheno = collections.Counter()
for folder in folders:
    for f in glob.glob(os.path.join(folder, "**", "*.utc.json"), recursive=True):
        if any(x in f for x in ("node_modules", "/dist/", "/.build/", "backup")):
            continue
        try:
            u = json.load(open(f))
        except Exception:
            continue
        a = u.get("Appearance_Type", {}).get("value")
        if a is None or a > 6 or u.get("Race", {}).get("value") not in range(7) or u.get("Gender", {}).get("value") not in (0, 1):
            continue
        s = st[f"{a}-{u['Gender']['value']}"]
        s["n"] += 1
        s["skin"][u["Color_Skin"]["value"]] += 1
        s["hair"][u["Color_Hair"]["value"]] += 1
        pheno[u.get("Phenotype", {}).get("value", 0)] += 1

def pool(c, n):
    keep = [(v, k) for v, k in sorted(c.items(), key=lambda x: -x[1]) if k >= 2 and k >= 0.015 * n][:24]
    return [[v, k] for v, k in sorted(keep)]

out = {
    "source": "base-game head models; skin and hair colours as used by hand-built standard-race creatures (see scripts/build-pc-appearance.py)",
    "raceLetter": {"0": "D", "1": "E", "2": "G", "3": "A", "4": "H", "5": "O", "6": "H"},
    "heads": {k: sorted(v) for k, v in sorted(heads.items())},
    # Phenotype 0 (normal) and 2 (the big body) are the two standard player phenotypes; the others in use need custom content and are left out.
    "phenotype": {"0": pheno[0], "2": pheno[2]},
    "colors": {k: {"samples": v["n"], "skin": pool(v["skin"], v["n"]), "hair": pool(v["hair"], v["n"])} for k, v in sorted(st.items())},
}
json.dump(out, open(os.path.join(os.path.dirname(__file__), "..", "src", "data", "pc-appearance.json"), "w"), indent=1)
print({k: v["samples"] for k, v in out["colors"].items()})
