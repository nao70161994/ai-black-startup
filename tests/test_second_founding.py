import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def run_node(source):
    subprocess.run(["node", "-e", source], cwd=ROOT, check=True, capture_output=True, text=True)


def test_schema_three_save_migrates_to_four_without_losing_existing_fields():
    run_node(r"""
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const window = {};
vm.runInNewContext(fs.readFileSync('js/runtime/save.js', 'utf8'), { window, console });
const runtime = window.AIBS_CREATE_SAVE_RUNTIME({ saveKey: 'save', schemaVersion: 4 });
const original = {
  schemaVersion: 3, companyLevel: 10, money: 12345, totalMoney: 987654,
  fire: 23, employees: { dev01: 2 }, products: { dailyReportAi: { customers: 123, version: 5 } },
  achievements: { first_customer: { unlocked: true, unlockedAt: 10 } },
  logs: [{ id: 'legacy-log', text: 'keep me' }]
};
const migrated = runtime.migrateData(original).data;
assert.strictEqual(migrated.schemaVersion, 4);
assert.deepStrictEqual(migrated.secondFounding, { unlocked: false, stage: 0 });
for (const key of ['companyLevel', 'money', 'totalMoney', 'fire', 'employees', 'products', 'achievements', 'logs']) {
  assert.deepStrictEqual(migrated[key], original[key], key + ' must be preserved');
}
""".replace(/\n/g, "\n"))


def test_new_game_starts_with_second_founding_locked():
    run_node(r"""
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const window = {};
vm.runInNewContext(fs.readFileSync('js/runtime/state.js', 'utf8'), { window, console, Date });
const employees = ['dev01', 'sales02', 'buzz03', 'care04', 'fire05', 'security06'].map(id => ({ id }));
const runtime = window.AIBS_CREATE_STATE_RUNTIME({
  products: [{ id: 'dailyReportAi', type: 'subscription', initialQuality: 60, developmentRequired: 100, price: 500 }],
  tasks: [{ id: 'development' }], employees, achievements: [], missionStages: [],
  characterAssets: {}, initialLogs: [], logLabels: { normal: true, success: true },
  maxLevel: 10, maxLogs: 50, schemaVersion: 4, appVersion: 'test',
  decisionRetrySeconds: 12, decisionCooldownSeconds: 45,
  safeNumber: (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback,
  clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
  createLog: (type, text, employeeId) => ({ type, text, employeeId }),
  normalizeDecisionEvent: () => null, normalizeAssignments: value => value || {},
  getProductCustomers: product => Math.max(0, Math.floor(Number(product.customers) || 0)),
  getProductUnitsSold: product => Math.max(0, Math.floor(Number(product.unitsSold) || 0)),
  recalculateProductMrr: product => { product.mrr = product.customers * 500; },
  getStrategy: id => ({ id: id || 'balanced' }), normalizeHistory: value => value || []
});
assert.deepStrictEqual(runtime.createInitialState().secondFounding, { unlocked: false, stage: 0 });
""".replace(/\n/g, "\n"))


def test_normalizing_level_ten_save_preserves_company_and_gameplay_data():
    run_node(r"""
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const window = {};
vm.runInNewContext(fs.readFileSync('js/runtime/state.js', 'utf8'), { window, console, Date });
const employeeIds = ['dev01', 'sales02', 'buzz03', 'care04', 'fire05', 'security06'];
const employees = employeeIds.map(id => ({ id }));
const runtime = window.AIBS_CREATE_STATE_RUNTIME({
  products: [{ id: 'dailyReportAi', type: 'subscription', initialQuality: 60, developmentRequired: 100, price: 500 }],
  tasks: [{ id: 'development' }], employees, achievements: [{ id: 'first_customer' }], missionStages: [],
  characterAssets: {}, initialLogs: [], logLabels: { normal: true, success: true },
  maxLevel: 10, maxLogs: 50, schemaVersion: 4, appVersion: 'test',
  decisionRetrySeconds: 12, decisionCooldownSeconds: 45,
  safeNumber: (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback,
  clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
  createLog: (type, text, employeeId) => ({ type, text, employeeId }),
  normalizeDecisionEvent: () => null, normalizeAssignments: value => value || {},
  getProductCustomers: product => Math.max(0, Math.floor(Number(product.customers) || 0)),
  getProductUnitsSold: product => Math.max(0, Math.floor(Number(product.unitsSold) || 0)),
  recalculateProductMrr: product => { product.mrr = product.customers * 500; },
  getStrategy: id => ({ id: id || 'balanced' }), normalizeHistory: value => value || []
});
const saved = {
  companyLevel: 10, money: 4567, totalMoney: 123456789, users: 12, fire: 17,
  employees: Object.fromEntries(employeeIds.map(id => [id, 1])),
  products: { dailyReportAi: { status: 'selling', customers: 12, version: 5, quality: 88, bugs: 4 } },
  achievements: { first_customer: { unlocked: true, unlockedAt: 123 } },
  logs: [{ id: 'keep-log', type: 'normal', text: '既存ログ', employeeId: 'company', createdAt: 1 }]
};
const normalized = runtime.normalizeState(saved);
assert.strictEqual(normalized.companyLevel, 10);
assert.strictEqual(normalized.money, 4567);
assert.strictEqual(normalized.totalMoney, 123456789);
assert.strictEqual(normalized.fire, 17);
assert.strictEqual(normalized.products.dailyReportAi.customers, 12);
assert.strictEqual(normalized.products.dailyReportAi.version, 5);
assert.strictEqual(normalized.employees.security06, 1);
assert.strictEqual(normalized.achievements.first_customer.unlocked, true);
assert.strictEqual(normalized.logs[0].text, '既存ログ');
assert.deepStrictEqual(normalized.secondFounding, { unlocked: false, stage: 0 });
""".replace(/\n/g, "\n"))
