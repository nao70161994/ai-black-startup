"use strict";
window.AIBS_CREATE_ACHIEVEMENTS = function (api) {
  const PRODUCTS = api.PRODUCTS;
  const EMPLOYEES = api.EMPLOYEES;
  const TASKS = api.TASKS;
  const state = new Proxy({}, { get: function (_target, key) { return api.getState()[key]; } });
  const getProduct = api.getProduct;
  const getProductCustomers = api.getProductCustomers;
  const getTotalProductCustomers = api.getTotalProductCustomers;
  const getProductMrr = api.getProductMrr;
  const getProductDefinition = api.getProductDefinition;
  const getTotalProductMrr = api.getTotalProductMrr;
  const getProductUnitsSold = api.getProductUnitsSold;
  const getProductVersion = api.getProductVersion;
  const getProductFire = api.getProductFire;
  const getProductFlags = api.getProductFlags;
  const getAssignedWorkersForProduct = api.getAssignedWorkersForProduct;
  const getAssignedAiIds = api.getAssignedAiIds;
  const getProductCategory = api.getProductCategory;
  const safeNumber = api.safeNumber;
  // === Achievements ===
  const ACHIEVEMENTS = [
    { id: "first_customer", category: "顧客", title: "初顧客獲得", description: "いずれかのサブスク製品で顧客を1社獲得", done: function () { return getTotalProductCustomers() >= 1; } },
    { id: "customers_25", category: "顧客", title: "総顧客25社", description: "サブスク総顧客を25社まで伸ばす", done: function () { return getTotalProductCustomers() >= 25; } },
    { id: "customers_50", category: "顧客", title: "総顧客50社", description: "サブスク総顧客を50社まで伸ばす", done: function () { return getTotalProductCustomers() >= 50; } },
    { id: "customers_100", category: "顧客", title: "総顧客100社", description: "サブスク総顧客を100社まで伸ばす", done: function () { return getTotalProductCustomers() >= 100; } },
    { id: "total_mrr_10k", category: "経営", title: "MRR ¥10K/月", description: "総MRRを¥10K/月まで伸ばす", done: function () { return getTotalProductMrr() >= 10000; } },
    { id: "total_mrr_25k", category: "経営", title: "MRR ¥25K/月", description: "総MRRを¥25K/月まで伸ばす", done: function () { return getTotalProductMrr() >= 25000; } },
    { id: "total_mrr_50k", category: "経営", title: "MRR ¥50K/月", description: "総MRRを¥50K/月まで伸ばす", done: function () { return getTotalProductMrr() >= 50000; } },
    { id: "total_mrr_100k", category: "経営", title: "MRR ¥100K/月", description: "総MRRを¥100K/月まで伸ばす", done: function () { return getTotalProductMrr() >= 100000; } },
    { id: "total_mrr_500k", category: "経営", title: "MRR ¥500K/月", description: "総MRRを¥500K/月まで伸ばす", done: function () { return getTotalProductMrr() >= 500000; } },
    { id: "slide_10_sales", category: "製品", title: "売り切り10本", description: "AIスライド生成キットを10本販売", done: function () { return getProductUnitsSold(getProduct("slideKitAi")) >= 10; } },
    { id: "slide_100_sales", category: "製品", title: "売り切り100本", description: "AIスライド生成キットを100本販売", done: function () { return getProductUnitsSold(getProduct("slideKitAi")) >= 100; } },
    { id: "slide_500_sales", category: "製品", title: "売り切り500本", description: "AIスライド生成キットを500本販売", done: function () { return getProductUnitsSold(getProduct("slideKitAi")) >= 500; } },
    { id: "all_products_selling", category: "製品", title: "全製品販売開始", description: "全製品を販売中にする", done: function () { return PRODUCTS.every(function (definition) { return getProduct(definition.id).status === "selling"; }); } },
    { id: "first_v2", category: "製品", title: "初v2到達", description: "サブスク製品を初めてv2へアップデート", done: function () { return PRODUCTS.some(function (definition) { return definition.type === "subscription" && getProductVersion(getProduct(definition.id)) >= 2; }); } },
    { id: "version_3", category: "製品", title: "v3到達", description: "いずれかのサブスク製品をv3へ育てる", done: function () { return PRODUCTS.some(function (definition) { return definition.type === "subscription" && getProductVersion(getProduct(definition.id)) >= 3; }); } },
    { id: "version_5", category: "製品", title: "v5到達", description: "いずれかのサブスク製品をv5へ育てる", done: function () { return PRODUCTS.some(function (definition) { return definition.type === "subscription" && getProductVersion(getProduct(definition.id)) >= 5; }); } },
    { id: "version_10", category: "製品", title: "v10到達", description: "いずれかのサブスク製品をv10へ育てる", done: function () { return PRODUCTS.some(function (definition) { return definition.type === "subscription" && getProductVersion(getProduct(definition.id)) >= 10; }); } },
    { id: "version_20", category: "製品", title: "v20到達", description: "いずれかのサブスク製品をv20へ育てる", done: function () { return PRODUCTS.some(function (definition) { return definition.type === "subscription" && getProductVersion(getProduct(definition.id)) >= 20; }); } },
    { id: "first_churn", category: "トラブル", title: "初解約", description: "サブスク顧客が初めて解約", done: function () { return state.churnCount >= 1 || PRODUCTS.some(function (definition) { return definition.type === "subscription" && getProductFlags(definition.id).firstChurnLogged; }); } },
    { id: "churn_10", category: "トラブル", title: "解約10件", description: "累計10件の解約を経験する", done: function () { return state.churnCount >= 10; } },
    { id: "first_fire_50", category: "トラブル", title: "炎上50突破", description: "炎上度が50を超える", done: function () { return state.fire >= 50; } },
    { id: "fire_100", category: "トラブル", title: "炎上100", description: "炎上度が100に到達", done: function () { return state.fire >= 100; } },
    { id: "product_fire_50", category: "トラブル", title: "製品炎上50", description: "いずれかの製品炎上が50を超える", done: function () { return PRODUCTS.some(function (definition) { return getProductFire(getProduct(definition.id)) >= 50; }); } },
    { id: "fire05_first_crisis", category: "AI", title: "Fire-05初出動", description: "Fire-05を炎上対応に割り振る", done: function () { return PRODUCTS.some(function (definition) { return getAssignedWorkersForProduct("crisis", definition.id).indexOf("fire05") !== -1 || getProductFlags(definition.id).crisisStartedLogged; }); } },
    { id: "care04_first_support", category: "AI", title: "Care-04初サポート", description: "Care-04をサポートに割り振る", done: function () { return PRODUCTS.some(function (definition) { return getAssignedWorkersForProduct("support", definition.id).indexOf("care04") !== -1; }); } },
    { id: "all_ai_hired", category: "AI", title: "全AI雇用", description: "専門AIを全員雇用", done: function () { return EMPLOYEES.every(function (employee) { return (state.employees[employee.id] || 0) > 0; }); } },
    { id: "all_tasks_active", category: "AI", title: "全タスク稼働", description: "6種類のタスクすべてに担当AIを置く", done: function () { return TASKS.every(function (task) { return PRODUCTS.some(function (definition) { return getAssignedAiIds(task.id, definition.id).length > 0; }); }); } },
    { id: "manual_reward_claimed", category: "経営", title: "初報酬受け取り", description: "ミッション報酬を手動で受け取る", done: function () { return state.claimedMissions.length >= 1; } },
    { id: "manual_company_expansion", category: "経営", title: "初めての会社拡張", description: "会社を手動で拡張する", done: function () { return state.companyLevel >= 2; } },
    { id: "first_price_adjustment", category: "経営", title: "初めての価格改定", description: "サブスク製品の価格調整を行う", done: function () { return PRODUCTS.some(function (definition) { return definition.type === "subscription" && Math.abs(safeNumber(getProduct(definition.id).priceAdjustment, 0)) > 0; }); } },
    { id: "first_decision_approved", category: "社長判断", title: "初承認", description: "社長判断を初めて承認", done: function () { return safeNumber(state.decisionStats && state.decisionStats.approved, 0) >= 1; } },
    { id: "first_decision_rejected", category: "社長判断", title: "初却下", description: "社長判断を初めて却下", done: function () { return safeNumber(state.decisionStats && state.decisionStats.rejected, 0) >= 1; } },
    { id: "decisions_10", category: "社長判断", title: "社長判断10回", description: "承認/却下を合計10回選ぶ", done: function () { return safeNumber(state.decisionStats && state.decisionStats.approved, 0) + safeNumber(state.decisionStats && state.decisionStats.rejected, 0) >= 10; } },
    { id: "approvals_10", category: "社長判断", title: "承認10回", description: "社長判断を10回承認", done: function () { return safeNumber(state.decisionStats && state.decisionStats.approved, 0) >= 10; } },
    { id: "rejections_10", category: "社長判断", title: "却下10回", description: "社長判断を10回却下", done: function () { return safeNumber(state.decisionStats && state.decisionStats.rejected, 0) >= 10; } },
    { id: "total_mrr_1m", category: "経営", title: "MRR ¥1M/月", description: "総MRRを¥1M/月まで伸ばす", done: function () { return getTotalProductMrr() >= 1000000; } },
    { id: "customers_500", category: "顧客", title: "総顧客500社", description: "サブスク総顧客を500社まで伸ばす", done: function () { return getTotalProductCustomers() >= 500; } },
    { id: "slide_1000_sales", category: "製品", title: "売り切り1000本", description: "AIスライド生成キットを1000本販売", done: function () { return getProductUnitsSold(getProduct("slideKitAi")) >= 1000; } },
    { id: "all_products_v5", category: "製品", title: "全製品v5級", description: "すべてのサブスク製品をv5以上へ育てる", done: function () { return PRODUCTS.filter(function (definition) { return definition.type === "subscription"; }).every(function (definition) { return getProductVersion(getProduct(definition.id)) >= 5; }); } },
    { id: "decisions_50", category: "社長判断", title: "社長判断50回", description: "承認/却下を合計50回選ぶ", done: function () { return safeNumber(state.decisionStats && state.decisionStats.approved, 0) + safeNumber(state.decisionStats && state.decisionStats.rejected, 0) >= 50; } },
    { id: "approvals_25", category: "社長判断", title: "承認25回", description: "社長判断を25回承認", done: function () { return safeNumber(state.decisionStats && state.decisionStats.approved, 0) >= 25; } },
    { id: "rejections_25", category: "社長判断", title: "却下25回", description: "社長判断を25回却下", done: function () { return safeNumber(state.decisionStats && state.decisionStats.rejected, 0) >= 25; } },
    { id: "product_fire_80", category: "トラブル", title: "製品炎上80", description: "いずれかの製品炎上が80を超える", done: function () { return PRODUCTS.some(function (definition) { return getProductFire(getProduct(definition.id)) >= 80; }); } },
    { id: "all_ai_level_5", category: "AI", title: "全AI Lv5", description: "専門AIを全員Lv5以上にする", done: function () { return EMPLOYEES.every(function (employee) { return (state.employees[employee.id] || 0) >= 5; }); } },
    { id: "fire05_zero_fire", category: "トラブル", title: "Fire-05で鎮火", description: "Fire-05を使い、全社炎上と製品炎上を落ち着かせる", done: function () { return state.fire <= 0 && PRODUCTS.every(function (definition) { return getProductFire(getProduct(definition.id)) <= 20; }) && PRODUCTS.some(function (definition) { return getAssignedWorkersForProduct("crisis", definition.id).indexOf("fire05") !== -1 || getProductFlags(definition.id).crisisContainedLogged; }); } },
    { id: "care04_satisfaction_90", category: "AI", title: "満足度90", description: "サブスク製品の満足度を90以上にする", done: function () { return PRODUCTS.some(function (definition) { return definition.type === "subscription" && getProduct(definition.id).satisfaction >= 90; }); } },
    { id: "security_quality_95", category: "AI", title: "品質95", description: "いずれかの製品品質を95以上にする", done: function () { return PRODUCTS.some(function (definition) { return getProduct(definition.id).quality >= 95; }); } },
    { id: "buzz_awareness_100", category: "AI", title: "認知100", description: "いずれかの製品認知度を100にする", done: function () { return PRODUCTS.some(function (definition) { return getProduct(definition.id).awareness >= 100; }); } },
    { id: "support_reply_first_customer_achievement", category: "製品", title: "問い合わせ自動返信開始", description: "AI問い合わせ返信で初顧客を獲得", done: function () { return getProductCustomers(getProduct("supportReplyAi")) >= 1; } },
    { id: "apology_writer_first_sale_achievement", category: "製品", title: "謝罪文初販売", description: "AI謝罪文ジェネレーターを初販売", done: function () { return getProductUnitsSold(getProduct("apologyWriterAi")) >= 1; } },
    { id: "all_categories_started", category: "製品", title: "製品カテゴリ拡張", description: "3種類以上のカテゴリで製品開発を開始", done: function () { const started = {}; PRODUCTS.forEach(function (definition) { if (getProduct(definition.id).status !== "idea") started[getProductCategory(definition)] = true; }); return Object.keys(started).length >= 3; } },
    { id: "two_ai_assignment", category: "AI", title: "2AI同時担当", description: "1つの仕事にAIを2体割り振る", done: function () { return TASKS.some(function (task) { return PRODUCTS.some(function (definition) { return getAssignedAiIds(task.id, definition.id).length >= 2; }); }); } }
  ];


  return ACHIEVEMENTS;
};
