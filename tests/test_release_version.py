"""Release generation must reject drift and support a version change without test edits."""
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_checked_in_release_is_current():
    subprocess.run([sys.executable, "scripts/release_version.py", "--check"], cwd=ROOT, check=True)


def test_version_change_updates_every_target_and_check_rejects_drift(tmp_path):
    spec = importlib.util.spec_from_file_location("release_version", ROOT / "scripts/release_version.py")
    release = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(release)
    script = tmp_path / "scripts/release_version.py"
    script.parent.mkdir()
    script.write_text((ROOT / "scripts/release_version.py").read_text())
    for name in release.TARGETS:
        (tmp_path / name).write_text((ROOT / name).read_text())
    next_version = "2099.12.31.42"
    (tmp_path / "version.json").write_text(json.dumps({"version": next_version}))
    command = [sys.executable, str(script)]
    stale = subprocess.run(command + ["--check"], capture_output=True, text=True)
    assert stale.returncode != 0
    assert "Release metadata is stale" in stale.stderr
    subprocess.run(command, check=True)
    subprocess.run(command + ["--check"], check=True)
    for name in release.TARGETS:
        content = (tmp_path / name).read_text()
        assert next_version in content or "20991231-42" in content
