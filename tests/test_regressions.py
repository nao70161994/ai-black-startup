import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def app_source():
    data_dir = ROOT / "js" / "data"
    data_files = [
        "balance.js",
        "employees.js",
        "products.js",
        "tasks.js",
        "decision-events.js",
        "achievements.js",
        "missions.js",
    ]
    return "\n".join([(ROOT / "main.js").read_text()] + [(data_dir / name).read_text() for name in data_files])


def test_cache_busting_versions_match_app_version():
    index = (ROOT / "index.html").read_text()
    main = app_source()
    sw = (ROOT / "sw.js").read_text()

    assert 'content="2026.05.24.42"' in index
    assert 'style.css?v=20260524-42' in index
    assert 'main.js?v=20260524-42' in index
    assert 'manifest.webmanifest?v=20260524-42' in index
    assert 'icon.svg?v=20260524-42' in index
    assert 'ogp.png?v=20260524-42' in index
    assert 'icon-512.png?v=20260524-42' in index
    assert '<meta name="theme-color" content="#19bde8">' in index
    assert 'const APP_VERSION = "2026.05.24.42"' in main
    assert 'const APP_VERSION = "2026.05.24.42"' in sw
    assert 'sw.js?v=20260524-42' in main

    manifest = json.loads((ROOT / "manifest.webmanifest").read_text())
    assert manifest["name"] == "AI社長のブラック起業"
    assert manifest["short_name"] == "AI社長"
    assert manifest["start_url"] == "./index.html?v=20260524-42"
    assert manifest["display"] == "standalone"
    assert manifest["theme_color"] == "#19bde8"
    assert any(icon["src"] == "./icon-512.png?v=20260524-42" and icon["type"] == "image/png" for icon in manifest["icons"])


def png_size(path):
    data = path.read_bytes()
    assert data.startswith(b"\x89PNG\r\n\x1a\n")
    return int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")


def test_release_png_assets_exist_with_expected_sizes():
    assert png_size(ROOT / "ogp.png") == (1200, 630)
    assert png_size(ROOT / "icon-512.png") == (512, 512)



def test_external_data_files_are_loaded_before_main_and_precached():
    index = (ROOT / "index.html").read_text()
    sw = (ROOT / "sw.js").read_text()
    main = app_source()
    data_files = ["balance", "employees", "products", "tasks", "decision-events", "achievements", "missions"]
    main_pos = index.index('main.js?v=20260524-42')
    for name in data_files:
        path = ROOT / "js" / "data" / f"{name}.js"
        assert path.exists()
        assert f'js/data/{name}.js?v=20260524-42' in index
        assert index.index(f'js/data/{name}.js?v=20260524-42') < main_pos
        assert f'./js/data/{name}.js?v=20260524-42' in sw
    assert 'readExternalData("AIBS_PRODUCTS", [])' in main
    assert 'readExternalData("AIBS_EMPLOYEES", [])' in main
    assert 'readExternalData("AIBS_TASKS", [])' in main
    assert 'readExternalData("AIBS_DECISION_EVENTS", [])' in main
    assert 'readExternalFactory("AIBS_CREATE_ACHIEVEMENTS")' in main
    assert 'readExternalFactory("AIBS_CREATE_MISSION_DATA")' in main


def test_new_v04_products_and_category_affinity_are_defined():
    products_data = (ROOT / "js" / "data" / "products.js").read_text()
    main = app_source()

    for product_id in ["supportReplyAi", "apologyWriterAi"]:
        assert f'id: "{product_id}"' in products_data
    assert 'category: "support"' in products_data
    assert 'category: "crisis"' in products_data
    assert "function getAiProductAffinity" in main
    assert "function applyAffinity" in main
    assert "getProductCategoryLabel" in main
    assert 'applyAffinity(development.progress, workerId, definition, "development")' in main
    assert 'applyAffinity(baseChance, workerId, definition, "sales")' in main
    assert 'support_reply_first_customer_mission' in main
    assert 'apology_writer_first_sale_mission' in main



def test_category_affinity_changes_support_effect_and_detail_label_runtime():
    support_output = run_game_action_smoke({
        "employees": {"care04": 1},
        "products": {"supportReplyAi": {"id": "supportReplyAi", "status": "selling", "supportLoad": 50, "satisfaction": 50}},
        "assignments": {"support": {"productAssignments": {"supportReplyAi": {"aiIds": ["care04"]}}}},
    }, "window.__testApi.tick(); window.__testApi.openProductDetailModal('supportReplyAi'); window.__testApi.saveGame();")
    daily_output = run_game_action_smoke({
        "employees": {"care04": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "supportLoad": 50, "satisfaction": 50}},
        "assignments": {"support": {"productAssignments": {"dailyReportAi": {"aiIds": ["care04"]}}}},
    }, "window.__testApi.tick(); window.__testApi.saveGame();")
    assert support_output["save"]["products"]["supportReplyAi"]["supportLoad"] < daily_output["save"]["products"]["dailyReportAi"]["supportLoad"]
    assert support_output["save"]["products"]["supportReplyAi"]["satisfaction"] > daily_output["save"]["products"]["dailyReportAi"]["satisfaction"]
    assert "サポート" in support_output["productDetailHtml"]


def test_service_worker_update_flow_present():
    main = app_source()
    sw = (ROOT / "sw.js").read_text()

    assert "serviceWorker" in main
    assert "updatefound" in main
    assert "controllerchange" in main
    assert "reloadingForNewServiceWorker" in main
    assert "window.location.reload" in main
    assert "SKIP_WAITING" in main
    assert "self.skipWaiting()" in sw
    assert "self.clients.claim()" in sw
    assert "caches.delete" in sw
    assert "manifest.webmanifest?v=20260524-42" in sw
    assert "icon.svg?v=20260524-42" in sw
    assert "ogp.svg?v=20260524-42" in sw
    assert "ogp.png?v=20260524-42" in sw
    assert "icon-512.png?v=20260524-42" in sw


def test_share_button_and_share_fallback_present():
    index = (ROOT / "index.html").read_text()
    main = app_source()

    assert 'id="shareButton"' in index
    assert "function createShareText()" in main
    assert "navigator.share" in main
    assert "navigator.clipboard.writeText" in main
    assert "会社Lv: " in main
    assert "総MRR: " in main
    assert "総顧客: " in main
    assert "主力: " in main
    share_start = main.index("function createShareText()")
    share_end = main.index("function shareGameStatus()", share_start)
    share_code = main[share_start:share_end]
    assert "製品一覧: " not in share_code
    assert "最新ログ: " not in share_code
    assert "担当: " not in share_code


def test_task_presets_are_available_in_normal_ui_without_state_boost():
    index = (ROOT / "index.html").read_text()
    main = app_source()

    assert 'id="taskPresetPanel"' in index
    assert "function renderTaskPresetPanel()" in main
    assert "空きAIだけを追加します" in main
    assert "既存担当は外しません" in main
    assert "preset-result" in main
    assert 'allowStateBoost: false' in main
    cash_start = main.index('} else if (presetId === "cash")')
    cash_end = main.index('} else if (presetId === "firefighting")', cash_start)
    cash_code = main[cash_start:cash_end]
    assert "if (allowStateBoost)" in cash_code
    assert "getProduct(oneShotTarget.id).progress = oneShotTarget.developmentRequired" in cash_code


def run_browser_smoke(save):
    script = r'''
const fs = require('fs');
const vm = require('vm');
const dataFiles = ['js/data/balance.js', 'js/data/employees.js', 'js/data/products.js', 'js/data/tasks.js', 'js/data/decision-events.js', 'js/data/achievements.js', 'js/data/missions.js'];
let code = dataFiles.map(function (file) { return fs.readFileSync(file, 'utf8'); }).join('\n') + '\n' + fs.readFileSync('main.js', 'utf8');
code = code.replace('document.addEventListener("DOMContentLoaded", boot);', 'window.__testApi = { assignAiToTask, setTaskAis, tick, saveGame, claimMissionReward, expandCompanyLevel, applyDecisionEventChoice, applyDecisionEventGeneration, applyAchievements, applyDebugAction, createShareText, getDecisionEventCandidates, getNextRecommendation, applyTaskPreset, openProductActionMenu, openProductAssignmentModal, openWorkerAssignmentModal, openProductDetailModal, getDecisionEventHandler, getDecisionHandlerMissingEventIds }; document.addEventListener("DOMContentLoaded", boot);');
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
const location = { protocol: 'http:', search: input.__locationSearch || '' };
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
  companyExpansionHtml: elements.get('companyExpansionPanel').innerHTML,
  missionStage: elements.get('missionStage').textContent,
  missionHtml: elements.get('missionList').innerHTML,
  achievementHtml: elements.get('achievementPanel').innerHTML,
  debugHtml: elements.get('debugPanel').innerHTML,
  presetHtml: elements.get('taskPresetPanel').innerHTML,
  debugHidden: elements.get('debugPanel').hidden,
  actionMenuHtml: elements.get('productActionMenuModal').innerHTML,
  assignmentModalHtml: elements.get('assignmentModal').innerHTML,
  productDetailHtml: elements.get('productDetailModal').innerHTML,
  shareText: window.__testApi.createShareText()
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


def product_assignment(assignments, task_id, product_id="dailyReportAi"):
    return assignments[task_id]["productAssignments"][product_id]


def all_assigned_ai_ids(assignments):
    return [
        ai_id
        for task_assignment in assignments.values()
        for product_entry in task_assignment["productAssignments"].values()
        for ai_id in product_entry["aiIds"]
    ]


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
    assert output["save"]["products"]["supportReplyAi"]["status"] == "idea"
    assert output["save"]["products"]["supportReplyAi"]["quality"] == 58
    assert output["save"]["products"]["supportReplyAi"]["customers"] == 0
    assert output["save"]["products"]["apologyWriterAi"]["status"] == "idea"
    assert output["save"]["products"]["apologyWriterAi"]["quality"] == 52
    assert output["save"]["products"]["apologyWriterAi"]["unitsSold"] == 0
    assignments = output["save"]["assignments"]
    for task_id in ["development", "qa", "sales", "marketing", "support", "crisis"]:
        assert "productAssignments" in assignments[task_id]
        for product_id in ["dailyReportAi", "meetingMinutesAi", "slideKitAi", "supportReplyAi", "apologyWriterAi"]:
            assert product_assignment(assignments, task_id, product_id)["aiIds"] == []
    assert output["save"]["productFlags"]["dailyReportAi"]["startedLogged"] is False
    assert output["save"]["productFlags"]["supportReplyAi"]["startedLogged"] is False
    assert output["save"]["productFlags"]["apologyWriterAi"]["startedLogged"] is False
    assert output["save"]["productFlags"]["dailyReportAi"]["firstCustomerGranted"] is False
    assert output["save"]["productFlags"]["dailyReportAi"]["mrr10kLogged"] is False
    assert output["save"]["productFlags"]["meetingMinutesAi"]["startedLogged"] is False
    assert output["save"]["productFlags"]["slideKitAi"]["startedLogged"] is False
    assert "製品一覧を開く" in output["productHtml"]
    assert "5製品運用" in output["productHtml"]
    assert "AI日報メーカー" in output["primaryProductHtml"]
    assert "現在の担当" in output["assignmentHtml"]
    assert "担当を変更" in output["assignmentHtml"]
    assert output["save"]["appVersion"] == "2026.05.24.42"


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
    main = app_source()

    assert 'const SAVE_KEY = "ai_black_startup_save_v1"' in main
    assert 'LEVEL_THRESHOLDS: [0, 5000, 20000, 80000, 300000, 1000000, 3000000, 10000000, 30000000, 100000000]' in (ROOT / 'js' / 'data' / 'balance.js').read_text()
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
    assert 'return getProductMrr(product, definition || getProductDefinition(product.id)) / MRR_TO_REVENUE_DIVISOR' in main


def test_products_collection_has_two_subscription_products():
    main = app_source()

    assert 'id: "dailyReportAi"' in main
    assert 'id: "meetingMinutesAi"' in main
    assert main.count('type: "subscription"') >= 3
    assert main.count('type: "oneShot"') >= 2
    assert 'PRODUCTS.map(function (definition)' in main
    assert 'getAssignmentTargetButtons(taskId)' not in main
    assert 'button[data-modal-product]' in main


def test_product_pipeline_ui_and_assignment_rules_present():
    index = (ROOT / "index.html").read_text()
    main = app_source()

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
    assert "function removeAiFromAllAssignments(aiId)" in main
    assert "setAssignedAiIds(task.id, definition.id" in main
    assert "productAssignments" in main
    assert "function openAssignmentModal()" in main
    assert "function closeAssignmentModal()" in main
    assert "function renderAssignmentModal()" in main
    assert "function selectAssignmentTask(taskId)" in main
    assert "function getProductAssignment(taskId, productId)" in main
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
    assert product_assignment(assignments, "development")["aiIds"] == ["boss"]
    assert output["save"]["products"]["meetingMinutesAi"]["id"] == "meetingMinutesAi"
    assert product_assignment(assignments, "qa")["aiIds"] == ["security06"]
    assert product_assignment(assignments, "sales")["aiIds"] == ["sales02"]
    assert product_assignment(assignments, "support")["aiIds"] == []
    assert product_assignment(assignments, "crisis")["aiIds"] == []
    assert "meetingMinutesAi" in assignments["development"]["productAssignments"]


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
    ai_ids = all_assigned_ai_ids(output["save"]["assignments"])
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
    main = app_source()

    assert "function hasRevenueProduct()" in main
    assert "getProductCustomers(product) > 0 || getProductMrr(product, definition) > 0" in main
    assert "function applyProductRevenue()" in main
    assert "getProductRevenuePerSecond(product, definition)" in main
    assert 'const salesWorkers = getAssignedWorkersForProduct("sales", product.id)' in main
    assert 'return getProductAssignment(taskId, productId).aiIds' in main


def test_revenue_product_keeps_tick_condition_present():
    main = app_source()

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
    main = app_source()

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
    main = app_source()

    assert "function formatCustomers(value)" in main
    assert 'formatNumber(getProductCustomers({ customers: value })) + "社"' in main
    assert '"総顧客: " + formatCustomers(getTotalProductCustomers())' in main
    assert '"主力: " + primaryDefinition.name' in main
    assert "formatCurrency(getProductMrr(product, definition))" in main


def test_first_customer_guarantee_and_milestone_flags_present():
    main = app_source()

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
    main = app_source()

    assert "function getProductCustomers(product)" in main
    assert "return Math.max(0, Math.floor(Number(product.customers) || 0))" in main
    assert "function getProductMrr(product, definition)" in main
    assert 'getCurrentMonthlyPrice(product, definition) * getProductCustomers(product)' in main
    assert "function getProductRevenuePerSecond(product, definition)" in main
    assert "return getProductMrr(product, definition || getProductDefinition(product.id)) / MRR_TO_REVENUE_DIVISOR" in main
    assert "formatCurrency(getProductMrr(product, definition))" in main
    assert "function getTotalProductMrr()" in main
    assert "getTotalProductMrr()" in main


def test_two_product_targets_and_share_summary_present():
    main = app_source()

    assert 'name: "自動議事録AI"' in main
    assert 'PRODUCTS.map(function (definition)' in main
    assert 'button[data-product-menu]' in main
    assert 'id="openAssignmentModal"' in main
    assert 'button[data-modal-product]' in main
    assert 'button[data-modal-ai]' in main
    assert '"主力: " + primaryDefinition.name + " / " + getProductStatusLabel(primaryProduct.status)' in main
    assert '"総MRR: " + formatCurrency(getTotalProductMrr()) + "/月"' in main
    share_start = main.index("function createShareText()")
    share_end = main.index("function shareGameStatus()", share_start)
    share_code = main[share_start:share_end]
    assert '"製品一覧: " + getProductShareSummary()' not in share_code


def test_sales_target_ui_is_explicit():
    main = app_source()

    assert "対象: " in main
    assert "製品一覧" in main
    assert "製品運用 / 総MRR" in main
    assert "の新規顧客を確率で獲得" in main
    assert "現在の担当" in main
    assert "担当を変更" in main
    assert "販売担当なし。既存MRRは継続します。販売担当を置くと新規顧客を獲得できます。" in main
    assert "AIたちが担当中の製品です。" in main


def test_assignment_modal_ui_present():
    index = (ROOT / "index.html").read_text()
    main = app_source()

    assert 'id="assignmentModal"' in index
    assert "現在の担当" in main
    assert "担当を変更" in main
    assert "assignment-summary-list" in main
    assert "assignment-modal" in main
    assert "modal-option" in main
    assert "disabled" in main
    assert "タスク・対象製品・担当AIを選んで割り振ります" in main
    assert "担当AIを選択 最大2体" in main
    assert "この仕事には最大2体までAIを割り振れます" in main
    assert "setTaskAis(assignmentDraft.taskId, assignmentDraft.productId, assignmentDraft.aiIds || [], assignmentDraft.mode)" in main
    assert "clearProductAssignment(assignmentDraft.taskId, assignmentDraft.productId)" in main


def test_product_mrr_is_not_used_directly_for_revenue_or_share():
    main = app_source()

    assert "safeNumber(product.mrr" not in main
    assert "formatCurrency(product.mrr" not in main
    assert '"総MRR: " + formatCurrency(getTotalProductMrr())' in main
    assert "return getProductMrr(product, definition || getProductDefinition(product.id)) / MRR_TO_REVENUE_DIVISOR" in main
    assert "getProductMrr(product, definition) >= 10000" in main


def test_assignment_modal_visual_states_are_readable():
    main = app_source()
    css = (ROOT / "style.css").read_text()

    assert "販売担当を外しても、既存顧客のMRRは継続します" in main
    assert "開発担当を置くと開発が進みます" in main
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
    main = app_source()
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
    main = app_source()
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
    assert 'if (taskId === "development" && selectedAiIds.length)' in main
    assert 'if (assignmentMode === "upgrade") startSubscriptionUpgrade(normalizedProductId);' in main
    assert 'else startProductDevelopmentIfNeeded(normalizedProductId)' in main
    assert ".product-actions" in css
    assert ".product-action-menu-modal.open" in css
    assert ".product-action-menu-button" in css
    assert ".worker-option" in css


def test_high_priority_pipeline_foundation_is_prepared():
    main = app_source()

    assert 'setProductAssignmentEntry("development", definition.id, { aiIds: developmentAssignment.aiIds.slice(0, 2), mode: "newProduct" })' in main
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
    assert "function getAssignedWorkersForProduct(taskId, productId)" in main
    assert "function getProductLogText(productId, key, fallback)" in main
    assert "const PRODUCT_LOG_TEXTS" in main
    assert "自動議事録AIが完成しました" in main
    assert "日報が少しだけ会社を救っています" in main
    assert "getAssignmentTargetButtons" not in main


def test_one_shot_slide_kit_pipeline_present():
    main = app_source()

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
    assert 'ONE_SHOT_SALES02_PITY_LIMIT: 60' in (ROOT / 'js' / 'data' / 'balance.js').read_text()
    assert 'ONE_SHOT_BOSS_PITY_LIMIT: 90' in (ROOT / 'js' / 'data' / 'balance.js').read_text()
    assert 'pityLimit = workerId === "sales02" ? ONE_SHOT_SALES02_PITY_LIMIT : ONE_SHOT_BOSS_PITY_LIMIT' in main
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
    main = app_source()
    sw = (ROOT / "sw.js").read_text()

    assert 'content="2026.05.24.42"' in index
    assert 'main.js?v=20260524-42' in index
    assert 'sw.js?v=20260524-42' in main
    assert 'const APP_VERSION = "2026.05.24.42"' in sw



def test_subscription_product_upgrade_pipeline_present():
    main = app_source()

    assert "version: 1" in main
    assert "upgradeProgress: 0" in main
    assert 'upgradeStatus: "idle"' in main
    assert 'product.version = Math.max(1, Math.floor(safeNumber(saved.version, product.version)))' in main
    assert "const canResumeUpgrade = definition.type === \"subscription\"" in main
    assert 'product.upgradeStatus = canResumeUpgrade ? "upgrading" : "idle"' in main
    assert "function getCurrentMonthlyPrice(product, definition)" in main
    assert "Math.round(definition.monthlyPrice * (1 + VERSION_PRICE_BONUS * (getProductVersion(product) - 1) + safeNumber(product && product.priceAdjustment, 0)))" in main
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
const dataFiles = ['js/data/balance.js', 'js/data/employees.js', 'js/data/products.js', 'js/data/tasks.js', 'js/data/decision-events.js', 'js/data/achievements.js', 'js/data/missions.js'];
let code = dataFiles.map(function (file) { return fs.readFileSync(file, 'utf8'); }).join('\n') + '\n' + fs.readFileSync('main.js', 'utf8');
code = code.replace('document.addEventListener("DOMContentLoaded", boot);', 'window.__testApi = { assignAiToTask, setTaskAis, tick, saveGame, claimMissionReward, expandCompanyLevel, applyDecisionEventChoice, applyDecisionEventGeneration, applyAchievements, applyDebugAction, createShareText, getDecisionEventCandidates, getNextRecommendation, applyTaskPreset, openProductActionMenu, openProductAssignmentModal, openWorkerAssignmentModal, openProductDetailModal, getDecisionEventHandler, getDecisionHandlerMissingEventIds }; document.addEventListener("DOMContentLoaded", boot);');
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
const location = { protocol: 'http:', search: input.__locationSearch || '' };
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
  achievementHtml: elements.get('achievementPanel').innerHTML,
  debugHtml: elements.get('debugPanel').innerHTML,
  presetHtml: elements.get('taskPresetPanel').innerHTML,
  debugHidden: elements.get('debugPanel').hidden,
  actionMenuHtml: elements.get('productActionMenuModal').innerHTML,
  assignmentModalHtml: elements.get('assignmentModal').innerHTML,
  productDetailHtml: elements.get('productDetailModal').innerHTML,
  shareText: window.__testApi.createShareText(),
  latestLog: elements.get('latestLogText').textContent,
  testResult: window.__testResult || null,
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
    assert product_assignment(output["save"]["assignments"], "development")["aiIds"] == ["dev01"]
    assert product_assignment(output["save"]["assignments"], "development")["mode"] == "upgrade"
    assert product["upgradeStatus"] == "upgrading"
    assert product["upgradeProgress"] > 0

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
    main = app_source()
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
    main = app_source()

    assert '{ id: "marketing", label: "広報", workers: ["boss", "buzz03"] }' in main
    assert "createInitialProductAssignments(task.id)" in main
    assert "productAssignments" in main
    assert 'marketing: { boss: "ゆっくり認知度を上げる", buzz03: "認知度を大きく上げるが炎上微増" }' in main
    assert 'function applyMarketingTask(product, definition)' in main
    assert 'product.awareness = clamp(product.awareness + applyAffinity(marketing.awareness, workerId, definition, "marketing"), 0, 100)' in main
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
    main = app_source()
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
    assert product_assignment(output["save"]["assignments"], "marketing", "meetingMinutesAi")["aiIds"] == ["buzz03"]
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
    assert product_assignment(output["save"]["assignments"], "support")["aiIds"] == ["care04"]
    assert "サポート" in output["assignmentHtml"]
    assert "Care-04 → AI日報メーカー" in output["assignmentHtml"]


def test_support_task_behavior_and_churn_are_subscription_only():
    main = app_source()
    assert "function applySupportOperations(product, definition)" in main
    assert 'if (definition.type !== "subscription") return;' in main
    assert "function getSupportEffect(workerId)" in main
    assert "supportLoad: -(0.3 + level * 0.08)" in main
    assert "product.customers = Math.max(0, getProductCustomers(product) - 1)" in main
    assert "churnChance = clamp(product.churnRisk / 1000, 0, CHURN_CHANCE_MAX)" in main
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
    main = app_source()

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
    main = app_source()
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
    main = app_source()

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
    main = app_source()
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
    main = app_source()

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
    main = app_source()
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
    main = app_source()

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
        "claimedMissions": ["daily_report_developing", "assign_daily_development", "daily_report_ready_mission", "assign_daily_sales", "daily_first_customer", "daily_mrr_500", "meeting_developing", "meeting_ready_mission", "total_mrr_10k_mission", "slide_developing", "slide_ready_mission", "slide_first_sale_mission", "daily_v2_mission", "meeting_v2_mission", "any_product_quality_70"],
        "lastSavedAt": 9999999999999,
    })

    assert "次のおすすめ" in output["recommendationHtml"]
    assert "Security-06" in output["recommendationHtml"]
    assert output["latestLog"]
    assert "最新:" in (ROOT / "index.html").read_text()
    assert "次のおすすめに集約" == output["missionStage"]
    assert "すべてのミッションを見る" in output["missionHtml"]


def test_product_action_menu_descriptions_explain_effects():
    main = app_source()

    assert "顧客獲得 / MRR UP" in main
    assert "販売成功で即時売上UP" in main
    assert "品質UP / 製品バグDOWN" in main
    assert "認知度UP / 販売成功率UP / 炎上微増" in main
    assert "月額価格UP / 品質UP / 製品バグ増" in main
    assert "炎上度DOWN / 売上機会を少し消費" in main
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
    assert "すべてのミッションを見る" in output["missionHtml"]
    assert "報酬を受け取る" in output["missionHtml"]
    assert "daily_report_developing" not in output["save"]["claimedMissions"]
    assert "daily_report_ready_mission" not in output["save"]["claimedMissions"]
    assert "meeting_ready_mission" not in output["save"]["claimedMissions"]


def test_current_mission_stage_includes_unclaimed_completed_missions_in_code():
    main = app_source()

    start = main.index("function getCurrentMissionStage()")
    end = main.index("function getAllMissions()", start)
    stage_code = main[start:end]
    assert "!mission.done() || !isMissionClaimed(mission.id)" in stage_code
    assert "isMissionClaimed" in stage_code
    assert "function getAllMissions()" in main


def test_product_action_menu_uses_explicit_action_definitions():
    main = app_source()

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
    main = app_source()
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
    assert 'id: "vNextDevelopment"' in action_code
    assert 'label: "vNext開発担当"' in action_code
    assert 'description: "vNext開発を進める"' in action_code
    assert 'taskId: "development", mode: "upgrade"' in action_code
    assert 'enabled: isSubscription && product.upgradeStatus === "upgrading"' in action_code
    assert 'enabled: isSubscription && (isReady || isSelling) && product.upgradeStatus === "idle"' in action_code
    assert 'if (action.id === "vNextDevelopment") return isSubscription && product.upgradeStatus === "upgrading"' in action_code
    assert 'if (action.id === "support") return isSubscription' in action_code
    assert 'if (action.id === "upgrade") return isSubscription && (isReady || isSelling) && product.upgradeStatus !== "upgrading"' in action_code
    assert 'id: "crisis"' in action_code
    assert 'if (action.id === "qa" || action.id === "marketing" || action.id === "crisis") return !isIdea' in action_code
    assert 'if (action.id === "newProduct") return isIdea || isDeveloping' in action_code
    assert 'if (action.id === "sales") return isReady || isSelling' in action_code


def test_vnext_development_action_replaces_upgrade_while_upgrade_is_running():
    main = app_source()
    start = main.index("function getProductAvailableActions(product, definition)")
    end = main.index("function getProductAssignmentActions(product, definition)", start)
    action_code = main[start:end]

    assert 'id: "vNextDevelopment"' in action_code
    assert 'label: "vNext開発担当"' in action_code
    assert 'description: "vNext開発を進める"' in action_code
    assert 'taskId: "development", mode: "upgrade"' in action_code
    assert 'if (action.id === "vNextDevelopment") return isSubscription && product.upgradeStatus === "upgrading"' in action_code
    assert 'if (action.id === "upgrade") return isSubscription && (isReady || isSelling) && product.upgradeStatus !== "upgrading"' in action_code
    assert 'if (action.id === "support") return isSubscription' in action_code
    assert "vNext開発担当を置くと再開します" in main
    assert "担当AIを選ぶとvNext開発が進みます。" in main
    assert 'product.upgradeStatus === "idle" || product.upgradeStatus === "upgrading"' in main


def test_development_and_upgrade_modes_are_kept_separate_when_assigning():
    main = app_source()

    assert "function assignAiToTask(taskId, aiId, productId, mode)" in main
    assert "function getDevelopmentAssignmentMode(taskId, productId, mode)" in main
    assert 'const assignmentMode = getDevelopmentAssignmentMode(taskId, normalizedProductId, mode || "normal")' in main
    assert 'if (assignmentMode === "upgrade") startSubscriptionUpgrade(normalizedProductId);' in main
    assert 'else startProductDevelopmentIfNeeded(normalizedProductId);' in main
    assert 'shouldStartUpgradeOnDevelopmentAssignment(targetProduct, targetDefinition)' not in main[main.index("function assignAiToTask"):main.index("function clearAssignment", main.index("function assignAiToTask"))]
    assert 'if (assignmentDraft.mode === "upgrade" && product.upgradeStatus === "upgrading") return definition.name + "のv" + (getProductVersion(product) + 1) + "開発担当を選ぶ"' in main
    assert 'if (assignmentDraft.mode === "upgrade") return definition.name + "をバージョンアップする"' in main
    assert 'if (assignmentDraft.taskId === "development") return definition.name + "を開発する"' in main
    assert '担当AIを選ぶとvNext開発が進みます。' in main


def test_idea_product_action_menu_only_offers_development():
    main = app_source()
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


def test_manual_mission_rewards_are_not_auto_synced_on_load():
    main = app_source()

    assert "claimCompletedMissions" not in main
    assert "function claimMissionReward(missionId)" in main
    assert "getClaimableMissions()" in main
    assert "報酬を受け取る" in main
    assert "data-claim-mission" in main


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
        "claimedMissions": [
            "daily_report_developing", "assign_daily_development", "daily_report_ready_mission",
            "assign_daily_sales", "daily_first_customer", "daily_mrr_500",
            "meeting_developing", "meeting_ready_mission", "total_mrr_10k_mission",
            "slide_developing", "slide_ready_mission", "slide_first_sale_mission",
            "daily_v2_mission", "meeting_v2_mission", "any_product_quality_70"
        ],
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
        "claimedMissions": [
            "daily_report_developing", "assign_daily_development", "daily_report_ready_mission",
            "assign_daily_sales", "daily_first_customer", "daily_mrr_500",
            "meeting_developing", "meeting_ready_mission", "total_mrr_10k_mission",
            "slide_developing", "slide_ready_mission", "slide_first_sale_mission",
            "daily_v2_mission", "meeting_v2_mission", "any_product_quality_70"
        ],
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
    main = app_source()
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
    assert "#8f2c42" in danger_style
    assert "box-shadow: none" in danger_style
    assert "font-size: 12px" in danger_style
    assert "min-height: 32px" in danger_style


def test_employee_cards_show_task_specialties_and_current_assignments():
    main = app_source()

    assert "WORKER_TASK_PROFILES" in main
    assert "得意タスク: " in main
    assert "現在担当: " in main
    assert "getWorkerAssignmentSummary(workerId)" in main
    assert "Lvアップで開発速度UP" in main
    assert "Lvアップで販売成功率UP" in main
    assert "Lvアップで認知度上昇量UP" in main
    assert "Lvアップでサポート効果UP" in main
    assert "Lvアップで品質改善量UP" in main


def test_employee_cards_deemphasize_legacy_direct_status_effects():
    main = app_source()
    start = main.index("function getEmployeeCardsHtml()")
    end = main.index("function renderLatestLog()", start)
    employee_code = main[start:end]

    assert "effect-list" not in employee_code
    assert "signedCurrency(effect.money)" not in employee_code
    assert "signedNumber(effect.users)" not in employee_code
    assert "売上 " not in employee_code
    assert "ユーザー " not in employee_code
    assert "炎上度 " not in employee_code


def test_boss_and_fire05_roles_are_explained_for_v03_pipeline():
    main = app_source()

    assert "AI社長" in main
    assert "汎用補助" in main
    assert "すべてのタスクに割り振れるが、専門AIより低速" in main
    assert "Fire-05" in main
    assert "炎上対応専門。炎上度を大きく下げます" in main
    assert "今後の炎上対応タスクで活躍予定" not in main


def test_employee_summary_keeps_specialty_labels_after_pipeline_card_update():
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
    assert "Care-04 Lv1 サポート" in output["employeePanelHtml"]
    assert "Security-06 Lv1 品質管理" in output["employeePanelHtml"]
    assert "Fire-05 Lv1 炎上対応" in output["employeePanelHtml"]


def test_employee_cards_have_assign_work_buttons_and_disabled_unhired_state():
    main = app_source()

    assert "data-worker-assign" in main
    assert "仕事を割り振る" in main
    assert "openWorkerAssignmentModal" in main
    assert "worker-assign-button" in main
    assert "disabled>仕事を割り振る" in main


def test_worker_assignment_modal_uses_set_task_ais_flow():
    main = app_source()

    assert "function openWorkerAssignmentModal(workerId)" in main
    assert 'assignmentModalMode = "employee"' in main
    assert "getAssignableTasksForWorker(workerId)" in main
    assert "isWorkerProductTaskAvailable" in main
    assert "getWorkerAssignmentMode" in main
    assert "setTaskAis(assignmentDraft.taskId, assignmentDraft.productId, assignmentDraft.aiIds || [], assignmentDraft.mode)" in main
    assert "getWorkerLabel(assignmentDraft.aiId) + \"に仕事を割り振る\"" in main
    assert "refreshAssignmentDraftAiIds()" in main
    assert "toggleAssignmentDraftAi" in main


def test_worker_task_candidates_match_v03_specialists():
    main = app_source()

    assert '{ id: "development", label: "開発", workers: ["boss", "dev01"] }' in main
    assert '{ id: "sales", label: "販売", workers: ["boss", "sales02"] }' in main
    assert '{ id: "marketing", label: "広報", workers: ["boss", "buzz03"] }' in main
    assert '{ id: "support", label: "サポート", workers: ["boss", "care04"] },' in main
    assert '{ id: "crisis", label: "炎上対応", workers: ["boss", "fire05"] }' in main
    assert '{ id: "qa", label: "品質管理", workers: ["boss", "security06"] }' in main
    assert "炎上対応専門。炎上度を大きく下げます" in main


def test_employee_origin_assignment_respects_product_state_constraints():
    main = app_source()
    start = main.index("function canAssignTaskToProduct")
    end = main.index("function getWorkerProductTaskDisabledReason", start)
    code = main[start:end]

    assert 'if (taskId === "development")' in code
    assert 'product.status === "idea" || product.status === "developing"' in code
    assert 'product.upgradeStatus === "idle" || product.upgradeStatus === "upgrading"' in code
    assert 'if (taskId === "sales") return product.status === "ready" || product.status === "selling"' in code
    assert 'if (taskId === "qa" || taskId === "marketing") return product.status === "developing" || product.status === "ready" || product.status === "selling"' in code
    assert 'if (taskId === "support") return definition.type === "subscription" && product.status === "selling" && getProductCustomers(product) > 0' in code
    assert 'if (taskId === "crisis") return product.status === "selling" || ((state.fire >= 50 || getProductFire(product) >= 40) && product.status !== "idea")' in code


def test_employee_assignment_mode_separates_new_product_and_upgrade_from_employee_cards():
    main = app_source()
    start = main.index("function getWorkerAssignmentMode")
    end = main.index("function closeAssignmentModal", start)
    code = main[start:end]

    assert 'if (taskId !== "development") return "normal"' in code
    assert 'getDevelopmentAssignmentMode(taskId, productId, null)' in code
    assert 'assignmentMode === "upgrade" ? "upgrade" : "newProduct"' in code
    assert 'mode === "newProduct"' not in code


def test_legacy_employee_effects_are_removed_from_primary_logic():
    main = app_source()

    assert "applyEmployeeEffects" not in main
    assert "applyBaseContractWork" in main
    assert 'money:' not in (ROOT / "js" / "data" / "employees.js").read_text()
    assert 'users:' not in (ROOT / "js" / "data" / "employees.js").read_text()
    assert 'effect:' not in (ROOT / "js" / "data" / "employees.js").read_text()


def test_share_text_uses_total_customers_instead_of_legacy_users_label():
    main = app_source()
    start = main.index("function createShareText()")
    end = main.index("function shareGameStatus()", start)
    share_code = main[start:end]

    assert "総顧客: " in share_code
    assert "getTotalProductCustomers()" in share_code
    assert "ユーザー: " not in share_code


def test_share_text_is_short_and_omits_full_product_details():
    output = run_browser_smoke({
        "money": 672500,
        "totalMoney": 672500,
        "companyLevel": 3,
        "products": {
            "dailyReportAi": {"status": "selling", "customers": 3, "version": 5, "awareness": 49, "mrr": 999999},
            "meetingMinutesAi": {"status": "selling", "customers": 12, "version": 2, "awareness": 81},
            "slideKitAi": {"status": "selling", "unitsSold": 10, "lifetimeRevenue": 98000},
        },
        "logs": [{"type": "success", "text": "とても長い最新ログがここに入っても共有文には入れません。", "createdAt": 1760000000000}],
    })
    share_text = output["shareText"]

    assert "https://nao70161994.github.io/ai-black-startup/" in share_text
    assert len(share_text) <= 200
    assert "総顧客: " in share_text
    assert "主力: " in share_text
    assert "製品一覧: " not in share_text
    assert "AI日報メーカー v" not in share_text
    assert " | " not in share_text
    assert "ユーザー" not in share_text
    assert "最新ログ" not in share_text
    assert "担当:" not in share_text


def test_readme_intro_describes_product_pipeline_not_legacy_employee_effects():
    readme = (ROOT / "README.md").read_text()
    intro = readme[readme.index("## 概要"):readme.index("## 公開URL")]

    assert "製品開発・販売・広報・サポート" in intro
    assert "MRRと即時売上" in intro
    assert "売上、ユーザー、バグ、炎上度を管理しながらAI社員を雇用・強化" not in intro


def test_crisis_assignment_is_normalized_and_fire05_can_handle_crisis():
    output = run_browser_smoke({
        "money": 1000,
        "totalMoney": 300000,
        "users": 0,
        "bugs": 0,
        "fire": 80,
        "companyLevel": 5,
        "employees": {"dev01": 1, "sales02": 1, "buzz03": 1, "care04": 1, "fire05": 1, "security06": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "progress": 100, "quality": 70, "bugs": 0, "awareness": 50, "customers": 2, "version": 1}},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    })

    assert product_assignment(output["save"]["assignments"], "crisis")["aiIds"] == []
    assert "炎上対応" in output["assignmentHtml"]


def test_fire05_crisis_task_reduces_fire_without_old_effects():
    output = run_game_action_smoke({
        "money": 1000,
        "totalMoney": 300000,
        "users": 0,
        "bugs": 0,
        "fire": 80,
        "companyLevel": 5,
        "employees": {"dev01": 0, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 1, "security06": 0},
        "assignments": {"crisis": {"productId": "dailyReportAi", "aiId": "fire05"}},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "progress": 100, "quality": 70, "bugs": 0, "awareness": 50, "customers": 1, "version": 1}},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    }, "window.__testApi.tick(); window.__testApi.saveGame();")

    assert output["save"]["fire"] < 80
    assert output["save"]["productFlags"]["dailyReportAi"]["crisisStartedLogged"] is True


def test_claiming_completed_mission_reward_is_manual():
    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 1,
        "employees": {"dev01": 0, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "developing", "progress": 1, "quality": 60, "bugs": 0, "awareness": 0, "customers": 0}},
        "claimedMissions": [],
        "logs": [],
        "lastSavedAt": 9999999999999,
    }, "window.__testApi.saveGame();")
    assert "daily_report_developing" not in output["save"]["claimedMissions"]

    claimed = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 1,
        "employees": {"dev01": 0, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "developing", "progress": 1, "quality": 60, "bugs": 0, "awareness": 0, "customers": 0}},
        "claimedMissions": [],
        "logs": [],
        "lastSavedAt": 9999999999999,
    }, "window.__testApi.claimMissionReward('daily_report_developing'); window.__testApi.saveGame();")
    assert "daily_report_developing" in claimed["save"]["claimedMissions"]
    assert claimed["save"]["money"] == 200
    assert claimed["save"]["totalMoney"] == 200


def test_company_level_expansion_is_manual_and_one_level_per_click():
    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 1000000,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 1,
        "employees": {"dev01": 0, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    }, "window.__testApi.saveGame();")
    assert output["save"]["companyLevel"] == 1

    expanded = run_game_action_smoke({
        "money": 0,
        "totalMoney": 1000000,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 1,
        "employees": {"dev01": 0, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    }, "window.__testApi.expandCompanyLevel(); window.__testApi.saveGame();")
    assert expanded["save"]["companyLevel"] == 2


def test_company_level_existing_save_is_not_lowered_by_normalize():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 5,
        "employees": {"dev01": 0, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    })
    assert output["save"]["companyLevel"] == 5


def test_company_expansion_panel_and_manual_reward_ui_are_present():
    index = (ROOT / "index.html").read_text()
    main = app_source()

    assert 'id="companyExpansionPanel"' in index
    assert "会社Lvアップ可能" in main
    assert "会社を拡張する" in main
    assert "function expandCompanyLevel()" in main
    assert "function canExpandCompany()" in main
    assert "報酬を受け取る" in main
    assert "function claimMissionReward(missionId)" in main

def test_manual_mission_reward_button_uses_full_width_claim_row():
    main = app_source()
    css = (ROOT / "style.css").read_text()

    assert "mission-claim-block" in main
    assert "mission-reward-row" in main
    assert "mission-claim-button" in main
    assert "mission-item done claimable" in main
    assert "達成済み・未受け取り" in main
    assert "報酬: +" in main
    assert "claim-mission-button" not in main
    assert "claimed ? '' : '<span class=\"mission-reward-row\">報酬: +'" in main
    assert "done ? '✓' : '○'" in main
    assert ".mission-claim-block" in css
    assert "flex-direction: column" in css
    assert ".mission-reward-row" in css
    assert "grid-column: 1 / -1" in css
    assert ".mission-claim-button { display: flex" in css
    assert "width: 100%" in css
    assert "min-height: 44px" in css
    assert ".mission-item.claimable" in css
    assert ".mission-item.claimed" in css


def test_multi_ai_assignments_migrate_and_allow_two_workers_per_task():
    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 1,
        "employees": {"dev01": 1, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "assignments": {"development": {"productId": "dailyReportAi", "aiId": "boss"}},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "developing", "progress": 0, "quality": 60, "bugs": 0, "awareness": 0}},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    }, "window.__testApi.assignAiToTask('development', 'dev01', 'dailyReportAi'); window.__testApi.saveGame();")
    assignment = product_assignment(output["save"]["assignments"], "development")
    assert assignment["aiIds"] == ["boss", "dev01"]


def test_multi_ai_assignment_rejects_third_worker_and_removes_duplicate_from_other_task():
    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 5,
        "employees": {"dev01": 1, "sales02": 1, "buzz03": 1, "care04": 1, "fire05": 1, "security06": 1},
        "assignments": {"development": {"productId": "dailyReportAi", "aiIds": ["boss", "dev01"]}, "sales": {"productId": "dailyReportAi", "aiIds": ["sales02"]}},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "progress": 100, "quality": 60, "bugs": 0, "awareness": 0, "customers": 1}},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    }, "window.__testApi.assignAiToTask('development', 'security06', 'dailyReportAi'); window.__testApi.assignAiToTask('sales', 'boss', 'dailyReportAi'); window.__testApi.saveGame();")
    assignments = output["save"]["assignments"]
    assert product_assignment(assignments, "development")["aiIds"] == ["dev01"]
    assert product_assignment(assignments, "sales")["aiIds"] == ["sales02", "boss"]
    assert len(product_assignment(assignments, "sales")["aiIds"]) <= 2


def test_multi_ai_development_effects_are_combined():
    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 1,
        "employees": {"dev01": 1, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "assignments": {"development": {"productId": "meetingMinutesAi", "aiIds": ["boss", "dev01"]}},
        "products": {"meetingMinutesAi": {"id": "meetingMinutesAi", "status": "developing", "progress": 0, "quality": 55, "bugs": 0, "awareness": 0}},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    }, "window.__testApi.tick(); window.__testApi.saveGame();")
    product = output["save"]["products"]["meetingMinutesAi"]
    assert product["progress"] > 4.0
    assert product["bugs"] > 0.2


def test_multi_ai_sales_effects_and_labels_are_available():
    main = app_source()

    assert "salesWorkers.forEach(function (workerId)" in main
    assert "getWorkerGroupLabel(assignment.aiIds)" in main
    assert "getAssignmentShareSummary()" in main
    share_start = main.index("function createShareText()")
    share_end = main.index("function shareGameStatus()", share_start)
    assert '"担当: " + getAssignmentShareSummary()' not in main[share_start:share_end]
    assert "AI社長は専門AIと同じ仕事に入って補助" in (ROOT / "README.md").read_text()
    assert "最大2体" in main
    assert "最大2体まで" in main


def test_product_action_disabled_reasons_match_product_state():
    main = app_source()

    assert "function getProductActionDisabledReason(actionId, product, definition)" in main
    assert "現在vNextを開発中です" in main
    assert "サブスク製品のみ" in main
    assert "販売中のサブスクで有効" in main
    assert "顧客獲得後に有効" in main
    assert "開発済み製品はバージョンアップへ" in main


def test_sales_assignment_hint_explains_existing_revenue_continues():
    main = app_source()

    assert "販売担当なし。既存MRRは継続します。販売担当を置くと新規顧客を獲得できます。" in main
    assert "販売担当を置くと販売判定が進みます。" in main



def test_assignment_modal_disables_empty_bulk_apply_and_invalid_products():
    main = app_source()

    assert "selectedAiIds.length > 0" in main
    assert "担当AIを1体以上選んでください。" in main
    assert "function canAssignTaskToProduct(taskId, productId)" in main
    assert "!canAssignTaskToProduct(taskId, normalizedProductId)" in main
    assert "canAssignTaskToProduct(assignmentDraft.taskId, definition.id)" in main


def test_invalid_state_task_assignment_is_rejected():
    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 5,
        "employees": {"dev01": 1, "sales02": 1, "buzz03": 1, "care04": 1, "fire05": 1, "security06": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "idea", "progress": 0, "quality": 60, "bugs": 0, "awareness": 0, "customers": 0}},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 1760000000000,
    }, "window.__testApi.setTaskAis('qa', 'dailyReportAi', ['security06'], 'normal'); window.__testApi.setTaskAis('sales', 'dailyReportAi', ['sales02'], 'normal'); window.__testApi.saveGame();")
    assert product_assignment(output["save"]["assignments"], "qa", "dailyReportAi")["aiIds"] == []
    assert product_assignment(output["save"]["assignments"], "sales", "dailyReportAi")["aiIds"] == []


def test_assignment_modal_supports_multi_ai_selection_and_bulk_apply():
    main = app_source()

    assert "aiIds: []" in main
    assert "assignmentDraft.aiIds" in main
    assert "function setTaskAis(taskId, productId, aiIds, mode)" in main
    assert "担当AIを選択 最大2体" in main
    assert "現在担当:" in main
    assert "選択中:" in main
    assert "この担当にする" in main
    assert "担当を解除" in main
    assert "toggleAssignmentDraftAi" in main
    assert "selectedAiIds.length >= 2 && !selected" in main
    assert "最大2体まで" in main
    assert "getAllWorkerIds()" in main
    assert "対応不可" in main
    assert "未雇用" in main


def test_set_task_ais_replaces_ai_ids_and_moves_selected_workers_from_other_jobs():
    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 5,
        "employees": {"dev01": 1, "sales02": 1, "buzz03": 1, "care04": 1, "fire05": 1, "security06": 1},
        "assignments": {
            "sales": {"productAssignments": {"slideKitAi": {"aiIds": ["boss"]}}},
            "development": {"productAssignments": {"dailyReportAi": {"aiIds": ["dev01"], "mode": "newProduct"}}},
        },
        "products": {
            "dailyReportAi": {"id": "dailyReportAi", "status": "developing", "progress": 0, "quality": 60, "bugs": 0, "awareness": 0},
            "slideKitAi": {"id": "slideKitAi", "status": "ready", "progress": 160, "quality": 55, "bugs": 0, "awareness": 0},
        },
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    }, "window.__testApi.setTaskAis('development', 'dailyReportAi', ['boss', 'dev01'], 'newProduct'); window.__testApi.saveGame();")
    assignments = output["save"]["assignments"]
    assert product_assignment(assignments, "development", "dailyReportAi")["aiIds"] == ["boss", "dev01"]
    assert product_assignment(assignments, "sales", "slideKitAi")["aiIds"] == []
    assert "AI社長 + Dev-01 → AI日報メーカー" in output["assignmentHtml"]


def test_assignment_modal_initializes_existing_and_employee_origin_selected_ai_ids():
    main = app_source()

    assert "assignmentDraft.aiIds = assignment.aiIds.slice(0, 2)" in main
    assert "assignmentDraft.aiIds = current.aiIds.slice(0, 2)" in main
    assert "const preferredWorkerId = assignmentModalMode === \"employee\" ? assignmentDraft.aiId : null" in main
    assert "getInitialAssignmentAiIds(assignmentDraft.taskId, assignmentDraft.productId, preferredWorkerId)" in main
    assert "if (preferredWorkerId && canWorkerAssignToTask(preferredWorkerId" in main


def test_product_scoped_parallel_sales_assignments_can_target_multiple_products():
    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 5,
        "employees": {"dev01": 1, "sales02": 1, "buzz03": 1, "care04": 1, "fire05": 1, "security06": 1},
        "assignments": {},
        "products": {
            "dailyReportAi": {"id": "dailyReportAi", "status": "ready", "progress": 100, "quality": 80, "bugs": 0, "awareness": 100, "customers": 0},
            "slideKitAi": {"id": "slideKitAi", "status": "ready", "progress": 160, "quality": 80, "bugs": 0, "awareness": 100, "unitsSold": 0, "lifetimeRevenue": 0},
        },
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    }, "window.__testApi.assignAiToTask('sales', 'sales02', 'dailyReportAi'); window.__testApi.assignAiToTask('sales', 'boss', 'slideKitAi'); window.__testApi.tick(); window.__testApi.saveGame();")
    assignments = output["save"]["assignments"]
    assert product_assignment(assignments, "sales", "dailyReportAi")["aiIds"] == ["sales02"]
    assert product_assignment(assignments, "sales", "slideKitAi")["aiIds"] == ["boss"]
    assert output["save"]["products"]["dailyReportAi"]["status"] == "selling"
    assert output["save"]["products"]["slideKitAi"]["status"] == "selling"
    assert "Sales-02 → AI日報メーカー" in output["assignmentHtml"]
    assert "AI社長 → AIスライド生成キット" in output["assignmentHtml"]


def test_product_scoped_parallel_development_progresses_multiple_products_in_one_tick():
    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 5,
        "employees": {"dev01": 1, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "assignments": {},
        "products": {
            "dailyReportAi": {"id": "dailyReportAi", "status": "developing", "progress": 0, "quality": 60, "bugs": 0, "awareness": 0},
            "meetingMinutesAi": {"id": "meetingMinutesAi", "status": "developing", "progress": 0, "quality": 55, "bugs": 0, "awareness": 0},
        },
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    }, "window.__testApi.assignAiToTask('development', 'dev01', 'dailyReportAi'); window.__testApi.assignAiToTask('development', 'boss', 'meetingMinutesAi'); window.__testApi.tick(); window.__testApi.saveGame();")
    assignments = output["save"]["assignments"]
    assert product_assignment(assignments, "development", "dailyReportAi")["aiIds"] == ["dev01"]
    assert product_assignment(assignments, "development", "meetingMinutesAi")["aiIds"] == ["boss"]
    assert output["save"]["products"]["dailyReportAi"]["progress"] > 3.0
    assert output["save"]["products"]["meetingMinutesAi"]["progress"] >= 1.0


def test_product_scoped_assignments_reject_third_ai_per_task_product_and_move_ai_between_jobs():
    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 5,
        "employees": {"dev01": 1, "sales02": 1, "buzz03": 1, "care04": 1, "fire05": 1, "security06": 1},
        "assignments": {"development": {"productId": "dailyReportAi", "aiIds": ["boss", "dev01"]}},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "developing", "progress": 0, "quality": 60, "bugs": 0, "awareness": 0}, "slideKitAi": {"id": "slideKitAi", "status": "ready", "progress": 160, "quality": 55, "bugs": 0, "awareness": 0}},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    }, "window.__testApi.assignAiToTask('development', 'security06', 'dailyReportAi'); window.__testApi.assignAiToTask('sales', 'boss', 'slideKitAi'); window.__testApi.saveGame();")
    assignments = output["save"]["assignments"]
    assert product_assignment(assignments, "development", "dailyReportAi")["aiIds"] == ["dev01"]
    assert product_assignment(assignments, "sales", "slideKitAi")["aiIds"] == ["boss"]
    assert len(product_assignment(assignments, "development", "dailyReportAi")["aiIds"]) <= 2


def test_new_product_development_completion_releases_only_that_product_development_workers():
    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 5,
        "employees": {"dev01": 1, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "assignments": {"development": {"productAssignments": {
            "dailyReportAi": {"aiIds": ["dev01"], "mode": "newProduct"},
            "meetingMinutesAi": {"aiIds": ["boss"], "mode": "newProduct"},
        }}},
        "products": {
            "dailyReportAi": {"id": "dailyReportAi", "status": "developing", "progress": 99, "quality": 60, "bugs": 0, "awareness": 0},
            "meetingMinutesAi": {"id": "meetingMinutesAi", "status": "developing", "progress": 0, "quality": 55, "bugs": 0, "awareness": 0},
        },
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    }, "window.__testApi.tick(); window.__testApi.saveGame();")
    assignments = output["save"]["assignments"]
    assert output["save"]["products"]["dailyReportAi"]["status"] == "ready"
    assert product_assignment(assignments, "development", "dailyReportAi")["aiIds"] == []
    assert product_assignment(assignments, "development", "dailyReportAi")["mode"] == "newProduct"
    assert product_assignment(assignments, "development", "meetingMinutesAi")["aiIds"] == ["boss"]
    assert "Dev-01 → AI日報メーカー" not in output["assignmentHtml"]


def test_development_completion_releases_multiple_ai_from_same_product():
    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 5,
        "employees": {"dev01": 1, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "assignments": {"development": {"productAssignments": {
            "dailyReportAi": {"aiIds": ["boss", "dev01"], "mode": "newProduct"},
        }}},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "developing", "progress": 99, "quality": 60, "bugs": 0, "awareness": 0}},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    }, "window.__testApi.tick(); window.__testApi.saveGame();")
    assert product_assignment(output["save"]["assignments"], "development", "dailyReportAi")["aiIds"] == []
    assert "AI社長 + Dev-01" not in output["assignmentHtml"]
    assert "開発担当から外れました" in output["latestLog"]


def test_subscription_upgrade_completion_releases_development_workers():
    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 5,
        "employees": {"dev01": 1, "sales02": 0, "buzz03": 0, "care04": 0, "fire05": 0, "security06": 0},
        "assignments": {"development": {"productAssignments": {
            "dailyReportAi": {"aiIds": ["boss", "dev01"], "mode": "upgrade"},
        }}},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "progress": 100, "quality": 60, "bugs": 0, "awareness": 20, "customers": 3, "version": 1, "upgradeStatus": "upgrading", "upgradeProgress": 99}},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    }, "window.__testApi.tick(); window.__testApi.saveGame();")
    product = output["save"]["products"]["dailyReportAi"]
    assert product["version"] == 2
    assert product["upgradeStatus"] == "idle"
    assert product_assignment(output["save"]["assignments"], "development", "dailyReportAi")["aiIds"] == []
    assert product_assignment(output["save"]["assignments"], "development", "dailyReportAi")["mode"] == "newProduct"
    assert any("次の仕事待ち" in log.get("text", "") for log in output["save"]["logs"])


def test_continuous_tasks_are_not_auto_released_when_development_completes():
    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 80,
        "companyLevel": 5,
        "employees": {"dev01": 1, "sales02": 1, "buzz03": 1, "care04": 1, "fire05": 1, "security06": 1},
        "assignments": {
            "development": {"productAssignments": {"dailyReportAi": {"aiIds": ["dev01"], "mode": "newProduct"}}},
            "sales": {"productAssignments": {"dailyReportAi": {"aiIds": ["sales02"]}}},
            "qa": {"productAssignments": {"dailyReportAi": {"aiIds": ["security06"]}}},
            "marketing": {"productAssignments": {"dailyReportAi": {"aiIds": ["buzz03"]}}},
            "support": {"productAssignments": {"dailyReportAi": {"aiIds": ["care04"]}}},
            "crisis": {"productAssignments": {"dailyReportAi": {"aiIds": ["fire05"]}}},
        },
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "developing", "progress": 99, "quality": 60, "bugs": 0, "awareness": 0, "customers": 2, "supportLoad": 40, "satisfaction": 70, "churnRisk": 20}},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    }, "window.__testApi.tick(); window.__testApi.saveGame();")
    assignments = output["save"]["assignments"]
    assert product_assignment(assignments, "development", "dailyReportAi")["aiIds"] == []
    assert product_assignment(assignments, "sales", "dailyReportAi")["aiIds"] == ["sales02"]
    assert product_assignment(assignments, "qa", "dailyReportAi")["aiIds"] == ["security06"]
    assert product_assignment(assignments, "marketing", "dailyReportAi")["aiIds"] == ["buzz03"]
    assert product_assignment(assignments, "support", "dailyReportAi")["aiIds"] == ["care04"]
    assert product_assignment(assignments, "crisis", "dailyReportAi")["aiIds"] == ["fire05"]


def test_development_completion_release_structure_is_documented():
    main = app_source()
    readme = (ROOT / "README.md").read_text()

    assert "function releaseDevelopmentWorkersAfterCompletion(productId, messageTemplate)" in main
    assert 'setAssignedAiIds("development", productId, [], "newProduct")' in main
    assert "releaseDevelopmentWorkersAfterCompletion(product.id" in main
    assert "新規開発やvNext開発は完了すると開発担当AIが自動で外れ" in readme
    assert "販売、品質管理、広報、サポート、炎上対応は継続タスク" in readme


def test_product_scoped_assignment_structure_is_documented_for_all_tasks():
    main = app_source()
    readme = (ROOT / "README.md").read_text()

    assert "function createInitialProductAssignments(taskId)" in main
    assert "productAssignments[product.id]" in main
    assert "setAssignedAiIds(taskId, normalizedProductId" in main
    assert "return getProductAssignment(taskId, productId).aiIds" in main
    assert "各タスクは製品ごとに並行担当でき" in readme
    assert "1製品×1タスクに最大2体" in readme
    assert "1体のAIは同時に1つの仕事だけ" in readme



def test_unknown_product_assignment_ids_fall_back_to_daily_report():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 0,
        "users": 0,
        "bugs": 0,
        "fire": 0,
        "companyLevel": 5,
        "employees": {"dev01": 1, "sales02": 1, "buzz03": 1, "care04": 1, "fire05": 1, "security06": 1},
        "assignments": {"sales": {"productAssignments": {"ghostProduct": {"aiIds": ["sales02"]}}}},
        "products": {},
        "logs": [],
        "claimedMissions": [],
        "lastSavedAt": 9999999999999,
    })
    assert product_assignment(output["save"]["assignments"], "sales", "dailyReportAi")["aiIds"] == ["sales02"]


def test_beta1_public_descriptions_are_product_pipeline_focused():
    index = (ROOT / "index.html").read_text()
    manifest = json.loads((ROOT / "manifest.webmanifest").read_text())
    readme = (ROOT / "README.md").read_text()
    expected = "AI社長と専門AIを製品ごとのタスクへ割り振り、製品開発・販売・広報・サポートを回してMRRと即時売上を伸ばす放置型AI会社経営ゲーム。"

    assert f'<meta name="description" content="{expected}">' in index
    assert f'<meta property="og:description" content="{expected}">' in index
    assert f'<meta name="twitter:description" content="{expected}">' in index
    assert manifest["description"] == expected
    assert "製品開発・販売・広報・サポート" in readme
    assert "AI社員を雇用・強化し、売上、バグ、炎上を管理" not in index + manifest["description"] + readme


def test_legacy_user_wording_is_removed_from_report_logs():
    main = app_source()
    start = main.index("const REPORT_LOGS")
    end = main.index("function createInitialState", start)
    report_logs = main[start:end]

    assert "全ユーザー" not in report_logs
    assert "ユーザーの" not in report_logs
    assert "ユーザー向け" not in report_logs
    assert "ユーザー離脱" not in report_logs
    assert "総顧客: " in main


def test_assignment_modal_makes_two_ai_limit_clear():
    main = app_source()

    assert "選択中: " in main
    assert "selectedAiIds.length + '/2）</div>'" in main
    assert "この仕事は満員です（最大2体まで）" in main
    assert "2体選択中は他のAIを選べません" in main
    assert "同じAIは別の仕事から外れます" in main


def test_next_recommendation_can_suggest_idle_workers():
    main = app_source()

    assert "function getIdleWorkerRecommendationText()" in main
    assert "function isWorkerIdle(workerId)" in main
    assert "Dev-01が空いています" in main
    assert "Sales-02が空いています" in main
    assert "Buzz-03が空いています" in main
    assert "Care-04が空いています" in main
    assert "Security-06が空いています" in main
    assert "Fire-05が空いています" in main
    assert "AI社長が空いています" in main


def test_fire05_and_crisis_copy_explains_tradeoff():
    main = app_source()

    assert "炎上対応専門。炎上度を大きく下げます" in main
    assert "対応中は売上機会を少し失います" in main
    assert "炎上度DOWN / 売上機会を少し消費" in main
    assert "AI社長: ゆっくり火消し" in main
    assert "Fire-05: 炎上対応が速いが少し機会損失" in main


def test_reset_copy_is_explicit_and_subdued():
    index = (ROOT / "index.html").read_text()
    main = app_source()
    css = (ROOT / "style.css").read_text()

    assert ">データリセット</button>" in index
    assert "保存データが初期化されます。この操作は元に戻せません" in main
    assert ".actions button.danger" in css
    assert "border-style: dashed" in css
    assert "justify-self: end" in css



def test_decision_event_state_and_ui_are_present():
    index = (ROOT / "index.html").read_text()
    main = app_source()
    style = (ROOT / "style.css").read_text()

    assert 'id="decisionPanel"' in index
    assert "function renderDecisionPanel()" in main
    assert "DECISION_EVENTS" in main
    assert "pendingDecisionEvent" in main
    assert "decisionEventCooldown" in main
    assert "社長判断" in main
    assert "承認する" in main
    assert "却下する" in main
    assert ".decision-panel" in style
    for event_id in [
        "sales_big_contract",
        "buzz_bold_ad",
        "security_quality_pause",
        "care_customer_priority",
        "fire05_crisis_statement",
    ]:
        assert event_id in main


def test_decision_event_save_fields_are_normalized():
    output = run_browser_smoke({"money": 0, "totalMoney": 0, "pendingDecisionEvent": {"id": "unknown", "productId": "missing"}})

    assert output["save"]["pendingDecisionEvent"] is None
    assert "decisionEventCooldown" in output["save"]


def test_sales_decision_approval_uses_discrete_customers_and_clears_pending():
    output = run_game_action_smoke({
        "money": 1000,
        "totalMoney": 1000,
        "fire": 0,
        "products": {
            "dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 1, "mrr": 9999, "quality": 60, "bugs": 0}
        },
        "pendingDecisionEvent": {"id": "sales_big_contract", "productId": "dailyReportAi", "createdAt": 1},
        "decisionEventCooldown": 0,
    }, "window.__testApi.applyDecisionEventChoice('approve'); window.__testApi.saveGame();")

    product = output["save"]["products"]["dailyReportAi"]
    assert output["save"]["pendingDecisionEvent"] is None
    assert product["customers"] == 3
    assert product["mrr"] == 1500
    assert product["bugs"] == 5
    assert output["save"]["fire"] == 5


def test_decision_rejection_clears_pending_and_applies_rejection_effect():
    output = run_game_action_smoke({
        "money": 1000,
        "totalMoney": 1000,
        "fire": 50,
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 1}},
        "pendingDecisionEvent": {"id": "fire05_crisis_statement", "productId": "dailyReportAi", "createdAt": 1},
        "decisionEventCooldown": 0,
    }, "window.__testApi.applyDecisionEventChoice('reject'); window.__testApi.saveGame();")

    assert output["save"]["pendingDecisionEvent"] is None
    assert output["save"]["fire"] == 58


def test_decision_event_generation_can_queue_sales_event():
    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "employees": {"sales02": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "ready", "customers": 0}},
        "assignments": {"sales": {"productAssignments": {"dailyReportAi": {"aiIds": ["sales02"]}}}},
        "pendingDecisionEvent": None,
        "decisionEventCooldown": 0,
    }, "Math.random = function () { return 0; }; window.__testApi.applyDecisionEventGeneration(); window.__testApi.saveGame();")

    assert output["save"]["pendingDecisionEvent"]["id"] == "sales_big_contract"
    assert output["save"]["pendingDecisionEvent"]["productId"] == "dailyReportAi"



def test_next_recommendation_names_idle_worker_target_product():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 0,
        "companyLevel": 1,
        "employees": {"dev01": 1},
        "products": {
            "dailyReportAi": {"id": "dailyReportAi", "status": "ready", "progress": 100},
            "meetingMinutesAi": {"id": "meetingMinutesAi", "status": "developing", "progress": 0}
        },
        "claimedMissions": [
            "daily_report_developing", "assign_daily_development", "daily_report_ready_mission",
            "assign_daily_sales", "daily_first_customer", "daily_mrr_500",
            "meeting_developing", "meeting_ready_mission", "total_mrr_10k_mission",
            "slide_developing", "slide_ready_mission", "slide_first_sale_mission",
            "daily_v2_mission", "meeting_v2_mission", "any_product_quality_70"
        ],
        "assignments": {},
    })

    assert "Dev-01が空いています。自動議事録AIの開発に割り振りましょう。" in output["recommendationHtml"]


def test_next_recommendation_names_idle_sales_target_product():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 0,
        "companyLevel": 1,
        "employees": {"sales02": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "ready", "progress": 100}},
        "claimedMissions": [
            "daily_report_developing", "assign_daily_development", "daily_report_ready_mission",
            "assign_daily_sales", "daily_first_customer", "daily_mrr_500",
            "meeting_developing", "meeting_ready_mission", "total_mrr_10k_mission",
            "slide_developing", "slide_ready_mission", "slide_first_sale_mission",
            "daily_v2_mission", "meeting_v2_mission", "any_product_quality_70"
        ],
        "assignments": {},
    })

    assert "Sales-02が空いています。AI日報メーカーの販売に割り振りましょう。" in output["recommendationHtml"]



def test_share_text_and_web_share_include_public_url():
    main = app_source()

    assert 'const PUBLIC_URL = "https://nao70161994.github.io/ai-black-startup/"' in main
    share_start = main.index("function createShareText()")
    share_end = main.index("function shareGameStatus()", share_start)
    assert "PUBLIC_URL" in main[share_start:share_end]
    share_block = main[share_end:main.index("function copyShareText", share_end)]
    assert 'url: PUBLIC_URL' not in share_block


def test_beta2_decision_events_and_weighted_selector_are_present():
    main = app_source()

    for event_id in [
        "subscription_price_review",
        "emergency_quality_fix",
        "one_shot_bulk_sale",
        "vnext_fast_track",
    ]:
        assert event_id in main
    assert "function selectDecisionEventCandidate(candidates)" in main
    assert "Math.random() * totalPriority" in main
    assert "費用-¥500" in main
    assert "費用-¥700" in main


def test_one_shot_bulk_sale_decision_approval_changes_state():
    output = run_game_action_smoke({
        "money": 1000,
        "totalMoney": 1000,
        "fire": 0,
        "products": {"slideKitAi": {"id": "slideKitAi", "status": "selling", "progress": 160, "unitsSold": 2, "lifetimeRevenue": 19600, "quality": 55, "bugs": 0, "awareness": 40}},
        "pendingDecisionEvent": {"id": "one_shot_bulk_sale", "productId": "slideKitAi", "createdAt": 1},
        "decisionEventCooldown": 0,
    }, "window.__testApi.applyDecisionEventChoice('approve'); window.__testApi.saveGame();")

    product = output["save"]["products"]["slideKitAi"]
    assert output["save"]["pendingDecisionEvent"] is None
    assert product["unitsSold"] == 3
    assert product["lifetimeRevenue"] == 29400
    assert output["save"]["money"] == 10800
    assert output["save"]["totalMoney"] == 10800
    assert output["save"]["fire"] == 8


def test_pending_decision_is_top_recommendation():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 1000000,
        "companyLevel": 5,
        "employees": {"dev01": 1, "sales02": 1, "buzz03": 1, "care04": 1, "fire05": 1, "security06": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 8, "supportLoad": 90, "satisfaction": 20, "churnRisk": 80}},
        "pendingDecisionEvent": {"id": "care_customer_priority", "productId": "dailyReportAi", "createdAt": 1},
        "claimedMissions": [],
    })

    assert "社長判断を確認しましょう: AI日報メーカー / 顧客対応優先" in output["recommendationHtml"]


def test_initial_recommendation_prefers_product_development_before_idle_ai():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 0,
        "companyLevel": 1,
        "employees": {},
        "products": {},
        "claimedMissions": [],
    })

    assert "AI日報メーカーの開発を始めましょう。" in output["recommendationHtml"]
    assert "AI社長が空いています" not in output["recommendationHtml"]


def test_primary_product_card_has_direct_action_and_detail_buttons():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 0,
        "companyLevel": 1,
        "employees": {},
        "products": {},
        "claimedMissions": [],
    })

    assert 'data-primary-product-menu="dailyReportAi"' in output["primaryProductHtml"]
    assert 'data-primary-product-detail="dailyReportAi"' in output["primaryProductHtml"]
    assert "primary-product-actions" in output["primaryProductHtml"]


def test_product_action_menu_categories_are_rendered():
    main = app_source()
    css = (ROOT / "style.css").read_text()

    assert "function renderProductActionMenuList(actions, productId)" in main
    assert "成長" in main
    assert "収益" in main
    assert "運用" in main
    assert "product-action-menu-heading" in css


def test_fire_pressure_reduces_sales_chance_structure():
    main = app_source()

    assert "function getFireSalesPressureFactor(product)" in main
    assert "const fireFactor = getFireSalesPressureFactor(product);" in main
    assert "definition.demand * fireFactor" in main


def test_mixed_legacy_save_migration_keeps_beta2_fields_safe():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 0,
        "companyLevel": 5,
        "employees": {"dev01": 1, "sales02": 1, "buzz03": 1, "care04": 1, "fire05": 1, "security06": 1},
        "products": {
            "dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 2.8, "mrr": 9999, "upgradeStatus": "upgrading", "supportLoad": 999, "satisfaction": -10, "churnRisk": 999},
            "slideKitAi": {"id": "slideKitAi", "status": "ready", "upgradeStatus": "upgrading", "unitsSold": 3.7, "lifetimeRevenue": 29400},
        },
        "assignments": {
            "development": {"productId": "dailyReportAi", "aiId": "dev01", "mode": "upgrade"},
            "sales": {"productId": "missingProduct", "aiIds": ["sales02", "boss", "buzz03"]},
            "support": "care04",
            "crisis": {"productId": "dailyReportAi", "aiId": "fire05"},
        },
        "pendingDecisionEvent": {"id": "missing", "productId": "dailyReportAi"},
    })

    save = output["save"]
    assert save["pendingDecisionEvent"] is None
    assert save["products"]["dailyReportAi"]["customers"] == 2
    assert save["products"]["dailyReportAi"]["mrr"] == 1000
    assert save["products"]["dailyReportAi"]["supportLoad"] == 100
    assert save["products"]["dailyReportAi"]["satisfaction"] == 0
    assert save["products"]["dailyReportAi"]["churnRisk"] == 100
    assert save["products"]["slideKitAi"]["upgradeStatus"] == "idle"
    assert save["products"]["slideKitAi"]["unitsSold"] == 3
    assert len(product_assignment(save["assignments"], "sales", "dailyReportAi")["aiIds"]) <= 2
    assert "productAssignments" in save["assignments"]["support"]
    assert "productAssignments" in save["assignments"]["crisis"]



def test_dashboard_bug_level_includes_product_bugs():
    main = app_source()

    assert "function getProductBugLevel()" in main
    assert "function getDashboardBugLevel()" in main
    assert 'setText("bugs", Math.round(getDashboardBugLevel()) + " / 100")' in main
    share_start = main.index("function createShareText()")
    share_end = main.index("function shareGameStatus()", share_start)
    assert '"バグ: " + Math.round(getDashboardBugLevel()) + "/100"' not in main[share_start:share_end]


def test_release_candidate_readme_mentions_public_share_and_cache_url():
    readme = (ROOT / "README.md").read_text()

    assert "公開URL" in readme
    assert "https://nao70161994.github.io/ai-black-startup/" in readme
    assert "共有テキストはXへ投稿しやすい短い形式" in readme
    assert "全製品の詳細、担当一覧、最新ログは共有文には入れず" in readme
    assert "- 公開URL" in readme
    assert "https://nao70161994.github.io/ai-black-startup/?v=20260524-42" in readme


def test_decision_panel_explains_impact_and_warning_style():
    main = app_source()
    css = (ROOT / "style.css").read_text()

    assert "decision-impact-heading" in main
    assert "影響" in main
    assert "decision-risk-button" in main
    assert ".decision-impact-heading" in css
    assert ".decision-risk-button" in css


def test_company_expansion_panel_previews_unlock_text():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 5000,
        "companyLevel": 1,
        "employees": {},
        "products": {},
        "claimedMissions": [],
    })

    assert "会社Lvアップ可能" in output["companyExpansionHtml"]
    assert "解放予定:" in output["companyExpansionHtml"]
    assert "Buzz-03" in output["companyExpansionHtml"]


def test_assignment_invariant_helpers_are_present_and_runtime_rules_still_hold():
    main = app_source()

    for helper in [
        "function getTaskProductAssignment(taskId, productId)",
        "function getAssignedAiIds(taskId, productId)",
        "function setAssignedAiIds(taskId, productId, aiIds, mode)",
        "function removeAiFromAllAssignments(aiId)",
        "function removeAiFromTaskProduct(taskId, productId, aiId)",
        "function clearTaskProductAssignment(taskId, productId)",
        "function canAssignAiToTaskProduct(taskId, productId, aiId)",
        "function normalizeProductAssignments(taskId, rawAssignment)",
        "const MAX_AI_PER_TASK_PRODUCT = balanceValue(\"MAX_AI_PER_TASK_PRODUCT\", 2)",
        "const MRR_TO_REVENUE_DIVISOR = balanceValue(\"MRR_TO_REVENUE_DIVISOR\", 300)",
    ]:
        assert helper in main

    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "employees": {"dev01": 1, "sales02": 1, "security06": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "developing"}},
    }, "window.__testApi.setTaskAis('development', 'dailyReportAi', ['boss', 'dev01', 'dev01', 'security06'], 'newProduct'); window.__testApi.saveGame();")

    dev_ai = product_assignment(output["save"]["assignments"], "development", "dailyReportAi")["aiIds"]
    assert dev_ai == ["boss", "dev01"]
    assert len(dev_ai) == 2


def test_assignment_moves_ai_from_previous_work_with_helpers():
    output = run_game_action_smoke({
        "money": 0,
        "totalMoney": 0,
        "employees": {"sales02": 1},
        "products": {
            "dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 1},
            "slideKitAi": {"id": "slideKitAi", "status": "selling"},
        },
        "assignments": {
            "sales": {"productAssignments": {"dailyReportAi": {"aiIds": ["boss"]}}},
        },
    }, "window.__testApi.setTaskAis('sales', 'slideKitAi', ['boss', 'sales02'], 'normal'); window.__testApi.saveGame();")

    assignments = output["save"]["assignments"]
    assert product_assignment(assignments, "sales", "dailyReportAi")["aiIds"] == []
    assert product_assignment(assignments, "sales", "slideKitAi")["aiIds"] == ["boss", "sales02"]


def test_new_decision_events_are_defined_and_can_apply_state_changes():
    main = app_source()
    for event_id in ["competitive_campaign", "tech_debt_repayment", "customer_interview", "mystery_big_deal"]:
        assert event_id in main

    output = run_game_action_smoke({
        "money": 5000,
        "totalMoney": 5000,
        "employees": {"security06": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 3, "quality": 50, "bugs": 40}},
        "pendingDecisionEvent": {"id": "tech_debt_repayment", "productId": "dailyReportAi", "createdAt": 1},
        "decisionStats": {"approved": 0, "rejected": 0},
    }, "window.__testApi.applyDecisionEventChoice('approve'); window.__testApi.saveGame();")

    product = output["save"]["products"]["dailyReportAi"]
    assert output["save"]["pendingDecisionEvent"] is None
    assert output["save"]["decisionStats"]["approved"] == 1
    assert product["bugs"] == 25
    assert product["quality"] == 58
    assert output["save"]["money"] == 4400


def test_achievements_are_normalized_rendered_and_unlocked_once():
    output = run_browser_smoke({
        "money": 0,
        "totalMoney": 0,
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 1}},
        "achievements": {},
    })

    assert "achievements" in output["save"]
    assert output["save"]["achievements"]["first_customer"]["unlocked"] is True
    assert "実績" in output["achievementHtml"]
    assert "初顧客獲得" in output["achievementHtml"]


def test_decision_choice_unlocks_decision_achievements():
    output = run_game_action_smoke({
        "money": 1000,
        "totalMoney": 1000,
        "fire": 50,
        "pendingDecisionEvent": {"id": "fire05_crisis_statement", "productId": "dailyReportAi", "createdAt": 1},
        "achievements": {},
        "decisionStats": {"approved": 0, "rejected": 0},
    }, "window.__testApi.applyDecisionEventChoice('reject'); window.__testApi.saveGame();")

    assert output["save"]["decisionStats"]["rejected"] == 1
    assert output["save"]["achievements"]["first_decision_rejected"]["unlocked"] is True


def test_debug_panel_hidden_by_default_and_visible_with_debug_query():
    normal = run_browser_smoke({"money": 0, "totalMoney": 0})
    debug = run_browser_smoke({"money": 0, "totalMoney": 0, "__locationSearch": "?debug=1"})

    assert normal["debugHidden"] is True
    assert normal["debugHtml"] == ""
    assert debug["debugHidden"] is False
    assert "開発用デバッグ" in debug["debugHtml"]
    assert "売上 +100K" in debug["debugHtml"]


def test_debug_action_is_guarded_by_debug_query_and_can_change_state():
    blocked = run_game_action_smoke({"money": 0, "totalMoney": 0}, "window.__testApi.applyDebugAction('money100k'); window.__testApi.saveGame();")
    allowed = run_game_action_smoke({"money": 0, "totalMoney": 0, "__locationSearch": "?debug=1"}, "window.__testApi.applyDebugAction('money100k'); window.__testApi.saveGame();")

    assert blocked["save"]["money"] == 0
    assert allowed["save"]["money"] == 100000
    assert allowed["save"]["totalMoney"] == 100000


def test_release_qa_meta_and_readme_for_beta34_are_present():
    index = (ROOT / "index.html").read_text()
    readme = (ROOT / "README.md").read_text()

    assert 'property="og:image:width" content="1200"' in index
    assert 'property="og:image:height" content="630"' in index
    assert 'property="og:image:alt"' in index
    assert 'property="og:site_name" content="AI社長のブラック起業"' in index
    assert 'name="twitter:image:alt"' in index
    assert "GitHub Pagesでは、Pagesの公開元" in readme
    assert "PWA/Service Workerの確認は `file://` ではなく" in readme
    assert "?debug=1" in readme


def test_next_recommendation_renders_cta_for_sales_assignment():
    output = run_browser_smoke({
        "employees": {"sales02": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "ready", "progress": 100}},
        "assignments": {},
        "claimedMissions": ["daily_report_developing", "assign_daily_development", "daily_report_ready_mission"],
    })

    assert "Sales-02" in output["recommendationHtml"]
    assert "AI日報メーカー" in output["recommendationHtml"]
    assert "data-recommendation-action=\"product\"" in output["recommendationHtml"]
    assert "押す場所" in output["recommendationHtml"]
    assert "このボタンで販売担当を選ぶを開きます" in output["recommendationHtml"]




def test_product_action_menu_runtime_opens_state_specific_actions():
    output = run_game_action_smoke({
        "employees": {"sales02": 1, "care04": 1, "fire05": 1},
        "products": {
            "dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 6, "upgradeStatus": "upgrading", "upgradeProgress": 40},
            "slideKitAi": {"id": "slideKitAi", "status": "selling", "unitsSold": 2},
        },
    }, "window.__testApi.openProductActionMenu('dailyReportAi'); window.__testApi.saveGame();")

    html = output["actionMenuHtml"]
    assert "AI日報メーカーの操作" in html
    assert "vNext開発担当" in html
    assert "サポート" in html
    assert "炎上対応" in html
    assert "バージョンアップ" not in html or "現在vNextを開発中です" in html

    slide = run_game_action_smoke({
        "products": {"slideKitAi": {"id": "slideKitAi", "status": "selling", "unitsSold": 2}},
    }, "window.__testApi.openProductActionMenu('slideKitAi'); window.__testApi.saveGame();")
    assert "バージョンアップ" not in slide["actionMenuHtml"]
    assert "サポート" not in slide["actionMenuHtml"]


def test_assignment_modal_runtime_shows_multi_ai_selection_state():
    output = run_game_action_smoke({
        "employees": {"dev01": 1},
        "products": {"meetingMinutesAi": {"id": "meetingMinutesAi", "status": "developing", "progress": 20}},
        "assignments": {"development": {"productAssignments": {"meetingMinutesAi": {"aiIds": ["boss"], "mode": "newProduct"}}}},
    }, "window.__testApi.openProductAssignmentModal('development', 'meetingMinutesAi', 'newProduct'); window.__testApi.saveGame();")

    html = output["assignmentModalHtml"]
    assert "自動議事録AIを開発する" in html
    assert "最大2体" in html
    assert "現在担当:" in html
    assert "AI社長" in html
    assert "選択中: AI社長（1/2）" in html
    assert "この担当にする" in html
    assert "担当を解除" in html


def test_employee_assignment_modal_runtime_for_fire05_routes_to_crisis():
    output = run_game_action_smoke({
        "employees": {"fire05": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 4, "productFire": 70}},
    }, "window.__testApi.openWorkerAssignmentModal('fire05'); window.__testApi.saveGame();")

    html = output["assignmentModalHtml"]
    assert "Fire-05に仕事を割り振る" in html
    assert "炎上対応" in html
    assert "AI日報メーカー" in html
    assert "この仕事には最大2体までAIを割り振れます" in html


def test_sales_pity_counter_increments_once_with_two_sales_workers():
    output = run_game_action_smoke({
        "employees": {"sales02": 1},
        "products": {"slideKitAi": {"id": "slideKitAi", "status": "selling", "unitsSold": 0, "oneShotSalesPityCounter": 0, "awareness": 0, "quality": 50}},
        "assignments": {"sales": {"productAssignments": {"slideKitAi": {"aiIds": ["boss", "sales02"]}}}},
    }, "Math.random = function () { return 1; }; window.__testApi.tick(); window.__testApi.saveGame();")

    assert output["save"]["products"]["slideKitAi"]["oneShotSalesPityCounter"] == 1


def test_new_debug_presets_and_state_summary_are_guarded():
    main = app_source()
    assert 'data-debug-action="presetVnext"' in main
    assert 'data-debug-action="presetStability"' in main
    assert 'data-debug-action="allProductsV5"' in main
    assert 'data-debug-action="stateSummary"' in main

    blocked = run_game_action_smoke({"money": 0}, "window.__testApi.applyDebugAction('allProductsV5'); window.__testApi.saveGame();")
    allowed = run_game_action_smoke({"money": 0, "__locationSearch": "?debug=1"}, "window.__testApi.applyDebugAction('allProductsV5'); window.__testApi.saveGame();")
    assert blocked["save"].get("products", {}).get("dailyReportAi", {}).get("status", "idea") == "idea"
    assert allowed["save"]["products"]["dailyReportAi"]["status"] == "selling"
    assert allowed["save"]["products"]["dailyReportAi"]["version"] >= 5




def test_outsourcing_decision_can_complete_new_product_without_throwing():
    output = run_game_action_smoke({
        "money": 5000,
        "totalMoney": 5000,
        "employees": {"dev01": 1},
        "products": {"meetingMinutesAi": {"id": "meetingMinutesAi", "status": "developing", "progress": 170, "bugs": 0}},
        "assignments": {"development": {"productAssignments": {"meetingMinutesAi": {"aiIds": ["dev01"], "mode": "newProduct"}}}},
        "pendingDecisionEvent": {"id": "outsourcing_offer", "productId": "meetingMinutesAi", "createdAt": 1},
    }, "window.__testApi.applyDecisionEventChoice('approve'); window.__testApi.saveGame();")

    product = output["save"]["products"]["meetingMinutesAi"]
    assert output["save"]["pendingDecisionEvent"] is None
    assert product["status"] == "ready"
    assert product["progress"] == 180
    assert product_assignment(output["save"]["assignments"], "development", "meetingMinutesAi")["aiIds"] == []


def test_debug_state_summary_uses_existing_total_helpers():
    main = app_source()
    start = main.index("function getDebugStateSummary()")
    end = main.index("function applyTaskPreset", start)
    summary_code = main[start:end]
    assert "getTotalProductMrr()" in summary_code
    assert "getTotalProductCustomers()" in summary_code
    assert "getTotalMrr()" not in summary_code
    assert "getTotalCustomers()" not in summary_code

def test_decision_event_runtime_has_customer_request_and_ai_runaway_paths():
    main = app_source()
    for event_id in ["customer_impossible_request", "ai_runaway_proposal"]:
        assert f'id: "{event_id}"' in main
        assert f'eventId === "{event_id}"' in main

    request = run_game_action_smoke({
        "employees": {"care04": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 5, "satisfaction": 50, "supportLoad": 5, "bugs": 0}},
        "pendingDecisionEvent": {"id": "customer_impossible_request", "productId": "dailyReportAi", "createdAt": 1},
    }, "window.__testApi.applyDecisionEventChoice('approve'); window.__testApi.saveGame();")
    product = request["save"]["products"]["dailyReportAi"]
    assert product["satisfaction"] >= 55
    assert product["supportLoad"] >= 15
    assert product["bugs"] >= 5

    runaway = run_game_action_smoke({
        "employees": {"sales02": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 2, "productFire": 0}},
        "assignments": {"sales": {"productAssignments": {"dailyReportAi": {"aiIds": ["sales02"]}}}},
        "pendingDecisionEvent": {"id": "ai_runaway_proposal", "productId": "dailyReportAi", "createdAt": 1},
    }, "window.__testApi.applyDecisionEventChoice('approve'); window.__testApi.saveGame();")
    assert runaway["save"]["products"]["dailyReportAi"]["productFire"] >= 7
    assert runaway["save"]["fire"] >= 8


def test_collapsed_achievements_show_next_locked_goal_when_none_unlocked():
    output = run_browser_smoke({"achievements": {}})
    assert "解除済み: 0/" in output["achievementHtml"]
    assert "○ 初顧客獲得" in output["achievementHtml"]


def test_many_achievement_unlocks_are_summarized_in_one_log():
    output = run_game_action_smoke({
        "__locationSearch": "?debug=1",
        "achievements": {},
    }, "window.__testApi.applyDebugAction('allProductsV5'); window.__testApi.saveGame();")
    assert "実績を" in output["save"]["logs"][0]["text"]
    assert "件解除しました" in output["save"]["logs"][0]["text"]

def test_next_recommendation_cta_prioritizes_pending_decision():
    output = run_browser_smoke({
        "pendingDecisionEvent": {"id": "care_customer_priority", "productId": "dailyReportAi", "createdAt": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 5, "churnRisk": 80}},
    })

    assert "社長判断を確認しましょう" in output["recommendationHtml"]
    assert "data-recommendation-action=\"decision\"" in output["recommendationHtml"]
    assert "社長判断を見る" in output["recommendationHtml"]


def test_beta4_decision_events_are_defined_and_free_trial_changes_state():
    main = app_source()
    for event_id in ["free_trial_offer", "vip_customer_support", "sns_fire_response", "quality_audit", "outsourcing_offer"]:
        assert f'id: "{event_id}"' in main

    output = run_game_action_smoke({
        "employees": {"sales02": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 2, "awareness": 25, "supportLoad": 0}},
        "pendingDecisionEvent": {"id": "free_trial_offer", "productId": "dailyReportAi", "createdAt": 1},
    }, "window.__testApi.applyDecisionEventChoice('approve'); window.__testApi.saveGame();")
    product = output["save"]["products"]["dailyReportAi"]

    assert output["save"]["pendingDecisionEvent"] is None
    assert product["customers"] == 3
    assert product["awareness"] >= 35
    assert product["supportLoad"] >= 5


def test_extended_achievements_have_categories_and_unlock_by_state():
    main = app_source()
    assert 'category: "経営"' in main
    assert 'id: "total_mrr_50k"' in main
    assert 'id: "customers_100"' in main
    assert 'id: "version_10"' in main

    output = run_game_action_smoke({
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 100, "version": 1}},
        "achievements": {},
    }, "window.__testApi.applyAchievements(false); window.__testApi.saveGame();")

    assert output["save"]["achievements"]["total_mrr_50k"]["unlocked"] is True
    assert output["save"]["achievements"]["customers_100"]["unlocked"] is True
    assert "achievement-category" in output["achievementHtml"]


def test_fire05_crisis_reduces_fire_and_mitigates_churn_risk():
    output = run_game_action_smoke({
        "fire": 80,
        "employees": {"fire05": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 5, "satisfaction": 40, "supportLoad": 60, "bugs": 30, "churnRisk": 90}},
        "assignments": {"crisis": {"productAssignments": {"dailyReportAi": {"aiIds": ["fire05"]}}}},
    }, "Math.random = function () { return 1; }; window.__testApi.tick(); window.__testApi.saveGame();")
    product = output["save"]["products"]["dailyReportAi"]

    assert output["save"]["fire"] < 80
    assert product["churnRisk"] < 80
    assert product_assignment(output["save"]["assignments"], "crisis", "dailyReportAi")["aiIds"] == ["fire05"]


def test_debug_playtest_scenarios_are_guarded_and_available_with_debug_query():
    blocked = run_game_action_smoke({"money": 0}, "window.__testApi.applyDebugAction('scenario10min'); window.__testApi.saveGame();")
    allowed = run_game_action_smoke({"money": 0, "__locationSearch": "?debug=1"}, "window.__testApi.applyDebugAction('scenario10min'); window.__testApi.saveGame();")

    assert blocked["save"]["money"] == 0
    assert allowed["save"]["money"] >= 100000
    assert allowed["save"]["products"]["dailyReportAi"]["status"] == "selling"
    assert allowed["save"]["products"]["meetingMinutesAi"]["status"] == "developing"
    assert "10分テスト状態" in allowed["debugHtml"]
    assert "vNext 90%" in allowed["debugHtml"]


def test_release_qa_beta36_and_share_url_not_doubled_in_web_share_data():
    index = (ROOT / "index.html").read_text()
    main = app_source()
    sw = (ROOT / "sw.js").read_text()
    readme = (ROOT / "README.md").read_text()

    assert 'content="2026.05.24.42"' in index
    assert 'property="og:image:type" content="image/png"' in index
    assert 'const APP_VERSION = "2026.05.24.42"' in main
    assert 'const APP_VERSION = "2026.05.24.42"' in sw
    assert 'sw.js?v=20260524-42' in main
    assert 'url: PUBLIC_URL' not in main[main.index('function shareGameStatus()'):main.index('function copyShareText', main.index('function shareGameStatus()'))]
    assert 'v0.4へ向けた設計メモ' in readme
    assert '製品別炎上' in readme


def test_product_fire_is_normalized_and_rendered_as_product_risk():
    output = run_browser_smoke({
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 3, "productFire": 75}},
        "claimedMissions": ["daily_report_developing", "assign_daily_development", "daily_report_ready_mission"],
    })

    product = output["save"]["products"]["dailyReportAi"]
    assert product["productFire"] == 75
    assert "製品炎上高" in output["primaryProductHtml"]
    assert "Fire-05推奨" in output["primaryProductHtml"]


def test_marketing_raises_product_fire_and_crisis_reduces_it():
    raised = run_game_action_smoke({
        "employees": {"buzz03": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 3, "productFire": 0}},
        "assignments": {"marketing": {"productAssignments": {"dailyReportAi": {"aiIds": ["buzz03"]}}}},
    }, "Math.random = function () { return 1; }; window.__testApi.tick(); window.__testApi.saveGame();")
    assert raised["save"]["products"]["dailyReportAi"]["productFire"] > 0

    lowered = run_game_action_smoke({
        "fire": 20,
        "employees": {"fire05": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 3, "productFire": 80}},
        "assignments": {"crisis": {"productAssignments": {"dailyReportAi": {"aiIds": ["fire05"]}}}},
    }, "Math.random = function () { return 1; }; window.__testApi.tick(); window.__testApi.saveGame();")
    assert lowered["save"]["products"]["dailyReportAi"]["productFire"] < 80


def test_product_fire_affects_churn_and_sales_pressure_structure():
    main = app_source()

    assert "getProductFire(product) * PRODUCT_FIRE_CHURN_FACTOR" in main
    assert "getProductFire(product) * PRODUCT_FIRE_SATISFACTION_PRESSURE" in main
    assert "const productPenalty = clamp(getProductFire(product) / PRODUCT_FIRE_SALES_PENALTY_DIVISOR" in main
    assert "adjustProductFire(product, marketing.fire * 0.75)" in main
    assert 'adjustProductFire(product, applyAffinity(crisis.productFire || crisis.fire * 0.6, workerId, definition, "crisis"))' in main


def test_subscription_price_adjustment_is_derived_in_mrr_and_decision_approval():
    normalized = run_browser_smoke({
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 10, "priceAdjustment": 0.05}},
    })
    assert normalized["save"]["products"]["dailyReportAi"]["priceAdjustment"] == 0.05
    assert normalized["save"]["products"]["dailyReportAi"]["mrr"] == 5250

    approved = run_game_action_smoke({
        "employees": {"sales02": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 10, "satisfaction": 70, "churnRisk": 10, "priceAdjustment": 0}},
        "pendingDecisionEvent": {"id": "subscription_price_review", "productId": "dailyReportAi", "createdAt": 1},
    }, "window.__testApi.applyDecisionEventChoice('approve'); window.__testApi.saveGame();")
    product = approved["save"]["products"]["dailyReportAi"]
    assert product["priceAdjustment"] == 0.05
    assert product["mrr"] == 5250
    assert product["satisfaction"] < 65
    assert product["supportLoad"] > 0


def test_v04_achievement_expansions_are_present_and_unlockable():
    main = app_source()
    for achievement_id in ["total_mrr_500k", "slide_100_sales", "slide_500_sales", "version_20", "product_fire_50", "fire05_first_crisis", "care04_first_support", "all_tasks_active", "manual_reward_claimed", "manual_company_expansion"]:
        assert f'id: "{achievement_id}"' in main

    output = run_game_action_smoke({
        "companyLevel": 2,
        "claimedMissions": ["daily_report_developing"],
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 210, "version": 20, "productFire": 60}, "slideKitAi": {"id": "slideKitAi", "status": "selling", "unitsSold": 500}},
        "achievements": {},
    }, "window.__testApi.applyAchievements(false); window.__testApi.saveGame();")

    achievements = output["save"]["achievements"]
    assert achievements["total_mrr_500k"]["unlocked"] is True
    assert achievements["slide_500_sales"]["unlocked"] is True
    assert achievements["version_20"]["unlocked"] is True
    assert achievements["product_fire_50"]["unlocked"] is True
    assert achievements["manual_reward_claimed"]["unlocked"] is True
    assert achievements["manual_company_expansion"]["unlocked"] is True



def test_v04_new_decision_events_are_defined_and_effectful():
    main = app_source()
    for event_id in ["limited_one_shot_sale", "server_outage_response", "support_discount_offer", "security_audit_push"]:
        assert f'id: "{event_id}"' in main
        assert f'eventId === "{event_id}"' in main

    approved = run_game_action_smoke({
        "money": 1000,
        "totalMoney": 1000,
        "employees": {"care04": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 4, "satisfaction": 45, "supportLoad": 60, "churnRisk": 70, "priceAdjustment": 0}},
        "pendingDecisionEvent": {"id": "support_discount_offer", "productId": "dailyReportAi", "createdAt": 1},
    }, "window.__testApi.applyDecisionEventChoice('approve'); window.__testApi.saveGame();")
    product = approved["save"]["products"]["dailyReportAi"]
    assert product["priceAdjustment"] < 0
    assert product["satisfaction"] > 45
    assert product["churnRisk"] < 70
    assert approved["save"]["pendingDecisionEvent"] is None

    rejected = run_game_action_smoke({
        "employees": {"fire05": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 2, "productFire": 50, "bugs": 50}},
        "pendingDecisionEvent": {"id": "server_outage_response", "productId": "dailyReportAi", "createdAt": 1},
    }, "window.__testApi.applyDecisionEventChoice('reject'); window.__testApi.saveGame();")
    assert rejected["save"]["products"]["dailyReportAi"]["productFire"] > 50
    assert rejected["save"]["pendingDecisionEvent"] is None


def test_decision_candidates_include_new_v04_events_under_matching_conditions():
    output = run_game_action_smoke({
        "money": 5000,
        "employees": {"sales02": 1, "care04": 1, "fire05": 1, "security06": 1},
        "products": {
            "dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 5, "supportLoad": 60, "churnRisk": 60, "bugs": 40, "productFire": 50},
            "slideKitAi": {"id": "slideKitAi", "status": "selling", "awareness": 40, "unitsSold": 3},
        },
        "assignments": {"sales": {"productAssignments": {"slideKitAi": {"aiIds": ["sales02"]}}}},
    }, "window.__testResult = window.__testApi.getDecisionEventCandidates().map(function (item) { return item.id; }); window.__testApi.saveGame();")
    candidates = set(output["testResult"])
    assert "limited_one_shot_sale" in candidates
    assert "support_discount_offer" in candidates
    assert "server_outage_response" in candidates
    assert "security_audit_push" in candidates
    assert output["save"]["products"]["dailyReportAi"]["productFire"] == 50


def test_v04_achievement_expansions_and_category_group_rendering():
    main = app_source()
    css = (ROOT / "style.css").read_text()
    for achievement_id in ["total_mrr_1m", "customers_500", "slide_1000_sales", "all_products_v5", "decisions_50", "approvals_25", "rejections_25", "product_fire_80", "all_ai_level_5", "care04_satisfaction_90", "security_quality_95", "buzz_awareness_100"]:
        assert f'id: "{achievement_id}"' in main
    assert "function getAchievementListHtml(achievements, grouped)" in main
    assert "achievement-category-group" in main
    assert ".achievement-category-group" in css

    output = run_game_action_smoke({
        "employees": {"dev01": 5, "sales02": 5, "buzz03": 5, "care04": 5, "fire05": 5, "security06": 5},
        "decisionStats": {"approved": 25, "rejected": 25},
        "products": {
            "dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 500, "version": 5, "satisfaction": 92, "quality": 96, "awareness": 100, "productFire": 85},
            "meetingMinutesAi": {"id": "meetingMinutesAi", "status": "selling", "customers": 500, "version": 5},
            "supportReplyAi": {"id": "supportReplyAi", "status": "selling", "customers": 500, "version": 5},
            "slideKitAi": {"id": "slideKitAi", "status": "selling", "unitsSold": 1000},
        },
        "achievements": {},
    }, "window.__testApi.applyAchievements(false); window.__testApi.saveGame();")
    achievements = output["save"]["achievements"]
    assert achievements["customers_500"]["unlocked"] is True
    assert achievements["slide_1000_sales"]["unlocked"] is True
    assert achievements["all_products_v5"]["unlocked"] is True
    assert achievements["decisions_50"]["unlocked"] is True
    assert achievements["product_fire_80"]["unlocked"] is True
    assert achievements["all_ai_level_5"]["unlocked"] is True


def test_debug_panel_categories_and_new_preset_actions_are_guarded():
    main = app_source()
    assert "const TASK_PRESETS" in main
    assert "function applyTaskPreset(presetId, options)" in main
    assert 'data-debug-action="presetCash"' in main
    assert 'data-debug-action="presetSupport"' in main
    assert 'data-debug-action="allAiLevel5"' in main
    assert 'data-debug-action="companyExpansionReady"' in main

    blocked = run_game_action_smoke({"money": 0}, "window.__testApi.applyDebugAction('allAiLevel5'); window.__testApi.saveGame();")
    allowed = run_game_action_smoke({"money": 0, "__locationSearch": "?debug=1"}, "window.__testApi.applyDebugAction('allAiLevel5'); window.__testApi.saveGame();")
    assert blocked["save"].get("employees", {}).get("dev01", 0) == 0
    assert allowed["save"]["employees"]["dev01"] >= 5
    assert "売上/製品" in allowed["debugHtml"]
    assert "AI/プリセット" in allowed["debugHtml"]


def test_task_preset_applies_assignments_while_preserving_constraints():
    output = run_game_action_smoke({
        "employees": {"dev01": 1, "sales02": 1, "buzz03": 1, "care04": 1, "fire05": 1, "security06": 1},
        "products": {
            "dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 5, "supportLoad": 50, "churnRisk": 50, "productFire": 60},
            "slideKitAi": {"id": "slideKitAi", "status": "selling", "unitsSold": 1},
        },
    }, "window.__testApi.applyTaskPreset('firefighting'); window.__testApi.saveGame();")
    assignments = output["save"]["assignments"]
    assert product_assignment(assignments, "crisis", "dailyReportAi")["aiIds"]
    assert len(product_assignment(assignments, "crisis", "dailyReportAi")["aiIds"]) <= 2
    assert len(all_assigned_ai_ids(assignments)) == len(set(all_assigned_ai_ids(assignments)))



def test_normal_task_preset_uses_idle_ai_without_state_boost_or_reassigning_active_jobs():
    output = run_game_action_smoke({
        "employees": {"dev01": 1, "sales02": 1, "buzz03": 1, "care04": 1, "fire05": 1, "security06": 1},
        "products": {
            "dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 5},
            "slideKitAi": {"id": "slideKitAi", "status": "idea", "progress": 0},
        },
        "assignments": {
            "sales": {"productAssignments": {"dailyReportAi": {"aiIds": ["sales02"]}}},
            "marketing": {"productAssignments": {"dailyReportAi": {"aiIds": ["buzz03"]}}},
        },
    }, "window.__testApi.applyTaskPreset('cash', { allowStateBoost: false }); window.__testApi.saveGame();")
    assignments = output["save"]["assignments"]
    assert product_assignment(assignments, "sales", "dailyReportAi")["aiIds"] == ["sales02"]
    assert product_assignment(assignments, "marketing", "dailyReportAi")["aiIds"] == ["buzz03"]
    assert output["save"]["products"]["slideKitAi"]["status"] == "developing"
    assert output["save"]["products"]["slideKitAi"]["progress"] == 0
    assert product_assignment(assignments, "development", "slideKitAi")["aiIds"]



def test_normal_task_preset_preserves_existing_ai_on_same_task_product():
    output = run_game_action_smoke({
        "employees": {"sales02": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 5}},
        "assignments": {"sales": {"productAssignments": {"dailyReportAi": {"aiIds": ["boss"]}}}},
    }, "window.__testApi.applyTaskPreset('growth', { allowStateBoost: false }); window.__testApi.saveGame();")
    assert product_assignment(output["save"]["assignments"], "sales", "dailyReportAi")["aiIds"] == ["boss", "sales02"]


def test_debug_task_preset_can_boost_state_and_reassign_when_explicitly_allowed():
    output = run_game_action_smoke({
        "__locationSearch": "?debug=1",
        "employees": {"dev01": 1, "sales02": 1, "buzz03": 1},
        "products": {"slideKitAi": {"id": "slideKitAi", "status": "idea", "progress": 0}},
    }, "window.__testApi.applyTaskPreset('cash', { allowStateBoost: true, allowReassign: true }); window.__testApi.saveGame();")
    assert output["save"]["products"]["slideKitAi"]["status"] in ["ready", "selling"]
    assert product_assignment(output["save"]["assignments"], "sales", "slideKitAi")["aiIds"]

def test_next_recommendation_cta_labels_are_task_specific():
    output = run_browser_smoke({
        "employees": {"care04": 1},
        "claimedMissions": [
            "daily_report_developing",
            "assign_daily_development",
            "daily_report_ready_mission",
            "assign_daily_sales",
            "daily_first_customer",
            "daily_mrr_500",
        ],
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 3, "supportLoad": 60, "churnRisk": 20}},
    })
    assert "サポート担当を選ぶ" in output["recommendationHtml"]
    assert "操作を開く" not in output["recommendationHtml"]


def test_render_uses_light_runtime_clamp_not_full_normalize_each_time():
    main = app_source()
    render_start = main.index("function render()")
    render_end = main.index("function renderStatus()", render_start)
    render_code = main[render_start:render_end]
    assert "clampRuntimeState();" in render_code
    assert "sanitizeRuntimeState();" not in render_code
    assert "function clampRuntimeState()" in main
    assert "function clampRuntimeProduct(product, definition)" in main

def test_next_recommendation_product_cta_can_open_assignment_modal_directly():
    main = app_source()

    assert 'const taskId = button.getAttribute("data-recommendation-task") || "";' in main
    assert 'if (action === "product" && productId && taskId) { openProductAssignmentModal(taskId, productId, mode); return; }' in main
    assert 'taskId: "support"' in main
    assert 'taskId: "development", mode: "upgrade"' in main
    assert 'taskId: "crisis"' in main


def test_debug_product_fire_and_task_presets_are_guarded():
    blocked = run_game_action_smoke({"products": {"dailyReportAi": {"id": "dailyReportAi", "productFire": 0}}}, "window.__testApi.applyDebugAction('productFireScenario'); window.__testApi.saveGame();")
    allowed = run_game_action_smoke({"__locationSearch": "?debug=1", "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 3, "productFire": 0}}}, "window.__testApi.applyDebugAction('productFireScenario'); window.__testApi.saveGame();")

    assert blocked["save"]["products"]["dailyReportAi"]["productFire"] == 0
    assert allowed["save"]["products"]["dailyReportAi"]["productFire"] >= 49
    assert "製品炎上+70" in allowed["debugHtml"]
    assert "プリセット: 成長" in allowed["debugHtml"]
    assert "プリセット: 火消し" in allowed["debugHtml"]


def test_decision_warning_label_and_product_fire_qa_text_are_present():
    main = app_source()
    css = (ROOT / "style.css").read_text()

    assert "decision-risk-label" in main
    assert "リスクあり" in main
    assert ".decision-risk-label" in css
    assert "製品炎上" in main
    assert "productFire50Logged" in main


def test_v04_product_line_missions_and_one_shot_first_sale_are_playtest_friendly():
    missions = (ROOT / "js" / "data" / "missions.js").read_text()
    balance = (ROOT / "js" / "data" / "balance.js").read_text()

    assert missions.index('id: "v04_product_expansion"') < missions.index('id: "product_growth"')
    assert 'ONE_SHOT_FIRST_SALE_GUARANTEE_SECONDS: 12' in balance

    output = run_game_action_smoke({
        "employees": {"sales02": 1},
        "products": {"apologyWriterAi": {"id": "apologyWriterAi", "status": "selling", "unitsSold": 0, "sellingSeconds": 12, "oneShotSalesPityCounter": 0, "awareness": 0, "quality": 52}},
        "assignments": {"sales": {"productAssignments": {"apologyWriterAi": {"aiIds": ["sales02"]}}}},
    }, "Math.random = function () { return 1; }; window.__testApi.tick(); window.__testApi.saveGame();")
    product = output["save"]["products"]["apologyWriterAi"]
    assert product["unitsSold"] >= 1
    assert product["lifetimeRevenue"] >= 7800


def test_decision_once_flags_are_preserved_in_product_flags():
    output = run_browser_smoke({
        "productFlags": {"dailyReportAi": {"impossibleRequestHandled": True, "aiRunawayHandled": True}},
    })
    flags = output["save"]["productFlags"]["dailyReportAi"]
    assert flags["impossibleRequestHandled"] is True
    assert flags["aiRunawayHandled"] is True


def test_task_preset_result_is_rendered_in_normal_ui():
    output = run_game_action_smoke({
        "employees": {"dev01": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "developing", "progress": 0}},
    }, "window.__testApi.applyTaskPreset('growth', { allowStateBoost: false }); window.__testApi.saveGame();")
    assert "プリセット「成長重視」" in output["presetHtml"]
    assert "preset-result" in output["presetHtml"]


def test_decision_event_handler_map_covers_all_defined_events():
    output = run_game_action_smoke({"money": 0}, "window.__testResult = { missing: window.__testApi.getDecisionHandlerMissingEventIds(), hasPrice: Boolean(window.__testApi.getDecisionEventHandler('subscription_price_review')), hasSale: Boolean(window.__testApi.getDecisionEventHandler('limited_one_shot_sale')) }; window.__testApi.saveGame();")

    assert output["testResult"]["missing"] == []
    assert output["testResult"]["hasPrice"] is True
    assert output["testResult"]["hasSale"] is True


def test_decision_price_approve_reject_do_not_cross_apply_effects():
    approved = run_game_action_smoke({
        "money": 1000,
        "totalMoney": 1000,
        "employees": {"sales02": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 10, "satisfaction": 70, "churnRisk": 10, "priceAdjustment": 0}},
        "pendingDecisionEvent": {"id": "subscription_price_review", "productId": "dailyReportAi", "createdAt": 1},
        "decisionStats": {"approved": 0, "rejected": 0},
    }, "window.__testResult = window.__testApi.applyDecisionEventChoice('approve'); window.__testApi.saveGame();")
    approved_product = approved["save"]["products"]["dailyReportAi"]

    rejected = run_game_action_smoke({
        "money": 1000,
        "totalMoney": 1000,
        "employees": {"sales02": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 10, "satisfaction": 70, "churnRisk": 10, "priceAdjustment": 0}},
        "pendingDecisionEvent": {"id": "subscription_price_review", "productId": "dailyReportAi", "createdAt": 1},
        "decisionStats": {"approved": 0, "rejected": 0},
    }, "window.__testResult = window.__testApi.applyDecisionEventChoice('reject'); window.__testApi.saveGame();")
    rejected_product = rejected["save"]["products"]["dailyReportAi"]

    assert approved["testResult"] is True
    assert approved_product["priceAdjustment"] == 0.05
    assert approved_product["satisfaction"] < 65
    assert approved_product["supportLoad"] > 0
    assert approved_product["churnRisk"] == 15
    assert approved["save"]["decisionStats"]["approved"] == 1
    assert rejected["testResult"] is True
    assert rejected_product["priceAdjustment"] == 0
    assert rejected_product["satisfaction"] == 72
    assert rejected_product["churnRisk"] == 10
    assert rejected["save"]["decisionStats"]["rejected"] == 1


def test_decision_one_shot_and_product_fire_handlers_are_directional():
    approved = run_game_action_smoke({
        "money": 1000,
        "totalMoney": 1000,
        "employees": {"sales02": 1},
        "products": {"slideKitAi": {"id": "slideKitAi", "status": "selling", "unitsSold": 1, "productFire": 10, "awareness": 20}},
        "pendingDecisionEvent": {"id": "limited_one_shot_sale", "productId": "slideKitAi", "createdAt": 1},
    }, "window.__testApi.applyDecisionEventChoice('approve'); window.__testApi.saveGame();")
    approved_product = approved["save"]["products"]["slideKitAi"]

    rejected = run_game_action_smoke({
        "money": 1000,
        "totalMoney": 1000,
        "employees": {"sales02": 1},
        "products": {"slideKitAi": {"id": "slideKitAi", "status": "selling", "unitsSold": 1, "productFire": 10, "awareness": 20}},
        "pendingDecisionEvent": {"id": "limited_one_shot_sale", "productId": "slideKitAi", "createdAt": 1},
    }, "window.__testApi.applyDecisionEventChoice('reject'); window.__testApi.saveGame();")
    rejected_product = rejected["save"]["products"]["slideKitAi"]

    assert approved_product["unitsSold"] == 3
    assert approved_product["lifetimeRevenue"] >= 19600
    assert approved["save"]["money"] > 1000
    assert approved_product["productFire"] > 10
    assert rejected_product["unitsSold"] == 1
    assert rejected["save"]["money"] == 1000
    assert rejected_product["productFire"] < 10


def test_decision_one_time_flags_are_set_by_both_choices_and_block_candidates():
    approved = run_game_action_smoke({
        "employees": {"care04": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 5, "satisfaction": 50, "supportLoad": 20, "churnRisk": 20}},
        "pendingDecisionEvent": {"id": "customer_impossible_request", "productId": "dailyReportAi", "createdAt": 1},
    }, "window.__testApi.applyDecisionEventChoice('approve'); window.__testResult = window.__testApi.getDecisionEventCandidates().map(function (item) { return item.id; }); window.__testApi.saveGame();")

    rejected = run_game_action_smoke({
        "employees": {"care04": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 5, "satisfaction": 50, "supportLoad": 20, "churnRisk": 20}},
        "pendingDecisionEvent": {"id": "customer_impossible_request", "productId": "dailyReportAi", "createdAt": 1},
    }, "window.__testApi.applyDecisionEventChoice('reject'); window.__testResult = window.__testApi.getDecisionEventCandidates().map(function (item) { return item.id; }); window.__testApi.saveGame();")

    assert approved["save"]["productFlags"]["dailyReportAi"]["impossibleRequestHandled"] is True
    assert "customer_impossible_request" not in approved["testResult"]
    assert rejected["save"]["productFlags"]["dailyReportAi"]["impossibleRequestHandled"] is True
    assert "customer_impossible_request" not in rejected["testResult"]


def test_decision_cost_shortfall_adds_fire_pressure():
    output = run_game_action_smoke({
        "money": 0,
        "fire": 10,
        "employees": {"care04": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 8, "satisfaction": 45, "supportLoad": 70, "churnRisk": 60}},
        "pendingDecisionEvent": {"id": "support_discount_offer", "productId": "dailyReportAi", "createdAt": 1},
    }, "window.__testResult = window.__testApi.applyDecisionEventChoice('approve'); window.__testApi.saveGame();")
    product = output["save"]["products"]["dailyReportAi"]

    assert output["testResult"] is True
    assert output["save"]["money"] == 0
    assert output["save"]["fire"] > 10
    assert product["satisfaction"] > 45
    assert product["churnRisk"] < 60


def test_debug_decision_tools_do_not_overwrite_pending_and_can_reset():
    output = run_game_action_smoke({
        "__locationSearch": "?debug=1",
        "decisionEventCooldown": 30,
        "pendingDecisionEvent": {"id": "care_customer_priority", "productId": "dailyReportAi", "createdAt": 1},
        "products": {"dailyReportAi": {"id": "dailyReportAi", "status": "selling", "customers": 5, "supportLoad": 70, "churnRisk": 70}},
    }, "window.__testApi.applyDebugAction('decisionNow'); window.__testApi.applyDebugAction('decisionResetCooldown'); window.__testApi.saveGame();")

    assert output["save"]["pendingDecisionEvent"]["id"] == "care_customer_priority"
    assert output["save"]["decisionEventCooldown"] == 0
    assert "未処理の社長判断があるため上書きしません" in output["save"]["logs"][1]["text"]

    cleared = run_game_action_smoke({
        "__locationSearch": "?debug=1",
        "pendingDecisionEvent": {"id": "care_customer_priority", "productId": "dailyReportAi", "createdAt": 1},
    }, "window.__testApi.applyDebugAction('decisionClearPending'); window.__testApi.saveGame();")
    assert cleared["save"]["pendingDecisionEvent"] is None
