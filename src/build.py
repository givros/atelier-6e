import sys
from pathlib import Path

source = Path(__file__).resolve().parent
target = Path(sys.argv[1]) if len(sys.argv) > 1 else source.parent / "Declic-OS.html"
template = (source / "shell.html").read_text(encoding="utf-8")
for marker, filename in {
    "STYLES": "style.css",
    "SHELL SCRIPT": "shell.js",
    "CORE SCRIPT": "core.js",
    "MISSIONS SCRIPT": "missions.js",
}.items():
    content = (source / filename).read_text(encoding="utf-8").strip()
    template = template.replace(f"/* {marker} */", "\n" + content + "\n", 1)

target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(template, encoding="utf-8")
