"use strict";

// UI rendering reads live state; actions remain in the application controller.
window.AIBS_CREATE_CREW_RENDERER = function (context) {
function renderEmployees() {
    const panel = document.getElementById("employeePanel");
    if (!panel) return;
    const roster = context.dashboardUi.employeesExpanded ? "" : getTeamRosterPreviewHtml();
    panel.innerHTML = '<div class="section-heading"><div><span class="section-kicker">AI CREW</span><h2>AI社員</h2></div><button type="button" id="toggleEmployeesButton" class="change-assignment-button">' + (context.dashboardUi.employeesExpanded ? '採用・強化を閉じる' : '採用・強化を見る') + '</button></div>' +
      roster +
      '<p class="dashboard-summary">雇用済み: ' + context.escapeHtml(context.getHiredEmployeeSummary()) + '</p>' +
      '<div class="employee-list" id="employeeList">' + (context.dashboardUi.employeesExpanded ? getEmployeeCardsHtml() : '') + '</div>';
    const toggle = document.getElementById("toggleEmployeesButton");
    if (toggle) toggle.addEventListener("click", function () { context.toggleDashboardPanel("employeesExpanded"); });
    const list = document.getElementById("employeeList");
    if (list) list.querySelectorAll("button[data-employee-id]").forEach(function (button) { button.addEventListener("click", function () { context.hireOrUpgradeEmployee(button.getAttribute("data-employee-id")); }); });
    if (list) list.querySelectorAll("button[data-worker-assign]").forEach(function (button) { button.addEventListener("click", function () { context.openWorkerAssignmentModal(button.getAttribute("data-worker-assign")); }); });
    panel.querySelectorAll("button[data-roster-worker]").forEach(function (button) { button.addEventListener("click", function () { context.openWorkerAssignmentModal(button.getAttribute("data-roster-worker")); }); });
    panel.querySelectorAll("button[data-roster-hire]").forEach(function (button) { button.addEventListener("click", function () { context.dashboardUi.employeesExpanded = true; renderEmployees(); context.scrollToElement("employeeList"); }); });
    context.activateCharacterImageFallbacks(panel);
  }

function getTeamRosterPreviewHtml() {
    const boss = '<button type="button" class="team-roster-member hired featured" data-roster-worker="boss">' + context.getCharacterAvatarHtml("boss", "team-roster-avatar", true) + '<span class="roster-member-copy"><strong>AI社長</strong><small>COMMAND / 常駐</small><span class="roster-task">' + context.escapeHtml(context.getWorkerAssignmentSummary("boss")) + '</span></span><i aria-hidden="true">編成</i></button>';
    const members = context.EMPLOYEES.map(function (employee) {
      const level = context.state.employees[employee.id] || 0;
      const locked = !context.canUnlockEmployee(employee.id);
      const status = locked ? "locked" : (level > 0 ? "hired" : "available");
      const statusLabel = locked ? "会社Lv" + employee.unlockLevel + "で解放" : (level > 0 ? employee.role + " / Lv" + level : employee.role + " / 採用可能");
      const actionAttribute = locked ? " disabled" : (level > 0 ? ' data-roster-worker="' + employee.id + '"' : ' data-roster-hire="' + employee.id + '"');
      return '<button type="button" class="team-roster-member ' + status + '"' + actionAttribute + '>' + context.getCharacterAvatarHtml(employee.id, "team-roster-avatar", true) + '<span class="roster-member-copy"><strong>' + context.escapeHtml(employee.code) + '</strong><small>' + context.escapeHtml(statusLabel) + '</small><span class="roster-task">' + context.escapeHtml(level > 0 ? context.getWorkerAssignmentSummary(employee.id) : '未配置') + '</span></span><i aria-hidden="true">' + (locked ? "LOCK" : (level > 0 ? "編成" : "採用")) + '</i></button>';
    }).join("");
    return '<div class="team-roster-preview" aria-label="AI社員の在籍状況">' + boss + members + '</div>';
  }

function getEmployeeCardsHtml() {
    return getBossWorkerCardHtml() + context.EMPLOYEES.map(function (employee) {
      const level = context.state.employees[employee.id] || 0;
      const locked = !context.canUnlockEmployee(employee.id);
      const maxed = level >= context.MAX_LEVEL;
      const cost = context.getEmployeeCost(employee.id);
      const startupCredit = context.isStartupCreditAvailable(employee.id);
      const action = level === 0 ? "雇用" : "強化";
      const recommended = startupCredit && (employee.id === "dev01" || employee.id === "sales02");
      const profileHtml = getEmployeePipelineProfileHtml(employee.id);
      if (locked) return '<article class="employee-card locked compact-locked"><div class="employee-top">' + context.getCharacterAvatarHtml(employee.id, "employee-character-avatar", true) + '<div class="employee-name"><strong>' + context.escapeHtml(employee.code) + ' / ' + context.escapeHtml(employee.nickname) + '</strong><span>' + context.escapeHtml(employee.role) + '</span></div><div class="level-badge">Lv ' + employee.unlockLevel + '</div></div>' + profileHtml + '<span class="lock-note">会社Lv' + employee.unlockLevel + 'で解放</span><div class="employee-action"><button type="button" class="worker-assign-button" disabled>仕事を割り振る</button></div></article>';
      if (level === 0) {
        return '<article class="employee-card compact-unhired' + (recommended ? ' recommended' : '') + '"><div class="employee-top">' + context.getCharacterAvatarHtml(employee.id, "employee-character-avatar", true) + '<div class="employee-name"><strong>' + context.escapeHtml(employee.code) + ' / ' + context.escapeHtml(employee.nickname) + '</strong><span>' + context.escapeHtml(employee.role) + '</span></div><div class="level-badge">未雇用</div></div>' + profileHtml + '<div class="employee-action"><span class="cost-line">' + (startupCredit ? '初回創業クレジット: ¥0' : '雇用コスト: ' + context.formatCurrency(cost)) + '</span><button type="button" data-employee-id="' + employee.id + '">' + (startupCredit ? '雇用 ¥0' : '雇用 ' + context.formatCurrency(cost)) + '</button><button type="button" class="worker-assign-button" disabled>仕事を割り振る</button>' + (startupCredit ? '<span class="startup-note">最初の1体だけ無料です。</span>' : '') + '</div></article>';
      }
      return '<article class="employee-card hired"><div class="employee-top">' + context.getCharacterAvatarHtml(employee.id, "employee-character-avatar", true) + '<div class="employee-name"><strong>' + context.escapeHtml(employee.code) + ' / ' + context.escapeHtml(employee.nickname) + '</strong><span>' + context.escapeHtml(employee.role) + '</span></div><div class="level-badge">Lv ' + level + '</div></div>' + profileHtml + '<div class="quote compact-quote">「' + context.escapeHtml(employee.catchphrase) + '」</div><div class="employee-action"><span class="cost-line">' + action + 'コスト: ' + context.formatCurrency(cost) + '</span><button type="button" data-employee-id="' + employee.id + '"' + (maxed ? ' disabled' : '') + '>' + (maxed ? '最大Lv' : action + ' ' + context.formatCurrency(cost)) + '</button><button type="button" class="worker-assign-button" data-worker-assign="' + employee.id + '">仕事を割り振る</button></div></article>';
    }).join("");
  }

function getBossWorkerCardHtml() {
    return '<article class="employee-card hired boss-worker-card"><div class="employee-top">' + context.getCharacterAvatarHtml("boss", "employee-character-avatar", true) + '<div class="employee-name"><strong>AI社長</strong><span>初期担当AI</span></div><div class="level-badge">常駐</div></div>' + getEmployeePipelineProfileHtml("boss") + '<div class="employee-action"><button type="button" class="worker-assign-button" data-worker-assign="boss">仕事を割り振る</button></div></article>';
  }

function getWorkerRelationshipSummary(workerId) {
    const relationships = context.AI_RELATIONSHIPS.filter(function (relationship) { return relationship.workers.indexOf(workerId) >= 0; });
    return relationships.length ? relationships.map(function (relationship) { return relationship.label + "（" + relationship.workers.filter(function (id) { return id !== workerId; }).map(context.getWorkerLabel).join("・") + "）"; }).join(" / ") : "全員の仕事を補助";
  }

function getEmployeePipelineProfileHtml(workerId) {
    const profile = context.WORKER_TASK_PROFILES[workerId] || { specialty: "補助", description: "製品タスクを補助します。", levelHint: "Lvアップで担当効果UP" };
    const employee = context.getEmployee(workerId);
    const personality = employee ? employee.personality : "会社全体を見ながら、空いている仕事を静かに引き受ける。";
    return '<details class="employee-task-profile"><summary><span class="employee-specialty">得意: ' + context.escapeHtml(profile.specialty) + '</span><span>プロフィールを見る</span></summary><p class="employee-desc">' + context.escapeHtml(profile.description) + '</p><p class="employee-personality"><strong>性格</strong> ' + context.escapeHtml(personality) + '</p><p class="employee-affinity"><strong>相性</strong> ' + context.escapeHtml(getWorkerRelationshipSummary(workerId)) + '</p><span class="employee-level-hint">' + context.escapeHtml(profile.levelHint) + '</span><span class="employee-current-task">現在担当: ' + context.escapeHtml(context.getWorkerAssignmentSummary(workerId)) + '</span></details>';
  }

  return { renderEmployees, getTeamRosterPreviewHtml, getEmployeeCardsHtml, getBossWorkerCardHtml, getWorkerRelationshipSummary, getEmployeePipelineProfileHtml };
};
