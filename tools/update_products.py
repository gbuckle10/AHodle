"""Add products to AHodle or refresh their prices, using Albert Heijn's product search.

    python tools/update_products.py add https://www.ah.nl/producten/product/wi58169/ah-biologisch-volkoren-spaghetti
    python tools/update_products.py add <url> --en "Barn eggs" --cat dairy
    python tools/update_products.py replace "AH Scharreleieren" <url>
    python tools/update_products.py refresh

`add` looks the product up, downloads its photo into img/ and appends it to
js/products.js. Products that can't be ordered on ah.nl are refused. Anything
not given as an option is asked for (press Enter for the suggestion in brackets).

`replace` swaps a product (by exact name or AH id) for a new one. Use it for
products that `refresh` says can't be ordered any more.

`refresh` updates every product's regular price (Bonus offers are ignored),
reports pack-size or name changes, downloads any missing photos and warns
about products that can no longer be ordered on ah.nl.

Needs `requests` (pip install requests).
"""
import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
PRODUCTS_JS = ROOT / "js" / "products.js"
GAME_JS = ROOT / "js" / "game.js"
IMG_DIR = ROOT / "img"


def read_cats():
    """Category keys from the `cats: { ... }` lists in game.js (one per language).

    Returns (usable, untranslated): keys present in every language, and keys
    missing from at least one, which would show as "undefined" in the game.
    """
    blocks = re.findall(r"cats: \{([^}]*)\}", GAME_JS.read_text(encoding="utf-8"))
    per_lang = [re.findall(r"(\w+):", b) for b in blocks]
    all_keys = list(dict.fromkeys(k for keys in per_lang for k in keys))
    usable = [k for k in all_keys if all(k in keys for keys in per_lang)]
    return usable, [k for k in all_keys if k not in usable]


CATS, UNTRANSLATED_CATS = read_cats()
FIELD_ORDER = ["name", "en", "size", "sizeEn", "price", "cat", "img", "ahId", "ahSize", "url"]

# ---------- AH API (same requests as albert_heijn.py) ----------

class AH:
    def __init__(self):
        token = requests.post(
            "https://api.ah.nl/mobile-auth/v1/auth/token/anonymous",
            json={"clientId": "appie"},
            headers={"content-type": "application/json; charset=UTF-8"},
            timeout=20,
        ).json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {token}",
            "user-agent": "Appie/8.8.2 Model/phone Android/7.0-API24",
            "x-application": "AHWEBSHOP",
        }

    def search(self, query, size=100):
        r = requests.get(
            "https://api.ah.nl/mobile-services/product/search/v2",
            headers=self.headers, params={"query": query, "size": size}, timeout=20,
        )
        r.raise_for_status()
        return r.json().get("products", [])

    def find(self, ah_id, queries):
        """First product with this webshopId among the results of the given queries."""
        for q in queries:
            for p in self.search(q):
                if p["webshopId"] == ah_id:
                    return p
        return None


def regular_price(p):
    price = p.get("priceBeforeBonus")
    return price if price is not None else p.get("currentPrice")


def unavailable(p):
    """Why the product can't be ordered on ah.nl (e.g. NO_LONGER_IN_ASSORTMENT), or None."""
    if p.get("isOrderable"):
        return None
    return p.get("orderAvailabilityStatus") or "not orderable"


def product_url(p):
    return f"https://www.ah.nl/producten/product/wi{p['webshopId']}/{slug(p['title'])}"


def image_url(p):
    imgs = sorted(p.get("images", []), key=lambda i: i.get("width", 0))
    return next((i["url"] for i in imgs if i.get("width", 0) >= 400), imgs[-1]["url"] if imgs else None)

# ---------- products.js ----------

HEAD_RE = re.compile(r"^(.*?window\.PRODUCTS = \[\n)(.*?)(\n\];\n.*)$", re.S)
FIELD_RE = re.compile(r'(\w+): ("(?:[^"\\]|\\.)*"|-?[0-9.]+)')


def load():
    text = PRODUCTS_JS.read_text(encoding="utf-8")
    head, body, tail = HEAD_RE.match(text).groups()
    products = []
    for line in body.split("\n"):
        if line.strip().startswith("{"):
            products.append({k: json.loads(v) for k, v in FIELD_RE.findall(line)})
    return head, products, tail


def fmt_value(key, v):
    if key == "price":
        return f"{v:.2f}"
    return json.dumps(v, ensure_ascii=False)


def save(head, products, tail):
    lines = []
    for p in products:
        keys = [k for k in FIELD_ORDER if k in p] + [k for k in p if k not in FIELD_ORDER]
        lines.append("  { " + ", ".join(f"{k}: {fmt_value(k, p[k])}" for k in keys) + " },")
    # Write a temp file first so a failure can never leave products.js half-written.
    tmp = PRODUCTS_JS.with_suffix(".js.tmp")
    try:
        tmp.write_text(head + "\n".join(lines) + tail, encoding="utf-8", newline="")
        tmp.replace(PRODUCTS_JS)
    finally:
        tmp.unlink(missing_ok=True)


def slug(name):
    """Same as imageSrc() in game.js."""
    s = unicodedata.normalize("NFD", name.lower())
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", s))


def download_photo(p, ah_product):
    url = image_url(ah_product)
    if not url:
        print(f"  no photo available for {p['name']}")
        return
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}.get(r.headers.get("content-type", ""), "jpg")
    path = IMG_DIR / f"{slug(p['name'])}.{ext}"
    IMG_DIR.mkdir(exist_ok=True)
    path.write_bytes(r.content)
    if ext != "jpg":  # game.js looks for .jpg unless told otherwise
        p["img"] = f"img/{path.name}"
    print(f"  photo saved: img/{path.name}")


def has_photo(p):
    return (ROOT / p["img"]).exists() if "img" in p else (IMG_DIR / f"{slug(p['name'])}.jpg").exists()

# ---------- sizes ----------

def display_size(ah_size):
    s = ah_size.strip()
    s = re.sub(r"\bkilogram\b", "kg", s)
    s = re.sub(r"(\d)\s*l$", r"\1 L", s)
    return s


def english_size(size):
    s = size.replace("per stuk", "each").replace("ca. ", "approx. ")
    s = re.sub(r"\bstuks?\b", "pieces", s)
    s = re.sub(r"\bzakjes\b", "bags", s)
    s = re.sub(r"(\d),(\d)", r"\1.\2", s)
    return s

# ---------- commands ----------

def ask(prompt, default):
    try:
        answer = input(f"{prompt} [{default}]: ").strip()
    except EOFError:  # no input available (piped or scripted): take the suggestion
        print()
        return default
    return answer or default


def guess_cat(ah_product):
    main = (ah_product.get("mainCategory") or "").lower()
    for words, cat in [
        (("kaas",), "cheese"),
        (("zuivel", "eieren"), "dairy"),
        (("brood", "bakkerij", "gebak"), "bakery"),
        (("vlees", "vis", "kip", "vega"), "meat"),
        (("groente", "fruit", "aardappel"), "produce"),
        (("koffie", "thee", "frisdrank", "sap", "drank", "water"), "drinks"),
        (("snoep", "chocolade", "koek", "zoet"), "sweets"),
    ]:
        if cat in CATS and any(w in main for w in words):
            return cat
    return "pantry"


def lookup(url, products):
    """Find the AH product behind an ah.nl link, refusing duplicates and unorderable products."""
    m = re.search(r"wi(\d+)(?:/([^/?#]+))?", url)
    if not m:
        sys.exit("That doesn't look like an AH product link (expected .../producten/product/wi123456/name).")
    ah_id, url_slug = int(m.group(1)), m.group(2) or ""
    if any(p.get("ahId") == ah_id for p in products):
        sys.exit(f"Product {ah_id} is already in the list.")

    words = url_slug.replace("-", " ")
    queries = [q for q in [words, " ".join(words.split()[1:])] if q.strip()]
    ap = AH().find(ah_id, queries)
    if not ap:
        sys.exit(f"Couldn't find product {ah_id} via AH search. Is it still sold?")
    if unavailable(ap):
        sys.exit(f"{ap['title']} can't be ordered on ah.nl ({unavailable(ap)}); pick another product.")
    if any(p["name"] == ap["title"] for p in products):
        sys.exit(f"A product named {ap['title']!r} is already in the list.")
    return ap


def new_entry(ap, args, cat_default=None):
    """Build a products.js entry for an AH product, asking for whatever args don't give."""
    name = ap["title"]
    price = regular_price(ap)
    ah_size = ap.get("salesUnitSize") or ""
    print(f"Found: {name} | {ah_size} | €{price:.2f} | AH category: {ap.get('mainCategory')}")

    en = args.en or ask("English name", name)
    cat = args.cat or ask(f"Category ({', '.join(CATS)})", cat_default or guess_cat(ap))
    if cat in UNTRANSLATED_CATS:
        sys.exit(f"Category {cat!r} is missing from one of the `cats` lists in game.js; add it to both languages.")
    if cat not in CATS:
        sys.exit(f"Unknown category {cat!r}; add it to `cats` in game.js (in both languages) first.")
    size = args.size or ask("Size shown in game", display_size(ah_size))
    p = {"name": name, "en": en, "size": size}
    size_en = args.size_en or ask("Size in English", english_size(size))
    if size_en != size:
        p["sizeEn"] = size_en
    p["price"] = price
    p["cat"] = cat
    p["ahId"] = ap["webshopId"]
    p["ahSize"] = ah_size
    p["url"] = product_url(ap)
    download_photo(p, ap)
    return p


def cmd_add(args):
    head, products, tail = load()
    p = new_entry(lookup(args.url, products), args)
    products.append(p)
    save(head, products, tail)
    print(f"Added {p['name']} (product #{len(products)}).")


def cmd_replace(args):
    head, products, tail = load()
    target = args.old.strip().lower()
    matches = [i for i, p in enumerate(products) if target in (p["name"].lower(), str(p.get("ahId")))]
    if not matches:
        sys.exit(f"No product named {args.old!r} (use the exact name or AH id from products.js).")
    i = matches[0]
    old = products[i]
    print(f"Replacing: {old['name']}")
    p = new_entry(lookup(args.url, products), args, cat_default=old["cat"])
    old_photo = ROOT / old["img"] if "img" in old else IMG_DIR / f"{slug(old['name'])}.jpg"
    old_photo.unlink(missing_ok=True)
    products[i] = p
    save(head, products, tail)
    print(f"Replaced product #{i + 1} with {p['name']}.")


def cmd_refresh(args):
    head, products, tail = load()
    ah = AH()
    changes = 0
    for p in products:
        name = p["name"]
        results = ah.search(name)
        if "ahId" in p:
            ap = next((r for r in results if r["webshopId"] == p["ahId"]), None)
        else:  # older entries: match on exact name and remember the id
            ap = next((r for r in results if r["title"].lower() == name.lower()), None)
            if ap:
                p["ahId"] = ap["webshopId"]
        if not ap:
            print(f"! {name}: not found at AH (renamed or no longer sold?), left unchanged")
            continue

        notes = []
        price = regular_price(ap)
        if price is not None and abs(price - p["price"]) > 0.001:
            notes.append(f"price €{p['price']:.2f} -> €{price:.2f}")
            p["price"] = price
        ah_size = ap.get("salesUnitSize") or ""
        if "ahSize" not in p:
            p["ahSize"] = ah_size
        elif ah_size != p["ahSize"]:
            p["ahSize"] = ah_size
            p["size"] = display_size(ah_size)
            p.pop("sizeEn", None)
            if english_size(p["size"]) != p["size"]:
                p["sizeEn"] = english_size(p["size"])
            notes.append(f"pack size changed to {ah_size!r} (check the size text)")
        if p.get("url") != product_url(ap):
            notes.append("link added" if "url" not in p else "link updated")
            p["url"] = product_url(ap)
        if unavailable(ap):
            notes.append(f"CAN'T BE ORDERED on ah.nl ({unavailable(ap)}), consider replacing it")
        if ap["title"] != name:
            notes.append(f"AH now calls it {ap['title']!r} (name not changed)")
        if not has_photo(p):
            download_photo(p, ap)
            notes.append("photo downloaded")
        if notes:
            changes += 1
            print(f"* {name}: " + "; ".join(notes))

    save(head, products, tail)
    print(f"Done. {changes} of {len(products)} products changed.")


def main():
    for stream in (sys.stdin, sys.stdout):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    add = sub.add_parser("add", help="add a product from its ah.nl link")
    add.add_argument("url")
    add.add_argument("--en", help="English name")
    add.add_argument("--cat", help="category key from `cats` in game.js")
    add.add_argument("--size", help="size shown in game (default: AH's pack size)")
    add.add_argument("--size-en", help="size in English")
    add.set_defaults(func=cmd_add)
    replace = sub.add_parser("replace", help="swap a product for another one")
    replace.add_argument("old", help="exact name or AH id of the product to replace")
    replace.add_argument("url", help="ah.nl link of the new product")
    for flag, help_text in [("--en", "English name"), ("--size", "size shown in game"), ("--size-en", "size in English")]:
        replace.add_argument(flag, help=help_text)
    replace.add_argument("--cat", help="category key from `cats` in game.js")
    replace.set_defaults(func=cmd_replace)
    refresh = sub.add_parser("refresh", help="update prices of all products")
    refresh.set_defaults(func=cmd_refresh)
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
