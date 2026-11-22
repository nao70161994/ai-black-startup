import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def run_node(source):
    result = subprocess.run(["node", "-e", source], cwd=ROOT, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr


def test_competitor_market_share_events_and_finance_cost_reduction():
    run_node(r"""
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const window = {};
vm.runInNewContext(fs.readFileSync("js/runtime/competition.js", "utf8"), { window });
const runtime = window.AIBS_CREATE_COMPETITION_RUNTIME({});
const market = runtime.normalize({});
assert.strictEqual(market.competitorMrr, 250000);
assert.strictEqual(runtime.getShare(market, 250000), 50);
assert.strictEqual(runtime.getShare(market, 750000), 75);
assert.strictEqual(runtime.calculateDecisionCost(10000, 0), 10000);
assert.strictEqual(runtime.calculateDecisionCost(10000, 1), 9700);
assert.strictEqual(runtime.calculateDecisionCost(10000, 10), 7000);
const before = market.competitorMrr;
const priceWar = runtime.applyCompetitorEvent(market, "whiteai_price_war");
assert.strictEqual(priceWar.competitorMrr, Math.round(before * 0.92));
assert.strictEqual(priceWar.eventsSeen, 1);
const contract = runtime.applyCompetitorEvent(priceWar, "whiteai_enterprise_contract");
assert.strictEqual(contract.competitorMrr, Math.round(priceWar.competitorMrr * 1.12));
assert.strictEqual(contract.eventsSeen, 2);
const incident = runtime.applyCompetitorEvent(contract, "whiteai_data_incident");
assert.strictEqual(incident.competitorMrr, Math.round(contract.competitorMrr * 0.84));
assert.strictEqual(runtime.getRating(60), "業界リード");
let result;
for (let i = 0; i < 29; i += 1) result = runtime.tick(incident, 500000, 0);
assert.strictEqual(result.reviewed, false);
result = runtime.tick(incident, 500000, 0);
assert.strictEqual(result.reviewed, true);
assert.ok(result.share > 60);
assert.strictEqual(result.state.reviewSeconds, 0);
""")
 
 
def test_schema_four_save_keeps_company_products_staff_units_and_shareholder_state():
    run_node(r"""
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const window = {};
vm.runInNewContext(fs.readFileSync("js/runtime/state.js", "utf8"), { window, Date });
const products = [
  { id: "dailyReportAi", type: "subscription", initialQuality: 60, developmentRequired: 100, price: 500 },
  { id: "attendanceMonitorAi", type: "subscription", initialQuality: 48, developmentRequired: 260, monthlyPrice: 3000 }
];
const employeeIds = ["dev01", "sales02", "buzz03", "care04", "fire05", "security06", "finance07"];
const runtime = window.AIBS_CREATE_STATE_RUNTIME({
  products, tasks: [{ id: "development" }], employees: employeeIds.map(id => ({ id })),
  achievements: [], missionStages: [], characterAssets: {}, initialLogs: [],
  logLabels: { normal: true, success: true }, maxLevel: 10, maxLogs: 50,
  schemaVersion: 4, appVersion: "test", decisionRetrySeconds: 12, decisionCooldownSeconds: 45,
  safeNumber: (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback,
  clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
  createLog: (type, text, employeeId) => ({ type, text, employeeId }),
  normalizeDecisionEvent: () => null, normalizeAssignments: value => value || {},
  getProductCustomers: product => Math.max(0, Math.floor(Number(product.customers) || 0)),
  getProductUnitsSold: product => Math.max(0, Math.floor(Number(product.unitsSold) || 0)),
  recalculateProductMrr: product => { product.mrr = product.customers * 500; },
  getStrategy: id => ({ id: id || "balanced" }), normalizeHistory: value => value || []
});
const saved = {
  schemaVersion: 4, companyLevel: 10, money: 3210, totalMoney: 654321, users: 12, fire: 17,
  secondFounding: { unlocked: true, stage: 3 },
  employees: { dev01: 2, sales02: 1, security06: 1, finance07: 2 },
  products: { dailyReportAi: { status: "selling", customers: 12, version: 5, quality: 88, bugs: 4, priceAdjustment: 0.1 } },
  businessUnits: { enabled: false },
  shareholderBoard: { satisfaction: 77, dividendsPaid: 1500, qualityInvestments: 2, meetingsHeld: 4 },
  competition: { competitorMrr: 400000, lastShare: 30, eventsSeen: 5 },
  logs: [{ id: "kept-log", type: "normal", text: "既存ログ", employeeId: "company", createdAt: 1 }]
};
const state = runtime.normalizeState(saved);
assert.strictEqual(state.schemaVersion, 4);
assert.strictEqual(state.companyLevel, 10);
assert.strictEqual(state.money, 3210);
assert.strictEqual(state.totalMoney, 654321);
assert.strictEqual(state.users, 12);
assert.strictEqual(state.fire, 17);
assert.strictEqual(state.secondFounding.stage, 3);
assert.strictEqual(state.products.dailyReportAi.customers, 12);
assert.strictEqual(state.products.dailyReportAi.version, 5);
assert.strictEqual(state.products.attendanceMonitorAi.status, "idea");
assert.strictEqual(state.employees.dev01, 2);
assert.strictEqual(state.employees.finance07, 2);
assert.strictEqual(state.businessUnits.enabled, false);
assert.strictEqual(state.shareholderBoard.satisfaction, 77);
assert.strictEqual(state.shareholderBoard.dividendsPaid, 1500);
assert.strictEqual(state.shareholderBoard.qualityInvestments, 2);
assert.strictEqual(state.shareholderBoard.meetingsHeld, 4);
assert.strictEqual(state.competition.competitorMrr, 400000);
assert.strictEqual(state.competition.lastShare, 30);
assert.strictEqual(state.logs[0].text, "既存ログ");
const fresh = runtime.createInitialState();
assert.strictEqual(fresh.schemaVersion, 4);
assert.strictEqual(fresh.competition.competitorMrr, 250000);
assert.strictEqual(fresh.products.attendanceMonitorAi.status, "idea");
assert.strictEqual(fresh.employees.finance07, 0);
""")
 
 
def test_new_product_and_finance_advisor_are_registered_without_new_task_types():
    run_node(r"""
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const window = {};
vm.runInNewContext(fs.readFileSync("js/data/products.js", "utf8"), { window });
vm.runInNewContext(fs.readFileSync("js/data/employees.js", "utf8"), { window });
vm.runInNewContext(fs.readFileSync("js/data/tasks.js", "utf8"), { window });
const product = window.AIBS_PRODUCTS.find(item => item.id === "attendanceMonitorAi");
assert.ok(product);
assert.strictEqual(product.type, "subscription");
assert.strictEqual(product.monthlyPrice, 3000);
const finance = window.AIBS_EMPLOYEES.find(item => item.id === "finance07");
assert.ok(finance);
assert.strictEqual(finance.code, "Finance-07");
assert.strictEqual(finance.nickname, "ファイナナ");
assert.strictEqual(finance.unlockLevel, 10);
assert.ok(window.AIBS_WORKER_TASK_PROFILES.finance07);
assert.strictEqual(window.AIBS_TASKS.length, 6);
""")
