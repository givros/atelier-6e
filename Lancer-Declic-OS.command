#!/bin/zsh

/usr/bin/python3 - "${0:A:h}/Declic-OS.html" <<'PYTHON'
import errno
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

page = Path(sys.argv[1])
host = "127.0.0.1"
port = 4183
url = f"http://localhost:{port}/"


class DeclicHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_page(include_body=True)

    def do_HEAD(self):
        self.send_page(include_body=False)

    def send_page(self, include_body):
        if urlsplit(self.path).path not in ("/", "/Declic-OS.html"):
            self.send_error(404)
            return

        try:
            content = page.read_bytes()
        except OSError:
            self.send_error(404, "Declic-OS.html introuvable")
            return

        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        if include_body:
            self.wfile.write(content)

    def log_message(self, message, *args):
        pass


if not page.is_file():
    sys.exit("Place Lancer-Declic-OS.command à côté de Declic-OS.html, puis relance-le.")

try:
    with ThreadingHTTPServer((host, port), DeclicHandler) as server:
        print(f"Déclic OS est ouvert sur {url}", flush=True)
        print("Laisse cette fenêtre ouverte. Appuie sur Ctrl+C pour arrêter.", flush=True)
        subprocess.Popen(["/usr/bin/open", url])
        server.serve_forever()
except KeyboardInterrupt:
    print("\nDéclic OS est arrêté.")
except OSError as error:
    if error.errno == errno.EADDRINUSE:
        sys.exit(f"Le port {port} est déjà utilisé. Si Déclic OS est ouvert, retourne sur {url}.")
    sys.exit(f"Impossible de lancer Déclic OS : {error}")
PYTHON
