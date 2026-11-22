import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def run_node(source):
    result = subprocess.run(["node", "-e", source], cwd=ROOT, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr


def test_business_unit_definitions_group_all_five_existing_products_once():
    run_node(r"""
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const window = {};
vm.runInNewContext(fs.readFileSync("js/data/products.js", "utf8"), { window });
vm.runInNewContext(fs.readFileSync("js/data/business-units.js", "utf8"), { window });
const products = window.AIBS_PRODUCTS.map(product => product.id).sort();
const grouped = window.AIBS_BUSINESS_UNITS.reduce((all, unit) => all.concat(unit.productIds), []).sort();
assert.strictEqual(window.AIBS_BUSINESS_UNITS.length, 3);
assert.strictEqual(JSON.stringify(grouped), JSON.stringify(products));
assert.strictEqual(new Set(grouped).size, 5);
""")

def test_business_unit_ratings_and_efficiency_bonus_are_calculated_without_revenue_changes():
    run_node(r"""
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const window = {};
vm.runInNewContext(fs.readFileSync("js/runtime/operations.js", "utf8"), { window });
const runtime = window.AIBS_CREATE_OPERATIONS_RUNTIME({
  strategies: [{ id: "balanced", modifiers: {} }],
  synergies: [], relationships: [],
  tasks: [{ id: "development" }, { id: "qa" }],
  products: [
    { id: "p1", type: "subscription" },
    { id: "p2", type: "subscription" }
  ],
  businessUnits: [{
    id: "unit", name: "Test Unit", description: "test",
    productIds: ["p1", "p2"]
  }]
});
const state = {
  strategyId: "balanced",
  secondFounding: { unlocked: true, stage: 1 },
  businessUnits: { enabled: true },
  products: {
    p1: { status: "selling", mrr: 25000, quality: 80, satisfaction: 70, productFire: 20 },
    p2: { status: "selling", mrr: 25000, quality: 60, satisfaction: 90, productFire: 0 }
  },
  assignments: {}
};
const before = JSON.stringify({ mrr: state.products.p1.mrr, customers: 17 });
const evaluation = runtime.getBusinessUnitEvaluations(state)[0];
assert.strictEqual(evaluation.score, 88);
assert.strictEqual(evaluation.grade, "A");
assert.strictEqual(evaluation.bonus, 0.06);
assert.strictEqual(runtime.getModifiers(state, { id: "p1", type: "subscription" }).development, 1.06);
assert.strictEqual(runtime.getModifiers(state, { id: "p1", type: "subscription" }).qa, 1.06);
assert.strictEqual(JSON.stringify({ mrr: state.products.p1.mrr, customers: 17 }), before);
state.secondFounding.unlocked = false;
assert.strictEqual(runtime.getBusinessUnitEvaluations(state)[0].bonus, 0);
assert.strictEqual(runtime.getModifiers(state, { id: "p1", type: "subscription" }).development, 1);
state.secondFounding.unlocked = true;
state.products.p1.mrr = 25000;
state.products.p2.mrr = 0;
state.products.p1.quality = 80;
state.products.p2.quality = 80;
state.products.p1.satisfaction = 80;
state.products.p2.satisfaction = 80;
state.products.p1.productFire = 20;
state.products.p2.productFire = 20;
const gradeB = runtime.getBusinessUnitEvaluations(state)[0];
assert.strictEqual(gradeB.grade, "B");
assert.strictEqual(gradeB.bonus, 0.03);
state.products.p1.mrr = 0;
state.products.p1.quality = 70;
state.products.p2.quality = 70;
state.products.p1.satisfaction = 70;
state.products.p2.satisfaction = 70;
state.products.p1.productFire = 30;
state.products.p2.productFire = 30;
assert.strictEqual(runtime.getBusinessUnitEvaluations(state)[0].grade, "D");
state.products.p1.mrr = 25000;
state.products.p2.mrr = 25000;
state.products.p1.quality = 100;
state.products.p2.quality = 100;
state.products.p1.satisfaction = 100;
state.products.p2.satisfaction = 100;
state.products.p1.productFire = 0;
state.products.p2.productFire = 0;
const gradeS = runtime.getBusinessUnitEvaluations(state)[0];
assert.strictEqual(gradeS.grade, "S");
assert.strictEqual(gradeS.bonus, 0.10);
""")

def test_business_unit_renderer_shows_grade_and_product_names():
    run_node(r"""
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const window = {};
vm.runInNewContext(fs.readFileSync("js/render/insights.js", "utf8"), { window });
const renderer = window.AIBS_CREATE_INSIGHTS_RENDERER({
  escapeHtml: value => String(value),
  formatNumber: value => String(value)
});
const html = renderer.getBusinessUnitsHtml([{
  id: "efficiency", name: "業務効率化事業部", description: "業務自動化",
  productIds: ["dailyReportAi", "meetingMinutesAi"], score: 88, grade: "A",
  bonus: 0.06, metrics: { sales: 100, quality: 70, satisfaction: 80, fireSafety: 90 }
}], [
  { id: "dailyReportAi", name: "AI日報メーカー" },
  { id: "meetingMinutesAi", name: "自動議事録AI" }
], true);
assert.ok(html.includes("業務効率化事業部"));
assert.ok(html.includes("AI日報メーカー"));
assert.ok(html.includes("自動議事録AI"));
assert.ok(html.includes("業務効率 +6%"));
assert.ok(html.includes("grade-A"));
""")

def test_schema_four_save_defaults_business_unit_state_and_preserves_existing_data():
    run_node(r"""
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const window = {};
vm.runInNewContext(fs.readFileSync("js/runtime/state.js", "utf8"), { window, Date });
const employees = ["dev01", "sales02", "buzz03", "care04", "fire05", "security06"].map(id => ({ id }));
const runtime = window.AIBS_CREATE_STATE_RUNTIME({
  products: [{ id: "dailyReportAi", type: "subscription", initialQuality: 60, developmentRequired: 100 }],
  tasks: [{ id: "development" }], employees, achievements: [], missionStages: [],
  characterAssets: {}, initialLogs: [], logLabels: { normal: true, success: true },
  maxLevel: 10, maxLogs: 50, schemaVersion: 4, appVersion: "test",
  decisionRetrySeconds: 12, decisionCooldownSeconds: 45,
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
  schemaVersion: 4, companyLevel: 10, money: 1234, totalMoney: 987654,
  fire: 21, secondFounding: { unlocked: true, stage: 3 },
  employees: { dev01: 2, security06: 1 },
  products: { dailyReportAi: { status: "selling", customers: 12, version: 5, quality: 88, bugs: 4 } },
  logs: [{ id: "old-log", type: "normal", text: "preserve", employeeId: "company", createdAt: 1 }]
};
const normalized = runtime.normalizeState(saved);
assert.deepStrictEqual(JSON.parse(JSON.stringify(normalized.businessUnits)), { enabled: true });
assert.deepStrictEqual(JSON.parse(JSON.stringify(normalized.secondFounding)), { unlocked: true, stage: 3 });
assert.strictEqual(normalized.companyLevel, 10);
assert.strictEqual(normalized.money, 1234);
assert.strictEqual(normalized.totalMoney, 987654);
assert.strictEqual(normalized.fire, 21);
assert.strictEqual(normalized.employees.dev01, 2);
assert.strictEqual(normalized.products.dailyReportAi.customers, 12);
assert.strictEqual(normalized.products.dailyReportAi.version, 5);
assert.strictEqual(normalized.logs[0].text, "preserve");
const disabled = runtime.normalizeState(Object.assign({}, saved, { businessUnits: { enabled: false } }));
assert.strictEqual(disabled.businessUnits.enabled, false);
""")
