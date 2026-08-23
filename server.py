#!/usr/bin/env python3
"""Taskys download server.

Serves the static site/ folder and streams the freshly built AppImage
from app/dist/ so users can install Taskys with one command:

    curl -sSL http://localhost:8000/install.sh | bash

Run:
    python3 server.py            # serves on http://localhost:8000
    PORT=9000 python3 server.py  # custom port
"""

import http.server
import json
import os
import re
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE_DIR = os.path.join(ROOT, "site")
DIST_DIR = os.path.join(ROOT, "app", "dist")
COUNT_FILE = os.path.join(ROOT, "downloads.count")

# External URL used when the AppImage is not present locally (e.g. on hosts
# where the 100MB upload limit prevents bundling it). Override with APPIMAGE_URL.
APPIMAGE_URL = os.environ.get(
    "APPIMAGE_URL",
    "https://github.com/mozart-real/taskys/releases/download/v1.0.0/Taskys-1.0.0.AppImage",
)

MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".json": "application/json",
    ".AppImage": "application/octet-stream",
    ".deb": "application/octet-stream",
    ".rpm": "application/octet-stream",
    ".sh": "text/plain; charset=utf-8",
}


def latest_appimage():
    if not os.path.isdir(DIST_DIR):
        return None
    images = [f for f in os.listdir(DIST_DIR) if f.endswith(".AppImage")]
    if not images:
        return None
    images.sort(key=lambda f: os.path.getmtime(os.path.join(DIST_DIR, f)), reverse=True)
    return os.path.join(DIST_DIR, images[0])


def get_count():
    try:
        return int(open(COUNT_FILE).read().strip() or "0")
    except (FileNotFoundError, ValueError):
        return 0


def bump_count():
    n = get_count() + 1
    with open(COUNT_FILE, "w") as f:
        f.write(str(n))
    return n


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # quiet

    def _send(self, code, body, content_type="text/plain; charset=utf-8"):
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        route = urlparse(self.path).path

        # ---- API: download counter ----
        if route == "/api/downloads":
            return self._send(200, json.dumps({"count": get_count()}), "application/json")

        # ---- API: install script ----
        if route == "/install.sh":
            return self._send(200, open(os.path.join(ROOT, "install.sh")).read(),
                              "text/plain; charset=utf-8")

        # ---- API: stream the AppImage ----
        if route in ("/download/appimage", "/download/Taskys.AppImage"):
            path = latest_appimage()
            if not path:
                # not bundled locally (e.g. host upload limit) -> redirect to external URL
                bump_count()
                self.send_response(302)
                self.send_header("Location", APPIMAGE_URL)
                self.end_headers()
                return
            bump_count()
            self.send_response(200)
            self.send_header("Content-Type", "application/octet-stream")
            self.send_header("Content-Disposition",
                             'attachment; filename="Taskys.AppImage"')
            self.send_header("Content-Length", str(os.path.getsize(path)))
            self.end_headers()
            with open(path, "rb") as f:
                while True:
                    chunk = f.read(1 << 20)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
            return

        # ---- static files from site/ ----
        if route == "/":
            route = "/index.html"

        safe = re.sub(r"\.\.+", "", route)
        filepath = os.path.normpath(os.path.join(SITE_DIR, safe.lstrip("/")))

        if not filepath.startswith(SITE_DIR) or not os.path.isfile(filepath):
            return self._send(404, "Not found")

        ext = os.path.splitext(filepath)[1]
        self._send(200, open(filepath, "rb").read(), MIME.get(ext, "application/octet-stream"))


def main():
    port = int(os.environ.get("PORT", "80"))
    server = http.server.HTTPServer(("0.0.0.0", port), Handler)
    print(f"Taskys download server running at http://0.0.0.0:{port}")
    print(f"  Site:        http://0.0.0.0:{port}/")
    print(f"  Install:     curl -sSL http://0.0.0.0:{port}/install.sh | bash")
    print(f"  AppImage:    http://0.0.0.0:{port}/download/appimage")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nbye")


if __name__ == "__main__":
    main()
