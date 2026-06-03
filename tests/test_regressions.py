import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_cache_busting_versions_match_app_version():
    index = (ROOT / "index.html").read_text()
    main = (ROOT / "main.js").read_text()
    sw = (ROOT / "sw.js").read_text()

    assert 'content="2026.05.24.10"' in index
    assert 'style.css?v=20260524-10' in index
    assert 'main.js?v=20260524-10' in index
    assert 'manifest.webmanifest?v=20260524-10' in index
    assert 'icon.svg?v=20260524-10' in index
    assert 'ogp.svg?v=20260524-10' in index
    assert '<meta name="theme-color" content="#19bde8">' in index
    assert 'const APP_VERSION = "2026.05.24.10"' in main
    assert 'const APP_VERSION = "2026.05.24.10"' in sw
    assert 'sw.js?v=20260524-10' in main

    manifest = json.loads((ROOT / "manifest.webmanifest").read_text())
    assert manifest["name"] == "AI社長のブラック起業"
    assert manifest["short_name"] == "AI社長"
    assert manifest["start_url"] == "./index.html?v=20260524-10"
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
    assert "manifest.webmanifest?v=20260524-10" in sw
    assert "icon.svg?v=20260524-10" in sw
    assert "ogp.svg?v=20260524-10" in sw


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
console.log(JSON.stringify({
  save: JSON.parse(store.ai_black_startup_save_v1),
  employeeHtml: elements.get('employeeList').innerHTML,
  productHtml: elements.get('productPanel').innerHTML,
  assignmentHtml: elements.get('assignmentPanel').innerHTML
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
    }
    assert output["save"]["productFlags"]["dailyReportAi"]["startedLogged"] is False
    assert output["save"]["productFlags"]["dailyReportAi"]["firstCustomerGranted"] is False
    assert output["save"]["productFlags"]["dailyReportAi"]["mrr10kLogged"] is False
    assert output["save"]["productFlags"]["meetingMinutesAi"]["startedLogged"] is False
    assert output["save"]["productFlags"]["slideKitAi"]["startedLogged"] is False
    assert "AI日報メーカー" in output["productHtml"]
    assert "自動議事録AI" in output["productHtml"]
    assert "AIスライド生成キット" in output["productHtml"]
    assert "現在の担当" in output["assignmentHtml"]
    assert "担当を変更" in output["assignmentHtml"]
    assert output["save"]["appVersion"] == "2026.05.24.10"


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
    assert 'id="baseIncomeRate"' in index
    assert 'id="productIncomeRate"' in index
    assert 'id="productObjectiveList"' in index
    assert 'AI社長を開発に割り振れば、専門AIがいなくても開発できます' in index
    assert 'boss: { id: "boss", label: "AI社長"' in main
    assert '{ id: "development", label: "開発", workers: ["boss", "dev01"] }' in main
    assert '{ id: "qa", label: "品質管理", workers: ["boss", "security06"] }' in main
    assert '{ id: "sales", label: "販売", workers: ["boss", "sales02"] }' in main
    assert 'if (workerId === "boss") return true' in main
    assert "function getAssignment(taskId)" in main
    assert "function getAssignmentProduct(taskId)" in main
    assert "function getAssignmentAi(taskId)" in main
    assert "function assignAiToTask(taskId, aiId, productId)" in main
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
    assert 'button[data-product-action]' in main
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
    assert "開発・販売・品質管理は、それぞれ対象製品を持ちます" in main


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
    assert "assignAiToTask(assignmentDraft.taskId, assignmentDraft.aiId, assignmentDraft.productId)" in main
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
    assert "開発する" in main
    assert "販売する" in main
    assert "品質管理" in main
    assert "data-product-action" in main
    assert "function openProductAssignmentModal(taskId, productId, mode)" in main
    assert 'assignmentModalMode = "product"' in main
    assert "assignmentDraft.taskId = taskId" in main
    assert "assignmentDraft.productId = getProductDefinition(productId).id" in main
    assert "function getAssignmentModalTitle()" in main
    assert "担当AIを選んでください" in main
    assert "function getWorkerTaskDescription(workerId, taskId)" in main
    assert "何でもできるが低速" in main
    assert "開発が速いがバグ増加" in main
    assert "顧客獲得が速いが炎上微増" in main
    assert "品質改善とバグ削減が得意" in main
    assert "function startProductDevelopmentIfNeeded(productId)" in main
    assert 'if (taskId === "development" && aiId)' in main
    assert 'if (assignmentDraft.mode === "upgrade") startSubscriptionUpgrade(normalizedProductId)' in main
    assert 'else startProductDevelopmentIfNeeded(normalizedProductId)' in main
    assert ".product-actions" in css
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
    assert "AIスライド生成キットが1本売れました" in main
    assert "AIスライド生成キットの販売数が10本を超えました" in main


def test_cache_busting_updated_for_mrr_discrete_fix():
    index = (ROOT / "index.html").read_text()
    main = (ROOT / "main.js").read_text()
    sw = (ROOT / "sw.js").read_text()

    assert 'content="2026.05.24.10"' in index
    assert 'main.js?v=20260524-10' in index
    assert 'sw.js?v=20260524-10' in main
    assert 'const APP_VERSION = "2026.05.24.10"' in sw



def test_subscription_product_upgrade_pipeline_present():
    main = (ROOT / "main.js").read_text()

    assert "version: 1" in main
    assert "upgradeProgress: 0" in main
    assert 'upgradeStatus: "idle"' in main
    assert 'product.version = Math.max(1, Math.floor(safeNumber(saved.version, product.version)))' in main
    assert 'product.upgradeProgress = definition.type === "subscription"' in main
    assert 'product.upgradeStatus = definition.type === "subscription"' in main
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
    assert "AI日報メーカー v3開発中 45%" in output["productHtml"]
    assert "月額 <strong>¥600" in output["productHtml"]
    assert "MRR <strong>¥6.0K/月" in output["productHtml"]
    slide_html = output["productHtml"].split("AIスライド生成キット", 1)[1]
    assert "バージョンアップ" not in slide_html.split("</article>", 1)[0]
