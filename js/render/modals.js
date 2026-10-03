"use strict";

// UI rendering reads live state; actions remain in the application controller.
window.AIBS_CREATE_MODAL_RENDERER = function (context) {
function renderAssignmentModalContent() {
    const modal = document.getElementById("assignmentModal");
    if (!modal) return;
    modal.hidden = !context.assignmentModalOpen;
    modal.classList.toggle("open", context.assignmentModalOpen);
    if (!context.assignmentModalOpen) { modal.innerHTML = ""; context.syncModalIsolation(); return; }
    const selectedTask = context.TASKS.find(function (task) { return task.id === context.assignmentDraft.taskId; }) || context.TASKS[0];
    const simpleMode = context.assignmentModalMode === "product";
    const employeeMode = context.assignmentModalMode === "employee";
    const upgradeMode = context.assignmentDraft.mode === "upgrade";
    const productAssignable = context.isAssignmentDraftProductAvailable();
    const selectedAssignment = context.getProductAssignment(selectedTask.id, context.assignmentDraft.productId);
    const currentAiIds = selectedAssignment.aiIds;
    const selectedAiIds = context.normalizeAssignmentDraftAiIds(selectedTask.id, context.assignmentDraft.aiIds || []);
    const selectionValid = selectedAiIds.length > 0 && selectedAiIds.length <= 2 && selectedAiIds.every(function (workerId) { return context.canWorkerAssignToTask(workerId, selectedTask.id, context.state.employees); });
    const assignable = Boolean(context.assignmentDraft.taskId && context.assignmentDraft.productId) && productAssignable && selectionValid;
    const taskOptions = employeeMode ? context.getAssignableTasksForWorker(context.assignmentDraft.aiId) : context.TASKS;
    const productButtons = context.PRODUCTS.map(function (definition) {
      const enabled = employeeMode ? context.isWorkerProductTaskAvailable(context.assignmentDraft.aiId, context.assignmentDraft.taskId, definition.id) : context.canAssignTaskToProduct(context.assignmentDraft.taskId, definition.id);
      const reason = enabled ? "" : context.getWorkerProductTaskDisabledReason(context.assignmentDraft.aiId, context.assignmentDraft.taskId, definition.id);
      return '<button type="button" class="modal-option' + (context.assignmentDraft.productId === definition.id ? ' active' : '') + '" data-modal-product="' + definition.id + '"' + (enabled ? '' : ' disabled') + '>' + context.escapeHtml(definition.name) + (reason ? '<span>' + context.escapeHtml(reason) + '</span>' : '') + '</button>';
    }).join('');
    const workerButtons = context.getAllWorkerIds().map(function (workerId) {
      const selected = selectedAiIds.indexOf(workerId) !== -1;
      const taskCompatible = selectedTask.workers.indexOf(workerId) !== -1;
      const available = context.isWorkerAvailable(workerId, context.state.employees);
      const canAssign = taskCompatible && available;
      const maxReached = selectedAiIds.length >= context.MAX_AI_PER_TASK_PRODUCT && !selected;
      const enabled = selected || (productAssignable && canAssign && !maxReached);
      let detail = context.getWorkerTaskDescription(workerId, selectedTask.id);
      if (!taskCompatible) detail = "対応不可";
      else if (!available) detail = workerId === "boss" ? "利用可能" : "未雇用";
      else if (selected) detail += " / 選択済み";
      else if (maxReached) detail += " / この仕事は満員です（最大2体まで）";
      return '<button type="button" class="modal-option worker-option' + (selected ? ' active' : '') + (taskCompatible ? '' : ' incompatible') + '" data-modal-ai="' + workerId + '"' + (enabled ? '' : ' disabled') + '><strong>' + context.escapeHtml(context.getWorkerLabel(workerId)) + (selected ? ' 選択中' : '') + '</strong><span>' + context.escapeHtml(detail) + '</span></button>';
    }).join('');
    const currentWorkersHtml = '<div class="modal-current">現在担当: ' + context.escapeHtml(context.getWorkerGroupLabel(currentAiIds) || 'なし') + '</div>' +
      '<div class="modal-current selected-workers">選択中: ' + context.escapeHtml(context.getWorkerGroupLabel(selectedAiIds) || 'なし') + '（' + selectedAiIds.length + '/2）</div>';
    const workerSelector = currentWorkersHtml + '<div class="modal-group"><span>担当AIを選択 最大2体</span><div class="modal-option-grid worker-grid">' + workerButtons + '</div></div>';
    const noTaskMessage = employeeMode && taskOptions.length === 0 ? '<p class="modal-warning">このAIに割り振れるタスクは現在ありません。</p>' : '';
    const warningText = !productAssignable ? 'この製品では選択中のタスクを使えません。' : (!selectionValid ? (selectedAiIds.length === 0 ? '担当AIを1体以上選んでください。' : '選択中AIに担当できないAIが含まれています。') : '');
    modal.innerHTML = '<div class="assignment-modal-backdrop" data-modal-close="1"></div><div class="assignment-dialog" aria-labelledby="assignmentDialogTitle">' +
      '<div class="assignment-dialog-head"><strong id="assignmentDialogTitle">' + context.escapeHtml(context.getAssignmentModalTitle()) + '</strong><button type="button" class="modal-close-button" data-modal-close="1">閉じる</button></div>' +
      '<p class="modal-description">' + context.escapeHtml(context.getAssignmentModalDescription(upgradeMode, simpleMode, employeeMode)) + '</p>' +
      noTaskMessage +
      (simpleMode ? '' : '<div class="modal-group"><span>タスク選択</span><div class="modal-option-grid">' + taskOptions.map(function (task) { return '<button type="button" class="modal-option' + (context.assignmentDraft.taskId === task.id ? ' active' : '') + '" data-modal-task="' + task.id + '">' + context.escapeHtml(task.label) + '</button>'; }).join('') + '</div></div>') +
      (simpleMode ? '' : '<div class="modal-group"><span>対象製品選択</span><div class="modal-option-grid">' + productButtons + '</div></div>') +
      workerSelector +
      '<div class="modal-current">対象: ' + context.escapeHtml(selectedTask.label) + ' / ' + context.escapeHtml(context.getProductDefinition(context.assignmentDraft.productId).name) + '</div>' +
      '<p class="modal-help">この仕事には最大2体までAIを割り振れます。2体選択中は他のAIを選べません。同じAIは別の仕事から外れます。</p>' +
      (warningText ? '<p class="modal-warning">' + context.escapeHtml(warningText) + '</p>' : '') +
      context.EXPERIENCE.getAssignmentImpactHtml(context.assignmentDraft) + '<div class="modal-actions"><button type="button" id="applyAssignmentButton" class="modal-apply-button"' + (assignable ? '' : ' disabled') + '>この担当にする</button><button type="button" id="clearAssignmentButton" class="modal-subtle-button modal-clear-button">担当を解除</button><button type="button" class="modal-subtle-button" data-modal-close="1">閉じる</button></div>' +
      '</div>';
    modal.querySelectorAll("[data-modal-close]").forEach(function (button) { button.addEventListener("click", context.closeAssignmentModal); });
    modal.querySelectorAll("button[data-modal-task]").forEach(function (button) { button.addEventListener("click", function () { context.selectAssignmentTask(button.getAttribute("data-modal-task")); }); });
    modal.querySelectorAll("button[data-modal-product]").forEach(function (button) { button.addEventListener("click", function () { context.assignmentDraft.productId = button.getAttribute("data-modal-product"); context.updateAssignmentDraftMode(); context.refreshAssignmentDraftAiIds(); context.renderAssignmentModal(); }); });
    modal.querySelectorAll("button[data-modal-ai]").forEach(function (button) { button.addEventListener("click", function () { context.toggleAssignmentDraftAi(button.getAttribute("data-modal-ai")); }); });
    const applyButton = document.getElementById("applyAssignmentButton");
    if (applyButton) applyButton.addEventListener("click", function () { context.setTaskAis(context.assignmentDraft.taskId, context.assignmentDraft.productId, context.normalizeAssignmentDraftAiIds(context.assignmentDraft.taskId, context.assignmentDraft.aiIds || []), context.assignmentDraft.mode); context.closeAssignmentModal(); });
    const clearButton = document.getElementById("clearAssignmentButton");
    if (clearButton) clearButton.addEventListener("click", function () { context.clearProductAssignment(context.assignmentDraft.taskId, context.assignmentDraft.productId); context.closeAssignmentModal(); });
  }

function renderProductDetailModalContent() {
    const modal = document.getElementById("productDetailModal");
    if (!modal) return;
    modal.hidden = !context.productDetailModalOpen;
    modal.classList.toggle("open", context.productDetailModalOpen);
    if (!context.productDetailModalOpen) { modal.innerHTML = ""; context.syncModalIsolation(); return; }
    const definition = context.getProductDefinition(context.productDetailProductId);
    const product = context.getProduct(definition.id);
    const progressPercent = context.getProductProgressPercent(product, definition);
    modal.innerHTML = '<div class="assignment-modal-backdrop product-detail-backdrop" data-product-detail-close="1"></div><div class="product-detail-dialog" aria-labelledby="productDetailTitle">' +
      '<div class="assignment-dialog-head"><strong id="productDetailTitle">' + context.escapeHtml(definition.name) + 'の詳細</strong><button type="button" class="modal-close-button" data-product-detail-close="1">閉じる</button></div>' +
      '<div class="product-detail-status"><span>' + context.escapeHtml(context.getProductTypeLine(definition, product)) + ' / ' + context.escapeHtml(context.getProductCategoryLabel(definition)) + '</span><strong>' + context.escapeHtml(context.getProductStatusLabel(product.status)) + '</strong></div>' +
      '<div class="product-detail-grid">' +
      getProductSpecificDetailHtml(product, definition) +
      '<span class="product-detail-heading">品質</span>' +
      '<span class="product-detail-item">進捗 <strong>' + Math.floor(progressPercent) + '%</strong></span>' +
      '<span class="product-detail-item">品質 <strong>' + Math.round(product.quality) + '</strong></span>' +
      '<span class="product-detail-item">製品バグ <strong>' + product.bugs.toFixed(1) + '</strong></span>' +
      '<span class="product-detail-item">認知度 <strong>' + Math.round(product.awareness) + '</strong></span>' +
      '<span class="product-detail-heading">担当</span>' +
      '<span class="product-detail-item wide">担当中タスク <strong class="assignment-badge-list">' + context.getProductAssignmentBadges(definition.id) + '</strong></span>' +
      '<span class="product-detail-item wide">最新状態 <strong>' + context.escapeHtml(getProductLatestStateText(product, definition)) + '</strong></span>' +
      '</div>' +
      '<div class="product-detail-actions"><button type="button" class="product-action-button" data-product-menu="' + definition.id + '">操作メニューへ</button><button type="button" class="modal-subtle-button" data-product-detail-close="1">閉じる</button></div>' +
      '</div>';
    modal.querySelectorAll("[data-product-detail-close]").forEach(function (button) { button.addEventListener("click", context.closeProductDetailModal); });
    modal.querySelectorAll("button[data-product-menu]").forEach(function (button) {
      button.addEventListener("click", function () {
        context.closeProductDetailModal();
        context.openProductActionMenu(button.getAttribute("data-product-menu"));
      });
    });
  }

function getProductRiskDetailHtml(product, definition) {
    const chipsHtml = context.getProductRiskChipsHtml(product, definition, { compact: false });
    return '<div class="product-detail-item wide product-risk-detail"><span>運用リスク</span>' + (chipsHtml || '<span class="risk-chip risk-chip-muted">平常</span>') + '</div>';
  }

function getProductSpecificDetailHtml(product, definition) {
    if (definition.type === "oneShot") {
      return '<span class="product-detail-heading">収益</span>' +
        '<span class="product-detail-item">価格 <strong>' + context.formatCurrency(definition.price) + '</strong></span>' +
        '<span class="product-detail-item">販売数 <strong>' + context.getProductUnitsSold(product) + '本</strong></span>' +
        '<span class="product-detail-item">累計売上 <strong>' + context.formatCurrency(product.lifetimeRevenue) + '</strong></span>' +
        '<span class="product-detail-item">MRR <strong>なし</strong></span>' +
        '<span class="product-detail-heading">運用</span>' +
        getProductRiskDetailHtml(product, definition) +
        '<span class="product-detail-item">製品炎上 <strong>' + Math.round(context.getProductFire(product)) + '</strong></span>' +
        '<span class="product-detail-item wide">売り切り収益 <strong>販売成功時に即時売上が入ります</strong></span>';
    }
    return '<span class="product-detail-heading">収益</span>' +
      '<span class="product-detail-item">現行版 <strong>v' + context.getProductVersion(product) + '</strong></span>' +
      '<span class="product-detail-item">次期版 <strong>' + context.escapeHtml(product.upgradeStatus === "upgrading" ? 'v' + (context.getProductVersion(product) + 1) + ' 開発中 ' + Math.floor(product.upgradeProgress) + '%' : '待機中') + '</strong></span>' +
      '<span class="product-detail-item">月額価格 <strong>' + context.formatCurrency(context.getCurrentMonthlyPrice(product, definition)) + '</strong></span>' +
      '<span class="product-detail-item">顧客数 <strong>' + context.formatCustomers(context.getProductCustomers(product)) + '</strong></span>' +
      '<span class="product-detail-item">MRR <strong>' + context.formatCurrency(context.getProductMrr(product, definition)) + '/月</strong></span>' +
      '<span class="product-detail-item">製品売上/秒 <strong>' + context.formatCurrencyPrecise(context.getProductRevenuePerSecond(product, definition)) + '/秒</strong></span>' +
      '<span class="product-detail-heading">運用</span>' +
      getProductRiskDetailHtml(product, definition) +
      '<span class="product-detail-item">製品炎上 <strong>' + Math.round(context.getProductFire(product)) + '</strong></span>' +
      '<span class="product-detail-item">満足度 <strong>' + Math.round(product.satisfaction) + '</strong></span>' +
      '<span class="product-detail-item">サポート負荷 <strong>' + Math.round(product.supportLoad) + '</strong></span>' +
      '<span class="product-detail-item">解約リスク <strong>' + Math.round(product.churnRisk) + '</strong></span>' +
      '<span class="product-detail-item wide">次期版の効果 <strong>月額価格+20%、品質+8、認知+5。副作用: 製品バグ+5</strong></span>';
  }

function getProductLatestStateText(product, definition) {
    if (definition.type === "oneShot") {
      if (product.status === "selling" && context.getAssignedWorkersForProduct("sales", definition.id).length) return "販売判定中";
      return context.getProductUnitsSold(product) > 0 ? "販売実績あり" : "販売担当待ち";
    }
    if (product.upgradeStatus === "upgrading") return "v" + (context.getProductVersion(product) + 1) + "を開発中です。";
    if (product.status === "selling" && context.getAssignedWorkersForProduct("sales", definition.id).length) return "顧客獲得判定中";
    if (context.getProductCustomers(product) > 0) return "既存顧客は継続課金中";
    return "販売担当待ち";
  }

function renderProductActionMenuModalContent() {
    const modal = document.getElementById("productActionMenuModal");
    if (!modal) return;
    modal.hidden = !context.productActionMenuOpen;
    modal.classList.toggle("open", context.productActionMenuOpen);
    if (!context.productActionMenuOpen) { modal.innerHTML = ""; context.syncModalIsolation(); return; }
    const definition = context.getProductDefinition(context.productActionMenuProductId);
    const product = context.getProduct(definition.id);
    const actions = context.getProductAvailableActions(product, definition);
    modal.innerHTML = '<div class="assignment-modal-backdrop product-action-menu-backdrop" data-product-menu-close="1"></div><div class="product-action-menu-dialog" aria-labelledby="productActionMenuTitle">' +
      '<div class="assignment-dialog-head"><strong id="productActionMenuTitle">' + context.escapeHtml(definition.name) + 'の操作</strong><button type="button" class="modal-close-button" data-product-menu-close="1">閉じる</button></div>' +
      '<p class="modal-description">操作を選ぶと、担当AI選択へ進みます。</p>' +
      renderProductActionMenuList(actions, definition.id) +
      '<div class="product-detail-actions"><button type="button" class="modal-subtle-button" data-product-detail="' + definition.id + '">詳細を見る</button><button type="button" class="modal-subtle-button" data-product-menu-close="1">閉じる</button></div>' +
      '</div>';
    modal.querySelectorAll("[data-product-menu-close]").forEach(function (button) { button.addEventListener("click", context.closeProductActionMenu); });
    modal.querySelectorAll("button[data-product-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        context.closeProductActionMenu();
        context.openProductAssignmentModal(button.getAttribute("data-product-action"), button.getAttribute("data-product-id"), button.getAttribute("data-product-mode") || "normal");
      });
    });
    modal.querySelectorAll("button[data-product-detail]").forEach(function (button) {
      button.addEventListener("click", function () {
        context.closeProductActionMenu();
        context.openProductDetailModal(button.getAttribute("data-product-detail"));
      });
    });
  }

function renderProductActionMenuList(actions, productId) {
    const groups = [
      { id: "growth", label: "成長" },
      { id: "revenue", label: "収益" },
      { id: "operations", label: "運用" }
    ];
    return '<div class="product-action-menu-list">' + groups.map(function (group) {
      const groupActions = actions.filter(function (action) { return action.category === group.id; });
      if (!groupActions.length) return '';
      return '<div class="product-action-menu-group"><span class="product-action-menu-heading">' + context.escapeHtml(group.label) + '</span>' + groupActions.map(function (action) {
        return '<button type="button" class="product-action-menu-button' + (action.enabled ? '' : ' disabled-action') + '" data-product-action="' + action.taskId + '" data-product-action-id="' + action.id + '" data-product-id="' + productId + '" data-product-mode="' + action.mode + '"' + (action.enabled ? '' : ' disabled') + '><strong>' + context.escapeHtml(action.label) + '</strong><span>' + context.escapeHtml(action.enabled ? action.description : action.disabledReason) + '</span></button>';
      }).join('') + '</div>';
    }).join('') + '</div>';
  }

  return { renderAssignmentModalContent, renderProductDetailModalContent, getProductRiskDetailHtml, getProductSpecificDetailHtml, getProductLatestStateText, renderProductActionMenuModalContent, renderProductActionMenuList };
};
