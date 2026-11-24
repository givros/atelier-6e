import base64
import json
import sys
from pathlib import Path

source = Path(__file__).resolve().parent
target = Path(sys.argv[1]) if len(sys.argv) > 1 else source.parent / "Declic-OS.html"
template = (source / "shell.html").read_text(encoding="utf-8")
for marker, filename in {
    "STYLES": "style.css",
    "SHELL SCRIPT": "shell.js",
    "MAIL SCRIPT": "mail.js",
    "CORE SCRIPT": "core.js",
    "MISSIONS SCRIPT": "missions.js",
}.items():
    content = (source / filename).read_text(encoding="utf-8").strip()
    template = template.replace(f"/* {marker} */", "\n" + content + "\n", 1)

# Embed the CC0 Wikimedia Commons previews in the standalone HTML file.
# Cat: https://commons.wikimedia.org/wiki/File:Kitten_sleeping.jpg
# Dog: https://commons.wikimedia.org/wiki/File:Golden_Retriever_adult.jpg
# Rabbit: https://commons.wikimedia.org/wiki/File:Gray_and_white_spotted_rabbit_in_grass_at_Oakland_Zoo_(11589812176).jpg
photos = {
    name: base64.b64encode((source / "photos" / f"{name}.jpg").read_bytes()).decode("ascii")
    for name in ("cat", "dog", "rabbit")
}
template = template.replace("/* PHOTO DATA */", f"window.DeclicPhotos = {json.dumps(photos)};", 1)

# Desktop wallpaper by James Wheeler, CC0 1.0.
# https://commons.wikimedia.org/wiki/File:Pexels-james-wheeler-417074.jpg
wallpaper = base64.b64encode((source / "wallpaper.jpg").read_bytes()).decode("ascii")
template = template.replace('url("wallpaper.jpg")', f'url("data:image/jpeg;base64,{wallpaper}")', 1)

target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(template, encoding="utf-8")
