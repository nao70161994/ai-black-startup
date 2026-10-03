(function () {
  "use strict";
  // Live context getters keep reset/imported saves visible to every render.
  window.AIBS_CREATE_PRODUCTS_RENDERER = function (context) {
  function renderPrimaryProductPanel() {
    const panel = document.getElementById("primaryProductPanel");
    if (!panel) return;
    const definition = context.getPrimaryProductDefinition();
    const product = context.getProduct(definition.id);
    panel.innerHTML = '<div class="section-heading"><h2>現在の主力製品</h2><span>' + context.escapeHtml(context.getPrimaryProductValueText(product, definition)) + '</span></div>' +
      '<article class="primary-product-card"><div><strong>' + context.escapeHtml(context.getPrimaryProductTitle(product, definition)) + '</strong><span>' + context.escapeHtml(context.getPrimaryProductSummary(product, definition)) + '</span>' + context.getPrimaryProductRiskHtml(product, definition) + '<em>おすすめ: ' + context.escapeHtml(context.getPrimaryProductRecommendation(product, definition)) + '</em></div><div class="assignment-badge-list">' + context.getProductAssignmentBadges(definition.id) + '</div><div class="primary-product-actions"><button type="button" class="product-action-button" data-primary-product-menu="' + definition.id + '">操作メニューへ</button><button type="button" class="product-action-button product-detail-button" data-primary-product-detail="' + definition.id + '">詳細</button></div></article>';
    panel.querySelectorAll("button[data-primary-product-menu]").forEach(function (button) {
      button.addEventListener("click", function () { context.openProductActionMenu(button.getAttribute("data-primary-product-menu")); });
    });
    panel.querySelectorAll("button[data-primary-product-detail]").forEach(function (button) {
      button.addEventListener("click", function () { context.openProductDetailModal(button.getAttribute("data-primary-product-detail")); });
    });
  }

  function renderProductPanel() {
    const panel = document.getElementById("productPanel");
    if (!panel) return;
    const body = context.dashboardUi.productsExpanded ? '<div class="portfolio-products">' + context.PRODUCTS.map(function (definition) { return getProductCardHtml(definition); }).join('') + '</div>' : getProductPortfolioPreviewHtml();
    panel.innerHTML = '<div class="section-heading"><div><span class="section-kicker">PRODUCT LINE</span><h2>製品ポートフォリオ</h2></div><button type="button" id="toggleProductsButton" class="change-assignment-button">' + (context.dashboardUi.productsExpanded ? '製品一覧を閉じる' : '製品一覧を開く') + '</button></div>' +
      '<p class="dashboard-summary">' + context.PRODUCTS.length + '製品運用 / 総MRR ' + context.formatCurrency(context.getTotalProductMrr()) + '/月 / 売り切り累計 ' + context.formatCurrency(context.getTotalOneShotRevenue()) + '</p>' + body;
    const toggle = document.getElementById("toggleProductsButton");
    if (toggle) toggle.addEventListener("click", function () { context.toggleDashboardPanel("productsExpanded"); });
    panel.querySelectorAll("button[data-product-detail]").forEach(function (button) {
      button.addEventListener("click", function () { context.openProductDetailModal(button.getAttribute("data-product-detail")); });
    });
    panel.querySelectorAll("button[data-product-menu]").forEach(function (button) {
      button.addEventListener("click", function () { context.openProductActionMenu(button.getAttribute("data-product-menu")); });
    });
  }

  function getProductPortfolioPreviewHtml() {
    const primaryId = context.getPrimaryProductDefinition().id;
    const statusIcons = { idea: "01", developing: "02", ready: "03", selling: "LIVE" };
    return '<div class="product-portfolio-preview" aria-label="製品ラインの稼働状況">' + context.PRODUCTS.map(function (definition, index) {
      const product = context.getProduct(definition.id);
      const progress = product.status === "idea" ? 0 : (product.status === "developing" ? context.clamp(product.progress, 0, 100) : 100);
      const value = definition.type === "subscription" ? context.formatCurrency(context.getProductMrr(product, definition)) + "/月" : context.formatCurrency(context.safeNumber(product.lifetimeRevenue, 0));
      return '<button type="button" class="portfolio-preview-item status-' + product.status + (definition.id === primaryId ? ' is-primary' : '') + '" data-product-detail="' + definition.id + '">' +
        '<span class="portfolio-preview-index" aria-hidden="true">0' + (index + 1) + (definition.id === primaryId ? ' · 主力' : '') + '</span>' +
        '<span class="portfolio-preview-icon" aria-hidden="true">' + (statusIcons[product.status] || "01") + '</span>' +
        '<span class="portfolio-preview-copy"><strong>' + context.escapeHtml(definition.name) + '</strong><small>' + context.escapeHtml(context.getProductStatusLabel(product.status)) + ' · ' + context.escapeHtml(value) + '</small></span>' +
        '<span class="portfolio-preview-progress" aria-hidden="true"><i style="width:' + progress + '%"></i></span>' +
      '</button>';
    }).join("") + '</div>';
  }

  function getProductCardHtml(definition) {
    const product = context.getProduct(definition.id);
    const progressPercent = product.upgradeStatus === "upgrading" ? context.clamp(product.upgradeProgress, 0, 100) : context.getProductProgressPercent(product, definition);
    const shouldShowProgress = product.status === "developing" || product.upgradeStatus === "upgrading";
    return '<article class="product-card product-' + product.status + '">' +
      '<div class="product-top"><div><strong>' + context.escapeHtml(context.getProductDisplayName(product, definition)) + '</strong><span>' + context.escapeHtml(context.getProductTypeLine(definition, product)) + '</span></div><div class="level-badge">' + context.getProductStatusLabel(product.status) + '</div></div>' +
      (shouldShowProgress ? '<div class="product-progress"><span style="width:' + progressPercent + '%"></span></div>' : '') +
      '<div class="product-metrics product-summary-metrics">' + context.getProductSummaryMetrics(product, definition, progressPercent) + '</div>' +
      context.getProductActionHint(product, definition) +
      context.getProductActionButtons(product, definition) +
      '</article>';
  }


    return { renderPrimaryProductPanel, renderProductPanel, getProductPortfolioPreviewHtml, getProductCardHtml };
  };
})();
