"use strict";
window.AIBS_CREATE_MISSION_DATA = function (api) {
  const PRODUCTS = api.PRODUCTS;
  const getProduct = api.getProduct;
  const getAssignedWorkersForProduct = api.getAssignedWorkersForProduct;
  const getProductCustomers = api.getProductCustomers;
  const getProductMrr = api.getProductMrr;
  const getProductDefinition = api.getProductDefinition;
  const getTotalProductMrr = api.getTotalProductMrr;
  const getProductUnitsSold = api.getProductUnitsSold;
  const getProductVersion = api.getProductVersion;
  const getProductCategory = api.getProductCategory;
  // === Missions ===
  const MISSION_STAGES = [
    {
      id: "startup",
      label: "起業準備",
      missions: [
        { id: "daily_report_developing", text: "AI日報メーカーを開発中にする", reward: 200, done: function () { return getProduct("dailyReportAi").status !== "idea"; } },
        { id: "assign_daily_development", text: "AI社長またはDev-01を開発に割り振る", reward: 200, done: function () { return getProduct("dailyReportAi").status !== "idea" || getAssignedWorkersForProduct("development", "dailyReportAi").length > 0; } },
        { id: "daily_report_ready_mission", text: "AI日報メーカーを完成させる", reward: 300, done: function () { return ["ready", "selling"].indexOf(getProduct("dailyReportAi").status) !== -1; } }
      ]
    },
    {
      id: "first_sale",
      label: "初回販売",
      missions: [
        { id: "assign_daily_sales", text: "AI日報メーカーに販売担当を割り振る", reward: 300, done: function () { return getProductCustomers(getProduct("dailyReportAi")) >= 1 || getAssignedWorkersForProduct("sales", "dailyReportAi").length > 0; } },
        { id: "daily_first_customer", text: "AI日報メーカーの初顧客を1社獲得する", reward: 400, done: function () { return getProductCustomers(getProduct("dailyReportAi")) >= 1; } },
        { id: "daily_mrr_500", text: "MRR ¥500/月を達成する", reward: 500, done: function () { return getProductMrr(getProduct("dailyReportAi"), getProductDefinition("dailyReportAi")) >= 500; } }
      ]
    },
    {
      id: "v04_product_expansion",
      label: "製品ライン拡張",
      missions: [
        { id: "support_reply_developing_mission", text: "AI問い合わせ返信を開発中にする", reward: 900, done: function () { return getProduct("supportReplyAi").status !== "idea"; } },
        { id: "support_reply_first_customer_mission", text: "AI問い合わせ返信の顧客を1社獲得する", reward: 1200, done: function () { return getProductCustomers(getProduct("supportReplyAi")) >= 1; } },
        { id: "apology_writer_developing_mission", text: "AI謝罪文ジェネレーターを開発中にする", reward: 800, done: function () { return getProduct("apologyWriterAi").status !== "idea"; } },
        { id: "apology_writer_first_sale_mission", text: "AI謝罪文ジェネレーターを1本販売する", reward: 1100, done: function () { return getProductUnitsSold(getProduct("apologyWriterAi")) >= 1; } },
        { id: "three_product_categories_started", text: "3カテゴリ以上で製品開発を開始する", reward: 1000, done: function () { const started = {}; PRODUCTS.forEach(function (definition) { if (getProduct(definition.id).status !== "idea") started[getProductCategory(definition)] = true; }); return Object.keys(started).length >= 3; } }
      ]
    },
    {
      id: "product_growth",
      label: "製品拡大",
      missions: [
        { id: "meeting_developing", text: "自動議事録AIを開発中にする", reward: 600, done: function () { return getProduct("meetingMinutesAi").status !== "idea"; } },
        { id: "meeting_ready_mission", text: "自動議事録AIを完成させる", reward: 800, done: function () { return ["ready", "selling"].indexOf(getProduct("meetingMinutesAi").status) !== -1; } },
        { id: "total_mrr_10k_mission", text: "総MRR ¥10K/月を達成する", reward: 1200, done: function () { return getTotalProductMrr() >= 10000; } }
      ]
    },
    {
      id: "instant_revenue",
      label: "即時売上",
      missions: [
        { id: "slide_developing", text: "AIスライド生成キットを開発中にする", reward: 700, done: function () { return getProduct("slideKitAi").status !== "idea"; } },
        { id: "slide_ready_mission", text: "AIスライド生成キットを完成させる", reward: 900, done: function () { return ["ready", "selling"].indexOf(getProduct("slideKitAi").status) !== -1; } },
        { id: "slide_first_sale_mission", text: "AIスライド生成キットを1本販売する", reward: 1000, done: function () { return getProductUnitsSold(getProduct("slideKitAi")) >= 1; } }
      ]
    },
    {
      id: "improvement",
      label: "改善運用",
      missions: [
        { id: "daily_v2_mission", text: "AI日報メーカーをv2にする", reward: 1200, done: function () { return getProductVersion(getProduct("dailyReportAi")) >= 2; } },
        { id: "meeting_v2_mission", text: "自動議事録AIをv2にする", reward: 1400, done: function () { return getProductVersion(getProduct("meetingMinutesAi")) >= 2; } },
        { id: "any_product_quality_70", text: "いずれかの製品の品質を70以上にする", reward: 1000, done: function () { return PRODUCTS.some(function (definition) { return getProduct(definition.id).quality >= 70; }); } }
      ]
    }
  ];

  const PRODUCT_OBJECTIVES = [
    { id: "daily_report_start", productId: "dailyReportAi", text: "AI日報メーカーの開発を開始する", done: function () { return getProduct("dailyReportAi").status !== "idea"; } },
    { id: "daily_report_ready", productId: "dailyReportAi", text: "AI日報メーカーを完成させる", done: function () { return ["ready", "selling"].indexOf(getProduct("dailyReportAi").status) !== -1; } },
    { id: "daily_report_10_customers", productId: "dailyReportAi", text: "AI日報メーカーの顧客を10社獲得する", done: function () { return getProductCustomers(getProduct("dailyReportAi")) >= 10; } },
    { id: "meeting_minutes_start", productId: "meetingMinutesAi", text: "自動議事録AIの開発を開始する", done: function () { return getProduct("meetingMinutesAi").status !== "idea"; } },
    { id: "meeting_minutes_ready", productId: "meetingMinutesAi", text: "自動議事録AIを完成させる", done: function () { return ["ready", "selling"].indexOf(getProduct("meetingMinutesAi").status) !== -1; } },
    { id: "slide_kit_start", productId: "slideKitAi", text: "AIスライド生成キットの開発を開始する", done: function () { return getProduct("slideKitAi").status !== "idea"; } },
    { id: "slide_kit_ready", productId: "slideKitAi", text: "AIスライド生成キットを完成させる", done: function () { return ["ready", "selling"].indexOf(getProduct("slideKitAi").status) !== -1; } },
    { id: "slide_kit_first_sale", productId: "slideKitAi", text: "AIスライド生成キットを1本販売する", done: function () { return getProductUnitsSold(getProduct("slideKitAi")) >= 1; } },
    { id: "slide_kit_10_sales", productId: "slideKitAi", text: "AIスライド生成キットを10本販売する", done: function () { return getProductUnitsSold(getProduct("slideKitAi")) >= 10; } },
    { id: "support_reply_start", productId: "supportReplyAi", text: "AI問い合わせ返信の開発を開始する", done: function () { return getProduct("supportReplyAi").status !== "idea"; } },
    { id: "support_reply_ready", productId: "supportReplyAi", text: "AI問い合わせ返信を完成させる", done: function () { return ["ready", "selling"].indexOf(getProduct("supportReplyAi").status) !== -1; } },
    { id: "support_reply_first_customer", productId: "supportReplyAi", text: "AI問い合わせ返信の顧客を1社獲得する", done: function () { return getProductCustomers(getProduct("supportReplyAi")) >= 1; } },
    { id: "apology_writer_start", productId: "apologyWriterAi", text: "AI謝罪文ジェネレーターの開発を開始する", done: function () { return getProduct("apologyWriterAi").status !== "idea"; } },
    { id: "apology_writer_ready", productId: "apologyWriterAi", text: "AI謝罪文ジェネレーターを完成させる", done: function () { return ["ready", "selling"].indexOf(getProduct("apologyWriterAi").status) !== -1; } },
    { id: "apology_writer_first_sale", productId: "apologyWriterAi", text: "AI謝罪文ジェネレーターを1本販売する", done: function () { return getProductUnitsSold(getProduct("apologyWriterAi")) >= 1; } },
    { id: "daily_report_v2", productId: "dailyReportAi", text: "AI日報メーカーをv2にする", done: function () { return getProductVersion(getProduct("dailyReportAi")) >= 2; } },
    { id: "meeting_minutes_v2", productId: "meetingMinutesAi", text: "自動議事録AIをv2にする", done: function () { return getProductVersion(getProduct("meetingMinutesAi")) >= 2; } },
    { id: "total_mrr_10k", productId: "dailyReportAi", text: "総MRR ¥10K/月を達成する", done: function () { return getTotalProductMrr() >= 10000; } }
  ];


  return { MISSION_STAGES: MISSION_STAGES, PRODUCT_OBJECTIVES: PRODUCT_OBJECTIVES };
};
