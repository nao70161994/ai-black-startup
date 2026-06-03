import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_cache_busting_versions_match_app_version():
    index = (ROOT / "index.html").read_text()
    main = (ROOT / "main.js").read_text()
    sw = (ROOT / "sw.js").read_text()

    assert 'content="2026.05.24.20"' in index
    assert 'style.css?v=20260524-20' in index
    assert 'main.js?v=20260524-20' in index
    assert 'manifest.webmanifest?v=20260524-20' in index
    assert 'icon.svg?v=20260524-20' in index
    assert 'ogp.svg?v=20260524-20' in index
    assert '<meta name="theme-color" content="#19bde8">' in index
    assert 'const APP_VERSION = "2026.05.24.20"' in main
    assert 'const APP_VERSION = "2026.05.24.20"' in sw
    assert 'sw.js?v=20260524-20' in main

    manifest = json.loads((ROOT / "manifest.webmanifest").read_text())
    assert manifest["name"] == "AI社長のブラック起業"
    assert manifest["short_name"] == "AI社長"
    assert manifest["start_url"] == "./index.html?v=20260524-20"
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
    assert "manifest.webmanifest?v=20260524-20" in sw
    assert "icon.svg?v=20260524-20" in sw
    assert "ogp.svg?v=20260524-20" in sw


def test_share_button_and_share_fallback_present():
    index = (ROOT / "index.html").read_text()
    main = (ROOT / "main.js").read_text()

    assert 'id="shareButton"' in index
    assert "function createShareText()" in main
    assert "navigator.share" in main
    assert "navigator.clipboard.writeText" in main
    assert "会社Lv: " in main
    assert "最新ログ: " in main
    assert "主要製品: " in main
    assert "総MRR: " in main
    assert "製品一覧: " in main


def run_browser_smoke(save):
    script = r'''
const fs = require('fs');
const vm = require('vm');
let code = fs.readFileSync('main.js', 'utf8');
code = code.replace('document.addEventListener("DOMContentLoaded", boot);', 'window.__testApi = { assignAiToTask, tick, saveGame }; document.addEventListener("DOMContentLoaded", boot);');
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
console.log(JSON.stringify({
  save: JSON.parse(store.ai_black_startup_save_v1),
  employeeHtml: elements.get('employeeList').innerHTML,
  employeePanelHtml: elements.get('employeePanel').innerHTML,
  productHtml: elements.get('productPanel').innerHTML,
  primaryProductHtml: elements.get('primaryProductPanel').innerHTML,
  recommendationHtml: elements.get('nextRecommendationPanel').innerHTML,
  activityText: elements.get('activityText').textContent,
  latestLog: elements.get('latestLogText').textContent,
  assignmentHtml: elements.get('assignmentPanel').innerHTML,
  logPanelHtml: elements.get('logPanel').innerHTML,
  objectiveHtml: elements.get('productObjectivePanel').innerHTML,
  missionStage: elements.get('missionStage').textContent,
  missionHtml: elements.get('missionList').innerHTML
}));
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
    assert output["save"]["products"]["dailyReportAi"]["version"] == 1
    assert output["save"]["products"]["dailyReportAi"]["upgradeProgress"] == 0
    assert output["save"]["products"]["dailyReportAi"]["upgradeStatus"] == "idle"
    assert output["save"]["products"]["meetingMinutesAi"]["status"] == "idea"
    assert output["save"]["products"]["meetingMinutesAi"]["quality"] == 55
    assert output["save"]["products"]["meetingMinutesAi"]["version"] == 1
    assert output["save"]["products"]["meetingMinutesAi"]["upgradeProgress"] == 0
    assert output["save"]["products"]["meetingMinutesAi"]["upgradeStatus"] == "idle"
    assert output["save"]["products"]["slideKitAi"]["status"] == "idea"
    assert output["save"]["products"]["slideKitAi"]["quality"] == 55
    assert output["save"]["products"]["slideKitAi"]["unitsSold"] == 0
    assert output["save"]["products"]["slideKitAi"]["oneShotSalesPityCounter"] == 0
    assert output["save"]["assignments"] == {
        "development": {"productId": "dailyReportAi", "aiId": None},
        "qa": {"productId": "dailyReportAi", "aiId": None},
        "sales": {"productId": "dailyReportAi", "aiId": None},
        "marketing": {"productId": "dailyReportAi", "aiId": None},
        "support": {"productId": "dailyReportAi", "aiId": None},
    }
    assert output["save"]["productFlags"]["dailyReportAi"]["startedLogged"] is False
    assert output["save"]["productFlags"]["dailyReportAi"]["firstCustomerGranted"] is False
    assert output["save"]["productFlags"]["dailyReportAi"]["mrr10kLogged"] is False
    assert output["save"]["productFlags"]["meetingMinutesAi"]["startedLogged"] is False
    assert output["save"]["productFlags"]["slideKitAi"]["startedLogged"] is False
    assert "製品一覧を開く" in output["productHtml"]
    assert "3製品運用" in output["productHtml"]
    assert "AI日報メーカー" in output["primaryProductHtml"]
    assert "現在の担当" in output["assignmentHtml"]
    assert "担当を変更" in output["assignmentHtml"]
    assert output["save"]["appVersion"] == "2026.05.24.20"


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
    assert "社員を見る" in output["employeePanelHtml"]
    assert "Dev-01 Lv1" in output["employeePanelHtml"]
    assert "Security-06" in (ROOT / "main.js").read_text()


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
    assert 'id: "meetingMinutesAi"' in main
    assert 'name: "自動議事録AI"' in main
    assert 'monthlyPrice: 1200' in main
    assert 'developmentRequired: 180' in main
    assert 'demand: 1.0' in main
    assert 'risk: 1.0' in main
    assert 'initialQuality: 55' in main
    assert 'id: "slideKitAi"' in main
    assert 'name: "AIスライド生成キット"' in main
    assert 'type: "oneShot"' in main
    assert 'price: 9800' in main
    assert 'developmentRequired: 160' in main
    assert 'demand: 1.2' in main
    assert 'getCurrentMonthlyPrice(product, definition) * getProductCustomers(product)' in main
    assert 'getProductRevenuePerSecond(product, definition)' in main
    assert 'lifetimeRevenue' in main
    assert 'salesPityCounter' in main
    assert 'sellingSeconds' in main
    assert 'firstCustomerGranted' in main
    assert 'PRODUCTS.forEach(function (definition)' in main
    assert 'function applySingleProductPipeline(product, definition)' in main
    assert 'function addProductCustomer(product, definition, flags, firstGuaranteed)' in main
    assert 'getCurrentMonthlyPrice(product, definition) * getProductCustomers(product)' in main
    assert 'return getProductMrr(product, definition || getProductDefinition(product.id)) / 300' in main


def test_products_collection_has_two_subscription_products():
    main = (ROOT / "main.js").read_text()

    assert 'id: "dailyReportAi"' in main
    assert 'id: "meetingMinutesAi"' in main
    assert main.count('type: "subscription"') == 2
    assert main.count('type: "oneShot"') == 1
    assert 'PRODUCTS.map(function (definition)' in main
    assert 'getAssignmentTargetButtons(taskId)' not in main
    assert 'button[data-modal-product]' in main


def test_product_pipeline_ui_and_assignment_rules_present():
    index = (ROOT / "index.html").read_text()
    main = (ROOT / "main.js").read_text()

    assert 'id="productPanel"' in index
    assert 'id="assignmentPanel"' in index
    assert 'id="baseIncomeRate"' not in index
    assert 'id="productIncomeRate"' not in index
    assert 'id="activityPanel"' in index
    assert 'id="latestLogText"' in index
    assert 'id="productObjectiveList"' in index
    assert 'AI社長を開発に割り振れば、専門AIがいなくても開発できます' in index
    assert 'boss: { id: "boss", label: "AI社長"' in main
    assert '{ id: "development", label: "開発", workers: ["boss", "dev01"] }' in main
    assert '{ id: "qa", label: "品質管理", workers: ["boss", "security06"] }' in main
    assert '{ id: "sales", label: "販売", workers: ["boss", "sales02"] }' in main
    assert '{ id: "support", label: "サポート", workers: ["boss", "care04"] }' in main
    assert 'if (workerId === "boss") return true' in main
    assert "function getAssignment(taskId)" in main
    assert "function getAssignmentProduct(taskId)" in main
    assert "function getAssignmentAi(taskId)" in main
    assert "function assignAiToTask(taskId, aiId, productId, mode)" in main
    assert "function clearAssignment(taskId)" in main
    assert 'if (state.assignments[otherTaskId] && state.assignments[otherTaskId].aiId === aiId) state.assignments[otherTaskId].aiId = null' in main
    assert "function openAssignmentModal()" in main
    assert "function closeAssignmentModal()" in main
    assert "function renderAssignmentModal()" in main
    assert "function selectAssignmentTask(taskId)" in main
    assert "function setAssignmentProduct(taskId, productId)" in main
    assert 'id="openAssignmentModal"' in main
    assert 'data-modal-product="' in main
    assert 'data-modal-ai="' in main
    assert "自動議事録AI" in main


def test_legacy_assignments_migrate_to_product_scoped_shape():
    legacy_save = {
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 5,
        "employees": {"dev01": 1, "sales02": 1, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 1},
        "products": {},
        "productFlags": {},
        "assignments": {"development": "boss", "qa": "security06", "sales": "sales02"},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 1780416183951,
    }
    output = run_browser_smoke(legacy_save)
    assignments = output["save"]["assignments"]
    assert assignments["development"] == {"productId": "dailyReportAi", "aiId": "boss"}
    assert output["save"]["products"]["meetingMinutesAi"]["id"] == "meetingMinutesAi"
    assert assignments["qa"] == {"productId": "dailyReportAi", "aiId": "security06"}
    assert assignments["sales"] == {"productId": "dailyReportAi", "aiId": "sales02"}
    assert assignments["support"] == {"productId": "dailyReportAi", "aiId": None}
    assert assignments["development"]["productId"] == "dailyReportAi"


def test_duplicate_ai_assignment_removes_previous_task():
    legacy_save = {
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 1,
        "employees": {"dev01": 0, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "products": {},
        "productFlags": {},
        "assignments": {"development": "boss", "qa": "boss", "sales": None},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 1780416183951,
    }
    output = run_browser_smoke(legacy_save)
    ai_ids = [assignment["aiId"] for assignment in output["save"]["assignments"].values()]
    assert ai_ids.count("boss") == 1


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


def test_mrr_recurring_revenue_is_independent_from_sales_assignment():
    main = (ROOT / "main.js").read_text()

    assert "function hasRevenueProduct()" in main
    assert "getProductCustomers(product) > 0 || getProductMrr(product, definition) > 0" in main
    assert "function applyProductRevenue()" in main
    assert "getProductRevenuePerSecond(product, definition)" in main
    assert 'const salesAssignment = getAssignment("sales")' in main
    assert "product.id === salesAssignment.productId ? salesAssignment.aiId : null" in main


def test_revenue_product_keeps_tick_condition_present():
    main = (ROOT / "main.js").read_text()

    assert "function hasRevenueProduct()" in main
    assert "getProductCustomers(product) > 0 || getProductMrr(product, definition) > 0" in main
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
    assert 'formatNumber(getProductCustomers({ customers: value })) + "社"' in main
    assert '" / 顧客" + formatCustomers(getProductCustomers(product))' in main or '": サブスク / 顧客" + formatCustomers(getProductCustomers(product))' in main
    assert "formatCurrency(getProductMrr(product, definition))" in main


def test_first_customer_guarantee_and_milestone_flags_present():
    main = (ROOT / "main.js").read_text()

    assert "product.sellingSeconds >= 3" in main
    assert "getProductCustomers(product) === 0" in main
    assert "flags.firstCustomerGranted" in main
    assert "customer10Logged" in main
    assert "customer50Logged" in main
    assert "customer100Logged" in main
    assert "mrr100kLogged" in main


def test_saved_mrr_is_derived_from_integer_customers():
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
                "customers": 2,
                "mrr": 1400,
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
    assert product["customers"] == 2
    assert product["mrr"] == 1000


def test_product_mrr_and_revenue_are_derived_values():
    main = (ROOT / "main.js").read_text()

    assert "function getProductCustomers(product)" in main
    assert "return Math.max(0, Math.floor(Number(product.customers) || 0))" in main
    assert "function getProductMrr(product, definition)" in main
    assert 'getCurrentMonthlyPrice(product, definition) * getProductCustomers(product)' in main
    assert "function getProductRevenuePerSecond(product, definition)" in main
    assert "return getProductMrr(product, definition || getProductDefinition(product.id)) / 300" in main
    assert "formatCurrency(getProductMrr(product, definition))" in main
    assert "function getTotalProductMrr()" in main
    assert "getTotalProductMrr()" in main


def test_two_product_targets_and_share_summary_present():
    main = (ROOT / "main.js").read_text()

    assert 'name: "自動議事録AI"' in main
    assert 'PRODUCTS.map(function (definition)' in main
    assert 'button[data-product-menu]' in main
    assert 'id="openAssignmentModal"' in main
    assert 'button[data-modal-product]' in main
    assert 'button[data-modal-ai]' in main
    assert '"主要製品: " + primaryDefinition.name' in main
    assert '"総MRR: " + formatCurrency(getTotalProductMrr()) + "/月"' in main
    assert '"製品一覧: " + getProductShareSummary()' in main


def test_sales_target_ui_is_explicit():
    main = (ROOT / "main.js").read_text()

    assert "対象: " in main
    assert "製品一覧" in main
    assert "3製品運用" in main
    assert "の新規顧客を確率で獲得" in main
    assert "現在の担当" in main
    assert "担当を変更" in main
    assert "未割り振り。既存顧客のMRRのみ継続" in main
    assert "AIたちが担当中の製品です。" in main


def test_assignment_modal_ui_present():
    index = (ROOT / "index.html").read_text()
    main = (ROOT / "main.js").read_text()

    assert 'id="assignmentModal"' in index
    assert "現在の担当" in main
    assert "担当を変更" in main
    assert "assignment-summary-list" in main
    assert "assignment-modal" in main
    assert "modal-option" in main
    assert "disabled" in main
    assert "タスク・対象製品・担当AIを選んで割り振ります" in main
    assert "未選択の項目があります" in main
    assert "assignAiToTask(assignmentDraft.taskId, assignmentDraft.aiId, assignmentDraft.productId, assignmentDraft.mode)" in main
    assert "clearAssignment(assignmentDraft.taskId)" in main


def test_product_mrr_is_not_used_directly_for_revenue_or_share():
    main = (ROOT / "main.js").read_text()

    assert "safeNumber(product.mrr" not in main
    assert "formatCurrency(product.mrr" not in main
    assert '"総MRR: " + formatCurrency(getTotalProductMrr())' in main
    assert "return getProductMrr(product, definition || getProductDefinition(product.id)) / 300" in main
    assert "getProductMrr(product, definition) >= 10000" in main


def test_assignment_modal_visual_states_are_readable():
    main = (ROOT / "main.js").read_text()
    css = (ROOT / "style.css").read_text()

    assert "販売担当を外しても、既存顧客のMRRは継続します" in main
    assert "開発担当を割り振ると進捗が進みます" in main
    assert "販売担当を割り振ると顧客を獲得できます" in main
    assert "product-assignment-badge" in main
    assert "未雇用" in main
    assert "modal-subtle-button" in main
    assert "modal-clear-button" in main
    assert "担当なし" in main
    assert ".modal-option:disabled" in css
    assert "opacity: 1" in css
    assert "color: #33444d" in css
    assert "background: #dfe7eb" in css
    assert "border-color: rgba(76, 89, 98, 0.54)" in css
    assert ".modal-option.active" in css
    assert "color: #07506a" in css


def test_assignment_modal_subtle_actions_and_disabled_contrast():
    main = (ROOT / "main.js").read_text()
    css = (ROOT / "style.css").read_text()

    assert "modal-apply-button" in main
    assert "modal-subtle-button modal-clear-button" in main
    assert "未雇用" in main
    assert ".modal-apply-button" in css
    assert ".modal-subtle-button" in css
    assert ".modal-clear-button" in css
    assert "grid-template-columns: 1.25fr 0.82fr 0.82fr" in css
    assert "color: #33444d" in css
    assert "background: #dfe7eb" in css


def test_product_card_assignment_flow_exists():
    main = (ROOT / "main.js").read_text()
    css = (ROOT / "style.css").read_text()

    assert "function getProductActionButtons(product, definition)" in main
    assert "function renderProductActionMenuModal()" in main
    assert "function openProductActionMenu(productId)" in main
    assert "操作を選ぶと、担当AI選択へ進みます" in main
    assert "開発する" in main
    assert "販売する" in main
    assert "品質管理" in main
    assert "data-product-menu" in main
    assert "data-product-action" in main
    assert "function openProductAssignmentModal(taskId, productId, mode)" in main
    assert 'assignmentModalMode = "product"' in main
    assert "assignmentDraft.taskId = taskId" in main
    assert "assignmentDraft.productId = definition.id" in main
    assert "function getAssignmentModalTitle()" in main
    assert "担当AIを選んでください" in main
    assert "function getWorkerTaskDescription(workerId, taskId)" in main
    assert "何でもできるが低速" in main
    assert "開発が速いがバグ増加" in main
    assert "顧客獲得が速いが炎上微増" in main
    assert "品質改善とバグ削減が得意" in main
    assert "function startProductDevelopmentIfNeeded(productId)" in main
    assert 'if (taskId === "development" && aiId)' in main
    assert 'if (actionMode === "upgrade") startSubscriptionUpgrade(normalizedProductId);' in main
    assert 'else startProductDevelopmentIfNeeded(normalizedProductId)' in main
    assert ".product-actions" in css
    assert ".product-action-menu-modal.open" in css
    assert ".product-action-menu-button" in css
    assert ".worker-option" in css


def test_high_priority_pipeline_foundation_is_prepared():
    main = (ROOT / "main.js").read_text()

    assert "state.assignments.development = { productId: definition.id, aiId: developmentAssignment.aiId }" in main
    assert "開発対象を自動議事録AIに設定しました" in main
    assert "次に開発担当を割り振りましょう" in main
    assert "function applyDevelopmentTask(product, definition)" in main
    assert "function applyQaTask(product, definition)" in main
    assert "function applySalesTask(product, definition)" in main
    assert "function applyProductMilestones(product, definition)" in main
    assert "function applySubscriptionRevenue(product, definition)" in main
    assert "function applyOneShotRevenue(product, definition)" in main
    assert 'if (definition.type === "subscription") return sum + applySubscriptionRevenue(product, definition)' in main
    assert 'if (definition.type === "oneShot") return sum + applyOneShotRevenue(product, definition)' in main
    assert "function getAssignedWorkerForProduct(taskId, productId)" in main
    assert "function getProductLogText(productId, key, fallback)" in main
    assert "const PRODUCT_LOG_TEXTS" in main
    assert "自動議事録AIが完成しました" in main
    assert "日報が少しだけ会社を救っています" in main
    assert "getAssignmentTargetButtons" not in main


def test_one_shot_slide_kit_pipeline_present():
    main = (ROOT / "main.js").read_text()

    assert 'id: "slideKitAi"' in main
    assert 'name: "AIスライド生成キット"' in main
    assert 'type: "oneShot"' in main
    assert 'price: 9800' in main
    assert "unitsSold" in main
    assert "oneShotSalesPityCounter" in main
    assert "function getProductUnitsSold(product)" in main
    assert "function applyOneShotSalesActivity(product, definition, workerId, flags)" in main
    assert "function addOneShotSale(product, definition, flags)" in main
    assert "state.money = Math.max(0, state.money + price)" in main
    assert "state.totalMoney = Math.max(0, state.totalMoney + price)" in main
    assert "product.lifetimeRevenue = Math.max(0, safeNumber(product.lifetimeRevenue, 0) + price)" in main
    assert "function applyOneShotRevenue(product, definition)" in main
    assert "return 0" in main
    assert "saleChance" in main
    assert 'pityLimit = workerId === "sales02" ? 25 : 40' in main
    assert "売り切り / " in main
    assert "本販売 / 累計売上" in main
    assert "MRR <strong>なし" in main
    assert "AIスライド生成キットが初めて売れました" in main
    assert "AIスライド生成キットの販売数が10本を超えました" in main
    assert "AIスライド生成キットの販売数が50本を超えました" in main
    assert "AIスライド生成キットの販売数が100本を超えました" in main
    assert "AI日報メーカーをv2にする" in main
    assert "自動議事録AIをv2にする" in main


def test_cache_busting_updated_for_mrr_discrete_fix():
    index = (ROOT / "index.html").read_text()
    main = (ROOT / "main.js").read_text()
    sw = (ROOT / "sw.js").read_text()

    assert 'content="2026.05.24.20"' in index
    assert 'main.js?v=20260524-20' in index
    assert 'sw.js?v=20260524-20' in main
    assert 'const APP_VERSION = "2026.05.24.20"' in sw



def test_subscription_product_upgrade_pipeline_present():
    main = (ROOT / "main.js").read_text()

    assert "version: 1" in main
    assert "upgradeProgress: 0" in main
    assert 'upgradeStatus: "idle"' in main
    assert 'product.version = Math.max(1, Math.floor(safeNumber(saved.version, product.version)))' in main
    assert "const canResumeUpgrade = definition.type === \"subscription\"" in main
    assert 'product.upgradeStatus = canResumeUpgrade ? "upgrading" : "idle"' in main
    assert "function getCurrentMonthlyPrice(product, definition)" in main
    assert "Math.round(definition.monthlyPrice * (1 + 0.2 * (getProductVersion(product) - 1)))" in main
    assert "getCurrentMonthlyPrice(product, definition) * getProductCustomers(product)" in main
    assert "function startSubscriptionUpgrade(productId)" in main
    assert 'product.upgradeStatus = "upgrading"' in main
    assert "function applySubscriptionUpgradeDevelopment(product, definition, workerId)" in main
    assert "function completeSubscriptionUpgrade(product, definition)" in main
    assert "product.version = getProductVersion(product) + 1" in main
    assert "product.quality = clamp(product.quality + 8, 0, 100)" in main
    assert "product.awareness = clamp(product.awareness + 5, 0, 100)" in main
    assert "product.bugs = clamp(product.bugs + 5, 0, 100)" in main
    assert "バージョンアップ" in main
    assert 'definition.type === "subscription" && (product.status === "ready" || product.status === "selling") && product.upgradeStatus === "idle"' in main
    assert "売り切り / 価格" in main
    assert "AI日報メーカー v{version} の開発を開始しました" in main
    assert "自動議事録AI v{version} の開発を開始しました" in main
    assert 'return definition.name + " v" + getProductVersion(product)' in main
    assert "月額価格+20%" in main
    assert "副作用: 製品バグ+5" in main


def test_subscription_version_affects_rendered_mrr_and_share_text():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 1,
        "employees": {"dev01": 1, "sales02": 1, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "products": {
            "dailyReportAi": {"id": "dailyReportAi", "status": "selling", "progress": 100, "quality": 60, "bugs": 0, "awareness": 10, "customers": 10, "mrr": 9999, "version": 2, "upgradeProgress": 45, "upgradeStatus": "upgrading"},
            "slideKitAi": {"id": "slideKitAi", "status": "ready", "progress": 160, "quality": 55, "bugs": 0, "awareness": 0, "unitsSold": 0, "version": 4, "upgradeProgress": 80, "upgradeStatus": "upgrading"},
        },
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 1760000000000,
    })
    product = output["save"]["products"]["dailyReportAi"]
    assert product["version"] == 2
    assert product["upgradeProgress"] == 45
    assert product["upgradeStatus"] == "upgrading"
    assert product["mrr"] == 6000
    assert "製品一覧を開く" in output["productHtml"]
    assert "AI日報メーカー v2" in output["primaryProductHtml"]
    assert "MRR ¥6.0K/月" in output["primaryProductHtml"]


def run_game_action_smoke(save, action_script):
    script = r'''
const fs = require('fs');
const vm = require('vm');
let code = fs.readFileSync('main.js', 'utf8');
code = code.replace('document.addEventListener("DOMContentLoaded", boot);', 'window.__testApi = { assignAiToTask, tick, saveGame }; document.addEventListener("DOMContentLoaded", boot);');
const input = JSON.parse(process.argv[1]);
const action = process.argv[2];
let timeoutQueue = [];
function createElement(id) {
  const classes = new Set();
  return {
    id, textContent: '', innerHTML: '', hidden: false, className: '', style: {},
    classList: { add: (...n) => n.forEach(x => classes.add(x)), remove: (...n) => n.forEach(x => classes.delete(x)), toggle: (n, f) => f ? classes.add(n) : classes.delete(n) },
    closest: () => createElement(id + '-closest'),
    querySelectorAll: () => [], addEventListener: () => {},
  };
}
const store = { ai_black_startup_save_v1: JSON.stringify(input) };
const elements = new Map();
const document = {
  addEventListener: (event, cb) => { if (event === 'DOMContentLoaded') cb(); },
  getElementById: (id) => { if (!elements.has(id)) elements.set(id, createElement(id)); return elements.get(id); },
  createElement: (tag) => createElement(tag),
  body: { appendChild: () => {}, removeChild: () => {} },
  execCommand: () => true,
};
const window = { setTimeout: (cb) => { timeoutQueue.push(cb); return timeoutQueue.length; }, clearTimeout: () => {}, setInterval: () => 1, addEventListener: () => {}, confirm: () => true };
const navigator = { serviceWorker: { register: () => Promise.resolve({ waiting: null, addEventListener: () => {} }), controller: null } };
const location = { protocol: 'http:' };
const localStorage = { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } };
const sandbox = { window, document, localStorage, navigator, location, console, Date, Math, Number, String, Boolean, Object, Array, Promise };
vm.runInNewContext(code, sandbox);
vm.runInNewContext(action, sandbox);
console.log(JSON.stringify({
  save: JSON.parse(store.ai_black_startup_save_v1),
  productHtml: elements.get('productPanel').innerHTML,
  primaryProductHtml: elements.get('primaryProductPanel').innerHTML,
  employeePanelHtml: elements.get('employeePanel').innerHTML,
  assignmentHtml: elements.get('assignmentPanel').innerHTML,
  missionStage: elements.get('missionStage').textContent,
  missionHtml: elements.get('missionList').innerHTML,
  latestLog: elements.get('latestLogText').textContent,
}));
'''
    result = subprocess.run(
        ["node", "-e", script, json.dumps(save), action_script],
        cwd=ROOT,
        check=True,
        text=True,
        capture_output=True,
    )
    return json.loads(result.stdout)


def test_development_assignment_to_completed_subscription_requires_upgrade_mode():
    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 1,
        "employees": {"dev01": 1, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "progress": 100, "quality": 60, "bugs": 0, "awareness": 10, "customers": 2, "version": 1, "upgradeStatus": "idle"}},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 1760000000000,
    }, "window.__testApi.assignAiToTask('development', 'dev01', 'dailyReportAi'); window.__testApi.tick(); window.__testApi.saveGame();")
    product = output["save"]["products"]["dailyReportAi"]
    assert output["save"]["assignments"]["development"] == {"productId": "dailyReportAi", "aiId": "dev01"}
    assert product["upgradeStatus"] == "idle"

    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 1,
        "employees": {"dev01": 1, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "progress": 100, "quality": 60, "bugs": 0, "awareness": 10, "customers": 2, "version": 1, "upgradeStatus": "idle"}},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 1760000000000,
    }, "window.__testApi.assignAiToTask('development', 'dev01', 'dailyReportAi', 'upgrade'); window.__testApi.tick(); window.__testApi.saveGame();")
    product = output["save"]["products"]["dailyReportAi"]
    assert product["upgradeStatus"] == "upgrading"
    assert product["upgradeProgress"] > 0
    assert product["status"] == "selling"
    assert product["mrr"] == 1000


def test_broken_upgrade_status_is_normalized_for_unfinished_and_one_shot_products():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 1,
        "employees": {"dev01": 1, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "products": {
            "dailyReportAi": {"id": "dailyReportAi", "status": "idea", "progress": 0, "quality": 60, "bugs": 0, "awareness": 0, "customers": 0, "version": 3, "upgradeProgress": 80, "upgradeStatus": "upgrading"},
            "meetingMinutesAi": {"id": "meetingMinutesAi", "status": "developing", "progress": 20, "quality": 55, "bugs": 0, "awareness": 0, "customers": 0, "version": 2, "upgradeProgress": 30, "upgradeStatus": "upgrading"},
            "slideKitAi": {"id": "slideKitAi", "status": "ready", "progress": 160, "quality": 55, "bugs": 0, "awareness": 0, "unitsSold": 0, "version": 4, "upgradeProgress": 90, "upgradeStatus": "upgrading"},
        },
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 1760000000000,
    })
    assert output["save"]["products"]["dailyReportAi"]["upgradeStatus"] == "idle"
    assert output["save"]["products"]["dailyReportAi"]["upgradeProgress"] == 0
    assert output["save"]["products"]["meetingMinutesAi"]["upgradeStatus"] == "idle"
    assert output["save"]["products"]["meetingMinutesAi"]["upgradeProgress"] == 0
    assert output["save"]["products"]["slideKitAi"]["upgradeStatus"] == "idle"
    assert output["save"]["products"]["slideKitAi"]["upgradeProgress"] == 0


def test_upgrade_completion_raises_version_price_and_mrr_behavior():
    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 1,
        "employees": {"dev01": 1, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "assignments": {"development": {"productId": "dailyReportAi", "aiId": "dev01"}},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "progress": 100, "quality": 60, "bugs": 1, "awareness": 10, "customers": 10, "version": 1, "upgradeProgress": 99, "upgradeStatus": "upgrading"}},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 1760000000000,
    }, "window.__testApi.tick(); window.__testApi.saveGame();")
    product = output["save"]["products"]["dailyReportAi"]
    assert product["version"] == 2
    assert product["upgradeStatus"] == "idle"
    assert product["upgradeProgress"] == 0
    assert product["quality"] >= 68
    assert product["awareness"] >= 15
    assert product["bugs"] >= 6
    assert product["mrr"] == 6000
    assert output["save"]["totalMoney"] >= 20


def test_recurring_and_one_shot_revenue_paths_are_separate_behavior():
    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 1,
        "employees": {"dev01": 0, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "assignments": {"development": {"productId": "dailyReportAi", "aiId": None}, "qa": {"productId": "dailyReportAi", "aiId": None}, "sales": {"productId": "dailyReportAi", "aiId": None}},
        "products": {
            "dailyReportAi": {"id": "dailyReportAi", "status": "selling", "progress": 100, "quality": 60, "bugs": 0, "awareness": 0, "customers": 3, "version": 2, "mrr": 9999},
            "slideKitAi": {"id": "slideKitAi", "status": "selling", "progress": 160, "quality": 55, "bugs": 0, "awareness": 0, "unitsSold": 5, "lifetimeRevenue": 49000},
        },
        "logs": [],
        "claimedMissions": ["daily_report_developing", "assign_daily_development", "daily_report_ready_mission", "assign_daily_sales", "daily_first_customer", "daily_mrr_500", "meeting_developing", "meeting_ready_mission", "total_mrr_10k_mission", "slide_developing", "slide_ready_mission", "slide_first_sale_mission", "daily_v2_mission", "meeting_v2_mission", "any_product_quality_70"],
        "lastSavedAt": 9999999999999,
    }, "window.__testApi.tick(); window.__testApi.saveGame();")
    daily = output["save"]["products"]["dailyReportAi"]
    slide = output["save"]["products"]["slideKitAi"]
    assert daily["mrr"] == 1800
    assert output["save"]["money"] == 6
    assert output["save"]["totalMoney"] == 6
    assert slide["unitsSold"] == 5
    assert slide["lifetimeRevenue"] == 49000
    assert "売り切り累計 ¥49.0K" in output["productHtml"]


def test_product_card_summary_version_and_marketing_hint_present():
    main = (ROOT / "main.js").read_text()
    css = (ROOT / "style.css").read_text()

    assert "function getSubscriptionVersionLine(product)" in main
    assert "getProductVersion(product) + \"運用中\"" in main
    assert "開発中 " in main
    assert "function getMarketingEffectHint(productId)" in main
    assert "認知度UP → 販売成功率UP / 炎上微増" in main
    assert "primary-metric" in main
    assert "product-detail-item" in main
    assert ".product-summary-metrics .primary-metric" in css
    assert ".product-detail-item" in css
    assert ".product-summary-metrics .marketing-effect" in css


def test_marketing_task_and_product_centered_missions_present():
    main = (ROOT / "main.js").read_text()

    assert '{ id: "marketing", label: "広報", workers: ["boss", "buzz03"] }' in main
    assert 'marketing: { productId: PRODUCTS[0].id, aiId: null }' in main
    assert 'marketing: { boss: "ゆっくり認知度を上げる", buzz03: "認知度を大きく上げるが炎上微増" }' in main
    assert 'function applyMarketingTask(product, definition)' in main
    assert 'product.awareness = clamp(product.awareness + marketing.awareness, 0, 100)' in main
    assert 'state.fire = clamp(state.fire + marketing.fire, 0, 100)' in main
    assert 'function getMarketingEffect(workerId)' in main
    assert '0.35 + level * 0.10' in main
    assert 'fire: 0.03' in main
    assert 'AI日報メーカーを開発中にする' in main
    assert 'AI日報メーカーに販売担当を割り振る' in main
    assert 'AIスライド生成キットを1本販売する' in main
    assert 'いずれかの製品の品質を70以上にする' in main
    assert 'AI日報メーカーをv2にする' in main
    assert '自動議事録AIをv2にする' in main


def test_qa_and_marketing_status_limits_behavior():
    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 5,
        "employees": {"dev01": 0, "sales02": 0, "buzz03": 1, "care04": 0, "fire05": 0, "security06": 1},
        "assignments": {"qa": {"productId": "dailyReportAi", "aiId": "security06"}, "marketing": {"productId": "dailyReportAi", "aiId": "buzz03"}},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "idea", "progress": 0, "quality": 60, "bugs": 10, "awareness": 0, "customers": 0}},
        "logs": [],
        "claimedMissions": ["daily_report_developing", "assign_daily_development", "daily_report_ready_mission", "assign_daily_sales", "daily_first_customer", "daily_mrr_500", "meeting_developing", "meeting_ready_mission", "total_mrr_10k_mission", "slide_developing", "slide_ready_mission", "slide_first_sale_mission", "daily_v2_mission", "meeting_v2_mission", "any_product_quality_70"],
        "lastSavedAt": 9999999999999,
    }, "window.__testApi.tick(); window.__testApi.saveGame();")
    product = output["save"]["products"]["dailyReportAi"]
    assert product["quality"] == 60
    assert product["bugs"] == 10
    assert product["awareness"] == 0

    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 5,
        "employees": {"dev01": 0, "sales02": 0, "buzz03": 1, "care04": 0, "fire05": 0, "security06": 1},
        "assignments": {"qa": {"productId": "dailyReportAi", "aiId": "security06"}, "marketing": {"productId": "dailyReportAi", "aiId": "buzz03"}},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "developing", "progress": 1, "quality": 60, "bugs": 10, "awareness": 0, "customers": 0}},
        "logs": [],
        "claimedMissions": ["daily_report_developing", "assign_daily_development", "daily_report_ready_mission", "assign_daily_sales", "daily_first_customer", "daily_mrr_500", "meeting_developing", "meeting_ready_mission", "total_mrr_10k_mission", "slide_developing", "slide_ready_mission", "slide_first_sale_mission", "daily_v2_mission", "meeting_v2_mission", "any_product_quality_70"],
        "lastSavedAt": 9999999999999,
    }, "window.__testApi.tick(); window.__testApi.saveGame();")
    product = output["save"]["products"]["dailyReportAi"]
    assert product["quality"] > 60
    assert product["bugs"] < 10
    assert product["awareness"] > 0
    assert output["save"]["fire"] > 0


def test_one_shot_primary_score_and_milestone_flags_present():
    main = (ROOT / "main.js").read_text()
    assert "function getProductPrimaryScore(product, definition)" in main
    assert 'if (definition.type === "oneShot") return safeNumber(product.lifetimeRevenue, 0)' in main
    assert "getProductMrr(product, definition) * 1.1" in main
    assert "firstSaleLogged" in main
    assert "sales10Logged" in main
    assert "sales50Logged" in main
    assert "sales100Logged" in main
    assert "unitSold" not in main
    assert "firstSale" in main
    assert "sales50" in main
    assert "sales100" in main


def test_marketing_assignment_is_normalized_and_visible_behavior():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 2,
        "employees": {"dev01": 1, "sales02": 1, "buzz03": 1, "care04": 0, "fire05": 0, "security06": 0},
        "assignments": {"marketing": {"productId": "meetingMinutesAi", "aiId": "buzz03"}},
        "products": {"meetingMinutesAi": {"id": "meetingMinutesAi", "status": "developing", "progress": 20, "quality": 55, "bugs": 0, "awareness": 0}},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    })
    assert output["save"]["assignments"]["marketing"] == {"productId": "meetingMinutesAi", "aiId": "buzz03"}
    assert "広報" in output["assignmentHtml"]
    assert "Buzz-03 → 自動議事録AI" in output["assignmentHtml"]
    assert "広報" in output["assignmentHtml"]
    assert "製品一覧を開く" in output["productHtml"]


def test_subscription_support_state_and_assignment_are_normalized():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 3,
        "employees": {"dev01": 0, "sales02": 0, "buzz03": 0, "care04": 1, "fire05": 0, "security06": 0},
        "assignments": {"support": {"productId": "dailyReportAi", "aiId": "care04"}},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "progress": 100, "quality": 60, "bugs": 10, "awareness": 0, "customers": 5, "supportLoad": 120, "satisfaction": -5, "churnRisk": 999}},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    })
    product = output["save"]["products"]["dailyReportAi"]
    assert product["supportLoad"] == 100
    assert product["satisfaction"] == 0
    assert product["churnRisk"] == 100
    assert output["save"]["assignments"]["support"] == {"productId": "dailyReportAi", "aiId": "care04"}
    assert "サポート" in output["assignmentHtml"]
    assert "Care-04 → AI日報メーカー" in output["assignmentHtml"]


def test_support_task_behavior_and_churn_are_subscription_only():
    main = (ROOT / "main.js").read_text()
    assert "function applySupportOperations(product, definition)" in main
    assert 'if (definition.type !== "subscription") return;' in main
    assert "function getSupportEffect(workerId)" in main
    assert "supportLoad: -(0.3 + level * 0.08)" in main
    assert "product.customers = Math.max(0, getProductCustomers(product) - 1)" in main
    assert "churnChance = clamp(product.churnRisk / 1000, 0, 0.05)" in main
    assert 'id: "support", label: "サポート"' in main

    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 20,
        "companyLevel": 3,
        "employees": {"dev01": 0, "sales02": 0, "buzz03": 0, "care04": 5, "fire05": 0, "security06": 0},
        "assignments": {"support": {"productId": "dailyReportAi", "aiId": "care04"}},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "progress": 100, "quality": 80, "bugs": 5, "awareness": 0, "customers": 10, "supportLoad": 80, "satisfaction": 50, "churnRisk": 30}},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    }, "window.__testApi.tick(); window.__testApi.saveGame();")
    product = output["save"]["products"]["dailyReportAi"]
    assert product["supportLoad"] < 80
    assert product["satisfaction"] > 50
    assert output["save"]["fire"] < 20

    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 100,
        "fire": 100,
        "companyLevel": 1,
        "employees": {"dev01": 0, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "progress": 100, "quality": 20, "bugs": 100, "awareness": 0, "customers": 3, "supportLoad": 100, "satisfaction": 0, "churnRisk": 100}},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    }, "Math.random = function () { return 0; }; window.__testApi.tick(); window.__testApi.saveGame();")
    assert output["save"]["products"]["dailyReportAi"]["customers"] == 2
    assert output["save"]["productFlags"]["dailyReportAi"]["firstChurnLogged"] is True


def test_support_ui_and_detail_metrics_are_present():
    main = (ROOT / "main.js").read_text()

    assert "満足度" in main
    assert "サポート負荷" in main
    assert "解約リスク" in main
    assert "サポート負荷DOWN / 満足度UP / 解約リスクDOWN" in main
    assert "解約リスクが高い" in main
    assert "Care-04を" in main
    assert "supportLoad50Logged" in main
    assert "satisfaction40Logged" in main
    assert "churnRisk50Logged" in main
    assert "firstChurnLogged" in main


def test_product_summary_cards_have_detail_modal_flow():
    index = (ROOT / "index.html").read_text()
    main = (ROOT / "main.js").read_text()
    css = (ROOT / "style.css").read_text()

    assert 'id="productDetailModal"' in index
    assert 'data-product-detail="' in main
    assert '>詳細</button>' in main
    assert "function renderProductDetailModal()" in main
    assert "function openProductDetailModal(productId)" in main
    assert "function closeProductDetailModal()" in main
    assert "productDetailModalOpen" in main
    assert ".product-detail-modal.open" in css
    assert ".product-detail-dialog" in css


def test_product_detail_modal_contains_common_subscription_and_one_shot_metrics():
    main = (ROOT / "main.js").read_text()

    assert "品質 <strong>" in main
    assert "製品バグ <strong>" in main
    assert "認知度 <strong>" in main
    assert "担当中タスク" in main
    assert "最新状態" in main
    assert "現在version" in main
    assert "次version開発" in main
    assert "月額価格" in main
    assert "MRR <strong>" in main
    assert "製品売上/秒" in main
    assert "バージョンアップ効果" in main
    assert "販売数 <strong>" in main
    assert "累計売上 <strong>" in main
    assert "MRR <strong>なし" in main
    assert "販売成功時に即時売上が入ります" in main


def test_product_summary_cards_keep_assignment_summary_and_card_actions():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 5,
        "employees": {"dev01": 1, "sales02": 1, "buzz03": 1, "care04": 0, "fire05": 0, "security06": 1},
        "assignments": {"development": {"productId": "meetingMinutesAi", "aiId": "dev01"}, "sales": {"productId": "dailyReportAi", "aiId": "sales02"}, "marketing": {"productId": "slideKitAi", "aiId": "buzz03"}},
        "products": {
            "dailyReportAi": {"id": "dailyReportAi", "status": "selling", "progress": 100, "quality": 60, "bugs": 1, "awareness": 40, "customers": 2, "version": 1},
            "meetingMinutesAi": {"id": "meetingMinutesAi", "status": "developing", "progress": 40, "quality": 55, "bugs": 2, "awareness": 5, "customers": 0},
            "slideKitAi": {"id": "slideKitAi", "status": "selling", "progress": 160, "quality": 55, "bugs": 3, "awareness": 20, "unitsSold": 3, "lifetimeRevenue": 29400},
        },
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    })

    assert "現在の担当" in output["assignmentHtml"]
    assert "開発" in output["assignmentHtml"]
    assert "販売" in output["assignmentHtml"]
    assert "広報" in output["assignmentHtml"]
    assert "Dev-01 → 自動議事録AI" in output["assignmentHtml"]
    assert "Sales-02 → AI日報メーカー" in output["assignmentHtml"]
    assert "製品一覧を開く" in output["productHtml"]
    assert "操作" not in output["productHtml"]
    assert "詳細" not in output["productHtml"]
    assert "data-product-menu" not in output["productHtml"]
    assert "data-product-detail" not in output["productHtml"]
    assert "data-product-action=\"sales\"" not in output["productHtml"]
    assert "data-product-action=\"marketing\"" not in output["productHtml"]
    assert "品質 <strong>" not in output["productHtml"]
    assert "製品バグ <strong>" not in output["productHtml"]
    assert "認知度 <strong>" not in output["productHtml"]


def test_product_card_keeps_upgrade_effect_out_of_summary_html():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 1,
        "employees": {"dev01": 0, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "progress": 100, "quality": 60, "bugs": 0, "awareness": 0, "customers": 1, "version": 1, "upgradeStatus": "idle"}},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    })

    assert "バージョンアップ効果: 月額価格+20%、品質+8、認知+5。副作用: 製品バグ+5" not in output["productHtml"]
    assert "品質 <strong>" not in output["productHtml"]
    assert "製品バグ <strong>" not in output["productHtml"]
    assert "認知度 <strong>" not in output["productHtml"]


def test_product_assignment_badge_shows_vnext_development_when_upgrading():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 1,
        "employees": {"dev01": 1, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "assignments": {"development": {"productId": "dailyReportAi", "aiId": "dev01"}},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "progress": 100, "quality": 60, "bugs": 0, "awareness": 0, "customers": 1, "version": 4, "upgradeStatus": "upgrading", "upgradeProgress": 30}},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    })

    assert "Dev-01がv5開発中" in output["primaryProductHtml"]
    assert "Dev-01が開発中" not in output["primaryProductHtml"]


def test_product_cards_show_compact_operation_and_detail_buttons_only():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 1,
        "employees": {"dev01": 0, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "progress": 100, "quality": 60, "bugs": 0, "awareness": 0, "customers": 1, "version": 1}},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    })

    assert "製品一覧を開く" in output["productHtml"]
    assert 'data-product-menu="dailyReportAi"' not in output["productHtml"]
    assert 'data-product-detail="dailyReportAi"' not in output["productHtml"]
    assert "data-product-action" not in output["productHtml"]


def test_product_action_menu_can_route_to_assignment_modal():
    main = (ROOT / "main.js").read_text()
    index = (ROOT / "index.html").read_text()

    assert 'id="productActionMenuModal"' in index
    assert "function renderProductActionMenuModal()" in main
    assert "getProductAvailableActions(product, definition)" in main
    assert "getProductAssignmentActions(product, definition)" in main
    assert "closeProductActionMenu();" in main
    assert 'openProductAssignmentModal(button.getAttribute("data-product-action")' in main
    assert "月額価格UP / 品質UP / 製品バグ増" in main
    assert "販売成功で即時売上" in main
    assert "認知度UP / 販売成功率UP / 炎上微増" in main


def test_product_card_renderer_does_not_emit_individual_action_buttons():
    main = (ROOT / "main.js").read_text()

    start = main.index("function getProductActionButtons(product, definition)")
    end = main.index("function getAssignmentModalTitle()", start)
    card_renderer = main[start:end]
    assert "data-product-menu" in card_renderer
    assert "data-product-detail" in card_renderer
    assert "data-product-action" not in card_renderer
    assert "販売担当" not in card_renderer
    assert "品質管理" not in card_renderer
    assert "広報" not in card_renderer
    assert "バージョンアップ" not in card_renderer
    assert "function getProductAssignmentActionButtons" not in main


def test_dashboard_home_collapses_heavy_sections_by_default():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 1,
        "employees": {"dev01": 1, "sales02": 1, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "progress": 100, "quality": 60, "bugs": 0, "awareness": 0, "customers": 2, "version": 1}},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    })

    assert "現在の主力製品" in output["primaryProductHtml"]
    assert "製品一覧を開く" in output["productHtml"]
    assert "ログを見る" in output["logPanelHtml"]
    assert "社員を見る" in output["employeePanelHtml"]
    assert "すべての目標を見る" in output["objectiveHtml"]
    assert "product-card" not in output["productHtml"]
    assert "employee-card" not in output["employeePanelHtml"]
    assert "log-item" not in output["logPanelHtml"]


def test_dashboard_render_functions_and_toggles_exist():
    main = (ROOT / "main.js").read_text()
    index = (ROOT / "index.html").read_text()

    assert 'id="primaryProductPanel"' in index
    assert 'id="logPanel"' in index
    assert 'id="employeePanel"' in index
    assert "function renderPrimaryProductPanel()" in main
    assert "function toggleDashboardPanel(key)" in main
    assert 'productsExpanded: false' in main
    assert 'logsExpanded: false' in main
    assert 'employeesExpanded: false' in main
    assert 'objectivesExpanded: false' in main
    assert 'missionsExpanded: false' in main
    assert 'id="toggleProductsButton"' in main
    assert 'id="toggleLogsButton"' in main
    assert 'id="toggleEmployeesButton"' in main
    assert "getProductCardHtml(definition)" in main
    assert "getProductActionButtons(product, definition)" in main


def test_dashboard_home_uses_five_primary_status_cards_and_integrated_activity():
    index = (ROOT / "index.html").read_text()
    main = (ROOT / "main.js").read_text()

    start = index.index('<section class="status-grid compact-status dashboard-status"')
    end = index.index('</section>', start)
    status_section = index[start:end]
    assert status_section.count('class="status-card') == 5
    assert '<span>売上</span>' in status_section
    assert '<span>総MRR</span>' in status_section
    assert '<span>総顧客</span>' in status_section
    assert '<span>バグ</span>' in status_section
    assert '<span>炎上</span>' in status_section
    assert '製品/秒' not in status_section
    assert '基礎受託/秒' not in status_section
    assert '会社Lv' not in status_section
    assert 'id="latestLogPanel"' not in index
    assert '現在の動き' in index
    assert '最新: <span id="latestLogText"' in index
    assert 'MRR継続 +' in main
    assert '基礎受託 ' in main


def test_next_recommendation_and_compact_missions_are_rendered():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 75,
        "fire": 0,
        "companyLevel": 5,
        "employees": {"dev01": 1, "sales02": 1, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "progress": 100, "quality": 60, "bugs": 0, "awareness": 0, "customers": 2, "version": 1}},
        "logs": [{"type": "success", "text": "テストログ", "createdAt": 9999999999999}],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    })

    assert "次のおすすめ" in output["recommendationHtml"]
    assert "Security-06" in output["recommendationHtml"]
    assert output["latestLog"]
    assert "最新:" in (ROOT / "index.html").read_text()
    assert "次のおすすめに集約" == output["missionStage"]
    assert "すべてのミッションを見る" in output["missionHtml"]


def test_product_action_menu_descriptions_explain_effects():
    main = (ROOT / "main.js").read_text()

    assert "顧客獲得 / MRR UP" in main
    assert "販売成功で即時売上UP" in main
    assert "品質UP / 製品バグDOWN" in main
    assert "認知度UP / 販売成功率UP / 炎上微増" in main
    assert "月額価格UP / 品質UP / 製品バグ増" in main
    assert "AIたちが担当中の製品です。" in main


def test_mission_stage_uses_current_state_not_claimed_history_for_existing_saves():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 300000,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 5,
        "employees": {"dev01": 5, "sales02": 2, "buzz03": 1, "care04": 0, "fire05": 0, "security06": 1},
        "assignments": {"development": {"productId": "meetingMinutesAi", "aiId": "dev01"}, "sales": {"productId": "dailyReportAi", "aiId": "sales02"}},
        "products": {
            "dailyReportAi": {"id": "dailyReportAi", "status": "selling", "progress": 100, "quality": 72, "bugs": 0, "awareness": 60, "customers": 20, "version": 1},
            "meetingMinutesAi": {"id": "meetingMinutesAi", "status": "selling", "progress": 180, "quality": 65, "bugs": 0, "awareness": 40, "customers": 10, "version": 1},
            "slideKitAi": {"id": "slideKitAi", "status": "selling", "progress": 160, "quality": 55, "bugs": 0, "awareness": 20, "unitsSold": 3, "lifetimeRevenue": 29400},
        },
        "claimedMissions": [],
        "logs": [],
        "lastSavedAt": 9999999999999,
    })

    assert output["missionStage"] == "次のおすすめに集約"
    assert output["missionStage"] != "起業準備"
    assert "すべてのミッションを見る" in output["missionHtml"]
    assert "daily_report_developing" in output["save"]["claimedMissions"]
    assert "daily_report_ready_mission" in output["save"]["claimedMissions"]
    assert "meeting_ready_mission" in output["save"]["claimedMissions"]


def test_current_mission_stage_ignores_unclaimed_completed_missions_in_code():
    main = (ROOT / "main.js").read_text()

    start = main.index("function getCurrentMissionStage()")
    end = main.index("function claimCompletedMissions(options)", start)
    stage_code = main[start:end]
    assert "!mission.done()" in stage_code
    assert "isMissionClaimed" not in stage_code
    assert "MISSION_STAGES.forEach(function (stage)" in main


def test_product_action_menu_uses_explicit_action_definitions():
    main = (ROOT / "main.js").read_text()

    assert "function getProductAvailableActions(product, definition)" in main
    assert "id: \"newProduct\"" in main
    assert "mode: \"newProduct\"" in main
    assert "id: \"upgrade\"" in main
    assert "mode: \"upgrade\"" in main
    assert "id: \"support\"" in main
    assert "disabledReason" in main
    assert "data-product-action-id" in main
    assert "data-product-mode" in main
    assert "openProductAssignmentModal(button.getAttribute(\"data-product-action\"), button.getAttribute(\"data-product-id\"), button.getAttribute(\"data-product-mode\")" in main


def test_product_action_availability_matches_product_status_and_type():
    main = (ROOT / "main.js").read_text()
    start = main.index("function getProductAvailableActions(product, definition)")
    end = main.index("function getProductAssignmentActions(product, definition)", start)
    action_code = main[start:end]

    assert 'if (isIdea) return [' in action_code
    assert 'enabled: true' in action_code
    assert 'enabled: isDeveloping' in action_code
    assert 'enabled: isReady || isSelling' in action_code
    assert 'enabled: canOperate' in action_code
    assert 'if (isIdea) return [' in action_code
    assert 'label: "開発する"' in action_code
    assert 'enabled: isSubscription && isSelling && hasCustomers' in action_code
    assert 'enabled: isSubscription && (isReady || isSelling) && product.upgradeStatus === "idle"' in action_code
    assert 'if (action.id === "support" || action.id === "upgrade") return isSubscription' in action_code
    assert 'if (action.id === "newProduct") return isIdea || isDeveloping' in action_code
    assert 'if (action.id === "sales") return isReady || isSelling' in action_code
    assert 'if (action.id === "qa" || action.id === "marketing") return !isIdea' in action_code


def test_development_and_upgrade_modes_are_kept_separate_when_assigning():
    main = (ROOT / "main.js").read_text()

    assert "function assignAiToTask(taskId, aiId, productId, mode)" in main
    assert 'const actionMode = mode || "normal"' in main
    assert 'if (actionMode === "upgrade") startSubscriptionUpgrade(normalizedProductId);' in main
    assert 'else startProductDevelopmentIfNeeded(normalizedProductId);' in main
    assert 'shouldStartUpgradeOnDevelopmentAssignment(targetProduct, targetDefinition)' not in main[main.index("function assignAiToTask"):main.index("function clearAssignment", main.index("function assignAiToTask"))]
    assert 'if (assignmentDraft.mode === "upgrade") return definition.name + "をバージョンアップする"' in main
    assert 'if (assignmentDraft.taskId === "development") return definition.name + "を開発する"' in main


def test_idea_product_action_menu_only_offers_development():
    main = (ROOT / "main.js").read_text()
    start = main.index("function getProductAvailableActions(product, definition)")
    end = main.index("function getProductAssignmentActions(product, definition)", start)
    action_code = main[start:end]

    idea_block_start = action_code.index("if (isIdea) return [")
    idea_block_end = action_code.index("];", idea_block_start)
    idea_block = action_code[idea_block_start:idea_block_end]
    assert 'id: "newProduct"' in idea_block
    assert 'label: "開発する"' in idea_block
    assert 'mode: "newProduct"' in idea_block
    assert 'id: "support"' not in idea_block
    assert 'id: "upgrade"' not in idea_block
    assert 'id: "sales"' not in idea_block
    assert 'id: "qa"' not in idea_block
    assert 'id: "marketing"' not in idea_block


def test_mission_sync_claim_uses_single_summary_log_on_load():
    main = (ROOT / "main.js").read_text()

    assert "claimCompletedMissions({ sync: true })" in main
    assert "過去に達成済みのミッションを" in main
    assert "件同期しました。" in main
    start = main.index("function claimCompletedMissions(options)")
    end = main.index("function isMissionClaimed", start)
    claim_code = main[start:end]
    assert "const syncMode" in claim_code
    assert "syncedCount += 1" in claim_code
    assert "if (syncMode && syncedCount > 0) addLog" in claim_code
    assert 'else addLog("success", "ミッション達成:' in claim_code


def test_action_menu_disabled_styles_are_readable():
    css = (ROOT / "style.css").read_text()

    assert ".product-action-menu-button:disabled" in css
    assert "opacity: 1" in css
    assert "disabled-action" in css


def test_next_recommendation_prioritizes_churn_and_support_before_fire_and_bugs():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 90,
        "fire": 90,
        "companyLevel": 5,
        "employees": {"dev01": 1, "sales02": 1, "buzz03": 1, "care04": 0, "fire05": 1, "security06": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "progress": 100, "quality": 40, "bugs": 30, "awareness": 60, "customers": 8, "version": 1, "supportLoad": 90, "satisfaction": 20, "churnRisk": 80}},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    })

    assert "解約リスクが高いAI日報メーカーをサポートしましょう。" in output["recommendationHtml"]
    assert "炎上" not in output["recommendationHtml"]
    assert "バグ" not in output["recommendationHtml"]


def test_next_recommendation_promotes_care04_for_high_support_load():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 4,
        "employees": {"dev01": 1, "sales02": 1, "buzz03": 1, "care04": 1, "fire05": 0, "security06": 1},
        "products": {"meetingMinutesAi": {"id": "meetingMinutesAi", "status": "selling", "progress": 180, "quality": 70, "bugs": 5, "awareness": 60, "customers": 10, "version": 1, "supportLoad": 70, "satisfaction": 60, "churnRisk": 20}},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    })

    assert "Care-04を自動議事録AIのサポートに割り振りましょう。" in output["recommendationHtml"]


def test_employee_summary_includes_hired_ai_specialty_labels():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 300000,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 5,
        "employees": {"dev01": 5, "sales02": 3, "buzz03": 2, "care04": 1, "fire05": 1, "security06": 1},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    })

    assert "Dev-01 Lv5 開発" in output["employeePanelHtml"]
    assert "Sales-02 Lv3 販売" in output["employeePanelHtml"]
    assert "Buzz-03 Lv2 広報" in output["employeePanelHtml"]
    assert "Care-04 Lv1 サポート" in output["employeePanelHtml"]
    assert "Security-06 Lv1 品質管理" in output["employeePanelHtml"]
    assert "Fire-05 Lv1 炎上対応" in output["employeePanelHtml"]


def test_product_detail_modal_has_group_headings_for_scanability():
    main = (ROOT / "main.js").read_text()
    css = (ROOT / "style.css").read_text()

    assert "product-detail-heading" in main
    assert ">収益<" in main
    assert ">品質<" in main
    assert ">運用<" in main
    assert ">担当<" in main
    assert ".product-detail-heading" in css
    assert "grid-column: 1 / -1" in css


def test_reset_button_is_subdued_danger_action():
    css = (ROOT / "style.css").read_text()

    start = css.index("button.danger {")
    end = css.index("}\nbutton.danger:hover", start)
    danger_style = css[start:end]
    assert "#fff7f9" in danger_style
    assert "#9b2f46" in danger_style
    assert "box-shadow: none" in danger_style
    assert "font-size: 12px" in danger_style
    assert "min-height: 34px" in danger_style
