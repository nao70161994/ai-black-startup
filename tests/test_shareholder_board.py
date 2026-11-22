import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def run_node(source):
    result = subprocess.run(["node", "-e", source], cwd=ROOT, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr


def test_shareholder_satisfaction_review_uses_mrr_fire_and_quality_without_touching_game_economy():
    run_node(r"""
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const window = {};
vm.runInNewContext(fs.readFileSync("js/runtime/shareholders.js", "utf8"), { window });
const runtime = window.AIBS_CREATE_SHAREHOLDER_RUNTIME({
  clamp: (value, min, max) => Math.min(max, Math.max(min, value))
});
const board = runtime.normalize({ satisfaction: 50, lastMrr: 10000 });
const untouchedGameValues = { money: 5000, mrr: 12000, customers: 24 };
let result;
for (let i = 0; i < 29; i += 1) {
  result = runtime.review(board, { mrr: 12000, fire: 0, averageQuality: 95 });
  assert.strictEqual(result.reviewed, false);
}
result = runtime.review(board, { mrr: 12000, fire: 0, averageQuality: 95 });
assert.strictEqual(result.reviewed, true);
assert.strictEqual(result.delta, 3);
assert.strictEqual(board.satisfaction, 53);
assert.strictEqual(board.lastMrr, 12000);
assert.strictEqual(board.meetingsHeld, 1);
assert.deepStrictEqual(untouchedGameValues, { money: 5000, mrr: 12000, customers: 24 });
""")

def test_shareholder_satisfaction_is_clamped_and_review_tracks_downturn_and_risk():
    run_node(r"""
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const window = {};
vm.runInNewContext(fs.readFileSync("js/runtime/shareholders.js", "utf8"), { window });
const runtime = window.AIBS_CREATE_SHAREHOLDER_RUNTIME({});
const board = runtime.normalize({ satisfaction: 150, reviewSeconds: 99 });
assert.strictEqual(board.satisfaction, 100);
assert.strictEqual(board.reviewSeconds, 29);
board.reviewSeconds = 0;
runtime.adjust(board, -500);
assert.strictEqual(board.satisfaction, 0);
runtime.adjust(board, 500);
assert.strictEqual(board.satisfaction, 100);
board.satisfaction = 50;
board.lastMrr = 20000;
for (let i = 0; i < 30; i += 1) {
  var result = runtime.review(board, { mrr: 10000, fire: 75, averageQuality: 40 });
}
assert.strictEqual(result.reviewed, true);
assert.strictEqual(result.delta, -4);
assert.strictEqual(board.satisfaction, 46);
assert.strictEqual(runtime.getRating(85), "安定");
assert.strictEqual(runtime.getRating(10), "危機");
""")

def test_board_decision_events_have_registered_handlers_and_board_achievements():
    run_node(r"""
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const window = {};
vm.runInNewContext(fs.readFileSync("js/data/decision-events.js", "utf8"), { window });
vm.runInNewContext(fs.readFileSync("js/runtime/decisions.js", "utf8"), { window });
const ids = [
  "board_sales_growth", "board_quality_investment", "board_customer_protection",
  "board_brand_campaign", "board_crisis_response", "board_dividend"
];
const handlers = {};
ids.forEach(id => { handlers[id] = { approve: () => {}, reject: () => {} }; });
const runtime = window.AIBS_CREATE_DECISION_RUNTIME({
  events: window.AIBS_DECISION_EVENTS,
  handlers: handlers,
  legacyEventIds: []
});
ids.forEach(id => {
  assert.ok(window.AIBS_DECISION_EVENTS.some(event => event.id === id));
  assert.ok(runtime.getDecisionEventHandler(id));
  assert.strictEqual(typeof runtime.getDecisionEventHandler(id).approve, "function");
  assert.strictEqual(typeof runtime.getDecisionEventHandler(id).reject, "function");
});
""")

def test_shareholder_state_defaults_for_existing_schema_four_saves_and_preserves_existing_fields():
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
  schemaVersion: 4, companyLevel: 10, money: 3210, totalMoney: 654321,
  fire: 17, secondFounding: { unlocked: true, stage: 3 },
  employees: { dev01: 2, security06: 1 },
  products: { dailyReportAi: { status: "selling", customers: 12, version: 5, quality: 88, bugs: 4 } },
  logs: [{ id: "kept-log", type: "normal", text: "keep me", employeeId: "company", createdAt: 1 }]
};
const normalized = runtime.normalizeState(saved);
assert.deepStrictEqual(JSON.parse(JSON.stringify(normalized.shareholderBoard)), {
  satisfaction: 50, reviewSeconds: 0, lastMrr: 0, dividendsPaid: 0,
  qualityInvestments: 0, meetingsHeld: 0
});
assert.strictEqual(normalized.schemaVersion, 4);
assert.strictEqual(normalized.companyLevel, 10);
assert.strictEqual(normalized.money, 3210);
assert.strictEqual(normalized.totalMoney, 654321);
assert.strictEqual(normalized.fire, 17);
assert.strictEqual(normalized.secondFounding.stage, 3);
assert.strictEqual(normalized.employees.dev01, 2);
assert.strictEqual(normalized.products.dailyReportAi.customers, 12);
assert.strictEqual(normalized.logs[0].text, "keep me");
const custom = runtime.normalizeState(Object.assign({}, saved, {
  shareholderBoard: { satisfaction: 77, dividendsPaid: 1500, qualityInvestments: 2, meetingsHeld: 4 }
}));
assert.strictEqual(custom.shareholderBoard.satisfaction, 77);
assert.strictEqual(custom.shareholderBoard.dividendsPaid, 1500);
assert.strictEqual(custom.shareholderBoard.qualityInvestments, 2);
assert.strictEqual(custom.shareholderBoard.meetingsHeld, 4);
""")

def test_shareholder_board_panel_renders_rating_and_financial_statistics():
    run_node(r"""
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const window = {};
vm.runInNewContext(fs.readFileSync("js/render/insights.js", "utf8"), { window });
const renderer = window.AIBS_CREATE_INSIGHTS_RENDERER({
  escapeHtml: value => String(value),
  formatNumber: value => String(value),
  getCharacterAvatarHtml: () => ""
});
const html = renderer.getShareholderBoardHtml({
  satisfaction: 82, dividendsPaid: 2500, qualityInvestments: 3, meetingsHeld: 5
}, "安定");
assert.ok(html.includes("株主満足度"));
assert.ok(html.includes("82"));
assert.ok(html.includes("安定"));
assert.ok(html.includes("2500円"));
assert.ok(html.includes("3回"));
assert.ok(html.includes("5回"));
""")
