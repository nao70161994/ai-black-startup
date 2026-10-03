(function () {
  "use strict";
  // Live context getters keep reset/imported saves visible to every render.
  window.AIBS_CREATE_OFFICE_RENDERER = function (context) {
  function getOfficeLevel() {
    return Math.min(5, Math.max(1, Math.floor(context.safeNumber(context.state.companyLevel, 1))));
  }

  function getOfficeWorkerAssignment(workerId) {
    for (let taskIndex = 0; taskIndex < context.TASKS.length; taskIndex += 1) {
      const task = context.TASKS[taskIndex];
      for (let productIndex = 0; productIndex < context.PRODUCTS.length; productIndex += 1) {
        const definition = context.PRODUCTS[productIndex];
        const assignment = context.getProductAssignment(task.id, definition.id);
        if (assignment.aiIds.indexOf(workerId) >= 0) return { task: task, definition: definition, mode: assignment.mode };
      }
    }
    return null;
  }

  function getOfficeTaskSymbol(taskId) {
    return { development: "{ }", qa: "✓", sales: "↗", marketing: "✦", support: "♡", crisis: "!" }[taskId] || "…";
  }

  function getOfficeWorkerState(workerId, assignment) {
    const latest = context.state.logs.find(function (log) { return log.employeeId === workerId || (workerId === "boss" && log.employeeId === "company"); });
    if (latest && Date.now() - latest.createdAt < 9000 && latest.type === "success") return "success";
    if (assignment && assignment.task.id === "crisis") return "crisis";
    if ((context.state.fire >= 70 && workerId === "fire05") || (context.getDashboardBugLevel() >= 70 && workerId === "security06")) return "alert";
    return assignment ? "working" : "resting";
  }

  function getOfficeWorkerDialogue(workerId, assignment) {
    const character = context.CHARACTER_ASSETS[workerId] || {};
    if (context.state.fire >= 70 && (workerId === "boss" || workerId === "fire05")) return "炎上 " + Math.round(context.state.fire) + "。いま火消しを！";
    if (context.getDashboardBugLevel() >= 70 && (workerId === "boss" || workerId === "security06")) return "バグ " + Math.round(context.getDashboardBugLevel()) + "。品質確認します";
    const latest = context.state.logs.find(function (log) { return log.employeeId === workerId && Date.now() - log.createdAt < 16000; });
    if (latest) return latest.text.length > 34 ? latest.text.slice(0, 33) + "…" : latest.text;
    if (assignment) {
      if (assignment.task.id === "sales") return "MRR " + context.formatCurrency(context.getTotalProductMrr()) + "。商談中です";
      if (assignment.task.id === "development") return assignment.definition.name + "を開発中です";
      return assignment.task.label + "を進めています";
    }
    const dialogue = Array.isArray(character.dialogue) ? character.dialogue : [];
    return dialogue.length ? dialogue[(context.state.playSeconds + workerId.length) % dialogue.length] : "次の仕事を待っています";
  }

  const OFFICE_TASK_ZONES = {
    development: { x: 28, y: 77, label: "開発ベイ", shortLabel: "開発", icon: "{ }", unlock: 1 },
    sales: { x: 76, y: 78, label: "セールス端末", shortLabel: "販売", icon: "↗", unlock: 2 },
    marketing: { x: 17, y: 57, label: "広報ブース", shortLabel: "広報", icon: "✦", unlock: 3 },
    qa: { x: 68, y: 55, label: "品質スキャナ", shortLabel: "品質", icon: "✓", unlock: 3 },
    support: { x: 51, y: 53, label: "サポート席", shortLabel: "支援", icon: "♡", unlock: 4 },
    crisis: { x: 86, y: 53, label: "危機対応室", shortLabel: "危機", icon: "!", unlock: 4 }
  };

  function getOfficeWorkerPosition(workerId, assignment, slotIndex, idleIndex) {
    if (assignment && OFFICE_TASK_ZONES[assignment.task.id]) {
      const zone = OFFICE_TASK_ZONES[assignment.task.id];
      return { x: zone.x + (slotIndex ? 7 : -2), y: zone.y + (slotIndex ? 1 : 0) };
    }
    if (workerId === "boss") return { x: 50, y: 76 };
    const idlePositions = [{ x: 40, y: 82 }, { x: 57, y: 82 }, { x: 34, y: 62 }, { x: 62, y: 65 }, { x: 76, y: 64 }, { x: 23, y: 68 }];
    return idlePositions[idleIndex % idlePositions.length];
  }

  function getOfficeWorkerHtml(workerId, index, position, zoneSlot) {
    const character = context.CHARACTER_ASSETS[workerId] || {};
    const assignment = getOfficeWorkerAssignment(workerId);
    const label = character.label || context.getWorkerLabel(workerId);
    const detail = assignment ? assignment.definition.name + "の" + assignment.task.label + "を担当中" : "待機中。タップして仕事を割り振る";
    const src = character.officeSrc || character.src || "";
    const workerState = getOfficeWorkerState(workerId, assignment);
    const dialogue = getOfficeWorkerDialogue(workerId, assignment);
    const selected = context.dashboardUi.officeWorkerSelected === workerId;
    return '<button type="button" class="office-worker' + (selected ? ' selected' : '') + '" data-office-worker="' + context.escapeHtml(workerId) + '" data-task="' + context.escapeHtml(assignment ? assignment.task.id : "idle") + '" data-worker-state="' + context.escapeHtml(workerState) + '" data-zone-slot="' + zoneSlot + '" style="--worker-index:' + index + ';--worker-x:' + position.x + '%;--worker-y:' + position.y + '%" aria-pressed="' + String(selected) + '" aria-label="' + context.escapeHtml(label + "、" + detail + "。" + dialogue) + '"><span class="office-speech" aria-hidden="true">' + context.escapeHtml(dialogue) + '</span><span class="office-work-effect" aria-hidden="true"><i></i><b>' + context.escapeHtml(assignment ? getOfficeTaskSymbol(assignment.task.id) : "☕") + '</b></span><span class="office-worker-fallback" aria-hidden="true">' + context.escapeHtml(character.shortLabel || "AI") + '</span>' + (src ? '<img data-office-character-image src="' + context.escapeHtml(src + "?v=" + context.APP_ASSET_TOKEN) + '" alt="" width="512" height="768" decoding="async">' : '') + '<span class="office-worker-status"><span aria-hidden="true">' + context.escapeHtml(assignment ? getOfficeTaskSymbol(assignment.task.id) : "☕") + '</span> ' + context.escapeHtml(assignment ? assignment.task.label : "待機") + '</span></button>';
  }

  function getOfficeEquipmentHtml(officeLevel) {
    return Object.keys(OFFICE_TASK_ZONES).map(function (taskId) {
      const zone = OFFICE_TASK_ZONES[taskId];
      const locked = officeLevel < zone.unlock;
      return '<button type="button" class="office-zone zone-' + taskId + (locked ? ' locked' : '') + '" data-office-zone="' + taskId + '" data-zone-label="' + context.escapeHtml(zone.shortLabel) + '" style="--zone-x:' + zone.x + '%;--zone-y:' + zone.y + '%"' + (locked ? ' disabled' : '') + ' aria-label="' + context.escapeHtml(zone.label + (locked ? '、会社Lv' + zone.unlock + 'で解放' : 'を操作')) + '"><b aria-hidden="true">' + zone.icon + '</b><span>' + context.escapeHtml(zone.label) + '</span>' + (locked ? '<small>Lv' + zone.unlock + '</small>' : '') + '</button>';
    }).join("");
  }

  function handleOfficeZoneAction(taskId) {
    const task = context.TASKS.find(function (item) { return item.id === taskId; });
    if (!task) return;
    const assignedDefinition = context.PRODUCTS.find(function (definition) { return context.getProductAssignment(taskId, definition.id).aiIds.length > 0; });
    const target = assignedDefinition || context.PRODUCTS.find(function (definition) { return context.canAssignTaskToProduct(taskId, definition.id); }) || context.getPrimaryProductDefinition();
    if (!target || !context.canAssignTaskToProduct(taskId, target.id)) {
      context.navigateToPage("products", { updateHistory: true, scrollTop: true });
      context.focusMainContent();
      return;
    }
    const product = context.getProduct(target.id);
    const mode = taskId === "development" && product.upgradeStatus === "upgrading" ? "upgrade" : "normal";
    context.openProductAssignmentModal(taskId, target.id, mode);
  }

  function renderOfficeWorkerInspector() {
    const panel = document.getElementById("officeWorkerInspector");
    if (!panel) return;
    const workerId = context.dashboardUi.officeWorkerSelected;
    const hired = workerId === "boss" || context.EMPLOYEES.some(function (employee) { return employee.id === workerId && (context.state.employees[employee.id] || 0) > 0; });
    if (!workerId || !hired) { panel.hidden = true; panel.innerHTML = ""; return; }
    const character = context.CHARACTER_ASSETS[workerId] || {};
    const assignment = getOfficeWorkerAssignment(workerId);
    const label = character.label || context.getWorkerLabel(workerId);
    const taskLine = assignment ? assignment.definition.name + " / " + assignment.task.label : "待機中 / 新しい指令を待っています";
    panel.hidden = false;
    panel.innerHTML = '<button type="button" class="office-inspector-close" data-office-inspector-close aria-label="社員詳細を閉じる">×</button>' + context.getCharacterAvatarHtml(workerId, "office-inspector-avatar", false) + '<div class="office-inspector-copy"><span>SELECTED AI</span><strong>' + context.escapeHtml(label) + '</strong><p>' + context.escapeHtml(taskLine) + '</p><small>' + context.escapeHtml(getOfficeWorkerDialogue(workerId, assignment)) + '</small></div><button type="button" class="office-inspector-assign" data-office-inspector-assign="' + context.escapeHtml(workerId) + '">担当を変更</button>';
    context.activateCharacterImageFallbacks(panel);
    const closeButton = panel.querySelector("[data-office-inspector-close]");
    if (closeButton) closeButton.addEventListener("click", function () { context.dashboardUi.officeWorkerSelected = ""; renderOffice(); });
    const assignButton = panel.querySelector("[data-office-inspector-assign]");
    if (assignButton) assignButton.addEventListener("click", function () { context.openWorkerAssignmentModal(workerId); });
  }

  function activateOfficeImageFallbacks(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll("img[data-office-character-image]").forEach(function (image) {
      function showFallback() { image.hidden = true; if (image.parentElement) image.parentElement.classList.add("image-failed"); }
      image.addEventListener("error", showFallback, { once: true });
      if (image.complete && image.naturalWidth === 0) showFallback();
    });
  }

  function renderOffice() {
    const officePanel = document.getElementById("officePanel");
    const officeName = document.getElementById("officeName");
    const officeMood = document.getElementById("officeMood");
    if (!officePanel || !officeName || !officeMood) return;
    const officeLevel = getOfficeLevel();
    const officeNames = ["仮想ワンルーム", "ミニスタートアップ空間", "自動化オフィス", "クラウド企業フロア", "AI企業タワー"];
    const level = context.state.companyLevel;
    officeName.textContent = officeNames[officeLevel - 1];
    context.setText("officeCompanyLevel", officeLevel);
    const officeStage = document.getElementById("officeStage");
    if (officeStage && typeof officeStage.setAttribute === "function") officeStage.setAttribute("data-office-level", String(officeLevel));
    const bugLevel = context.getDashboardBugLevel();
    officeMood.textContent = bugLevel >= 70 && context.state.fire >= 70 ? "警告灯が会議室より多く点灯しています。" : context.state.fire >= 60 ? "広報チャンネルが高温話題化しています。" : bugLevel >= 60 ? "未分類機能が廊下を歩いています。" : level >= 5 ? "全フロアが自律稼働中。停止ボタンは申請制です。" : level >= 3 ? "自動化が進み、誰が何を自動化したか不明です。" : level >= 2 ? "人員は少ないですが、全員が24時間います。" : "起業直後。まだクラウド代の方が重いです。";
    officePanel.classList.toggle("alert", bugLevel >= 65 || context.state.fire >= 65);
    const background = document.getElementById("officeBackground");
    if (background && typeof background.getAttribute === "function") {
      const nextSrc = "assets/office/backgrounds/office-level-" + officeLevel + ".webp?v=" + context.APP_ASSET_TOKEN;
      if (background.getAttribute("src") !== nextSrc) { background.hidden = false; background.setAttribute("src", nextSrc); }
      background.onerror = function () { background.hidden = true; officePanel.classList.add("office-background-failed"); };
      background.onload = function () { background.hidden = false; officePanel.classList.remove("office-background-failed"); };
    }
    const decor = document.getElementById("officeDecor");
    if (decor) {
      decor.innerHTML = getOfficeEquipmentHtml(officeLevel);
      if (typeof decor.setAttribute === "function") decor.setAttribute("data-office-level", String(officeLevel));
      decor.querySelectorAll("button[data-office-zone]").forEach(function (button) { button.addEventListener("click", function () { handleOfficeZoneAction(button.getAttribute("data-office-zone")); }); });
    }
    const hiredWorkerIds = ["boss"].concat(context.EMPLOYEES.filter(function (employee) { return (context.state.employees[employee.id] || 0) > 0; }).map(function (employee) { return employee.id; }));
    const workers = document.getElementById("officeWorkers");
    if (workers) {
      const workerSignature = hiredWorkerIds.map(function (workerId) {
        const assignment = getOfficeWorkerAssignment(workerId);
        const latest = context.state.logs.find(function (log) { return log.employeeId === workerId || (workerId === "boss" && log.employeeId === "company"); });
        return workerId + ":" + (assignment ? assignment.task.id + ":" + assignment.definition.id + ":" + assignment.mode : "idle") + ":" + getOfficeWorkerState(workerId, assignment) + ":" + (latest ? String(latest.id || latest.createdAt || "") + ":" + latest.text : "");
      }).join("|") + "|selected:" + context.dashboardUi.officeWorkerSelected;
      const canTrackSignature = typeof workers.getAttribute === "function" && typeof workers.setAttribute === "function";
      if (!canTrackSignature || workers.getAttribute("data-office-signature") !== workerSignature) {
        if (canTrackSignature) {
          workers.setAttribute("data-worker-count", String(hiredWorkerIds.length));
          workers.setAttribute("data-office-signature", workerSignature);
        }
        const taskSlots = {};
        let idleIndex = 0;
        workers.innerHTML = hiredWorkerIds.map(function (workerId, index) {
          const assignment = getOfficeWorkerAssignment(workerId);
          const taskId = assignment ? assignment.task.id : "idle";
          const slot = taskSlots[taskId] || 0;
          taskSlots[taskId] = slot + 1;
          const position = getOfficeWorkerPosition(workerId, assignment, slot, idleIndex);
          if (!assignment && workerId !== "boss") idleIndex += 1;
          return getOfficeWorkerHtml(workerId, index, position, slot);
        }).join("");
        workers.querySelectorAll("button[data-office-worker]").forEach(function (button) { button.addEventListener("click", function () { context.dashboardUi.officeWorkerSelected = button.getAttribute("data-office-worker"); renderOffice(); }); });
        activateOfficeImageFallbacks(workers);
      }
    }
    renderOfficeWorkerInspector();
    const workingCount = hiredWorkerIds.filter(function (workerId) { return Boolean(getOfficeWorkerAssignment(workerId)); }).length;
    const summary = document.getElementById("officeSummary");
    const summaryText = "稼働中 " + workingCount + "体 / 待機中 " + (hiredWorkerIds.length - workingCount) + "体。キャラクターをタップすると担当を変更できます。";
    if (summary && summary.textContent !== summaryText) summary.textContent = summaryText;
    const decisionHotspot = document.getElementById("officeDecisionHotspot");
    if (decisionHotspot) decisionHotspot.hidden = !context.state.pendingDecisionEvent;
  }

  // === Rendering: Employees ===
    return { getOfficeLevel, getOfficeWorkerAssignment, getOfficeTaskSymbol, getOfficeWorkerState, getOfficeWorkerDialogue, getOfficeWorkerPosition, getOfficeWorkerHtml, getOfficeEquipmentHtml, handleOfficeZoneAction, renderOfficeWorkerInspector, activateOfficeImageFallbacks, renderOffice };
  };
})();
