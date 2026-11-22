"use strict";

window.AIBS_CREATE_INSIGHTS_RENDERER = function (options) {
  const settings = options && typeof options === "object" ? options : {};
  const escapeHtml = settings.escapeHtml;
  const formatNumber = settings.formatNumber;
  const getCharacterAvatarHtml = typeof settings.getCharacterAvatarHtml === "function" ? settings.getCharacterAvatarHtml : function () { return ""; };

  function sparkline(history, key, label, color, fixedMax, unit) {
    const values = history.map(function (point) { return Math.max(0, Number(point[key]) || 0); });
    const max = Math.max(Number(fixedMax) || 0, 1, values.reduce(function (best, value) { return Math.max(best, value); }, 0));
    const points = values.map(function (value, index) {
      const x = values.length <= 1 ? 0 : index * 100 / (values.length - 1);
      const y = 38 - value / max * 34;
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    const latest = values.length ? values[values.length - 1] : 0;
    const delta = latest - (values[0] || 0);
    const suffix = unit || "";
    const change = (delta > 0 ? "+" : "") + formatNumber(delta) + suffix;
    const firstTime = history.length ? Number(history[0].t) : 0;
    const lastTime = history.length ? Number(history[history.length - 1].t) : 0;
    const range = Number.isFinite(firstTime) && Number.isFinite(lastTime) && (history.length <= 1 || lastTime > firstTime) ? "直近" + Math.max(0, lastTime - firstTime) + "秒" : history.length + "サンプル";
    return '<article class="metric-chart"><div><strong>' + escapeHtml(label) + '</strong><span>' + escapeHtml(formatNumber(latest) + suffix) + '</span></div>' +
      '<svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="' + escapeHtml(label + "の直近推移。現在" + formatNumber(latest)) + '">' +
      '<line x1="0" y1="38" x2="100" y2="38" class="chart-baseline"></line>' +
      (points ? '<polyline points="' + points + '" fill="none" stroke="' + color + '" vector-effect="non-scaling-stroke"></polyline>' : '') +
      '</svg><span class="chart-caption">' + escapeHtml(range + ' / 変化 ' + change + ' / 縦軸 0〜' + formatNumber(max) + suffix) + '</span></article>';
  }

  function getHistoryHtml(history) {
    const source = Array.isArray(history) ? history : [];
    return '<div class="section-heading"><h2>経営推移</h2><span>10秒ごと・最大20分</span></div>' +
      '<div class="metric-chart-grid">' +
      sparkline(source, "mrr", "総MRR", "#65d8ff", 0, "円/月") +
      sparkline(source, "customers", "総顧客", "#70eebd", 0, "社") +
      sparkline(source, "bugs", "最大製品バグ", "#ffca55", 100, "/100") +
      sparkline(source, "fire", "全社炎上", "#ff8897", 100, "/100") +
      sparkline(source, "productFire", "最大製品炎上", "#c6a8ff", 100, "/100") +
      '</div><p class="dashboard-summary">グラフは端末内の保存データだけで生成され、外部送信されません。</p>';
  }

  function getStrategyHtml(strategies, selectedId, synergies, relationships) {
    const current = strategies.find(function (s) { return s.id === selectedId; }) || strategies[0];
    const labels = { development: "開発", qa: "品質管理", sales: "販売", marketing: "広報", support: "支援", crisis: "炎上対応", bugGeneration: "バグ発生", fireGeneration: "炎上発生", churnPressure: "解約圧力" };
    const strategyButtons = strategies.map(function (strategy) {
      const selected = strategy.id === selectedId;
      const comparison = Object.keys(labels).map(function (key) {
        const previous = Number(current.modifiers[key]) || 1, next = Number(strategy.modifiers[key]) || 1;
        const change = Math.round((next / previous - 1) * 100);
        return change ? labels[key] + (change > 0 ? "+" : "") + change + "%" : "";
      }).filter(Boolean).join(" / ");
      return '<button type="button" class="strategy-option' + (selected ? ' selected' : '') + '" data-strategy-id="' + escapeHtml(strategy.id) + '" aria-pressed="' + selected + '"><strong>' + escapeHtml(strategy.label) + '</strong><span>' + escapeHtml(strategy.description) + '</span>' + (selected ? '<small>現在の方針</small>' : '<small>現在からの変化: ' + escapeHtml(comparison || '基準効果は同じ') + '</small>') + '</button>';
    }).join("");
    const synergyHtml = synergies.length ? synergies.map(function (item) {
      return '<li><strong>連携中</strong> ' + escapeHtml(item.label) + ' — ' + escapeHtml(item.description) + '</li>';
    }).join("") : '<li>販売中の製品を増やすと製品間連携が解放されます。</li>';
    const relationshipHtml = relationships.length ? relationships.map(function (item) {
      const portraits = (Array.isArray(item.workers) ? item.workers : []).map(function (workerId) { return getCharacterAvatarHtml(workerId, "relationship-character-avatar", false); }).join("");
      return '<li class="relationship-bonus"><span class="relationship-avatars" aria-hidden="true">' + portraits + '</span><span><strong>共同作業</strong> ' + escapeHtml(item.label) + ' — ' + escapeHtml(item.description) + '</span></li>';
    }).join("") : '<li>相性のあるAIを同じ製品の別タスクへ配置すると共同効果が発生します。</li>';
    return '<div class="section-heading"><h2>会社方針</h2><span>いつでも変更可能</span></div>' +
      '<div class="strategy-grid" role="group" aria-label="会社方針を選択">' + strategyButtons + '</div>' +
      '<details class="operations-bonuses synergy-summary"><summary>現在の連携効果</summary><ul>' + synergyHtml + relationshipHtml + '</ul></details>';
  }

  function getBusinessUnitsHtml(evaluations, products, enabled) {
    const definitions = Array.isArray(products) ? products : [];
    const units = Array.isArray(evaluations) ? evaluations : [];
    const cards = units.map(function (unit) {
      const productNames = unit.productIds.map(function (id) {
        const definition = definitions.find(function (product) { return product.id === id; });
        return definition ? definition.name : id;
      });
      const metrics = unit.metrics || {};
      const bonus = Math.round((Number(unit.bonus) || 0) * 100);
      return '<article class="business-unit-card">' +
        '<div class="business-unit-heading"><div><span class="section-kicker">BUSINESS UNIT</span><h3>' + escapeHtml(unit.name) + '</h3></div><strong class="business-unit-grade grade-' + escapeHtml(unit.grade) + '">' + escapeHtml(unit.grade) + '</strong></div>' +
        '<p>' + escapeHtml(unit.description) + '</p>' +
        '<div class="business-unit-score"><strong>' + escapeHtml(String(unit.score)) + '<small> / 100</small></strong><span>' + (enabled ? '業務効率 +' + bonus + '%' : '第二創業解放後にボーナス適用') + '</span></div>' +
        '<div class="business-unit-metrics">' +
        '<span>売上 <b>' + escapeHtml(String(metrics.sales || 0)) + '</b></span>' +
        '<span>品質 <b>' + escapeHtml(String(metrics.quality || 0)) + '</b></span>' +
        '<span>顧客満足度 <b>' + escapeHtml(String(metrics.satisfaction || 0)) + '</b></span>' +
        '<span>炎上安全度 <b>' + escapeHtml(String(metrics.fireSafety || 0)) + '</b></span>' +
        '</div><p class="business-unit-products">担当製品：' + escapeHtml(productNames.join(' / ')) + '</p></article>';
    }).join('');
    return '<section class="business-units-panel"><div class="section-heading"><h2>事業部評価</h2><span>' + (enabled ? '第二創業・稼働中' : '第二創業解放後に有効') + '</span></div>' +
      '<p class="dashboard-summary">売上40%・品質20%・顧客満足度20%・炎上安全度20%で評価。B: +3% / A: +6% / S: +10%の業務効率ボーナス。</p>' +
      '<div class="business-unit-grid">' + cards + '</div></section>';
  }

  return { getHistoryHtml: getHistoryHtml, getStrategyHtml: getStrategyHtml, getBusinessUnitsHtml: getBusinessUnitsHtml };
};
