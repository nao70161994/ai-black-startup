import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_cache_busting_versions_match_app_version():
    index = (ROOT / "index.html").read_text()
    main = (ROOT / "main.js").read_text()
    sw = (ROOT / "sw.js").read_text()

    assert 'content="2026.05.24.2"' in index
    assert 'style.css?v=20260524-2' in index
    assert 'main.js?v=20260524-2' in index
    assert 'manifest.webmanifest?v=20260524-2' in index
    assert 'icon.svg?v=20260524-2' in index
    assert 'ogp.svg?v=20260524-2' in index
    assert '<meta name="theme-color" content="#19bde8">' in index
    assert 'const APP_VERSION = "2026.05.24.2"' in main
    assert 'const APP_VERSION = "2026.05.24.2"' in sw
    assert 'sw.js?v=20260524-2' in main

    manifest = json.loads((ROOT / "manifest.webmanifest").read_text())
    assert manifest["name"] == "AI社長のブラック起業"
    assert manifest["short_name"] == "AI社長"
    assert manifest["start_url"] == "./index.html?v=20260524-2"
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
    assert "manifest.webmanifest?v=20260524-2" in sw
    assert "icon.svg?v=20260524-2" in sw
    assert "ogp.svg?v=20260524-2" in sw


def test_share_button_and_share_fallback_present():
    index = (ROOT / "index.html").read_text()
    main = (ROOT / "main.js").read_text()

    assert 'id="shareButton"' in index
    assert "function createShareText()" in main
    assert "navigator.share" in main
    assert "navigator.clipboard.writeText" in main
    assert "会社Lv: " in main
    assert "最新ログ: " in main
    assert "製品: " in main
    assert "製品MRR: " in main


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
    assert output["save"]["products"]["dailyReportAi"]["status"] == "idea"
    assert output["save"]["products"]["dailyReportAi"]["quality"] == 60
    assert output["save"]["assignments"] == {"development": None, "qa": None, "sales": None}
    assert output["save"]["productFlags"]["dailyReportAi"]["startedLogged"] is False
    assert output["save"]["productFlags"]["dailyReportAi"]["firstCustomerGranted"] is False
    assert output["save"]["productFlags"]["dailyReportAi"]["mrr10kLogged"] is False
    assert output["save"]["appVersion"] == "2026.05.24.2"


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


def test_product_pipeline_minimum_definition_present():
    main = (ROOT / "main.js").read_text()

    assert 'const SAVE_KEY = "ai_black_startup_save_v1"' in main
    assert 'const LEVEL_THRESHOLDS = [0, 5000, 20000, 80000, 300000, 1000000, 3000000, 10000000, 30000000, 100000000]' in main
    assert 'id: "dailyReportAi"' in main
    assert 'name: "AI日報メーカー"' in main
    assert 'type: "subscription"' in main
    assert 'monthlyPrice: 500' in main
    assert 'developmentRequired: 100' in main
    assert 'demand: 0.8' in main
    assert 'risk: 0.6' in main
    assert 'initialQuality: 60' in main
    assert 'definition.monthlyPrice * product.customers' in main
    assert 'getProductRevenuePerSecond(product)' in main
    assert 'lifetimeRevenue' in main
    assert 'salesPityCounter' in main
    assert 'sellingSeconds' in main
    assert 'firstCustomerGranted' in main
    assert 'PRODUCTS.forEach(function (definition)' in main
    assert 'function applySingleProductPipeline(product, definition)' in main
    assert 'function addProductCustomer(product, definition, flags, firstGuaranteed)' in main
    assert 'definition.monthlyPrice * product.customers' in main
    assert 'return Math.max(0, safeNumber(product.mrr, 0)) / 300' in main


def test_product_pipeline_ui_and_assignment_rules_present():
    index = (ROOT / "index.html").read_text()
    main = (ROOT / "main.js").read_text()

    assert 'id="productPanel"' in index
    assert 'id="assignmentPanel"' in index
    assert 'id="baseIncomeRate"' in index
    assert 'id="productIncomeRate"' in index
    assert 'id="productObjectiveList"' in index
    assert 'AI社長を開発に割り振れば、専門AIがいなくても開発できます' in index
    assert 'boss: { id: "boss", label: "AI社長"' in main
    assert '{ id: "development", label: "開発", workers: ["boss", "dev01"] }' in main
    assert '{ id: "qa", label: "品質管理", workers: ["boss", "security06"] }' in main
    assert '{ id: "sales", label: "販売", workers: ["boss", "sales02"] }' in main
    assert 'if (workerId === "boss") return true' in main
    assert 'if (state.assignments[otherTaskId] === workerId) state.assignments[otherTaskId] = null' in main


def test_product_flags_migrate_from_legacy_shape():
    legacy_save = {
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 1,
        "employees": {"dev01": 0, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "products": {
            "dailyReportAi": {
                "id": "dailyReportAi",
                "status": "selling",
                "progress": 100,
                "quality": 60,
                "bugs": 0,
                "awareness": 0,
                "customers": 20,
                "mrr": 10000,
                "totalSales": 1234,
            }
        },
        "productFlags": {
            "dailyReportMrr10kLogged": True,
            "dailyReportQaLogShown": True,
            "dailyReportSalesStartedLogged": True,
        },
        "assignments": {},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 1760000000000,
    }
    output = run_browser_smoke(legacy_save)
    flags = output["save"]["productFlags"]["dailyReportAi"]
    assert flags["mrr10kLogged"] is True
    assert flags["qaLogShown"] is True
    assert flags["salesStartedLogged"] is True
    assert flags["firstCustomerGranted"] is False
    assert output["save"]["products"]["dailyReportAi"]["lifetimeRevenue"] == 1234


def test_revenue_product_keeps_tick_condition_present():
    main = (ROOT / "main.js").read_text()

    assert "function hasRevenueProduct()" in main
    assert "product.customers > 0 || product.mrr > 0" in main
    assert "!hasRevenueProduct()" in main
    assert "function applyProductRevenue()" in main
    assert "product.lifetimeRevenue" in main
    assert "product.salesPityCounter >= pityLimit" in main
    assert "customerChance: clamp" in main
    assert "初めての顧客が付きました" in main


def test_product_objectives_are_separate_from_stage_missions():
    index = (ROOT / "index.html").read_text()
    main = (ROOT / "main.js").read_text()

    assert 'id="productObjectivePanel"' in index
    assert 'id="productObjectiveList"' in index
    assert "const PRODUCT_OBJECTIVES" in main
    assert "function renderProductObjectives()" in main
    assert 'id: "product_release"' not in main


def test_fractional_customers_are_normalized_to_integer_mrr():
    old_save = {
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 1,
        "employees": {"dev01": 0, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "products": {
            "dailyReportAi": {
                "id": "dailyReportAi",
                "status": "selling",
                "progress": 100,
                "quality": 70,
                "bugs": 0,
                "awareness": 10,
                "customers": 1.9,
                "mrr": 950,
                "lifetimeRevenue": 0,
            }
        },
        "productFlags": {},
        "assignments": {},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 1780416183951,
    }
    output = run_browser_smoke(old_save)
    product = output["save"]["products"]["dailyReportAi"]
    assert product["customers"] == 1
    assert product["mrr"] == 500
    assert isinstance(product["customers"], int)


def test_customer_display_and_share_use_integer_company_units():
    main = (ROOT / "main.js").read_text()

    assert "function formatCustomers(value)" in main
    assert 'formatNumber(Math.floor(safeNumber(value, 0))) + "社"' in main
    assert '"製品顧客数: " + formatCustomers' in main
    assert "formatCurrencyPrecise(revenue)" in main


def test_first_customer_guarantee_and_milestone_flags_present():
    main = (ROOT / "main.js").read_text()

    assert "product.sellingSeconds >= 3" in main
    assert "customers === 0" in main
    assert "flags.firstCustomerGranted" in main
    assert "customer10Logged" in main
    assert "customer50Logged" in main
    assert "customer100Logged" in main
    assert "mrr100kLogged" in main
