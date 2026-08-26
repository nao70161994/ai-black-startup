#!/usr/bin/env python3
"""Run computed-layout UI checks in a real headless Chromium browser."""

from __future__ import annotations

import argparse
import copy
import html
import json
import re
import shutil
import subprocess
import threading
import time
import urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SAVE_KEY = "ai_black_startup_save_v1"
PAGES = ("home", "products", "team", "management", "records")

MATURE_SAVE = {
    "schemaVersion": 3,
    "appVersion": "2026.05.24.59",
    "money": 680000,
    "totalMoney": 1200000,
    "users": 480,
    "bugs": 28,
    "fire": 42,
    "companyLevel": 6,
    "strategyId": "quality",
    "employees": {
        "dev01": 3, "sales02": 3, "buzz03": 2,
        "care04": 2, "fire05": 2, "security06": 1,
    },
    "products": {
        "dailyReportAi": {
            "id": "dailyReportAi", "status": "selling", "progress": 100,
            "quality": 72, "bugs": 6, "awareness": 68, "customers": 180,
            "version": 2, "upgradeProgress": 32, "upgradeStatus": "upgrading",
            "satisfaction": 64, "supportLoad": 38, "churnRisk": 16,
        },
        "meetingMinutesAi": {
            "id": "meetingMinutesAi", "status": "selling", "progress": 180,
            "quality": 61, "bugs": 8, "awareness": 48, "customers": 74,
            "version": 1, "satisfaction": 55, "supportLoad": 44, "churnRisk": 23,
        },
        "slideKitAi": {
            "id": "slideKitAi", "status": "selling", "progress": 160,
            "quality": 57, "bugs": 4, "awareness": 54, "unitsSold": 38,
            "lifetimeRevenue": 372400,
        },
        "supportReplyAi": {
            "id": "supportReplyAi", "status": "developing", "progress": 135,
            "quality": 62, "bugs": 5, "awareness": 25, "customers": 0,
            "version": 1, "satisfaction": 60, "supportLoad": 20, "churnRisk": 10,
        },
        "apologyWriterAi": {
            "id": "apologyWriterAi", "status": "idea", "progress": 0,
            "quality": 52, "bugs": 0, "awareness": 3, "unitsSold": 0,
            "lifetimeRevenue": 0,
        },
    },
    "productFlags": {product_id: {flag: True for flag in ["startedLogged","completedLogged","salesStartedLogged","firstCustomerGranted","customer10Logged","customer50Logged","customer100Logged","mrr10kLogged","mrr100kLogged","firstSaleLogged","sales10Logged","sales50Logged","sales100Logged","unit10Logged","qaLogShown","marketingStartedLogged","marketingFireLogged","awareness50Logged","awareness100Logged","supportLoad50Logged","satisfaction40Logged","churnRisk50Logged","firstChurnLogged","productFire50Logged","productFire80Logged","productFire100Logged","crisisStartedLogged","crisisContainedLogged","impossibleRequestHandled","aiRunawayHandled"]} for product_id in ["dailyReportAi","meetingMinutesAi","slideKitAi","supportReplyAi","apologyWriterAi"]},
    "assignments": {
        "development": {"productId": "dailyReportAi", "aiIds": ["dev01"]},
        "qa": {"productId": "meetingMinutesAi", "aiIds": ["security06"]},
        "sales": {"productId": "dailyReportAi", "aiIds": ["sales02"]},
        "marketing": {"productId": "slideKitAi", "aiIds": ["buzz03"]},
        "support": {"productId": "meetingMinutesAi", "aiIds": ["care04"]},
        "crisis": {"productId": "dailyReportAi", "aiIds": ["fire05"]},
    },
    "claimedMissions": ["hire_first", "develop_first", "sell_first"],
    "tutorialCompleted": True,
    "tutorialDismissed": True,
    "seenStoryEvents": {**{f"level-{level}": True for level in range(1, 11)}, **{f"first-revenue-{product_id}": True for product_id in ("dailyReportAi", "meetingMinutesAi", "slideKitAi", "supportReplyAi", "apologyWriterAi")}},
    "storyEvent": None,
    "logs": [
        {
            "id": f"uiqa-{index}",
            "type": "success" if index % 3 == 0 else "normal",
            "text": (
                "新規顧客を獲得しました"
                if index % 3 == 0
                else "品質レビューと販売施策を更新しました"
            ),
            "employeeId": ("sales02", "security06", "buzz03")[index % 3],
            "createdAt": 2000000000000 - index * 60000,
        }
        for index in range(18)
    ],
    "lastSavedAt": 2000000000000,
    "metricHistory": [
        {"money": 100000, "mrr": 30000, "customers": 60, "bugs": 12, "fire": 10, "productFire": 8},
        {"money": 250000, "mrr": 52000, "customers": 130, "bugs": 18, "fire": 18, "productFire": 15},
        {"money": 420000, "mrr": 91000, "customers": 260, "bugs": 35, "fire": 30, "productFire": 28},
        {"money": 680000, "mrr": 178000, "customers": 480, "bugs": 28, "fire": 42, "productFire": 36},
    ],
}

CRISIS_SAVE = copy.deepcopy(MATURE_SAVE)
CRISIS_SAVE.update({
    "bugs": 96,
    "fire": 92,
    "pendingDecisionEvent": {
        "id": "server_outage_response",
        "productId": "dailyReportAi",
        "createdAt": 2000000000000,
    },
})
CRISIS_SAVE["products"]["dailyReportAi"].update({
    "quality": 24,
    "bugs": 88,
    "satisfaction": 19,
    "supportLoad": 96,
    "churnRisk": 81,
    "productFire": 94,
})

END_SAVE = copy.deepcopy(MATURE_SAVE)
END_SAVE.update({
    "money": 12800000,
    "totalMoney": 32600000,
    "users": 5480,
    "companyLevel": 10,
    "employees": {
        "dev01": 5, "sales02": 5, "buzz03": 5,
        "care04": 5, "fire05": 5, "security06": 5,
    },
})
for end_product in END_SAVE["products"].values():
    end_product.update({"status": "selling", "progress": 200, "quality": 88, "bugs": 7, "awareness": 100})
END_SAVE["products"]["supportReplyAi"].update({"customers": 620, "satisfaction": 86, "supportLoad": 24, "churnRisk": 6})
END_SAVE["products"]["apologyWriterAi"].update({"unitsSold": 410, "lifetimeRevenue": 3198000})
END_SAVE["logs"].insert(0, {
    "id": "uiqa-end-long",
    "type": "success",
    "text": "全製品の終盤運用レビューを完了し、品質・販売・顧客対応の長期計画を更新しました。" * 5,
    "employeeId": "boss",
    "createdAt": 2000000001000,
})

OFFICE_LEVEL_SAVES = {}
for office_level in (2, 3, 4):
    office_save = copy.deepcopy(MATURE_SAVE)
    office_save["companyLevel"] = office_level
    unlocked_count = min(6, office_level + 1)
    employee_ids = ("dev01", "sales02", "buzz03", "care04", "fire05", "security06")
    office_save["employees"] = {employee_id: 1 for employee_id in employee_ids[:unlocked_count]}
    OFFICE_LEVEL_SAVES[f"level-{office_level}"] = office_save

IDLE_SAVE = copy.deepcopy(MATURE_SAVE)
IDLE_SAVE["assignments"] = {}

PROBE_SCRIPT = r"""
const settings = SETTINGS;
const resultNode = document.getElementById("result");
try {
  if (settings.save === null) localStorage.removeItem(SAVE_KEY);
  else localStorage.setItem(SAVE_KEY, JSON.stringify(settings.save));
} catch (error) {
  resultNode.textContent = "UIQA_ERROR:" + error.message;
}
const frame = document.createElement("iframe");
frame.title = "UI検査対象";
frame.src = "/?uiqa=" + Date.now() + "#" + settings.page;
document.body.appendChild(frame);

function visible(node, win) {
  if (node.closest("[hidden]")) return false;
  const style = win.getComputedStyle(node);
  const rect = node.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" &&
    Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
}

function accessibleName(node) {
  const labelledBy = node.getAttribute("aria-labelledby");
  if (labelledBy) {
    const doc = node.ownerDocument;
    const value = labelledBy.split(/\s+/).map(id => {
      const label = doc.getElementById(id);
      return label ? label.textContent.trim() : "";
    }).join(" ").trim();
    if (value) return value;
  }
  if (node.id) {
    const label = node.ownerDocument.querySelector('label[for="' + CSS.escape(node.id) + '"]');
    if (label && label.textContent.trim()) return label.textContent.trim();
  }
  return (node.getAttribute("aria-label") || node.getAttribute("title") || node.textContent || "").trim();
}

function openRequestedModal(doc) {
  if (settings.modal === "detail") {
    const button = doc.querySelector("[data-primary-product-detail], [data-product-detail]");
    if (button) button.click();
  } else if (settings.modal === "assignment") {
    const button = doc.getElementById("openAssignmentModal");
    if (button) button.click();
  } else if (settings.modal === "zone") {
    const button = doc.querySelector('[data-office-zone="development"]');
    if (button) button.click();
  }
}

function collect() {
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  openRequestedModal(doc);
  if (settings.selectWorker) {
    const worker = doc.querySelector('[data-office-worker="' + settings.selectWorker + '"]') || doc.querySelector("[data-office-worker]");
    if (worker) worker.click();
  }
  if (settings.forceImageFailure) {
    doc.querySelectorAll("img[data-office-character-image], img[data-character-image]").forEach((image, index) => {
      image.src = "/__missing_uiqa_image_" + index + ".webp";
    });
  }
  window.setTimeout(() => {
    const controls = Array.from(doc.querySelectorAll("button, select, summary, a[href]"))
      .filter(node => visible(node, win));
    const controlHeights = controls.map(node => Math.round(node.getBoundingClientRect().height));
    const undersizedTargets = controls.filter(node => node.getBoundingClientRect().height < 43.5).map(node => node.id || node.className || node.tagName);
    const ids = Array.from(doc.querySelectorAll("[id]")).map(node => node.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
      .filter((id, index, source) => source.indexOf(id) === index);
    const nav = doc.querySelector(".bottom-nav");
    const shell = doc.querySelector(".app-shell");
    const currentLink = doc.querySelector('.bottom-nav a[aria-current="page"]');
    const recommendation = doc.querySelector(".next-recommendation-button");
    const share = doc.querySelector("button.share");
    const selectedStrategy = doc.querySelector(".strategy-option.selected");
    const unselectedStrategy = doc.querySelector(".strategy-option:not(.selected)");
    const focusTarget = controls.find(node => !node.disabled && (!settings.modal || node.closest("[role=\"dialog\"]")));
    if (focusTarget) focusTarget.focus();
    const focusStyle = focusTarget ? win.getComputedStyle(focusTarget) : null;

    let modal = null;
    let modalResult = null;
    if (settings.modal) {
      modal = doc.querySelector('[role="dialog"]:not([hidden])');
      const modalControls = modal ? Array.from(modal.querySelectorAll("button, select, summary, a[href]"))
        .filter(node => visible(node, win)) : [];
      const first = modalControls[0] || null;
      const last = modalControls[modalControls.length - 1] || null;
      const focusInside = Boolean(modal && modal.contains(doc.activeElement));
      if (last) {
        last.focus();
        doc.dispatchEvent(new win.KeyboardEvent("keydown", {key: "Tab", bubbles: true}));
      }
      const trapWorked = Boolean(first && doc.activeElement === first);
      const isolated = Array.from(doc.querySelectorAll(".hero, .tutorial-panel, .page-location, .app-page, .bottom-nav, .skip-link"))
        .filter(node => node.inert && node.getAttribute("aria-hidden") === "true").length;
      modalResult = {
        open: Boolean(modal),
        role: modal ? modal.getAttribute("role") : "",
        minTarget: modalControls.length ? Math.min(...modalControls.map(node => Math.round(node.getBoundingClientRect().height))) : 0,
        focusInside,
        trapWorked,
        isolated,
      };
      if (!settings.keepModal) doc.dispatchEvent(new win.KeyboardEvent("keydown", {key: "Escape", bubbles: true}));
      modalResult.escapeClosed = settings.keepModal || !doc.querySelector('[role="dialog"]:not([hidden])');
    }

    const officeStage = doc.getElementById("officeStage");
    const officeWorkers = Array.from(doc.querySelectorAll(".office-worker")).filter(node => visible(node, win));
    const equipmentZones = Array.from(doc.querySelectorAll(".office-zone")).filter(node => visible(node, win));
    function overlapArea(first, second) {
      if (!first || !second || !visible(first, win) || !visible(second, win)) return 0;
      const a = first.getBoundingClientRect();
      const b = second.getBoundingClientRect();
      return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    }
    const officeCoach = doc.querySelector(".office-coach:not([hidden])");
    const coachTitle = officeCoach && officeCoach.querySelector(".tutorial-copy strong");
    const coachBody = officeCoach && officeCoach.querySelector(".tutorial-copy p");
    function renderedLines(node) {
      if (!node || !visible(node, win)) return 0;
      const lineHeight = parseFloat(win.getComputedStyle(node).lineHeight) || parseFloat(win.getComputedStyle(node).fontSize);
      return Math.max(1, Math.round(node.getBoundingClientRect().height / lineHeight));
    }
    function containedBy(parent, children) {
      if (!parent || !visible(parent, win)) return true;
      const outer = parent.getBoundingClientRect();
      return children.every(node => {
        const rect = node.getBoundingClientRect();
        return rect.left >= outer.left - 1 && rect.right <= outer.right + 1 && rect.top >= outer.top - 1 && rect.bottom <= outer.bottom + 1;
      });
    }
    const activityPanel = doc.getElementById("activityPanel");
    const activityText = doc.getElementById("activityText");
    const zoneLabelsVisible = equipmentZones.every(node => {
      const content = win.getComputedStyle(node, "::after").content;
      return settings.width >= 960 || (content !== "none" && content.length > 2);
    });
    const officeResult = officeStage ? {
      height: Math.round(officeStage.getBoundingClientRect().height),
      top: Math.round(officeStage.getBoundingClientRect().top),
      workers: officeWorkers.length,
      uniqueWorkerAnchors: new Set(officeWorkers.map(node => {
        const rect = node.getBoundingClientRect();
        return Math.round(rect.left / 8) + ":" + Math.round(rect.top / 8);
      })).size,
      equipmentZones: equipmentZones.length,
      inspectorOpen: Boolean(doc.querySelector(".office-worker-inspector:not([hidden])")),
      minWorkerWidth: officeWorkers.length ? Math.round(Math.min(...officeWorkers.map(node => node.getBoundingClientRect().width))) : 0,
      tutorialVisible: Boolean(officeCoach),
      tutorialHeadingLines: renderedLines(coachTitle),
      tutorialBodyLines: renderedLines(coachBody),
      tutorialActionsContained: containedBy(officeCoach, officeCoach ? Array.from(officeCoach.querySelectorAll(".tutorial-actions button")) : []),
      tutorialContained: containedBy(officeStage, officeCoach ? [officeCoach] : []),
      activityTextContained: containedBy(activityPanel, activityText ? [activityText] : []),
      zonesLabeled: zoneLabelsVisible,
      tutorialWorkerOverlap: overlapArea(doc.querySelector(".office-coach:not([hidden])"), doc.querySelector(".office-worker")),
      directiveVitalsOverlap: overlapArea(doc.querySelector(".office-directive"), doc.querySelector(".office-vitals")),
      directiveRiskOverlap: overlapArea(doc.querySelector(".office-directive"), doc.querySelector(".office-risk-console")),
    } : null;

    const result = {
      scenario: settings.scenario,
      page: settings.page,
      width: settings.width,
      clientWidth: doc.documentElement.clientWidth,
      scrollWidth: doc.documentElement.scrollWidth,
      shellWidth: Math.round(shell.getBoundingClientRect().width),
      storyTitle: doc.getElementById("storyTitle").textContent.trim(),
      storyHidden: doc.getElementById("storyModal").hidden,
      pageTitle: doc.getElementById("currentPageTitle").textContent.trim(),
      pageDescription: doc.getElementById("currentPageDescription").textContent.trim(),
      currentPage: currentLink ? currentLink.getAttribute("data-page-link") : "",
      minTarget: controlHeights.length ? Math.min(...controlHeights) : 0,
      undersized: undersizedTargets,
      unnamed: controls.filter(node => !accessibleName(node)).map(node => node.id || node.tagName),
      duplicates,
      navHeight: Math.round(nav.getBoundingClientRect().height),
      shellPaddingBottom: Math.round(parseFloat(win.getComputedStyle(shell).paddingBottom)),
      focusOutline: focusStyle ? Math.round(parseFloat(focusStyle.outlineWidth)) : 0,
      strategyDistinct: !selectedStrategy || !unselectedStrategy ||
        win.getComputedStyle(selectedStrategy).backgroundImage !== win.getComputedStyle(unselectedStrategy).backgroundImage ||
        win.getComputedStyle(selectedStrategy).backgroundColor !== win.getComputedStyle(unselectedStrategy).backgroundColor,
      strategyLabel: !selectedStrategy || win.getComputedStyle(selectedStrategy, "::after").content.includes("選択中"),
      recommendationDistinct: !recommendation ||
        win.getComputedStyle(recommendation).backgroundImage !== win.getComputedStyle(doc.querySelector("button:not(.next-recommendation-button)")).backgroundImage,
      shareTextColor: share ? win.getComputedStyle(share).color : "",
      imageFallbacks: doc.querySelectorAll(".image-failed").length,
      saveNotice: (doc.getElementById("saveManagerStatus") || {}).textContent || "",
      office: officeResult,
      modal: modalResult,
    };
    resultNode.textContent = "UIQA_RESULT:" + JSON.stringify(result);
    document.body.dataset.done = "true";
  }, 180);
}
frame.addEventListener("load", () => window.setTimeout(collect, 1250));
"""


def make_probe(settings: dict[str, object]) -> bytes:
    script = PROBE_SCRIPT.replace("SETTINGS", json.dumps(settings, ensure_ascii=False))
    script = script.replace("SAVE_KEY", json.dumps(SAVE_KEY))
    page = (
        "<!doctype html><html><head><meta charset=\"utf-8\">"
        "<title>UI experience probe</title>"
        "<style>html,body{margin:0}iframe{display:block;width:100vw;height:900px;border:0}"
        "#result{position:absolute;left:-9999px}</style></head><body>"
        '<pre id="result">waiting</pre><script>' + script + "</script></body></html>"
    )
    return page.encode("utf-8")


class ProbeHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args: object, **kwargs: object) -> None:
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format: str, *args: object) -> None:
        return

    def do_GET(self) -> None:
        parsed = urllib.parse.urlsplit(self.path)
        if parsed.path != "/__ui_probe__.html":
            super().do_GET()
            return
        query = urllib.parse.parse_qs(parsed.query)
        scenario = query.get("scenario", ["fresh"])[0]
        save = CRISIS_SAVE if scenario == "crisis" else END_SAVE if scenario == "end" else OFFICE_LEVEL_SAVES.get(scenario) if scenario.startswith("level-") else IDLE_SAVE if scenario == "idle" else MATURE_SAVE if scenario in ("mature", "image-failed", "selected") else None
        settings = {
            "scenario": scenario,
            "page": query.get("page", ["home"])[0],
            "width": int(query.get("width", ["390"])[0]),
            "modal": query.get("modal", [""])[0],
            "forceImageFailure": query.get("forceImageFailure", ["False"])[0].lower() == "true",
            "selectWorker": query.get("selectWorker", [""])[0],
            "keepModal": query.get("keepModal", ["False"])[0].lower() == "true",
            "save": save,
        }
        payload = make_probe(settings)
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def find_browser() -> str:
    for name in ("chromium-browser", "chromium", "google-chrome", "google-chrome-stable"):
        path = shutil.which(name)
        if path:
            return path
    raise RuntimeError("Chromium/Chrome is required for UI experience checks")


def run_case(browser: str, base_url: str, case: dict[str, object]) -> dict[str, object]:
    query = urllib.parse.urlencode(case)
    url = urllib.parse.urljoin(base_url, "__ui_probe__.html?" + query)
    command = [
        browser, "--headless=new", "--no-sandbox", "--disable-dev-shm-usage",
        "--disable-gpu", "--disable-software-rasterizer", "--disable-background-networking",
        "--disable-features=VizDisplayCompositor,MediaRouter",
        "--hide-scrollbars", "--incognito", "--virtual-time-budget=5000",
        "--window-size=" + str(case["width"]) + ",900",
        "--dump-dom", url,
    ]
    if case.get("storageUnavailable"):
        command.insert(-2, "--disable-local-storage")
    completed = subprocess.run(command, text=True, capture_output=True, timeout=25, check=True)
    match = re.search(r"UIQA_RESULT:(\{.*?\})</pre>", completed.stdout)
    if not match:
        error = re.search(r"UIQA_ERROR:([^<]+)", completed.stdout)
        detail = html.unescape(error.group(1)) if error else completed.stderr[-500:]
        raise RuntimeError(f"probe did not finish for {case}: {detail}")
    return json.loads(html.unescape(match.group(1)))


def validate(result: dict[str, object]) -> list[str]:
    label = f"{result['scenario']}/{result['page']}/{result['width']}"
    failures: list[str] = []
    if result["scrollWidth"] != result["clientWidth"]:
        failures.append(f"{label}: horizontal overflow {result['scrollWidth']}>{result['clientWidth']}")
    if result["minTarget"] < 44:
        failures.append(f"{label}: smallest target is {result['minTarget']}px: {result['undersized']} story={result['storyHidden']}:{result['storyTitle']}")
    if result["unnamed"]:
        failures.append(f"{label}: unnamed controls {result['unnamed']}")
    if result["duplicates"]:
        failures.append(f"{label}: duplicate IDs {result['duplicates']}")
    if result["currentPage"] != result["page"]:
        failures.append(f"{label}: current navigation is {result['currentPage']}")
    if not result["pageTitle"] or not result["pageDescription"]:
        failures.append(f"{label}: page context is incomplete")
    if result["width"] < 960 and result["shellPaddingBottom"] < result["navHeight"] + 8:
        failures.append(f"{label}: fixed navigation clearance is insufficient")
    if not result.get("modal") and (result["focusOutline"] or 0) < 2:
        failures.append(f"{label}: keyboard focus outline is not visible")
    if result["width"] >= 1200 and result["shellWidth"] < 1000:
        failures.append(f"{label}: desktop shell remains too narrow")
    if not result["strategyDistinct"] or not result["strategyLabel"]:
        failures.append(f"{label}: selected strategy is not clearly distinguishable")
    if not result["recommendationDistinct"]:
        failures.append(f"{label}: recommendation action lacks visual hierarchy")
    if result["shareTextColor"] and result["shareTextColor"] not in ("rgb(5, 42, 25)", "rgb(7, 56, 41)"):
        failures.append(f"{label}: share action contrast color regressed")
    if result["scenario"] == "image-failed" and not result["imageFallbacks"]:
        failures.append(f"{label}: image failure fallback was not activated")
    if result["scenario"] == "storage-unavailable" and "一時保存" not in result["saveNotice"]:
        failures.append(f"{label}: unavailable storage state is not explained")
    office = result.get("office")
    if result["page"] == "home":
        required_height = 620 if result["width"] < 960 else 580
        if not office or office["height"] < required_height or office["top"] > 24:
            failures.append(f"{label}: office is not the first-view primary stage: {office}")
        if office and office["minWorkerWidth"] < (90 if result["width"] < 960 else 105):
            failures.append(f"{label}: office workers are too small to read: {office}")
        if office and office["tutorialVisible"] and (office["tutorialHeadingLines"] > 2 or office["tutorialBodyLines"] > 4 or not office["tutorialActionsContained"] or not office["tutorialContained"]):
            failures.append(f"{label}: tutorial copy or actions collapse outside the coach: {office}")
        if office and not office["activityTextContained"]:
            failures.append(f"{label}: live activity text escapes its panel")
        if office and not office["zonesLabeled"]:
            failures.append(f"{label}: mobile work zones lack a visible meaning label")
        if office and office["workers"] != office["uniqueWorkerAnchors"]:
            failures.append(f"{label}: workers share the same spatial anchor")
        if office and (office["tutorialWorkerOverlap"] > 100 or office["directiveVitalsOverlap"] > 100 or office["directiveRiskOverlap"] > 100):
            failures.append(f"{label}: office HUD overlaps primary content: {office}")
        if result["scenario"] in ("mature", "end", "crisis") and office and office["equipmentZones"] < 6:
            failures.append(f"{label}: mature office does not expose all work zones")
        if result["scenario"] == "selected" and (not office or not office["inspectorOpen"]):
            failures.append(f"{label}: worker selection did not open the in-stage inspector")
    modal = result.get("modal")
    if modal:
        if not modal["open"] or modal["role"] != "dialog":
            failures.append(f"{label}: requested modal did not open as a dialog")
        if modal["minTarget"] < 44:
            failures.append(f"{label}: modal target is below 44px")
        if not modal["focusInside"] or not modal["trapWorked"]:
            failures.append(f"{label}: modal focus management failed")
        if modal["isolated"] < 5:
            failures.append(f"{label}: modal background is not isolated")
        if not modal["escapeClosed"]:
            failures.append(f"{label}: Escape did not close modal")
    return failures


def build_cases() -> list[dict[str, object]]:
    cases: list[dict[str, object]] = []
    for page in PAGES:
        cases.append({"scenario": "fresh", "page": page, "width": 320})
        cases.append({"scenario": "mature", "page": page, "width": 390})
        cases.append({"scenario": "mature", "page": page, "width": 1280})
    cases.append({"scenario": "mature", "page": "home", "width": 768})
    cases.append({"scenario": "mature", "page": "home", "width": 960})
    cases.append({"scenario": "fresh", "page": "home", "width": 960})
    cases.append({"scenario": "fresh", "page": "home", "width": 1280})
    for width in (320, 1280):
        cases.append({"scenario": "crisis", "page": "home", "width": width})
        cases.append({"scenario": "crisis", "page": "products", "width": width})
    for page in PAGES:
        cases.append({"scenario": "end", "page": page, "width": 390})
    for office_level in (2, 3, 4):
        cases.append({"scenario": f"level-{office_level}", "page": "home", "width": 390})
    cases.append({"scenario": "idle", "page": "home", "width": 390})
    for width in (390, 1280):
        cases.append({"scenario": "selected", "page": "home", "width": width, "selectWorker": "boss"})
    for width in (320, 1280):
        cases.append({"scenario": "mature", "page": "home", "width": width, "modal": "zone"})
    cases.append({"scenario": "image-failed", "page": "team", "width": 320, "forceImageFailure": True})
    cases.append({"scenario": "storage-unavailable", "page": "records", "width": 320, "storageUnavailable": True})
    for width in (320, 1280):
        cases.append({"scenario": "mature", "page": "products", "width": width, "modal": "detail"})
        cases.append({"scenario": "mature", "page": "team", "width": width, "modal": "assignment"})
    return cases


class QuietServer(ThreadingHTTPServer):
    def handle_error(self, request: object, client_address: object) -> None:
        return

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--case", help="run one page:width:scenario case")
    args = parser.parse_args()
    browser = find_browser()
    cases = build_cases()
    if args.case:
        parts = args.case.split(":")
        page, width, scenario = parts[:3]
        cases = [{"page": page, "width": int(width), "scenario": scenario}]
        if scenario == "selected": cases[0]["selectWorker"] = "boss"
        if scenario == "image-failed": cases[0]["forceImageFailure"] = True
        if scenario == "storage-unavailable": cases[0]["storageUnavailable"] = True
        if len(parts) > 3: cases[0]["modal"] = parts[3]

    server = QuietServer(("127.0.0.1", 0), ProbeHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base_url = f"http://127.0.0.1:{server.server_port}/"
    results: list[dict[str, object]] = []
    failures: list[str] = []
    started = time.monotonic()
    try:
        for case in cases:
            result = run_case(browser, base_url, case)
            results.append(result)
            failures.extend(validate(result))
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)

    if failures:
        raise RuntimeError("\n".join(failures))
    print(json.dumps({
        "status": "ok",
        "browser": Path(browser).name,
        "cases": len(results),
        "pages": list(PAGES),
        "widths": sorted({result["width"] for result in results}),
        "modalCases": sum(1 for result in results if result.get("modal")),
        "elapsedSeconds": round(time.monotonic() - started, 2),
    }, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
