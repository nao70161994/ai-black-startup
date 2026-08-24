"use strict";

window.AIBS_CREATE_RISK_RENDERER = function (options) {
  const settings = options && typeof options === "object" ? options : {};
  const safeNumber = settings.safeNumber;
  const getProductFire = settings.getProductFire;
  const escapeHtml = settings.escapeHtml;

  function getRiskLevel(value, warningThreshold, dangerThreshold, inverse) {
    const number = safeNumber(value, 0);
    if (inverse) {
      if (number <= dangerThreshold) return "danger";
      if (number <= warningThreshold) return "warning";
      return "normal";
    }
    if (number >= dangerThreshold) return "danger";
    if (number >= warningThreshold) return "warning";
    return "normal";
  }

  function createRiskChip(type, label, value, recommendation, level) {
    return { type: type, label: label, value: Math.round(safeNumber(value, 0)), recommendation: recommendation || "", level: level || "warning" };
  }

  function getProductRiskChips(product, definition, options) {
    const chipSettings = Object.assign({ includeNormal: false, compact: false }, options || {});
    const chips = [];
    if (product.status === "idea") return [];
    const productFire = getProductFire(product);
    const productFireLevel = getRiskLevel(productFire, 50, 75);
    if (chipSettings.includeNormal || productFireLevel !== "normal") chips.push(createRiskChip("product-fire", productFireLevel === "danger" ? "製品炎上 高" : "製品炎上 注意", productFire, "炎上対応推奨", productFireLevel));
    if (definition.type === "subscription") {
      const churnLevel = getRiskLevel(product.churnRisk, 45, 70);
      const supportLevel = getRiskLevel(product.supportLoad, 50, 80);
      if (chipSettings.includeNormal || churnLevel !== "normal") chips.push(createRiskChip("churn", churnLevel === "danger" ? "解約リスク 高" : "解約リスク 注意", product.churnRisk, "サポート推奨", churnLevel));
      if (chipSettings.includeNormal || supportLevel !== "normal") chips.push(createRiskChip("support", supportLevel === "danger" ? "サポート負荷 高" : "サポート負荷 注意", product.supportLoad, "サポート推奨", supportLevel));
    }
    const bugsLevel = getRiskLevel(product.bugs, 35, 65);
    if (chipSettings.includeNormal || bugsLevel !== "normal") chips.push(createRiskChip("bugs", bugsLevel === "danger" ? "バグ多め" : "バグ注意", product.bugs, "品質管理推奨", bugsLevel));
    const qualityLevel = getRiskLevel(product.quality, 60, 40, true);
    if (chipSettings.includeNormal || qualityLevel !== "normal") chips.push(createRiskChip("quality", qualityLevel === "danger" ? "品質低下" : "品質注意", product.quality, "品質管理推奨", qualityLevel));
    chips.sort(function (a, b) {
      const levelScore = { danger: 2, warning: 1, normal: 0 };
      const levelDiff = (levelScore[b.level] || 0) - (levelScore[a.level] || 0);
      if (levelDiff) return levelDiff;
      const aUrgency = a.type === "quality" ? 100 - safeNumber(a.value, 0) : safeNumber(a.value, 0);
      const bUrgency = b.type === "quality" ? 100 - safeNumber(b.value, 0) : safeNumber(b.value, 0);
      return bUrgency - aUrgency;
    });
    return chipSettings.compact ? chips.slice(0, 3) : chips;
  }

  function getRiskChipHtml(chip) {
    const text = chip.label + (chip.value || chip.value === 0 ? " " + chip.value : "") + (chip.recommendation ? " / " + chip.recommendation : "");
    const symbol = chip.level === "danger" ? "⛔" : (chip.level === "warning" ? "⚠" : "●");
    return '<span class="risk-chip risk-chip-' + escapeHtml(chip.type) + ' risk-chip-' + escapeHtml(chip.level) + '" aria-label="' + escapeHtml(text) + '"><span class="risk-chip-symbol" aria-hidden="true">' + symbol + '</span>' + escapeHtml(text) + '</span>';
  }

  function getProductRiskChipsHtml(product, definition, options) {
    const chips = getProductRiskChips(product, definition, options);
    return chips.length ? '<div class="risk-chip-list product-risk-chip-list">' + chips.map(getRiskChipHtml).join('') + '</div>' : '';
  }

  function getGlobalFireRiskChipHtmlForProduct(product, globalFire) {
    if (product.status === "idea" || safeNumber(globalFire, 0) < 60) return '';
    return '<span class="risk-chip risk-chip-global-fire risk-chip-warning" aria-label="全社炎上 注意 / 炎上対応推奨"><span class="risk-chip-symbol" aria-hidden="true">⚠</span>全社炎上 注意 / 炎上対応推奨</span>';
  }

  return {
    getProductRiskChips: getProductRiskChips,
    getProductRiskChipsHtml: getProductRiskChipsHtml,
    getGlobalFireRiskChipHtmlForProduct: getGlobalFireRiskChipHtmlForProduct
  };
};
