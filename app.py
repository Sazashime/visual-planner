from flask import Flask, render_template, jsonify, request
import os
from products import products

# Config
IMG_FOLDER = os.path.join("static", "fimg")  # 👈 use new folder
PIXEL_SIZE = 40  # pixels per tile on canvas
TILE_SIZE = 0.4  # meters per tile

# Color map for fallback
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
    """Find tile image inside /static/fimg by filename match"""
    if not os.path.isdir(IMG_FOLDER):
        return None
    code_lower = code.lower()
    for fn in os.listdir(IMG_FOLDER):
        if code_lower in fn.lower() and fn.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
            return os.path.join("fimg", fn)  # relative to /static
    return None

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/products")
def api_products():
    """Return products with resolved image path and color fallback."""
    out = {}
    for code, data in products.items():
        img = find_image_for_code(code)
        color_key = data.get("color", "unknown")
        css_color = COLOR_MAP.get(color_key, "lightgray")
        out[code] = {
            "name": data.get("name"),
            "price": data.get("price"),
            "image": img,
            "color_key": color_key,
            "css_color": css_color
        }
    return jsonify(out)

@app.route("/api/calculate", methods=["POST"])
def api_calculate():
    data = request.get_json()
    if not data or "grid" not in data:
        return jsonify({"error": "missing grid"}), 400

    grid = data["grid"]
    tile_size_m = data.get("tile_size_m", TILE_SIZE)

    counts = {}
    total = 0.0
    for row in grid:
        for code in row:
            if code:
                counts[code] = counts.get(code, 0) + 1

    subtotals = {}
    for code, qty in counts.items():
        price = products.get(code, {}).get("price", 0) or 0
        subtotal = qty * price
        subtotals[code] = round(subtotal, 2)
        total += subtotal

    return jsonify({
        "counts": counts,
        "subtotals": subtotals,
        "total": round(total, 2)
    })

if __name__ == "__main__":
    app.run(debug=True)
