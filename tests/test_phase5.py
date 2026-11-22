"""Phase 5 regression contracts: M&A, ending and backwards-compatible saves."""
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]


def run_node(source):
    result = subprocess.run(["node", "-e", source], cwd=ROOT, capture_output=True, text=True)
    assert result.returncode == 0, result.stdout + result.stderr
    return json.loads(result.stdout)


def test_phase5_economy_and_completion():
    result = run_node(r"""
const fs = require("fs"), vm = require("vm"), assert = require("assert");
const sandbox = {window: {}};
vm.runInNewContext(fs.readFileSync("js/runtime/competition.js", "utf8"), sandbox);
const c = sandbox.window.AIBS_CREATE_COMPETITION_RUNTIME({});
assert.equal(c.targets.length, 4);
assert.equal(c.getOwnedMrr(["paperclip", "clouddesk"]), 450000);
assert.equal(c.getOwnedMrr(["paperclip", "paperclip", "unknown"]), 100000);
assert(c.acquisitionCost(c.targets[0], 10) < c.acquisitionCost(c.targets[0], 0));
assert.equal(c.getValuation(5000000, 40000000), 1000000000);
assert(c.checkEnding(60, 5000000, 1000000000));
assert(!c.checkEnding(59.9, 5000000, 1000000000));
assert(!c.checkEnding(60, 4999999, 1000000000));
assert(!c.checkEnding(60, 5000000, 999999999));
const initial = c.normalize(null);
assert.equal(c.getShare(initial, 375000), 60);
console.log(JSON.stringify({ok:true}));
""")
    assert result["ok"] is True


def test_phase5_save_schema_and_default_fill():
    main = (ROOT / "main.js").read_text()
    state = (ROOT / "js/runtime/state.js").read_text()
    crew = (ROOT / "js/render/crew.js").read_text()
    employees = (ROOT / "js/data/employees.js").read_text()
    assert "const SAVE_SCHEMA_VERSION = 4;" in main
    assert 'acquisitions: normalizeAcquisitions(saved.acquisitions)' in state
    assert 'endingCompleted: saved.endingCompleted === true' in state
    assert 'employees.forEach(function (employee)' in state
    assert 'id: "legal08"' in employees
    assert 'employee.id === "legal08"' in crew
    assert 'workerId === "legal08"' in main


def test_phase5_release_matches_version():
    version = json.loads((ROOT / "version.json").read_text())["version"]
    assert version == "2026.11.23.1"
    result = subprocess.run(["python", "scripts/release_version.py", "--check"], cwd=ROOT, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr + result.stdout
