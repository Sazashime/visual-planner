# app.py
from flask import Flask, render_template, jsonify, request
import os, math
from products import products

# Config
IMG_FOLDER = os.path.join("static", "img")
PIXEL_SIZE = 40  # pixels per tile on canvas (frontend uses same)
TILE_SIZE = 0.4  # meters per tile

# Color map (same as the Tkinter app)
COLOR_MAP = {
    "черна": "black",
    "светло синя": "lightblue",
    "синя": "blue",
    "зелена": "green",
    "червена": "red",
    "жълта": "yellow",
    "сива": "gray",
    "светло сива": "gainsboro",
    "кафява": "saddlebrown",
    "оранжева": "orange",
    "лилава": "purple",
    "бяла": "white",
    "тъмно зелена": "darkgreen",
    "ярко зелена": "limegreen",
    "розова": "pink",
    "антрацит": "dimgray",
    "кафяво": "peru",
    "дърво": "burlywood",
    "зелен": "forestgreen",
    "синя тюркоаз": "turquoise",
    "unknown": "lightgray"
}

app = Flask(__name__, static_folder="static", template_folder="templates")

def find_image_for_code(code):
    """Fuzzy match: return filename (relative to static/img) if any file contains code (case-insensitive)"""
    if not os.path.isdir(IMG_FOLDER):
        return None
    code_lower = code.lower()
    for fn in os.listdir(IMG_FOLDER):
        low = fn.lower()
        if code_lower in low and low.endswith((".png", ".jpg", ".jpeg", ".gif", ".webp")):
            return os.path.join("img", fn)  # path relative to /static
    return None

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/calculate", methods=["POST"])
def api_calculate():
    """
    Expects JSON:
    {
      "grid": [["DUa597","DUa597",""], [...]],
      "tile_size_m": 0.4   # optional (defaults to 0.4)
    }
    Returns:
    {
      "counts": {"DUa597": 12, ...},        # raw cell counts
      "tiles": {"DUa597": 54, ...},         # corrected tile counts
      "subtotal": {"DUa597": 54*5.99, ...},
      "total": 123.45
    }
    """
    data = request.get_json()
    if not data or "grid" not in data:
        return jsonify({"error": "missing grid"}), 400

    grid = data["grid"]
    tile_size = float(data.get("tile_size_m", 0.4))
    cell_area = tile_size * tile_size

    counts = {}
    for row in grid:
        for code in row:
            if code:
                counts[code] = counts.get(code, 0) + 1

    tiles_needed = {}
    subtotals = {}
    total = 0.0

    for code, cell_count in counts.items():
        product = products.get(code)
        if not product:
            continue

        prod_w, prod_h = product["size"]
        prod_area = prod_w * prod_h

        painted_area = cell_count * cell_area
        needed_tiles = math.ceil(painted_area / prod_area)
        subtotal = needed_tiles * product["price"]

        tiles_needed[code] = needed_tiles
        subtotals[code] = subtotal
        total += subtotal

    return jsonify({
        "counts": counts,
        "tiles": tiles_needed,
        "subtotal": subtotals,
        "total": round(total, 2)
    })

if __name__ == "__main__":
    app.run(debug=True)
