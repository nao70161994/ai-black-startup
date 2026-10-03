"use strict";

// Presentation preferences and feedback live outside the schema-3 gameplay save.
window.AIBS_CREATE_EXPERIENCE_RENDERER = function (c) {
  const preferenceKey = "ai_black_startup_focus_product";
  let pinned = c.STORAGE.getItem(preferenceKey) || "";
  let returnReward = null;
  const milestones = new Set();
  const e = c.escapeHtml;
  function getFocusProductDefinition() {
    const pin = c.PRODUCTS.find(function (d) { return d.id === pinned; });
    if (pin) return pin;
    const subscriptions = c.PRODUCTS.filter(function (d) { return d.type === "subscription" && c.getProductMrr(c.getProduct(d.id), d) > 0; });
    if (subscriptions.length) return subscriptions.sort(function (a, b) { return c.getProductMrr(c.getProduct(b.id), b) - c.getProductMrr(c.getProduct(a.id), a); })[0];
    return c.PRODUCTS.find(function (d) { return c.getProduct(d.id).status === "developing"; }) || c.PRODUCTS.find(function (d) { return c.getProduct(d.id).status !== "idea"; }) || c.PRODUCTS[0];
  }
  function getFocusPickerHtml() {
    const subscriptions = c.PRODUCTS.filter(function (d) { return d.type === "subscription"; }).sort(function (a, b) { return c.getProductMrr(c.getProduct(b.id), b) - c.getProductMrr(c.getProduct(a.id), a); });
    const hits = c.PRODUCTS.filter(function (d) { return d.type === "oneShot"; }).sort(function (a, b) { return (c.getProduct(b.id).lifetimeRevenue || 0) - (c.getProduct(a.id).lifetimeRevenue || 0); });
    const top = subscriptions[0], hit = hits[0];
    return '<label class="focus-picker">注力製品を固定<select id="focusProductSelect"><option value="">自動：月額収入トップ／開発中</option>' + c.PRODUCTS.map(function (d) { return '<option value="' + d.id + '"' + (d.id === pinned ? ' selected' : '') + '>' + e(d.name) + '</option>'; }).join('') + '</select></label><details class="product-leaders"><summary>収益別のトップ製品</summary><p>月額収入トップ: ' + e(top.name) + ' ' + e(c.formatCurrency(c.getProductMrr(c.getProduct(top.id), top))) + '/月</p><p>累計ベストセラー: ' + e(hit.name) + ' ' + e(c.formatCurrency(c.getProduct(hit.id).lifetimeRevenue || 0)) + '</p><p>月額収入はゲーム内で' + c.monthSeconds + '秒＝1か月として収入へ換算します。売り切り累計とは別の指標です。</p></details>';
  }
  function bindFocusPicker(panel) {
    const select = document.getElementById('focusProductSelect');
    if (select) select.addEventListener('change', function () {
      if (c.readOnly) return;
      pinned = c.PRODUCTS.some(function (d) { return d.id === select.value; }) ? select.value : '';
      c.STORAGE.setItem(preferenceKey, pinned);
      c.renderPrimaryProductPanel(); c.renderProductPanel();
      const next = document.getElementById('focusProductSelect');
      if (next && next.focus) next.focus();
      c.showAppToast(pinned ? '注力製品を固定しました' : '注力製品を自動選択にしました', 'success');
    });
  }
  function getProductAction(d) {
    const p = c.getProduct(d.id);
    if (p.status === 'idea') return { label: '開発を始める', taskId: 'development' };
    const options = [
      ['crisis', c.getProductFire(p) >= 60 || c.state.fire >= 70, '炎上対応の担当を決める'],
      ['support', d.type === 'subscription' && (p.churnRisk >= 45 || p.supportLoad >= 50), 'サポート担当を決める'],
      ['qa', p.bugs >= 45 || p.quality <= 45, '品質管理の担当を決める'],
      ['development', p.status === 'developing' || p.upgradeStatus === 'upgrading', c.getAssignedWorkersForProduct('development', d.id).length ? '開発担当を確認する' : '開発担当を決める'],
      ['sales', !c.getAssignedWorkersForProduct('sales', d.id).length, '販売担当を決める'],
      ['marketing', p.awareness < 50, '広報担当を決める'],
      ['qa', p.bugs >= 25 || p.quality < 70, '品質管理の担当を決める']
    ];
    const action = options.find(function (o) { return o[1] && c.canAssignTaskToProduct(o[0], d.id); });
    return action ? { taskId: action[0], label: action[2] } : { label: '稼働状況を確認する', detail: true };
  }
  function runProductAction(d) {
    const action = getProductAction(d);
    if (action.detail) c.openProductDetailModal(d.id);
    else c.openProductAssignmentModal(action.taskId, d.id, c.getProduct(d.id).upgradeStatus === 'upgrading' && action.taskId === 'development' ? 'upgrade' : 'normal');
  }
  function getProgressHtml(d) {
    const p = c.getProduct(d.id), upgrade = p.upgradeStatus === 'upgrading';
    if (p.status !== 'developing' && !upgrade) return '';
    const percent = upgrade ? Math.min(100, Math.max(0, Number(p.upgradeProgress) || 0)) : c.getProductProgressPercent(p, d);
    return '<div class="focus-progress"><span>' + (upgrade ? '改良' : '開発') + ' ' + Math.floor(percent) + '% · ' + (c.getAssignedWorkersForProduct('development', d.id).length ? '担当AIが作業中' : '担当が必要です') + '</span><progress max="100" value="' + percent + '" aria-label="' + e(d.name) + 'の進捗"></progress></div>';
  }
  function getAssignmentImpactHtml(draft) {
    const target = c.getProductDefinition(draft.productId);
    const task = c.TASKS.find(function (t) { return t.id === draft.taskId; });
    const selected = draft.aiIds || [], current = c.getProductAssignment(draft.taskId, draft.productId).aiIds;
    const changes = [];
    selected.forEach(function (worker) {
      c.TASKS.forEach(function (t) { c.PRODUCTS.forEach(function (d) {
        if (t.id === draft.taskId && d.id === draft.productId) return;
        const old = c.getProductAssignment(t.id, d.id).aiIds;
        if (old.indexOf(worker) >= 0) {
          const remaining = old.filter(function (id) { return selected.indexOf(id) < 0; });
          changes.push(c.getWorkerLabel(worker) + 'を移動 → ' + d.name + 'の' + t.label + (remaining.length ? 'は' + remaining.map(c.getWorkerLabel).join('・') + 'が継続' : 'は担当不在になります'));
        }
      }); });
    });
    current.filter(function (id) { return selected.indexOf(id) < 0; }).forEach(function (id) { changes.push(c.getWorkerLabel(id) + 'はこの担当から外れ、待機します'); });
    return '<section class="assignment-impact" aria-label="担当変更の結果"><strong>決定後の状態</strong><p>' + e(target.name + ' / ' + (task ? task.label : '') + '：' + (selected.length ? selected.map(c.getWorkerLabel).join('・') : '担当なし')) + '</p>' + (changes.length ? '<ul>' + changes.map(function (x) { return '<li>' + e(x) + '</li>'; }).join('') + '</ul>' : '<p>ほかの仕事の担当は変わりません。</p>') + '</section>';
  }
  function getEmployeeComparisonHtml(id) {
    const lv = c.state.employees[id] || 0;
    const before = lv ? c.getEmployeeEffectPreview(id, lv) : null, after = c.getEmployeeEffectPreview(id, lv + 1);
    const number = function (v) { return Number(v.toFixed(2)); };
    return '<div class="employee-effect-comparison"><strong>' + e(after.label) + '</strong><span>' + (lv >= 10 ? '最大Lv · ' + number(before.value) : (before ? number(before.value) : '未採用') + ' → ' + number(after.value)) + e(after.unit) + '</span><small>基準効果。定期判定は' + c.effectSeconds + '秒ごと。方針・連携・製品相性で変動します。</small></div>';
  }
  function renderBoard() {
    const panel = document.getElementById('businessSummary'); if (!panel) return;
    const history = c.state.metricHistory || [], first = history[0], last = history[history.length - 1];
    const delta = first ? c.getTotalProductCustomers() - first.customers : 0;
    const danger = Math.max(c.state.fire, c.getDashboardBugLevel(), ...c.PRODUCTS.map(function (d) { const p = c.getProduct(d.id); return Math.max(c.getProductFire(p), d.type === 'subscription' ? p.churnRisk : 0, p.status !== 'idea' ? 100 - p.quality : 0); }));
    const rec = c.getNextRecommendation();
    panel.innerHTML = '<h2>会社の状態</h2><div class="business-kpis"><article><span>成長</span><strong>' + c.getTotalProductCustomers() + '社</strong><small>最初の記録から ' + (delta > 0 ? '+' : '') + delta + '社</small></article><article><span>収入</span><strong>' + e(c.formatCurrency(c.getRates().money)) + '/秒</strong><small>月額収入 ' + e(c.formatCurrency(c.getTotalProductMrr())) + '</small></article><article class="' + (danger >= 60 ? 'risk-high' : '') + '"><span>危険</span><strong>' + (danger >= 80 ? '緊急' : danger >= 50 ? '要確認' : '安定') + '</strong><small>最大リスク ' + Math.round(danger) + '/100</small></article></div><p class="board-next">' + e(rec.text || rec.message || '') + '</p><p>' + e(c.getCompanyGoal()) + '</p><details><summary>収入と期間の読み方</summary><p>月額収入（MRR）は継続契約の規模。ゲーム内では' + c.monthSeconds + '秒で1か月分へ換算します。毎秒収入は現在の計算値で、販売・解約・事故により変わります。成長の増減は最初の記録から現在までです。</p></details>';
  }
  function setReturnReward(value) { returnReward = value; }
  function renderReturnSummary() {
    const panel = document.getElementById('returnSummary'); if (!panel) return;
    if (!returnReward) { panel.hidden = true; return; }
    // Stable across ticks: do not steal focus or rebuild the dismiss button.
    if (!panel.hidden && panel.firstChild) return;
    panel.hidden = false;
    const r = returnReward, active = c.TASKS.reduce(function (set, t) { c.PRODUCTS.forEach(function (d) { c.getProductAssignment(t.id, d.id).aiIds.forEach(function (id) { set.add(id); }); }); return set; }, new Set()).size;
    const rec = c.getNextRecommendation();
    panel.innerHTML = '<div><strong>おかえりなさい</strong><p>不在 ' + Math.floor(r.absence / 60000) + '分 · 収益 +' + e(c.formatCurrency(r.reward)) + '</p><small>収益対象 ' + Math.floor(r.elapsed / 60000) + '分（上限2時間）。現在' + active + '体が担当中。開発進捗は不在中には進みません。</small><p>' + e(rec.text || rec.message || '') + '</p></div><button type="button" id="dismissReturnSummary">確認しました</button>';
    document.getElementById('dismissReturnSummary').addEventListener('click', function () { returnReward = null; panel.hidden = true; });
  }
  function dateText(timestamp) { return timestamp > 0 ? new Date(timestamp).toLocaleString('ja-JP', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' }) : '未保存'; }
  function renderSaveSummary(slots) {
    const summary = document.getElementById('saveSummary'), cards = document.getElementById('saveSlotCards');
    if (summary) {
      let primary = null;
      try { const raw = c.STORAGE.getItem(c.SAVE_RUNTIME.saveKey); primary = raw ? c.SAVE_RUNTIME.parse(raw).data : null; } catch (_) { /* Read-only saves keep their original data. */ }
      let source = null, sourceLabel = 'なし';
      for (const entry of [[c.SAVE_RUNTIME.checkpointKey, '読込・初期化前のチェックポイント'], [c.SAVE_RUNTIME.backupKey, '直前の正常な保存']]) {
        try { const raw = c.STORAGE.getItem(entry[0]); if (raw) { source = c.SAVE_RUNTIME.parse(raw).data; sourceLabel = entry[1]; break; } } catch (_) { /* Try the fallback source. */ }
      }
      summary.innerHTML = '<strong>' + (c.readOnly ? '元のデータを保護中' : '自動保存：' + (primary ? dateText(primary.lastSavedAt) : 'まだ保存されていません')) + '</strong><p>復元元：' + e(sourceLabel) + (source ? ' · ' + e(dateText(source.lastSavedAt)) + ' · 会社Lv' + source.companyLevel : '') + '</p>';
    }
    if (cards) {
      const select = document.getElementById('saveSlotSelect');
      cards.innerHTML = slots.map(function (slot) { return '<button type="button" class="save-slot-card' + (select && select.value === slot.id ? ' selected' : '') + '" aria-pressed="' + String(Boolean(select && select.value === slot.id)) + '" data-save-slot="' + slot.id + '"><strong>スロット' + slot.id + '</strong><span>' + (slot.invalid ? '読み込めないデータ' : slot.occupied ? '会社Lv' + slot.companyLevel : '空き') + '</span><small>' + e(slot.occupied && !slot.invalid ? dateText(slot.lastSavedAt) : '節目を保存できます') + '</small></button>'; }).join('');
      cards.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { if (c.readOnly) return; select.value = b.getAttribute('data-save-slot'); renderSaveSummary(slots); const next = cards.querySelector ? cards.querySelector('[data-save-slot="' + select.value + '"]') : null; if (next) next.focus(); }); });
    }
  }
  function renderJourney() {
    const node = document.getElementById('journeyStatus'); if (!node) return;
    const d = getFocusProductDefinition(), p = c.getProduct(d.id);
    const hasRevenue = c.PRODUCTS.some(function (item) { const product = c.getProduct(item.id); return product.customers > 0 || product.unitsSold > 0; });
    const hired = c.EMPLOYEES.some(function (item) { return c.state.employees[item.id] > 0; });
    const text = hasRevenue ? c.getCompanyGoal() : !hired ? '最初の目標：仲間を採用 → 開発 → 完成 → 初売上' : p.status === 'idea' ? d.name + '：開発担当を決めて着手しましょう' : p.status === 'developing' ? d.name + '：開発 ' + Math.floor(c.getProductProgressPercent(p, d)) + '% · ' + (c.getAssignedWorkersForProduct('development', d.id).length ? '作業中' : '担当待ち') : d.name + '：完成！販売担当を決めて初売上へ';
    if (node.textContent !== text) node.textContent = text;
  }

  function observeLog(type, text, employeeId) {
    if (type !== 'success' && type !== 'system') return;
    const match = /(?:開発を開始|完成しました|雇用しました|初.*(?:顧客|販売)|初売上)/.exec(text);
    if (!match) return;
    const key = (employeeId || '') + match[0]; if (milestones.has(key)) return;
    milestones.add(key); c.showAppToast(text, 'success');
  }
  return { getFocusProductDefinition, getFocusPickerHtml, bindFocusPicker, getProductAction, runProductAction, getProgressHtml, getAssignmentImpactHtml, getEmployeeComparisonHtml, renderBoard, renderJourney, setReturnReward, renderReturnSummary, renderSaveSummary, observeLog };
};
