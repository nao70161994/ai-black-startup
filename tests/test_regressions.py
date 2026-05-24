import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_cache_busting_versions_match_app_version():
    index = (ROOT / "index.html").read_text()
    main = (ROOT / "main.js").read_text()
    sw = (ROOT / "sw.js").read_text()

    assert 'content="2026.05.24.1"' in index
    assert 'style.css?v=20260524-1' in index
    assert 'main.js?v=20260524-1' in index
    assert 'manifest.webmanifest?v=20260524-1' in index
    assert 'icon.svg?v=20260524-1' in index
    assert '<meta name="theme-color" content="#19bde8">' in index
    assert 'const APP_VERSION = "2026.05.24.1"' in main
    assert 'const APP_VERSION = "2026.05.24.1"' in sw
    assert 'sw.js?v=20260524-1' in main

    manifest = json.loads((ROOT / "manifest.webmanifest").read_text())
    assert manifest["name"] == "AI社長のブラック起業"
    assert manifest["short_name"] == "AI社長"
    assert manifest["start_url"] == "./index.html?v=20260524-1"
    assert manifest["display"] == "standalone"
    assert manifest["theme_color"] == "#19bde8"


def test_service_worker_update_flow_present():
    main = (ROOT / "main.js").read_text()
    sw = (ROOT / "sw.js").read_text()

    assert "serviceWorker" in main
    assert "updatefound" in main
    assert "SKIP_WAITING" in main
    assert "self.skipWaiting()" in sw
    assert "self.clients.claim()" in sw
    assert "caches.delete" in sw
    assert "manifest.webmanifest?v=20260524-1" in sw
    assert "icon.svg?v=20260524-1" in sw


def test_share_button_and_share_fallback_present():
    index = (ROOT / "index.html").read_text()
    main = (ROOT / "main.js").read_text()

    assert 'id="shareButton"' in index
    assert "function createShareText()" in main
    assert "navigator.share" in main
    assert "navigator.clipboard.writeText" in main
    assert "会社Lv: " in main
    assert "最新ログ: " in main


def run_browser_smoke(save):
    script = r'''
const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync('main.js', 'utf8');
const input = JSON.parse(process.argv[1]);
function createElement(id) {
  const classes = new Set();
  return {
    id, textContent: '', innerHTML: '', hidden: false, className: '',
    classList: { add: (...n) => n.forEach(x => classes.add(x)), remove: (...n) => n.forEach(x => classes.delete(x)), toggle: (n, f) => f ? classes.add(n) : classes.delete(n) },
    closest: () => createElement(id + '-closest'),
    querySelectorAll: () => [], addEventListener: () => {},
  };
}
const store = { ai_black_startup_save_v1: JSON.stringify(input) };
const elements = new Map();
const document = {
  addEventListener: (event, cb) => { if (event === 'DOMContentLoaded') cb(); },
  getElementById: (id) => { if (!elements.has(id)) elements.set(id, createElement(id)); return elements.get(id); }
};
const window = { setTimeout: () => 1, clearTimeout: () => {}, setInterval: () => 1, addEventListener: () => {}, confirm: () => true };
const navigator = { serviceWorker: { register: () => Promise.resolve({ waiting: null, addEventListener: () => {} }), controller: null } };
const location = { protocol: 'http:' };
const localStorage = { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } };
vm.runInNewContext(code, { window, document, localStorage, navigator, location, console, Date, Math, Number, String, Boolean, Object, Array, Promise });
console.log(JSON.stringify({ save: JSON.parse(store.ai_black_startup_save_v1), employeeHtml: elements.get('employeeList').innerHTML }));
'''
    result = subprocess.run(
        ["node", "-e", script, json.dumps(save)],
        cwd=ROOT,
        check=True,
        text=True,
        capture_output=True,
    )
    return json.loads(result.stdout)


def test_existing_save_is_normalized_with_security06():
    old_save = {
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 1,
        "employees": {"dev01": 1, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 1760000000000,
    }
    output = run_browser_smoke(old_save)
    assert output["save"]["employees"]["security06"] == 0
    assert output["save"]["appVersion"] == "2026.05.24.1"


def test_security06_visible_at_company_level_5():
    lv5_save = {
        "money": 10000,
        "totalMoney": 300000,
        "users": 0,
        "bugs": 100,
        "fire": 0,
        "companyLevel": 5,
        "employees": {"dev01": 1, "sales02": 0, "buzz03": 1, "care04": 1, "fire05": 1},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 1760000000000,
    }
    output = run_browser_smoke(lv5_save)
    assert "Security-06" in output["employeeHtml"]
    assert "雇用 ¥5.0K" in output["employeeHtml"]
