"use strict";

window.AIBS_CREATE_INSIGHTS_RENDERER = function (options) {
  const settings = options && typeof options === "object" ? options : {};
  const escapeHtml = settings.escapeHtml;
  const formatNumber = settings.formatNumber;
  const getCharacterAvatarHtml = typeof settings.getCharacterAvatarHtml === "function" ? settings.getCharacterAvatarHtml : function () { return ""; };

  function sparkline(history, key, label, color, fixedMax) {
    const values = history.map(function (point) { return Math.max(0, Number(point[key]) || 0); });
    const max = Math.max(Number(fixedMax) || 0, 1, values.reduce(function (best, value) { return Math.max(best, value); }, 0));
    const points = values.map(function (value, index) {
      const x = values.length <= 1 ? 0 : index * 100 / (values.length - 1);
      const y = 38 - value / max * 34;
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    const latest = values.length ? values[values.length - 1] : 0;
    return '<article class="metric-chart"><div><strong>' + escapeHtml(label) + '</strong><span>' + escapeHtml(formatNumber(latest)) + '</span></div>' +
      '<svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="' + escapeHtml(label + "の直近推移。現在" + formatNumber(latest)) + '">' +
      '<line x1="0" y1="38" x2="100" y2="38" class="chart-baseline"></line>' +
      (points ? '<polyline points="' + points + '" fill="none" stroke="' + color + '" vector-effect="non-scaling-stroke"></polyline>' : '') +
      '</svg></article>';
  }

  function getHistoryHtml(history) {
    const source = Array.isArray(history) ? history : [];
    return '<div class="section-heading"><h2>経営推移</h2><span>10秒ごと・直近20分</span></div>' +
      '<div class="metric-chart-grid">' +
      sparkline(source, "mrr", "総MRR", "#006f8b") +
      sparkline(source, "customers", "総顧客", "#247a3c") +
      sparkline(source, "bugs", "最大製品バグ", "#9b4d00", 100) +
      sparkline(source, "fire", "全社炎上", "#b3261e", 100) +
      sparkline(source, "productFire", "最大製品炎上", "#7d2a8a", 100) +
      '</div><p class="dashboard-summary">グラフは端末内の保存データだけで生成され、外部送信されません。</p>';
  }

  function getStrategyHtml(strategies, selectedId, synergies, relationships) {
    const strategyButtons = strategies.map(function (strategy) {
      const selected = strategy.id === selectedId;
      return '<button type="button" class="strategy-option' + (selected ? ' selected' : '') + '" data-strategy-id="' + escapeHtml(strategy.id) + '" aria-pressed="' + selected + '"><strong>' + escapeHtml(strategy.label) + '</strong><span>' + escapeHtml(strategy.description) + '</span></button>';
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
      '<div class="operations-bonuses"><h3>現在の連携効果</h3><ul>' + synergyHtml + relationshipHtml + '</ul></div>';
  }

  return { getHistoryHtml: getHistoryHtml, getStrategyHtml: getStrategyHtml };
};
