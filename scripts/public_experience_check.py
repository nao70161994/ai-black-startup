#!/usr/bin/env python3
"""Validate the locally served public page, manifest, and PWA asset graph."""

from __future__ import annotations

import json
import re
import threading
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class AssetParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.assets: list[str] = []
        self.app_version = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "meta" and values.get("name") == "app-version":
            self.app_version = values.get("content") or ""
        if tag == "script" and values.get("src"):
            self.assets.append(values["src"])
        if tag == "link" and values.get("href") and values.get("rel") in {
            "stylesheet", "manifest", "icon", "apple-touch-icon"
        }:
            self.assets.append(values["href"])


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        return


def fetch(base_url: str, path: str) -> tuple[bytes, str]:
    url = urllib.parse.urljoin(base_url, path)
    with urllib.request.urlopen(url, timeout=5) as response:
        if response.status != 200:
            raise RuntimeError(f"{path}: HTTP {response.status}")
        return response.read(), response.headers.get_content_type()


def main() -> int:
    handler = lambda *args, **kwargs: QuietHandler(*args, directory=str(ROOT), **kwargs)
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base_url = f"http://127.0.0.1:{server.server_port}/"
    checked: dict[str, str] = {}

    try:
        index_bytes, index_type = fetch(base_url, "index.html")
        if index_type != "text/html":
            raise RuntimeError(f"index.html: unexpected content type {index_type}")
        parser = AssetParser()
        parser.feed(index_bytes.decode("utf-8"))
        if not parser.app_version:
            raise RuntimeError("index.html: app-version meta is missing")

        tokens = {
            match.group(1)
            for asset in parser.assets
            for match in [re.search(r"[?&]v=([0-9-]+)", asset)]
            if match
        }
        version_parts = parser.app_version.split(".")
        expected_token = "".join(version_parts[:3]) + "-" + "".join(version_parts[3:])
        if tokens != {expected_token}:
            raise RuntimeError(f"cache tokens {sorted(tokens)} do not match {expected_token}")

        for asset in dict.fromkeys(parser.assets):
            _, content_type = fetch(base_url, asset)
            checked[asset] = content_type

        manifest_path = next(asset for asset in parser.assets if asset.startswith("manifest.webmanifest"))
        manifest_bytes, _ = fetch(base_url, manifest_path)
        manifest = json.loads(manifest_bytes)
        for key in ("name", "short_name", "start_url", "scope", "display", "icons"):
            if not manifest.get(key):
                raise RuntimeError(f"manifest: {key} is missing")
        if manifest["display"] != "standalone":
            raise RuntimeError("manifest: display must be standalone")
        for icon in manifest["icons"]:
            _, content_type = fetch(base_url, icon["src"])
            checked[icon["src"]] = content_type
        fetch(base_url, manifest["start_url"])

        sw_bytes, sw_type = fetch(base_url, "sw.js")
        checked["sw.js"] = sw_type
        sw = sw_bytes.decode("utf-8")
        if parser.app_version not in sw:
            raise RuntimeError("sw.js: APP_VERSION does not match index.html")
        shell_assets = re.findall(r'^\s*"([^"]+)",?$', sw, re.MULTILINE)
        if not shell_assets:
            raise RuntimeError("sw.js: APP_SHELL is empty")
        for asset in shell_assets:
            _, content_type = fetch(base_url, asset)
            checked[asset] = content_type

        scripts = {asset for asset in parser.assets if urllib.parse.urlsplit(asset).path.endswith(".js")}
        shell_asset_keys = {asset[2:] if asset.startswith("./") else asset for asset in shell_assets}
        missing_from_shell = sorted(scripts.difference(shell_asset_keys))
        if missing_from_shell:
            raise RuntimeError(f"sw.js: scripts missing from APP_SHELL: {missing_from_shell}")

        result = {
            "status": "ok",
            "appVersion": parser.app_version,
            "httpOrigin": base_url,
            "checkedAssets": len(checked),
            "serviceWorkerAssets": len(shell_assets),
        }
        print(json.dumps(result, ensure_ascii=False, sort_keys=True))
        return 0
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


if __name__ == "__main__":
    raise SystemExit(main())
