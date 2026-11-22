import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def run_node(source):
    subprocess.run(["node", "-e", source], cwd=ROOT, check=True, capture_output=True, text=True)


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
