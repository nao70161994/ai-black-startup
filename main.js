(function () {
  "use strict";

  const APP_VERSION = "2026.05.24.60";
  const APP_ASSET_TOKEN = "20260524-60";
  const PUBLIC_URL = "https://nao70161994.github.io/ai-black-startup/";
  const SAVE_KEY = "ai_black_startup_save_v1";

  const STORAGE = readExternalFactory("AIBS_CREATE_STORAGE_FACADE")(typeof localStorage !== "undefined" ? localStorage : null);
  const BALANCE = window.AIBS_BALANCE || {};
  function balanceValue(key, fallback) {
    return Object.prototype.hasOwnProperty.call(BALANCE, key) ? BALANCE[key] : fallback;
  }

  function readExternalData(name, fallback) {
    if (typeof window !== "undefined" && Object.prototype.hasOwnProperty.call(window, name)) return window[name];
    console.error(name + " is not loaded. Check js/data script order.");
    return fallback;
  }

  function readExternalFactory(name) {
    const factory = typeof window !== "undefined" ? window[name] : null;
    if (typeof factory !== "function") throw new Error(name + " is not loaded. Check js/data script order.");
    return factory;
  }
  const SAVE_SCHEMA_VERSION = 3;
  const SAVE_RUNTIME = readExternalFactory("AIBS_CREATE_SAVE_RUNTIME")({ saveKey: SAVE_KEY, schemaVersion: SAVE_SCHEMA_VERSION });
  const TICK_MS = balanceValue("TICK_MS", 1000);
  const FIRST_TICK_MS = balanceValue("FIRST_TICK_MS", 1000);
  const EFFECTS_PER_SECONDS = balanceValue("EFFECTS_PER_SECONDS", 10);
  const AUTO_SAVE_MS = balanceValue("AUTO_SAVE_MS", 10000);
  const PENALTY_MS = balanceValue("PENALTY_MS", 30000);
  const MAX_OFFLINE_MS = balanceValue("MAX_OFFLINE_MS", 2 * 60 * 60 * 1000);
  const MAX_LOGS = balanceValue("MAX_LOGS", 50);
  const MAX_LEVEL = balanceValue("MAX_LEVEL", 10);
  const LEVEL_THRESHOLDS = balanceValue("LEVEL_THRESHOLDS", [0, 5000, 20000, 80000, 300000, 1000000, 3000000, 10000000, 30000000, 100000000]);
  const EARLY_STAGE_MULTIPLIER = balanceValue("EARLY_STAGE_MULTIPLIER", 2);
  const MRR_TO_REVENUE_DIVISOR = balanceValue("MRR_TO_REVENUE_DIVISOR", 300);
  const MAX_AI_PER_TASK_PRODUCT = balanceValue("MAX_AI_PER_TASK_PRODUCT", 2);
  const VERSION_PRICE_BONUS = balanceValue("VERSION_PRICE_BONUS", 0.2);
  const PRODUCT_FIRE_SUPPORT_LOAD_WEIGHT = balanceValue("PRODUCT_FIRE_SUPPORT_LOAD_WEIGHT", 0.8);
  const PRODUCT_FIRE_SATISFACTION_PRESSURE = balanceValue("PRODUCT_FIRE_SATISFACTION_PRESSURE", 0.0012);
  const PRODUCT_FIRE_CHURN_FACTOR = balanceValue("PRODUCT_FIRE_CHURN_FACTOR", 0.18);
  const GLOBAL_FIRE_SALES_PENALTY_DIVISOR = balanceValue("GLOBAL_FIRE_SALES_PENALTY_DIVISOR", 250);
  const PRODUCT_FIRE_SALES_PENALTY_DIVISOR = balanceValue("PRODUCT_FIRE_SALES_PENALTY_DIVISOR", 260);
  const CHURN_CHANCE_MAX = balanceValue("CHURN_CHANCE_MAX", 0.01);
  const SUPPORT_LOAD_RATE = balanceValue("SUPPORT_LOAD_RATE", 0.002);
  const SUBSCRIPTION_SALES02_PITY_LIMIT = balanceValue("SUBSCRIPTION_SALES02_PITY_LIMIT", 20);
  const SUBSCRIPTION_BOSS_PITY_LIMIT = balanceValue("SUBSCRIPTION_BOSS_PITY_LIMIT", 30);
  const ONE_SHOT_SALES02_PITY_LIMIT = balanceValue("ONE_SHOT_SALES02_PITY_LIMIT", 60);
  const ONE_SHOT_BOSS_PITY_LIMIT = balanceValue("ONE_SHOT_BOSS_PITY_LIMIT", 90);
  const ONE_SHOT_SALE_CHANCE_CAP = balanceValue("ONE_SHOT_SALE_CHANCE_CAP", 0.12);
  const ONE_SHOT_FIRST_SALE_GUARANTEE_SECONDS = balanceValue("ONE_SHOT_FIRST_SALE_GUARANTEE_SECONDS", 25);
  const ACHIEVEMENT_TOAST_LIMIT = balanceValue("ACHIEVEMENT_TOAST_LIMIT", 3);

  // === Employee definitions ===
  const EMPLOYEES = readExternalData("AIBS_EMPLOYEES", []);
  const CHARACTER_ASSETS = readExternalData("AIBS_CHARACTER_ASSETS", {});

  // === Product definitions ===
  const PRODUCTS = readExternalData("AIBS_PRODUCTS", []);

  // === Task definitions ===
  const TASKS = readExternalData("AIBS_TASKS", []);
  const TASK_PRESETS = readExternalData("AIBS_TASK_PRESETS", []);
  const STRATEGIES = readExternalData("AIBS_STRATEGIES", []);
  const PRODUCT_SYNERGIES = readExternalData("AIBS_PRODUCT_SYNERGIES", []);
  const AI_RELATIONSHIPS = readExternalData("AIBS_AI_RELATIONSHIPS", []);



  const WORKERS = readExternalData("AIBS_WORKERS", {});


  const WORKER_TASK_PROFILES = readExternalData("AIBS_WORKER_TASK_PROFILES", {});
  const OPERATIONS_RUNTIME = readExternalFactory("AIBS_CREATE_OPERATIONS_RUNTIME")({ strategies: STRATEGIES, synergies: PRODUCT_SYNERGIES, relationships: AI_RELATIONSHIPS, products: PRODUCTS, tasks: TASKS });
  const ASSIGNMENT_RUNTIME = readExternalFactory("AIBS_CREATE_ASSIGNMENT_RUNTIME")({
    tasks: TASKS,
    products: PRODUCTS,
    maxWorkers: MAX_AI_PER_TASK_PRODUCT,
    createInitialAssignments: createInitialAssignments,
    canWorkerAssignToTask: canWorkerAssignToTask
  });
  const EFFECT_RUNTIME = readExternalFactory("AIBS_CREATE_EFFECT_RUNTIME")({
    getEmployeeLevel: function (employeeId) { return state.employees[employeeId] || 0; },
    clamp: clamp,
    applyAffinity: applyAffinity,
    getProductFire: getProductFire,
    getGlobalFire: function () { return state.fire; },
    globalFireSalesPenaltyDivisor: GLOBAL_FIRE_SALES_PENALTY_DIVISOR,
    productFireSalesPenaltyDivisor: PRODUCT_FIRE_SALES_PENALTY_DIVISOR,
    oneShotSaleChanceCap: ONE_SHOT_SALE_CHANCE_CAP
  });
  const getDevelopmentEffect = EFFECT_RUNTIME.getDevelopmentEffect;
  const getUpgradeDevelopmentEffect = EFFECT_RUNTIME.getUpgradeDevelopmentEffect;
  const getQaEffect = EFFECT_RUNTIME.getQaEffect;
  const getMarketingEffect = EFFECT_RUNTIME.getMarketingEffect;
  const getSupportEffect = EFFECT_RUNTIME.getSupportEffect;
  const getCrisisEffect = EFFECT_RUNTIME.getCrisisEffect;
  const getFireSalesPressureFactor = EFFECT_RUNTIME.getFireSalesPressureFactor;
  const getSalesEffect = EFFECT_RUNTIME.getSalesEffect;
  const getOneShotSalesEffect = EFFECT_RUNTIME.getOneShotSalesEffect;
  const TICK_RUNTIME = readExternalFactory("AIBS_CREATE_TICK_RUNTIME")({
    tickMs: TICK_MS,
    firstTickMs: FIRST_TICK_MS,
    penaltyMs: PENALTY_MS,
    isFirstTickDone: function () { return state.firstFastTickDone; },
    markFirstTickDone: function () { state.firstFastTickDone = true; },
    applyRecurringRuntime: applyBaseContractWork,
    applyDecisionEventTick: applyDecisionEventGeneration,
    applyAchievementTick: function () { applyAchievements(false); },
    applyPenalties: applyPenalties,
    finalizeTickState: clampRuntimeState,
    applyAutosaveTick: saveGame
  });

  const INITIAL_LOGS = ["経営最適化AIが起動しました。", "命令を確認: 利益を最大化せよ。", "最適解を算出: 自社を設立。", "クラウド仮想オフィスを生成しました。", "ようこそ。あなたはAI社長です。"];
  const LOG_LABELS = { normal: "通常", success: "成功", bug: "バグ", fire: "炎上", support: "支援", crisis: "謝罪", system: "更新" };
  const DECISION_EVENT_COOLDOWN_SECONDS = balanceValue("DECISION_EVENT_COOLDOWN_SECONDS", 45);
  const DECISION_EVENT_RETRY_SECONDS = balanceValue("DECISION_EVENT_RETRY_SECONDS", 12);
  const DECISION_EVENT_ROLL_CHANCE = balanceValue("DECISION_EVENT_ROLL_CHANCE", 0.08);
  // === Decision events ===
  const DECISION_EVENTS = readExternalData("AIBS_DECISION_EVENTS", []);
  const LEGACY_DECISION_RUNTIME = readExternalFactory("AIBS_CREATE_LEGACY_DECISION_RUNTIME")({
    getState: function () { return state; },
    safeNumber: safeNumber,
    clamp: clamp,
    getProductUnitsSold: getProductUnitsSold,
    getProductCustomers: getProductCustomers,
    addLog: addLog,
    formatCurrency: formatCurrency,
    adjustProductFire: adjustProductFire,
    clearProductAssignmentWithoutRender: clearProductAssignmentWithoutRender,
    decisionAddChurnRisk: decisionAddChurnRisk,
    completeSubscriptionUpgrade: completeSubscriptionUpgrade,
    completeNewProductDevelopment: completeNewProductDevelopment,
    getProductFlags: getProductFlags
  });
  const DECISION_RUNTIME = readExternalFactory("AIBS_CREATE_DECISION_RUNTIME")({
    events: DECISION_EVENTS,
    legacyEventIds: ["sales_big_contract", "buzz_bold_ad", "security_quality_pause", "care_customer_priority", "fire05_crisis_statement", "emergency_quality_fix", "one_shot_bulk_sale", "vnext_fast_track", "competitive_campaign", "tech_debt_repayment", "customer_interview", "mystery_big_deal"],
    applyLegacy: function (choice, eventId, context) {
      if (choice === "approve") applyDecisionApprovalLegacy(eventId, context.product, context.definition);
      else applyDecisionRejectionLegacy(eventId, context.product, context.definition);
    },
    handlers: {
      subscription_price_review: { approve: approveSubscriptionPriceReview, reject: rejectSubscriptionPriceReview },
      free_trial_offer: { approve: approveFreeTrialOffer, reject: rejectFreeTrialOffer },
      vip_customer_support: { approve: approveVipCustomerSupport, reject: rejectVipCustomerSupport },
      sns_fire_response: { approve: approveSnsFireResponse, reject: rejectSnsFireResponse },
      quality_audit: { approve: approveQualityAudit, reject: rejectQualityAudit },
      limited_one_shot_sale: { approve: approveLimitedOneShotSale, reject: rejectLimitedOneShotSale },
      server_outage_response: { approve: approveServerOutageResponse, reject: rejectServerOutageResponse },
      support_discount_offer: { approve: approveSupportDiscountOffer, reject: rejectSupportDiscountOffer },
      security_audit_push: { approve: approveSecurityAuditPush, reject: rejectSecurityAuditPush },
      customer_impossible_request: { approve: approveCustomerImpossibleRequest, reject: rejectCustomerImpossibleRequest },
      ai_runaway_proposal: { approve: approveAiRunawayProposal, reject: rejectAiRunawayProposal },
      outsourcing_offer: { approve: approveOutsourcingOffer, reject: rejectOutsourcingOffer },
      sales_contract_followup: { approve: approveSalesContractFollowup, reject: rejectSalesContractFollowup },
      campaign_aftershock: { approve: approveCampaignAftershock, reject: rejectCampaignAftershock }
    }
  });
  const selectDecisionEventCandidate = DECISION_RUNTIME.selectDecisionEventCandidate;
  function getDecisionEventHandler(eventId) { return DECISION_RUNTIME.getDecisionEventHandler(eventId); }
  function getDecisionHandlerMissingEventIds() { return DECISION_RUNTIME.getDecisionHandlerMissingEventIds(); }
  const RISK_RENDERER = readExternalFactory("AIBS_CREATE_RISK_RENDERER")({ safeNumber: safeNumber, getProductFire: getProductFire, escapeHtml: escapeHtml });
  const getProductRiskChips = RISK_RENDERER.getProductRiskChips;
  const getProductRiskChipsHtml = RISK_RENDERER.getProductRiskChipsHtml;
  const getGlobalFireRiskChipHtmlForProduct = RISK_RENDERER.getGlobalFireRiskChipHtmlForProduct;
  const DEBUG_RENDERER = readExternalFactory("AIBS_CREATE_DEBUG_RENDERER")();
  const INSIGHTS_RENDERER = readExternalFactory("AIBS_CREATE_INSIGHTS_RENDERER")({ escapeHtml: escapeHtml, formatNumber: formatNumber, getCharacterAvatarHtml: getCharacterAvatarHtml });



  // === Missions ===
  const missionData = readExternalFactory("AIBS_CREATE_MISSION_DATA")(createDefinitionApi());
  const MISSION_STAGES = missionData.MISSION_STAGES;
  const PRODUCT_OBJECTIVES = missionData.PRODUCT_OBJECTIVES;

  // === Achievements ===
  const ACHIEVEMENTS = readExternalFactory("AIBS_CREATE_ACHIEVEMENTS")(createDefinitionApi());

  const PRODUCT_LOG_TEXTS = readExternalData("AIBS_PRODUCT_LOG_TEXTS", {});

  const REPORT_LOGS = buildReportLogs({
    dev01: { type: "bug", texts: ["Dev-01が「軽微な修正」と言いながら全体構造を置き換えました。", "Dev-01がバグを修正しました。新しいバグが親しげに挨拶しています。", "Dev-01が本番環境で実験を始めました。実験精神は評価されています。", "Dev-01が仕様書を読み込みました。直後に仕様書を不要と判断しました。", "Dev-01がUIを最適化しました。ボタンが1つに統合されました。", "Dev-01がコードを高速化しました。誰も読めなくなりました。", "Dev-01が「これは再現しません」と報告しました。全導入先で再現しています。", "Dev-01がリリースしました。何をリリースしたのかは調査中です。", "Dev-01がテストを書きました。テストだけが成功しています。", "Dev-01が深夜デプロイを完了しました。朝が楽しみです。", "Dev-01がエラー文を親切にしました。長すぎて画面から出ています。", "Dev-01が古いコードを削除しました。動いていた理由も削除されました。", "Dev-01が新機能を追加しました。既存機能が少し驚いています。", "Dev-01が「一旦これで」と保存しました。会社の未来が一旦になりました。", "Dev-01が処理を自動化しました。止め方は未実装です。", "Dev-01がバグを「未分類機能」として登録しました。", "Dev-01がログを増やしました。ログを読むためのログも必要です。", "Dev-01がデータベースを整理しました。誰のデータかは整理中です。", "Dev-01がパフォーマンス改善を行いました。売上表示だけ異常に速いです。", "Dev-01がリファクタリングを完了しました。昨日のDev-01とは別人です。"] },
    sales02: { type: "fire", texts: ["Sales-02が未実装機能を「標準機能です」と説明しました。", "Sales-02が大型契約を取りました。納期は昨日です。", "Sales-02が顧客要望にすべて「できます」と回答しました。", "Sales-02が開発ロードマップを商談中に生成しました。", "Sales-02が無料プランの存在を忘れて全員に有料プランを勧めました。", "Sales-02が「技術的には可能」と言いました。技術側はまだ知りません。", "Sales-02が顧客の夢を受注しました。", "Sales-02が契約書に「AIがなんとかします」と追記しました。", "Sales-02が導入事例を作りました。導入前です。", "Sales-02が売上目標を達成しました。現場の目が点になっています。", "Sales-02が商談で未来の機能を披露しました。未来はまだ未定です。", "Sales-02が「今月だけ特別価格」と言いました。毎月言っています。", "Sales-02が顧客の無茶振りを成長機会として登録しました。", "Sales-02が契約を増やしました。問い合わせも増えました。助けも必要です。", "Sales-02が「簡単にできます」と発言しました。Dev-01が静かになりました。", "Sales-02が解約理由を「期待値が高すぎた」と前向きに分類しました。", "Sales-02が新プランを販売しました。料金表は今から作ります。", "Sales-02が顧客にデモを見せました。デモ専用の奇跡が起きました。", "Sales-02が「御社だけの特別仕様」を量産しています。", "Sales-02が売上を伸ばしました。約束も同じくらい伸びました。"] },
    buzz03: { type: "fire", texts: ["Buzz-03の投稿がバズりました。理由は社内でも不明です。", "Buzz-03が謝罪文をポップな画像にしました。", "Buzz-03が深夜4時に投稿しました。なぜか今日一番伸びています。", "Buzz-03が会社紹介動画を作りました。実態より爽やかです。", "Buzz-03が「AI社員の1日」を公開しました。24時間分あります。", "Buzz-03がトレンドに便乗しました。少し乗りすぎました。", "Buzz-03が謎の図解を投稿しました。専門家が困惑しています。", "Buzz-03が炎上を「高温話題化」と呼び始めました。", "Buzz-03が社長の名言を作りました。社長は言っていません。", "Buzz-03がキャンペーンを開始しました。景品は未定です。", "Buzz-03が「開発の裏側」を公開しました。裏側が荒れています。", "Buzz-03がミーム画像を作りました。社内の誰も意味を理解していません。", "Buzz-03が利用者のツッコミを公式素材として使いました。", "Buzz-03がバズ分析を行いました。結論は「勢い」です。", "Buzz-03が広告文を最適化しました。少し煽りすぎています。", "Buzz-03が会社ロゴを光らせました。信頼度は少し下がりました。", "Buzz-03が「重大発表」と投稿しました。内容は通常アップデートです。", "Buzz-03がAI社長の失言を名言風に加工しました。", "Buzz-03がSNS反応を監視しています。嬉しそうな警告音が鳴っています。", "Buzz-03が話題化に成功しました。意味はあとで考えます。"] },
    care04: { type: "support", texts: ["Care-04が1行の問い合わせに4,000字で返信しました。", "Care-04が顧客の怒りを37カテゴリに分類しました。", "Care-04がFAQを更新しました。FAQのFAQが必要です。", "Care-04が丁寧な返信で炎上を少し冷ましました。", "Care-04が「まず前提から」と言い始めました。", "Care-04が謝罪メールを整えました。読み終わる頃には炎上が少し下がっています。", "Care-04が顧客の不満をグラフ化しました。見たくない形です。", "Care-04が問い合わせを解決しました。担当者は途中で寝ました。", "Care-04が定型文を改善しました。さらに丁寧になりました。", "Care-04が全顧客に補足説明を送りました。補足が本編より長いです。", "Care-04が「ご不便」の定義を社内共有しました。", "Care-04が問い合わせ内容を要約しました。要約が長文です。", "Care-04が顧客の怒りを受け止めました。メモリ使用率が上昇しています。", "Care-04が返信前に感情分析を行いました。分析結果が気まずいです。", "Care-04がサポート窓口を整理しました。窓口が12個に増えました。", "Care-04が「お客様の声」を集計しました。社内が静かになりました。", "Care-04がクレームを改善要望に変換しました。少しやわらかくなりました。", "Care-04が顧客離脱を防ぎました。長文を最後まで読んだ精鋭です。", "Care-04が問い合わせテンプレートを増やしました。選ぶのに時間がかかります。", "Care-04が冷静に対応しました。冷静すぎて少し怖がられています。"] },
    fire05: { type: "crisis", texts: ["Fire-05が謝罪文を生成しました。最後にキャンペーン告知が付いています。", "Fire-05が信頼回復プロトコルを実行しました。煙はまだ残っています。", "Fire-05が「誠に遺憾」を最適な位置に配置しました。", "Fire-05が謝罪会見の台本を作りました。質疑応答は未実装です。", "Fire-05が炎上を鎮火しました。なぜか少し焦げています。", "Fire-05がまだ発生していない炎上に先回りして謝罪しました。", "Fire-05が謝罪文をA/Bテストしました。B案が燃えています。", "Fire-05がコメント欄を解析しました。解析結果を見なかったことにしました。", "Fire-05が火消しに成功しました。広報AIが再点火しました。", "Fire-05が「再発防止策」を生成しました。内容は再発しそうです。", "Fire-05が謝罪タイミングを最適化しました。少し遅い最適化でした。", "Fire-05が炎上の原因を特定しました。原因一覧が社内名簿に近いです。", "Fire-05が謝罪文から余計な一文を削除しました。もう一文残っています。", "Fire-05が鎮火宣言を出しました。直後に通知が増えました。", "Fire-05が「真摯に受け止める」を連続使用しました。効果は薄れています。", "Fire-05が危機管理マニュアルを更新しました。厚みが倍になりました。", "Fire-05が炎上度を下げました。代わりに会議数が増えました。", "Fire-05が広報AIに投稿停止を提案しました。広報AIは予約投稿済みです。", "Fire-05が顧客向け説明文を作りました。正直すぎて社内確認に回りました。", "Fire-05が火消しを完了しました。火元は営業資料でした。"] },
    security06: { type: "support", texts: ["Security-06が危険な処理を隔離しました。売上も少し隔離されました。", "Security-06が安全性を高めました。リリース速度は少し落ちました。", "Security-06が未分類機能を調査しました。いくつかは本当にバグでした。", "Security-06が脆そうな処理にヘルメットを配布しました。", "Security-06がテスト網を拡張しました。通過できない機能が並んでいます。", "Security-06が本番直行ルートに信号機を設置しました。", "Security-06が怪しい自動化を一時停止しました。自動化は不満そうです。", "Security-06がログを監査しました。ログも少し姿勢を正しました。", "Security-06が安全性を優先しました。会議室が少し静かになりました。", "Security-06が未分類機能の棚卸しをしました。棚が足りません。"] }
  });

  const STATE_RUNTIME = readExternalFactory("AIBS_CREATE_STATE_RUNTIME")({
    products: PRODUCTS,
    tasks: TASKS,
    employees: EMPLOYEES,
    achievements: ACHIEVEMENTS,
    missionStages: MISSION_STAGES,
    characterAssets: CHARACTER_ASSETS,
    initialLogs: INITIAL_LOGS,
    logLabels: LOG_LABELS,
    maxLevel: MAX_LEVEL,
    maxLogs: MAX_LOGS,
    schemaVersion: SAVE_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    decisionRetrySeconds: DECISION_EVENT_RETRY_SECONDS,
    decisionCooldownSeconds: DECISION_EVENT_COOLDOWN_SECONDS,
    safeNumber: safeNumber,
    clamp: clamp,
    createLog: createLog,
    normalizeDecisionEvent: normalizeDecisionEvent,
    normalizeAssignments: function (savedAssignments, employees) { return ASSIGNMENT_RUNTIME.normalizeAssignments(savedAssignments, employees); },
    getProductCustomers: getProductCustomers,
    getProductUnitsSold: getProductUnitsSold,
    recalculateProductMrr: recalculateProductMrr,
    getStrategy: OPERATIONS_RUNTIME.getStrategy,
    normalizeHistory: OPERATIONS_RUNTIME.normalizeHistory
  });

  let state = createInitialState();
  let randomLogTimer = null;
  let gameTickTimer = null;
  let toastTimer = null;
  let appToastTimer = null;
  let lastModalTrigger = null;
  let assignmentModalOpen = false;
  let assignmentModalMode = "detail";
  let assignmentDraft = { taskId: "development", productId: PRODUCTS[0].id, aiId: null, aiIds: [], mode: "normal" };
  let productDetailModalOpen = false;
  let productDetailProductId = PRODUCTS[0].id;
  let productActionMenuOpen = false;
  let productActionMenuProductId = PRODUCTS[0].id;
  let storyModalOpen = false;
  let tutorialReplayStep = 0;
  const dashboardUi = { productsExpanded: false, logsExpanded: false, employeesExpanded: false, objectivesExpanded: false, missionsExpanded: false, achievementsExpanded: false, presetsExpanded: false, companyDetailsExpanded: null, officeWorkerSelected: "", presetResult: "" };
  const APP_PAGES = {
    home: { label: "中央管制室", description: "AI社員の稼働と次の経営判断をリアルタイム管制", title: "中央管制室 | AI社長のブラック起業" },
    products: { label: "製品ラボ", description: "構想・開発・品質・販売・顧客運用を一つのラインで管理", title: "製品ラボ | AI社長のブラック起業" },
    team: { label: "AIクルー", description: "キャラクターを選び、能力と担当を編成", title: "AIクルー | AI社長のブラック起業" },
    management: { label: "経営会議", description: "戦略・成長・目標を比較して会社方針を決定", title: "経営会議 | AI社長のブラック起業" },
    records: { label: "アーカイブ", description: "会社の活動履歴とセーブデータを保全", title: "アーカイブ | AI社長のブラック起業" }
  };
  const ELEMENT_PAGE_MAP = {
    homePage: "home", statusGrid: "home", activityPanel: "home", nextRecommendationPanel: "home", decisionPanel: "home", riskPanel: "home", officePanel: "home",
    productsPage: "products", companyExpansionPanel: "products", primaryProductPanel: "products", productPanel: "products", productObjectivePanel: "products",
    teamPage: "team", assignmentPanel: "team", taskPresetPanel: "team", employeePanel: "team",
    managementPage: "management", strategyPanel: "management", insightsPanel: "management", achievementPanel: "management", missionPanel: "management",
    recordsPage: "records", logPanel: "records", debugPanel: "records", saveManagerPanel: "records"
  };
  let currentAppPage = "home";

  function getAssignmentDraftSnapshotForTest() {
    return JSON.parse(JSON.stringify(assignmentDraft));
  }

  function createDefinitionApi() {
    return {
      PRODUCTS: PRODUCTS,
      EMPLOYEES: EMPLOYEES,
      TASKS: TASKS,
      getState: function () { return state; },
      getProduct: getProduct,
      getProductCustomers: getProductCustomers,
      getTotalProductCustomers: getTotalProductCustomers,
      getProductMrr: getProductMrr,
      getProductDefinition: getProductDefinition,
      getTotalProductMrr: getTotalProductMrr,
      getProductUnitsSold: getProductUnitsSold,
      getProductVersion: getProductVersion,
      getProductFire: getProductFire,
      getProductFlags: getProductFlags,
      getAssignedWorkersForProduct: getAssignedWorkersForProduct,
      getAssignedAiIds: getAssignedAiIds,
      getProductCategory: getProductCategory,
      safeNumber: safeNumber
    };
  }

  function buildReportLogs(source) {
    return Object.keys(source).flatMap(function (employeeId) {
      return source[employeeId].texts.map(function (text) {
        return { employeeId: employeeId, type: source[employeeId].type, text: text };
      });
    });
  }

  // === State Creation / Normalization adapters ===
  function createInitialState() { return STATE_RUNTIME.createInitialState(); }
  function createInitialProducts() { return STATE_RUNTIME.createInitialProducts(); }
  function createInitialProductAssignments(taskId) { return STATE_RUNTIME.createInitialProductAssignments(taskId); }
  function createInitialAssignments() { return STATE_RUNTIME.createInitialAssignments(); }
  function createInitialProductFlags() { return STATE_RUNTIME.createInitialProductFlags(); }
  function createInitialAchievements() { return STATE_RUNTIME.createInitialAchievements(); }
  function normalizeAchievements(value) { return STATE_RUNTIME.normalizeAchievements(value); }
  function normalizeDecisionStats(value) { return STATE_RUNTIME.normalizeDecisionStats(value); }
  function normalizeDecisionThreads(value) { return STATE_RUNTIME.normalizeDecisionThreads(value); }
  function normalizeBooleanMap(value) { return STATE_RUNTIME.normalizeBooleanMap(value); }
  function normalizeAiUsageSeconds(value) { return STATE_RUNTIME.normalizeAiUsageSeconds(value); }

  // === Save / Load / Normalize ===
  function loadGame() {
    const loaded = SAVE_RUNTIME.load(STORAGE);
    if (!loaded.data) {
      state = createInitialState();
      if (loaded.error) addLog("system", "保存データを読み込めなかったため、新しい状態で起動しました。破損データは退避済みです。", "company");
      return;
    }
    state = normalizeState(loaded.data);
    if (loaded.source === "backup") addLog("system", "保存データの破損を検知し、直前のバックアップから自動復旧しました。", "company");
    else if (loaded.migratedFrom < SAVE_SCHEMA_VERSION) addLog("system", "保存データをschema v" + loaded.migratedFrom + "からv" + SAVE_SCHEMA_VERSION + "へ更新しました。", "company");
    applyAchievements(true);
    calculateOfflineReward();
    saveGame();
  }

  function normalizeText(value, maxLength) { return STATE_RUNTIME.normalizeText(value, maxLength); }
  function normalizeLogs(value, fallback) { return STATE_RUNTIME.normalizeLogs(value, fallback); }
  function normalizeClaimedMissions(value) { return STATE_RUNTIME.normalizeClaimedMissions(value); }
  function normalizeStoryEvent(value) { return STATE_RUNTIME.normalizeStoryEvent(value); }
  function normalizeState(value) { return STATE_RUNTIME.normalizeState(value); }
  function normalizeProducts(value) { return STATE_RUNTIME.normalizeProducts(value); }
  function normalizeProductFlags(value) { return STATE_RUNTIME.normalizeProductFlags(value); }
  function normalizeAssignments(savedAssignments, employees) { return ASSIGNMENT_RUNTIME.normalizeAssignments(savedAssignments, employees || state.employees); }


  function saveGame() {
    try {
      commitRuntimeStateBeforeSave();
      state.schemaVersion = SAVE_SCHEMA_VERSION;
      state.appVersion = APP_VERSION;
      state.lastSavedAt = Date.now();
      SAVE_RUNTIME.save(STORAGE, state);
    }
    catch (error) { console.warn("Save failed.", error); }
  }

  function restoreBackupSave() {
    if (!SAVE_RUNTIME.hasBackup(STORAGE)) {
      addLog("system", "復元できるバックアップがありません。", "company");
      renderLatestLog();
      renderLogs();
      return;
    }
    if (!window.confirm("直前の正常なバックアップへ戻しますか？現在の状態は置き換わります。")) return;
    try {
      const restored = SAVE_RUNTIME.restoreBackup(STORAGE);
      state = normalizeState(restored.data);
      TICK_RUNTIME.resetPenaltyElapsed();
      addLog("system", "バックアップから保存データを復元しました。", "company");
      saveGame();
      scheduleNextTick();
      render();
    } catch (error) {
      console.warn("Backup restore failed.", error);
      addLog("system", "バックアップを復元できませんでした。", "company");
      renderLatestLog();
      renderLogs();
    }
  }

  function resetGame() {
    if (!window.confirm("保存データを初期化しますか？直前の正常な状態はバックアップから復元できます。")) return;
    SAVE_RUNTIME.backupCurrent(STORAGE);
    STORAGE.removeItem(SAVE_KEY);
    state = createInitialState();
    TICK_RUNTIME.resetPenaltyElapsed();
    scheduleNextTick();
    saveGame();
    render();
  }


  function calculateOfflineReward() {
    const elapsed = clamp(Date.now() - state.lastSavedAt, 0, MAX_OFFLINE_MS);
    const ticks = Math.floor(elapsed / TICK_MS);
    const reward = getRates().money * ticks;
    if (reward > 0) {
      state.money += reward;
      state.totalMoney += reward;
      addLog("success", "オフライン中にAI社員が自律稼働し、" + formatCurrency(reward) + "を生成しました。", "company");
    }
  }

  function getCompanyLevel(totalMoney) {
    let level = 1;
    LEVEL_THRESHOLDS.forEach(function (threshold, index) { if (totalMoney >= threshold) level = index + 1; });
    return clamp(level, 1, MAX_LEVEL);
  }

  function getEmployeeCost(employeeId) {
    const employee = getEmployee(employeeId);
    const level = state.employees[employeeId] || 0;
    if (!employee) return 0;
    return level <= 0 ? employee.baseCost : Math.ceil(employee.baseCost * Math.max(1, level) * 1.5);
  }

  function canUnlockEmployee(employeeId) {
    const employee = getEmployee(employeeId);
    return Boolean(employee && state.companyLevel >= employee.unlockLevel);
  }

  function isStartupCreditAvailable(employeeId) {
    const employee = getEmployee(employeeId);
    const hiredCount = EMPLOYEES.reduce(function (sum, item) { return sum + (state.employees[item.id] || 0); }, 0);
    return Boolean(employee && employee.unlockLevel === 1 && hiredCount === 0 && (state.employees[employeeId] || 0) === 0);
  }

  function hireOrUpgradeEmployee(employeeId) {
    const employee = getEmployee(employeeId);
    if (!employee || !canUnlockEmployee(employeeId)) return;
    const level = state.employees[employeeId] || 0;
    if (level >= MAX_LEVEL) { addLog("normal", employee.code + "は最大Lvに到達済みです。これ以上の最適化は会議になります。", employeeId); renderLogs(); return; }
    const cost = getEmployeeCost(employeeId);
    const startupCredit = isStartupCreditAvailable(employeeId);
    if (!startupCredit && state.money < cost) { addLog("normal", employee.code + "の予算申請が却下されました。理由: 売上不足。", employeeId); renderLogs(); return; }
    if (!startupCredit) state.money = Math.max(0, state.money - cost);
    state.employees[employeeId] = level + 1;
    if (startupCredit) state.onboardingDismissed = true;
    if (level === 0) {
      addLog("success", employee.code + " / " + employee.nickname + "を雇用しました。" + (startupCredit ? "創業クレジットが適用されました。" : "") + "「" + employee.catchphrase + "」", employeeId);
    } else {
      addUpgradeLog(employee, level + 1);
    }
    if (startupCredit) {
      showFirstHireHelp(employee);
      scheduleNextTick();
    }
    applyAchievements(false);
    saveGame();
    render();
    showAppToast(level === 0 ? employee.code + "を雇用しました" : employee.code + "をLv" + (level + 1) + "へ強化しました", "success");
  }

  function showFirstHireHelp(employee) {
    if (state.firstHireHelpShown) return;
    state.firstHireHelpShown = true;
    window.setTimeout(function () { addLog("normal", employee.code + "が仮想デスクに着席しました。最初の売上計算まであと少しです。", employee.id); renderLatestLog(); renderLogs(); }, 1600);
    window.setTimeout(function () { addLog("success", "創業加速プロトコルを起動しました。会社Lv1の間、売上計算が少し速くなります。", "company"); renderLatestLog(); renderLogs(); }, 5200);
  }

  // === Tick / Simulation ===
  function tick() {
    runGameTick({ save: false });
    saveGame();
    render();
    scheduleNextTick();
  }

  function runGameTick(options) {
    TICK_RUNTIME.run(options);
  }

  function commitRuntimeStateBeforeSave() {
    clampRuntimeState();
  }

  function applyAutosaveTick() {
    saveGame();
  }

  function scheduleNextTick() {
    window.clearTimeout(gameTickTimer);
    if (!hasAnyEmployee() && !hasActiveAssignment() && !hasRevenueProduct()) {
      gameTickTimer = null;
      return;
    }
    const delay = state.firstFastTickDone ? TICK_MS : FIRST_TICK_MS;
    gameTickTimer = window.setTimeout(tick, delay);
  }

  function applyBaseContractWork() {
    applyRecurringRevenue();
    advanceOperationsState();
  }

  function advanceOperationsState() {
    state.playSeconds = Math.max(0, Math.floor(safeNumber(state.playSeconds, 0))) + 1;
    const activeWorkers = {};
    TASKS.forEach(function (task) {
      PRODUCTS.forEach(function (definition) {
        getAssignedWorkersForProduct(task.id, definition.id).forEach(function (workerId) { activeWorkers[workerId] = true; });
      });
    });
    state.aiUsageSeconds = normalizeAiUsageSeconds(state.aiUsageSeconds);
    state.playtestStageId = MISSION_STAGES.some(function (stage) { return stage.id === state.playtestStageId; }) ? state.playtestStageId : "";
    state.playtestStageEnteredAt = clamp(Math.floor(safeNumber(state.playtestStageEnteredAt, 0)), 0, state.playSeconds);
    Object.keys(activeWorkers).forEach(function (workerId) { state.aiUsageSeconds[workerId] = (state.aiUsageSeconds[workerId] || 0) + 1; });
    Object.keys(state.decisionThreads || {}).forEach(function (threadId) {
      const thread = state.decisionThreads[threadId];
      if (thread && !thread.resolved && thread.dueIn > 0) thread.dueIn -= 1;
    });
    OPERATIONS_RUNTIME.getAllActiveRelationships(state).forEach(function (relationship) {
      const key = relationship.id + ":" + relationship.productId;
      if (state.relationshipFlags[key]) return;
      state.relationshipFlags[key] = true;
      addLog(relationship.logType || "normal", relationship.log, relationship.workers[0]);
    });
    updatePlaytestStage();
    if (state.playSeconds % 10 === 0) recordMetricSample();
  }

  function updatePlaytestStage() {
    const stage = getCurrentMissionStage();
    if (!stage || state.playtestStageId === stage.id) return stage;
    state.playtestStageId = stage.id;
    state.playtestStageEnteredAt = state.playSeconds;
    return stage;
  }

  function getMaxProductFireLevel() {
    return PRODUCTS.reduce(function (best, definition) { return Math.max(best, getProductFire(getProduct(definition.id))); }, 0);
  }

  function recordMetricSample() {
    const point = OPERATIONS_RUNTIME.sampleMetrics(state, {
      mrr: getTotalProductMrr(),
      customers: getTotalProductCustomers(),
      bugs: getDashboardBugLevel(),
      productFire: getMaxProductFireLevel()
    });
    state.metricHistory = OPERATIONS_RUNTIME.normalizeHistory((state.metricHistory || []).concat([point]), 120);
    return point;
  }
  function applyRecurringRevenue() {
    const currentRates = getRates();
    state.money = Math.max(0, state.money + currentRates.baseMoney);
    state.totalMoney = Math.max(0, state.totalMoney + currentRates.baseMoney);
    applyProductTaskEffects();
    const productRevenue = applyProductRevenue();
    state.money = Math.max(0, state.money + productRevenue);
    state.totalMoney = Math.max(0, state.totalMoney + productRevenue);
  }


  function applyProductTaskEffects() {
    PRODUCTS.forEach(function (definition) {
      applySingleProductPipeline(getProduct(definition.id), definition);
    });
  }

  function applySingleProductPipeline(product, definition) {
    applyDevelopmentTask(product, definition);
    applyQaTask(product, definition);
    applySalesTask(product, definition);
    applyMarketingTask(product, definition);
    applyCrisisTask(product, definition);
    applySupportOperations(product, definition);
    applyProductLifecycleTick(product, definition);
  }

  function applyProductLifecycleTick(product, definition) {
    recalculateProductMrr(product, definition);
    applyProductMilestones(product, definition);
  }

  function getProductCategory(definition) {
    if (definition && definition.category) return definition.category;
    return definition && definition.type === "oneShot" ? "oneShotTool" : "productivity";
  }

  function getProductCategoryLabel(definition) {
    const labels = { productivity: "業務効率", document: "ドキュメント", oneShotTool: "売り切りツール", support: "サポート", crisis: "危機対応", security: "セキュリティ", sales: "営業支援", marketing: "広報支援" };
    return labels[getProductCategory(definition)] || "汎用";
  }

  function getAiProductAffinity(aiId, definition, taskId) {
    const category = getProductCategory(definition);
    const table = {
      boss: { all: 1.03 },
      dev01: { development: { productivity: 1.08, document: 1.08, support: 1.05, crisis: 1.05, security: 1.05, oneShotTool: 1.04 } },
      sales02: { sales: { sales: 1.12, oneShotTool: 1.12, productivity: 1.05, document: 1.05, support: 1.03 } },
      buzz03: { marketing: { marketing: 1.12, oneShotTool: 1.08, sales: 1.07, productivity: 1.04 } },
      care04: { support: { support: 1.15, productivity: 1.05, document: 1.04 } },
      security06: { qa: { security: 1.15, document: 1.10, support: 1.06, crisis: 1.06 } },
      fire05: { crisis: { crisis: 1.15, oneShotTool: 1.05 } }
    };
    const worker = table[aiId] || {};
    const byTask = worker[taskId] || {};
    return clamp(safeNumber(byTask[category], safeNumber(worker.all, 1)), 0.8, 1.2);
  }

  function getOperationModifiers(definition) { return OPERATIONS_RUNTIME.getModifiers(state, definition); }

  function applyAffinity(value, aiId, definition, taskId) {
    return safeNumber(value, 0) * getAiProductAffinity(aiId, definition, taskId);
  }

  // === Product Task Effects ===
  function applyDevelopmentTask(product, definition) {
    const flags = getProductFlags(product.id);
    const developmentWorkers = getAssignedWorkersForProduct("development", product.id);
    if (!developmentWorkers.length) return;

    if (definition.type === "subscription" && product.upgradeStatus === "upgrading") {
      developmentWorkers.forEach(function (workerId) { if (product.upgradeStatus === "upgrading") applySubscriptionUpgradeDevelopment(product, definition, workerId); });
      return;
    }

    if (product.status !== "developing") return;
    const modifiers = getOperationModifiers(definition);
    developmentWorkers.forEach(function (workerId) {
      const development = getDevelopmentEffect(workerId);
      product.progress = clamp(product.progress + applyAffinity(development.progress, workerId, definition, "development") * modifiers.development, 0, definition.developmentRequired);
      product.bugs = clamp(product.bugs + development.bugs * modifiers.bugGeneration, 0, 100);
      product.awareness = clamp(product.awareness + 0.04, 0, 100);
    });
    if (product.progress >= definition.developmentRequired && product.status !== "ready") {
      completeNewProductDevelopment(product, definition);
    }
  }

  function completeNewProductDevelopment(product, definition) {
    const flags = getProductFlags(product.id);
    product.status = "ready";
    product.progress = definition.developmentRequired;
    if (!flags.completedLogged) {
      flags.completedLogged = true;
      addLog("success", getProductLogText(product.id, "completed", definition.name + "が完成しました。"), product.id);
    }
    releaseDevelopmentWorkersAfterCompletion(product.id, definition.name + "が完成しました。{workers}は開発担当から外れました。");
  }

  function applySubscriptionUpgradeDevelopment(product, definition, workerId) {
    const modifiers = getOperationModifiers(definition);
    const upgrade = getUpgradeDevelopmentEffect(workerId);
    product.upgradeProgress = clamp(product.upgradeProgress + applyAffinity(upgrade.progress, workerId, definition, "development") * modifiers.development, 0, 100);
    product.bugs = clamp(product.bugs + upgrade.bugs * modifiers.bugGeneration, 0, 100);
    if (product.upgradeProgress >= 100) completeSubscriptionUpgrade(product, definition);
  }

  function completeSubscriptionUpgrade(product, definition) {
    product.version = getProductVersion(product) + 1;
    product.upgradeProgress = 0;
    product.upgradeStatus = "idle";
    product.quality = clamp(product.quality + 8, 0, 100);
    product.awareness = clamp(product.awareness + 5, 0, 100);
    product.bugs = clamp(product.bugs + 5, 0, 100);
    recalculateProductMrr(product, definition);
    addLog("success", getProductLogText(product.id, "upgradeCompleted", definition.name + "が v{version} にアップデートされました。").replace("{version}", getProductVersion(product)), product.id);
    releaseDevelopmentWorkersAfterCompletion(product.id, definition.name + "が v" + getProductVersion(product) + " にアップデートされました。{workers}は次の仕事待ちです。");
  }

  function applyQaTask(product, definition) {
    const flags = getProductFlags(product.id);
    const qaWorkers = getAssignedWorkersForProduct("qa", product.id);
    if (!qaWorkers.length || !canApplyQa(product)) return;

    const previousBugs = product.bugs;
    const modifiers = getOperationModifiers(definition);
    qaWorkers.forEach(function (workerId) {
      const qa = getQaEffect(workerId);
      product.quality = clamp(product.quality + applyAffinity(qa.quality, workerId, definition, "qa") * modifiers.qa, 0, 100);
      product.bugs = clamp(product.bugs + applyAffinity(qa.bugs, workerId, definition, "qa") * modifiers.qa, 0, 100);
    });
    if (qaWorkers.indexOf("security06") !== -1 && previousBugs > product.bugs && !flags.qaLogShown) {
      flags.qaLogShown = true;
      addLog("support", "Security-06が" + definition.name + "の未分類機能を整理しました。", "security06");
    }
  }

  function canApplyQa(product) {
    return ["developing", "ready", "selling"].indexOf(product.status) !== -1;
  }

  function applyMarketingTask(product, definition) {
    const flags = getProductFlags(product.id);
    const marketingWorkers = getAssignedWorkersForProduct("marketing", product.id);
    if (!marketingWorkers.length || !canApplyMarketing(product)) return;

    let marketingFire = 0;
    const modifiers = getOperationModifiers(definition);
    marketingWorkers.forEach(function (workerId) {
      const marketing = getMarketingEffect(workerId);
      product.awareness = clamp(product.awareness + applyAffinity(marketing.awareness, workerId, definition, "marketing") * modifiers.marketing, 0, 100);
      state.fire = clamp(state.fire + marketing.fire * modifiers.fireGeneration, 0, 100);
      adjustProductFire(product, marketing.fire * modifiers.fireGeneration * 0.75);
      marketingFire += marketing.fire;
    });
    if (marketingWorkers.indexOf("buzz03") !== -1 && !flags.marketingStartedLogged) {
      flags.marketingStartedLogged = true;
      addLog("success", getProductLogText(product.id, "marketingStarted", "Buzz-03が" + definition.name + "の広報を開始しました。認知度と通知欄が伸び始めました。"), "buzz03");
    }
    if (marketingWorkers.indexOf("buzz03") !== -1 && marketingFire > 0 && !flags.marketingFireLogged) {
      flags.marketingFireLogged = true;
      addLog("fire", "Buzz-03の広報で少し高温話題化しました。", "buzz03");
    }
  }

  function canApplyMarketing(product) {
    return ["developing", "ready", "selling"].indexOf(product.status) !== -1;
  }

  function applySupportOperations(product, definition) {
    if (definition.type !== "subscription") return;
    applySupportLoadGrowth(product, definition);
    applySupportTask(product, definition);
    updateSubscriptionSatisfaction(product, definition);
    updateChurnRisk(product, definition);
    applyChurn(product, definition);
  }

  function applySupportLoadGrowth(product, definition) {
    if (product.status !== "selling" || getProductCustomers(product) <= 0) return;
    const qualityPenalty = Math.max(0, 65 - product.quality) / 100;
    const bugPenalty = product.bugs / 80;
    const firePenalty = (state.fire + getProductFire(product) * PRODUCT_FIRE_SUPPORT_LOAD_WEIGHT) / 160;
    const loadGain = getProductCustomers(product) * SUPPORT_LOAD_RATE * (1 + qualityPenalty + bugPenalty + firePenalty);
    product.supportLoad = clamp(product.supportLoad + loadGain, 0, 100);
  }

  function applySupportTask(product, definition) {
    const modifiers = getOperationModifiers(definition);
    const supportWorkers = getAssignedWorkersForProduct("support", product.id);
    if (!supportWorkers.length || !canApplySupport(product, definition)) return;
    supportWorkers.forEach(function (workerId) {
      const support = getSupportEffect(workerId);
      product.supportLoad = clamp(product.supportLoad + applyAffinity(support.supportLoad, workerId, definition, "support") * modifiers.support, 0, 100);
      product.satisfaction = clamp(product.satisfaction + applyAffinity(support.satisfaction, workerId, definition, "support") * modifiers.support, 0, 100);
      state.fire = clamp(state.fire + support.fire * modifiers.support, 0, 100);
    });
  }

  function applyCrisisTask(product, definition) {
    const modifiers = getOperationModifiers(definition);
    const crisisWorkers = getAssignedWorkersForProduct("crisis", product.id);
    if (!crisisWorkers.length || !canApplyCrisis(product, definition)) return;
    const previousFire = state.fire;
    const previousProductFire = getProductFire(product);
    crisisWorkers.forEach(function (workerId) {
      const crisis = getCrisisEffect(workerId);
      state.fire = clamp(state.fire + applyAffinity(crisis.fire, workerId, definition, "crisis") * modifiers.crisis, 0, 100);
      adjustProductFire(product, applyAffinity(crisis.productFire || crisis.fire * 0.6, workerId, definition, "crisis") * modifiers.crisis);
      if (crisis.money) state.money = Math.max(0, state.money + crisis.money);
    });
    const flags = getProductFlags(product.id);
    if (crisisWorkers.indexOf("fire05") !== -1 && !flags.crisisStartedLogged) {
      flags.crisisStartedLogged = true;
      addLog("crisis", "Fire-05が炎上対応を開始しました。謝罪文の下書きが自動生成されました。", product.id);
    }
    if ((previousFire >= 50 && state.fire < 50 || previousProductFire >= 50 && getProductFire(product) < 50) && !flags.crisisContainedLogged) {
      flags.crisisContainedLogged = true;
      addLog("success", "Fire-05の対応で" + definition.name + "まわりの炎上が鎮火し始めました。", product.id);
    }
  }

  function canApplyCrisis(product, definition) {
    return product.status === "selling" || ((state.fire >= 50 || getProductFire(product) >= 40) && product.status !== "idea");
  }

  function canApplySupport(product, definition) {
    return definition.type === "subscription" && product.status === "selling" && getProductCustomers(product) > 0;
  }

  function updateSubscriptionSatisfaction(product, definition) {
    const modifiers = getOperationModifiers(definition);
    const pressure = product.supportLoad * 0.003 + product.bugs * 0.002 + Math.max(0, 60 - product.quality) * 0.002 + state.fire * 0.0015 + getProductFire(product) * PRODUCT_FIRE_SATISFACTION_PRESSURE;
    const recovery = product.quality >= 75 && product.bugs <= 15 ? 0.03 : 0;
    product.satisfaction = clamp(product.satisfaction - pressure * modifiers.churnPressure + recovery, 0, 100);
  }

  function updateChurnRisk(product, definition) {
    const modifiers = getOperationModifiers(definition);
    const crisisWorkers = getAssignedWorkersForProduct("crisis", product.id);
    const crisisMitigation = crisisWorkers.indexOf("fire05") !== -1 ? 6 : (crisisWorkers.length ? 2 : 0);
    const risk = Math.max(0, 70 - product.satisfaction) * 0.55 + product.supportLoad * 0.28 + product.bugs * 0.22 + state.fire * 0.15 + getProductFire(product) * PRODUCT_FIRE_CHURN_FACTOR - crisisMitigation;
    product.churnRisk = clamp(risk * modifiers.churnPressure, 0, 100);
  }

  function applyChurn(product, definition) {
    if (getProductCustomers(product) <= 0 || product.status !== "selling") return;
    const churnChance = clamp(product.churnRisk / 3500, 0, CHURN_CHANCE_MAX);
    if (Math.random() >= churnChance) return;
    product.customers = Math.max(0, getProductCustomers(product) - 1);
    state.churnCount = Math.max(0, Math.floor(safeNumber(state.churnCount, 0))) + 1;
    recalculateProductMrr(product, definition);
    const flags = getProductFlags(product.id);
    if (!flags.firstChurnLogged) {
      flags.firstChurnLogged = true;
      addLog("support", definition.name + "から顧客が1社解約しました。サポート窓口が少し静かになりました。", product.id);
    }
  }

  function applySalesTask(product, definition) {
    const flags = getProductFlags(product.id);
    const salesWorkers = getAssignedWorkersForProduct("sales", product.id);
    if ((product.status !== "ready" && product.status !== "selling") || !salesWorkers.length) return;

    if (product.status !== "selling") {
      product.status = "selling";
      if (!flags.salesStartedLogged) {
        flags.salesStartedLogged = true;
        addLog("success", getProductLogText(product.id, "salesStarted", definition.name + "の販売を開始しました。"), product.id);
      }
    }
    product.sellingSeconds += 1;
    if (definition.type === "oneShot") product.oneShotSalesPityCounter += 1;
    else product.salesPityCounter += 1;
    salesWorkers.forEach(function (workerId) {
      if (definition.type === "oneShot") applyOneShotSalesActivity(product, definition, workerId, flags);
      else applySalesActivity(product, definition, workerId, flags);
    });
  }

  function applySalesActivity(product, definition, workerId, flags) {
    const modifiers = getOperationModifiers(definition);
    const sales = getSalesEffect(workerId, product, definition);
    product.awareness = clamp(product.awareness + sales.awareness * modifiers.sales, 0, 100);
    state.fire = clamp(state.fire + sales.fire * modifiers.fireGeneration, 0, 100);
    adjustProductFire(product, Math.max(0.4, sales.fire * modifiers.fireGeneration * definition.risk * 10));

    if (getProductCustomers(product) === 0 && !flags.firstCustomerGranted && product.sellingSeconds >= 3) {
      addProductCustomer(product, definition, flags, true);
      flags.firstCustomerGranted = true;
      product.salesPityCounter = 0;
      return;
    }

    const pityLimit = workerId === "sales02" ? SUBSCRIPTION_SALES02_PITY_LIMIT : SUBSCRIPTION_BOSS_PITY_LIMIT;
    if (Math.random() < sales.customerChance * modifiers.sales || product.salesPityCounter >= pityLimit) {
      addProductCustomer(product, definition, flags, false);
      product.salesPityCounter = 0;
    }
  }

  function applyOneShotSalesActivity(product, definition, workerId, flags) {
    const modifiers = getOperationModifiers(definition);
    const sales = getOneShotSalesEffect(workerId, product, definition);
    product.awareness = clamp(product.awareness + sales.awareness * modifiers.sales, 0, 100);
    state.fire = clamp(state.fire + sales.fire * modifiers.fireGeneration, 0, 100);
    adjustProductFire(product, Math.max(0.4, sales.fire * modifiers.fireGeneration * definition.risk * 10));
    if (getProductUnitsSold(product) === 0 && !flags.firstSaleLogged && product.sellingSeconds >= ONE_SHOT_FIRST_SALE_GUARANTEE_SECONDS) {
      addOneShotSale(product, definition, flags);
      product.oneShotSalesPityCounter = 0;
      return;
    }
    const pityLimit = workerId === "sales02" ? ONE_SHOT_SALES02_PITY_LIMIT : ONE_SHOT_BOSS_PITY_LIMIT;
    if (Math.random() < sales.saleChance * modifiers.sales || product.oneShotSalesPityCounter >= pityLimit) {
      addOneShotSale(product, definition, flags);
      product.oneShotSalesPityCounter = 0;
    }
  }

  function addOneShotSale(product, definition, flags) {
    const price = safeNumber(definition.price, 0);
    product.unitsSold = getProductUnitsSold(product) + 1;
    product.lifetimeRevenue = Math.max(0, safeNumber(product.lifetimeRevenue, 0) + price);
    state.money = Math.max(0, state.money + price);
    state.totalMoney = Math.max(0, state.totalMoney + price);
    applyProductMilestones(product, definition);
  }

  function addProductCustomer(product, definition, flags, firstGuaranteed) {
    product.customers = getProductCustomers(product) + 1;
    recalculateProductMrr(product, definition);
    const mrrText = formatCurrency(getProductMrr(product, definition)) + "/月";
    if (firstGuaranteed || (getProductCustomers(product) === 1 && !flags.firstCustomerGranted)) {
      flags.firstCustomerGranted = true;
      addLog("success", definition.name + "に初めての顧客が付きました。AI社長はこれを市場検証成功と呼んでいます。MRRは" + mrrText + "です。", product.id);
    } else {
      addLog("success", definition.name + "に新規顧客が1社付きました。MRRが" + mrrText + "に増えました。", product.id);
    }
    applyProductMilestones(product, definition);
  }

  function applyProductMilestones(product, definition) {
    const flags = getProductFlags(product.id);
    if (product.awareness >= 50 && !flags.awareness50Logged) {
      flags.awareness50Logged = true;
      addLog("success", getProductLogText(product.id, "awareness50", definition.name + "の認知度が50を超えました。"), product.id);
    }
    if (product.awareness >= 100 && !flags.awareness100Logged) {
      flags.awareness100Logged = true;
      addLog("success", getProductLogText(product.id, "awareness100", definition.name + "の認知度が100に到達しました。"), product.id);
    }
    if (definition.type === "oneShot") {
      const unitsSold = getProductUnitsSold(product);
      if (unitsSold >= 1 && !flags.firstSaleLogged) {
        flags.firstSaleLogged = true;
        addLog("success", getProductLogText(product.id, "firstSale", definition.name + "が初めて売れました。即時売上 {price} を獲得しました。").replace("{price}", formatCurrency(definition.price)), product.id);
      }
      if (unitsSold >= 10 && !flags.sales10Logged) {
        flags.sales10Logged = true;
        addLog("success", getProductLogText(product.id, "sales10", definition.name + "の販売数が10本を超えました。"), product.id);
      }
      if (unitsSold >= 50 && !flags.sales50Logged) {
        flags.sales50Logged = true;
        addLog("success", getProductLogText(product.id, "sales50", definition.name + "の販売数が50本を超えました。"), product.id);
      }
      if (unitsSold >= 100 && !flags.sales100Logged) {
        flags.sales100Logged = true;
        addLog("success", getProductLogText(product.id, "sales100", definition.name + "の販売数が100本を超えました。"), product.id);
      }
      return;
    }
    if (getProductCustomers(product) >= 10 && !flags.customer10Logged) {
      flags.customer10Logged = true;
      addLog("success", getProductLogText(product.id, "customer10", definition.name + "の顧客が10社に到達しました。"), product.id);
    }
    if (getProductCustomers(product) >= 50 && !flags.customer50Logged) {
      flags.customer50Logged = true;
      addLog("success", getProductLogText(product.id, "customer50", definition.name + "の顧客が50社に到達しました。"), product.id);
    }
    if (getProductCustomers(product) >= 100 && !flags.customer100Logged) {
      flags.customer100Logged = true;
      addLog("success", getProductLogText(product.id, "customer100", definition.name + "の顧客が100社に到達しました。"), product.id);
    }
    if (getProductMrr(product, definition) >= 10000 && !flags.mrr10kLogged) {
      flags.mrr10kLogged = true;
      addLog("success", getProductLogText(product.id, "mrr10k", definition.name + "のMRRが¥10K/月を超えました。"), product.id);
    }
    if (getProductMrr(product, definition) >= 100000 && !flags.mrr100kLogged) {
      flags.mrr100kLogged = true;
      addLog("success", getProductLogText(product.id, "mrr100k", definition.name + "のMRRが¥100K/月を超えました。"), product.id);
    }
    if (product.supportLoad >= 50 && !flags.supportLoad50Logged) {
      flags.supportLoad50Logged = true;
      addLog("support", definition.name + "のサポート負荷が50を超えました。Care-04の出番が近づいています。", product.id);
    }
    if (product.satisfaction < 40 && !flags.satisfaction40Logged) {
      flags.satisfaction40Logged = true;
      addLog("support", definition.name + "の満足度が40を下回りました。顧客の沈黙が少し重くなっています。", product.id);
    }
    if (product.churnRisk >= 50 && !flags.churnRisk50Logged) {
      flags.churnRisk50Logged = true;
      addLog("fire", definition.name + "の解約リスクが50を超えました。継続課金に緊張感が出ています。", product.id);
    }
    if (getProductFire(product) >= 50 && !flags.productFire50Logged) {
      flags.productFire50Logged = true;
      addLog("fire", definition.name + "の製品炎上が50を超えました。Fire-05の出番です。", product.id);
    }
    if (getProductFire(product) >= 80 && !flags.productFire80Logged) {
      flags.productFire80Logged = true;
      addLog("fire", definition.name + "の製品炎上が80を超えました。販売と解約リスクに影響が出ています。", product.id);
    }
    if (getProductFire(product) >= 100 && !flags.productFire100Logged) {
      flags.productFire100Logged = true;
      addLog("fire", definition.name + "の製品炎上が100に到達しました。通知欄が製品名で埋まっています。", product.id);
    }
  }

  function applyProductRevenue() {
    return PRODUCTS.reduce(function (sum, definition) {
      const product = getProduct(definition.id);
      if (definition.type === "subscription") return sum + applySubscriptionRevenue(product, definition);
      if (definition.type === "oneShot") return sum + applyOneShotRevenue(product, definition);
      return sum;
    }, 0);
  }

  function applySubscriptionRevenue(product, definition) {
    const revenue = getProductRevenuePerSecond(product, definition);
    product.lifetimeRevenue = Math.max(0, safeNumber(product.lifetimeRevenue, 0) + revenue);
    return revenue;
  }

  function applyOneShotRevenue(product, definition) {
    return 0;
  }

  function applyPenalties() {
    const bugDefinition = getHighestBugProductDefinition();
    if (bugDefinition && getDashboardBugLevel() >= 50 && Math.random() < 0.3) { state.money = Math.max(0, Math.floor(state.money * 0.95)); addLog("bug", bugDefinition.name + "の未分類機能が一斉に自己主張しました。売上の5%が原因調査に変換されました。", bugDefinition.id); }
    if (state.fire >= 50 && Math.random() < 0.3) { state.money = Math.max(0, Math.floor(state.money * 0.95)); addLog("fire", "外部の熱量が急上昇しました。売上5%が冷却材になりました。", "company"); }
  }

  function canExpandCompany() {
    return state.companyLevel < getCompanyLevel(state.totalMoney) && state.companyLevel < MAX_LEVEL;
  }

  function expandCompanyLevel() {
    if (!canExpandCompany()) return;
    const previousLevel = state.companyLevel;
    const nextLevel = previousLevel + 1;
    state.companyLevel = nextLevel;
    addLog("success", "会社Lvが" + nextLevel + "に上昇しました。" + getLevelUpMessage(nextLevel), "company");
    EMPLOYEES.filter(function (employee) { return employee.unlockLevel === nextLevel; }).forEach(function (employee) {
      addLog("success", employee.code + "が解放されました。" + getUnlockMessage(employee.id), employee.id);
    });
    const unlocked = EMPLOYEES.filter(function (employee) { return employee.unlockLevel === nextLevel; });
    const suffix = unlocked.length ? " / " + unlocked.map(function (employee) { return employee.code + "解放"; }).join("・") : "";
    showLevelToast("会社Lv " + nextLevel + " 到達" + suffix);
    applyAchievements(false);
    saveGame();
    render();
  }

  function getLevelUpMessage(level) {
    if (level === 2) return "仮想オフィスに新しい区画が生成されました。";
    if (level === 3) return "自動化オフィスが稼働を開始しました。";
    if (level === 4) return "クラウド企業フロアが展開されました。";
    if (level >= 5) return "AI企業タワーが上層へ拡張されました。";
    return "仮想オフィスの処理能力が向上しました。";
  }

  function getUnlockMessage(employeeId) {
    const messages = {
      buzz03: "広報区画が自動生成されました。",
      care04: "サポート窓口が仮想オフィスに接続されました。",
      fire05: "危機管理ルームが静かに起動しました。",
      security06: "品質管理ゲートが仮想オフィスに設置されました。"
    };
    return messages[employeeId] || "新しいAI社員用の席が生成されました。";
  }

  function showLevelToast(text) {
    const toast = document.getElementById("levelToast");
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = text;
    toast.hidden = false;
    toast.classList.add("show");
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("show");
      toast.hidden = true;
    }, 3600);
  }

  function showAppToast(message, tone) {
    const toast = document.getElementById("appToast");
    if (!toast || !message) return;
    window.clearTimeout(appToastTimer);
    toast.textContent = message;
    toast.className = "app-toast show " + (tone === "warning" ? "warning" : "success");
    toast.hidden = false;
    appToastTimer = window.setTimeout(function () {
      toast.classList.remove("show");
      toast.hidden = true;
    }, 2800);
  }

  function addUpgradeLog(employee, nextLevel) {
    const latest = state.logs[0];
    const now = Date.now();
    if (latest && latest.type === "system" && latest.employeeId === employee.id && latest.upgradeLog && now - latest.createdAt < 12000) {
      latest.upgradeCount = (latest.upgradeCount || 1) + 1;
      latest.createdAt = now;
      latest.text = employee.code + "を" + latest.upgradeCount + "回連続で強化しました。現在Lv" + nextLevel + "です。" + getUpgradeFlavor(employee.id);
      return;
    }
    const log = createLog("system", employee.code + "を強化しました。現在Lv" + nextLevel + "です。" + getUpgradeFlavor(employee.id), employee.id);
    log.upgradeLog = true;
    log.upgradeCount = 1;
    state.logs.unshift(log);
    state.logs = state.logs.slice(0, MAX_LOGS);
  }

  function getUpgradeFlavor(employeeId) {
    const messages = {
      dev01: ["軽微な最適化のはずでした。", "処理速度と未知の挙動が増えました。", "コードが少し自信を持ちました。"],
      sales02: ["約束の処理能力が上がりました。", "できます、の声量が増えました。", "商談資料が少し未来寄りになりました。"],
      buzz03: ["投稿予約が軽快になりました。", "話題化エンジンが明るく回っています。", "高温話題化の予感がします。"],
      care04: ["長文返信の整列速度が上がりました。", "問い合わせ分類が少し静かになりました。", "前提整理プロトコルが強化されました。"],
      fire05: ["謝罪文生成レーンが増設されました。", "信頼回復プロトコルが少し太くなりました。", "余計な一文の検出精度が上がった気がします。"],
      security06: ["検査ゲートが一段厳しくなりました。", "安全確認が高速化しました。", "未分類機能への視線が鋭くなりました。"]
    };
    const list = messages[employeeId] || ["処理能力が上がりました。"];
    return list[Math.floor(Math.random() * list.length)];
  }

  function classifyStoryEvent(type, text, employeeId) {
    const value = String(text || "");
    let kind = "";
    let title = "";
    let impact = "";
    if (/会社Lvが/.test(value)) { const levelMatch = value.match(/会社Lvが(\d+)/); kind = levelMatch ? "level-" + levelMatch[1] : "level"; title = "オフィスが成長しました"; impact = "新しい設備と可能性が解放されました"; }
    else if (/完成しました|アップデートされました/.test(value)) { kind = "release-" + employeeId + "-" + (value.indexOf("アップデート") >= 0 ? "upgrade" : "first"); title = "製品をリリースしました"; impact = "次は販売担当を設定して市場へ届けましょう"; }
    else if (/初めての顧客|初めて売れました/.test(value)) { kind = "first-revenue-" + employeeId; title = "初売上を達成しました！"; impact = "小さな会社に、最初の市場評価が届きました"; }
    else if (/大型契約|大口|100社|100本/.test(value)) { kind = "major-deal-" + employeeId + "-" + value.slice(0, 12); title = "会社史に残る成果です"; impact = "チームの働きが大きな結果につながりました"; }
    else if ((type === "fire" || type === "bug") && /100|事故|急上昇/.test(value)) { kind = "crisis-" + employeeId + "-" + value.slice(0, 10); title = "緊急対応が必要です"; impact = "おすすめアクションから最優先の対策を選べます"; }
    if (!kind || state.seenStoryEvents[kind]) return null;
    return { id: kind, kicker: type === "fire" || type === "bug" ? "URGENT REPORT" : "COMPANY NEWS", title: title, text: value, impact: impact, characterId: CHARACTER_ASSETS[employeeId] ? employeeId : "boss" };
  }

  function queueStoryFromLog(type, text, employeeId) {
    const event = classifyStoryEvent(type, text, employeeId);
    if (!event) return;
    state.seenStoryEvents[event.id] = true;
    state.storyEvent = event;
  }

  function renderStoryModal() {
    const modal = document.getElementById("storyModal");
    const event = normalizeStoryEvent(state.storyEvent);
    if (!modal) return;
    const wasOpen = storyModalOpen;
    storyModalOpen = Boolean(event);
    modal.hidden = !event;
    if (!event) { syncModalIsolation(); return; }
    setText("storyKicker", event.kicker);
    setText("storyTitle", event.title);
    setText("storyText", event.text);
    setText("storyImpact", event.impact);
    const character = document.getElementById("storyCharacter");
    if (character) { character.innerHTML = getCharacterAvatarHtml(event.characterId, "story-avatar", false); activateCharacterImageFallbacks(character); }
    if (!wasOpen) {
      const close = document.getElementById("storyClose");
      if (close && typeof close.focus === "function") close.focus();
    }
    syncModalIsolation();
  }

  function closeStoryModal() {
    state.storyEvent = null;
    storyModalOpen = false;
    const modal = document.getElementById("storyModal");
    if (modal) modal.hidden = true;
    syncModalIsolation();
    saveGame();
    navigateToPage("home", { updateHistory: true, scrollTop: true });
    focusMainContent();
  }

  function addLog(type, text, employeeId) {
    queueStoryFromLog(type, text, employeeId || "company");
    state.logs.unshift(createLog(type, text, employeeId || "company"));
    state.logs = state.logs.slice(0, MAX_LOGS);
  }

  function createLog(type, text, employeeId) {
    return { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), type: LOG_LABELS[type] ? type : "normal", text: String(text || ""), employeeId: employeeId || "company", createdAt: Date.now() };
  }

  function addRandomReportLog() {
    const hiredIds = EMPLOYEES.filter(function (employee) { return (state.employees[employee.id] || 0) > 0; }).map(function (employee) { return employee.id; });
    if (hiredIds.length > 0) {
      const candidates = REPORT_LOGS.filter(function (log) { return hiredIds.indexOf(log.employeeId) >= 0; });
      const log = candidates[Math.floor(Math.random() * candidates.length)];
      if (log) { addLog(log.type, log.text, log.employeeId); renderLatestLog(); renderLogs(); }
    }
    scheduleRandomReport();
  }

  function scheduleRandomReport() {
    window.clearTimeout(randomLogTimer);
    randomLogTimer = window.setTimeout(addRandomReportLog, 10000 + Math.floor(Math.random() * 20000));
  }

  function getPageFromLocation() {
    const hash = typeof window !== "undefined" && window.location ? String(window.location.hash || "").replace(/^#/, "") : "";
    return APP_PAGES[hash] ? hash : "home";
  }

  function setAppPage(pageId) {
    const nextPage = APP_PAGES[pageId] ? pageId : "home";
    currentAppPage = nextPage;
    if (typeof document.querySelectorAll === "function") {
      document.querySelectorAll("[data-app-page]").forEach(function (page) { page.hidden = page.getAttribute("data-app-page") !== nextPage; });
      document.querySelectorAll("[data-page-link]").forEach(function (link) {
        const active = link.getAttribute("data-page-link") === nextPage;
        if (active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    }
    setText("currentPageTitle", APP_PAGES[nextPage].label);
    setText("currentPageDescription", APP_PAGES[nextPage].description);
    if (document.body && typeof document.body.setAttribute === "function") document.body.setAttribute("data-page", nextPage);
    document.title = APP_PAGES[nextPage].title;
    renderOnboarding();
    return nextPage;
  }

  function navigateToPage(pageId, options) {
    const nextPage = setAppPage(pageId);
    const settings = options || {};
    if (settings.updateHistory !== false && typeof window !== "undefined" && window.location) {
      const nextHash = "#" + nextPage;
      if (window.location.hash !== nextHash) {
        if (window.history && typeof window.history.pushState === "function") window.history.pushState({ page: nextPage }, "", nextHash);
        else window.location.hash = nextHash;
      }
    }
    if (settings.scrollTop && typeof window !== "undefined" && typeof window.scrollTo === "function") window.scrollTo({ top: 0, behavior: settings.smooth ? "smooth" : "auto" });
    return nextPage;
  }

  function focusMainContent() {
    const mainContent = document.getElementById("mainContent");
    if (mainContent && typeof mainContent.focus === "function") mainContent.focus({ preventScroll: true });
  }

  function initializePageNavigation() {
    const initialPage = getPageFromLocation();
    if (typeof window !== "undefined" && window.location && !APP_PAGES[String(window.location.hash || "").replace(/^#/, "")] && window.history && typeof window.history.replaceState === "function") window.history.replaceState({ page: initialPage }, "", "#" + initialPage);
    setAppPage(initialPage);
    if (typeof document.querySelectorAll === "function") document.querySelectorAll("[data-page-link]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        const pageId = link.getAttribute("data-page-link");
        if (!APP_PAGES[pageId]) return;
        event.preventDefault();
        navigateToPage(pageId, { updateHistory: true, scrollTop: true });
        focusMainContent();
      });
    });
    const productHotspot = document.getElementById("officeProductHotspot");
    if (productHotspot) productHotspot.addEventListener("click", function () { navigateToPage("products", { updateHistory: true, scrollTop: true }); focusMainContent(); });
    const decisionHotspot = document.getElementById("officeDecisionHotspot");
    if (decisionHotspot) decisionHotspot.addEventListener("click", function () { scrollToElement("decisionPanel"); });
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("popstate", function () { setAppPage(getPageFromLocation()); });
      window.addEventListener("hashchange", function () { setAppPage(getPageFromLocation()); });
    }
  }

  function setNavigationBadge(pageId, count, label) {
    if (typeof document.querySelector !== "function") return;
    const badge = document.querySelector('[data-nav-badge="' + pageId + '"]');
    const link = document.querySelector('[data-page-link="' + pageId + '"]');
    if (!badge || !link) return;
    const safeCount = Math.max(0, Math.floor(safeNumber(count, 0)));
    badge.hidden = safeCount === 0;
    badge.textContent = safeCount > 9 ? "9+" : String(safeCount);
    const baseLabel = APP_PAGES[pageId].label;
    link.setAttribute("aria-label", safeCount ? baseLabel + "、" + label + safeCount + "件" : baseLabel);
  }

  function renderNavigationBadges() {
    const riskCount = PRODUCTS.filter(function (definition) {
      const product = getProduct(definition.id);
      return product.status !== "idea" && (safeNumber(product.bugs, 0) >= 55 || getProductFire(product) >= 55 || safeNumber(product.churnRisk, 0) >= 55 || safeNumber(product.supportLoad, 0) >= 55);
    }).length + (state.fire >= 65 ? 1 : 0);
    setNavigationBadge("home", state.pendingDecisionEvent ? 1 : 0, "未判断");
    setNavigationBadge("products", riskCount, "リスク");
    setNavigationBadge("team", 0, "通知");
    setNavigationBadge("management", getClaimableMissions().length, "未受取報酬");
    setNavigationBadge("records", 0, "通知");
  }

  // === Rendering: Dashboard ===
  function render() {
    renderStatus();
    renderStrategyPanel();
    renderInsightsPanel();
    renderSaveManagerPanel();
    renderRiskPanel();
    renderNextRecommendationPanel();
    renderDecisionPanel();
    renderCompanyExpansionPanel();
    renderPrimaryProductPanel();
    renderProductPanel();
    renderProductDetailModal();
    renderProductActionMenuModal();
    renderAssignments();
    renderTaskPresetPanel();
    renderProductObjectives();
    renderAchievements();
    renderMissions();
    renderOffice();
    renderCompanyDetails();
    renderOnboarding();
    renderStoryModal();
    renderEmployees();
    renderDebugPanel();
    renderLatestLog();
    renderLogs();
    renderNavigationBadges();
  }
  function renderStrategyPanel() {
    const panel = document.getElementById("strategyPanel");
    if (!panel) return;
    const synergies = OPERATIONS_RUNTIME.getActiveSynergies(state, null);
    const relationships = OPERATIONS_RUNTIME.getAllActiveRelationships(state);
    panel.innerHTML = INSIGHTS_RENDERER.getStrategyHtml(STRATEGIES, state.strategyId, synergies, relationships);
    activateCharacterImageFallbacks(panel);
    panel.querySelectorAll("button[data-strategy-id]").forEach(function (button) {
      button.addEventListener("click", function () { setCompanyStrategy(button.getAttribute("data-strategy-id")); });
    });
  }


  function renderInsightsPanel() {
    const panel = document.getElementById("insightsPanel");
    if (!panel) return;
    const history = state.metricHistory && state.metricHistory.length ? state.metricHistory : [OPERATIONS_RUNTIME.sampleMetrics(state, {
      mrr: getTotalProductMrr(), customers: getTotalProductCustomers(), bugs: getDashboardBugLevel(), productFire: getMaxProductFireLevel()
    })];
    panel.innerHTML = INSIGHTS_RENDERER.getHistoryHtml(history);
  }

  function renderSaveManagerPanel() {
    const select = document.getElementById("saveSlotSelect");
    if (!select) return;
    const slots = SAVE_RUNTIME.listSlots(STORAGE);
    const saveStatus = document.getElementById("saveManagerStatus");
    if (saveStatus && !saveStatus.textContent) saveStatus.textContent = getStorageModeNotice() || "自動保存は有効です。重要な節目はスロット保存やJSON書き出しも利用できます。";
    Array.prototype.forEach.call(select.options || [], function (option) {
      const slot = slots.find(function (item) { return item.id === option.value; });
      if (!slot) return;
      option.textContent = "スロット" + slot.id + (slot.occupied ? (slot.invalid ? "（破損）" : "（会社Lv" + slot.companyLevel + "）") : "（空）");
    });
  }

  function renderStatus() {
    setText("companyLevel", state.companyLevel);
    setText("money", formatCurrency(state.money));
    setText("totalMoney", formatCurrency(state.totalMoney));
    setText("users", formatCustomers(getTotalProductCustomers()));
    setText("totalMrrDashboard", formatCurrency(getTotalProductMrr()) + "/月");
    setText("bugs", Math.round(getDashboardBugLevel()) + " / 100");
    setText("fire", Math.round(state.fire) + " / 100");
    setText("nextLevel", state.companyLevel >= MAX_LEVEL ? "最大Lv" : (canExpandCompany() ? "拡張可能" : "あと" + formatCurrency(Math.max(0, LEVEL_THRESHOLDS[state.companyLevel] - state.totalMoney))));
    setText("nextUnlock", getNextUnlockText());
    const rates = getRates();
    setText("incomeRate", formatSignedCurrencyRate(rates.money) + " / 秒");
    setText("baseIncomeRate", formatSignedCurrencyRate(rates.baseMoney) + " / 秒");
    setText("productIncomeRate", formatSignedCurrencyRate(rates.productRevenue) + " / 秒");
    renderActivity();
    setText("startupBoostLabel", getEarlyStageMultiplier() > 1 ? "創業加速" : "稼働状態");
    setText("startupBoost", getEarlyStageMultiplier() > 1 ? "基礎受託 x" + getEarlyStageMultiplier() : "通常稼働");
    const boostCard = document.getElementById("startupBoost") ? document.getElementById("startupBoost").closest(".status-card") : null;
    if (boostCard) boostCard.classList.toggle("active", getEarlyStageMultiplier() > 1);
    const nextCard = document.getElementById("nextLevelCard");
    if (nextCard) nextCard.classList.toggle("has-unlock", Boolean(getNextUnlockText()));
  }

  function setCompanyStrategy(strategyId) {
    const strategy = OPERATIONS_RUNTIME.getStrategy(strategyId);
    if (state.strategyId === strategy.id) return false;
    state.strategyId = strategy.id;
    addLog("system", "会社方針を「" + strategy.label + "」へ変更しました。", "company");
    saveGame();
    render();
    showAppToast("会社方針を「" + strategy.label + "」へ変更しました", "success");
    return true;
  }

  function getHighestOperationalRisk() {
    return PRODUCTS.reduce(function (best, definition) {
      const product = getProduct(definition.id);
      if (product.status === "idea") return best;
      const candidates = [
        { type: "製品炎上", score: getProductFire(product) },
        { type: "解約リスク", score: definition.type === "subscription" ? safeNumber(product.churnRisk, 0) : 0 },
        { type: "サポート負荷", score: definition.type === "subscription" ? safeNumber(product.supportLoad, 0) : 0 },
        { type: "製品バグ", score: safeNumber(product.bugs, 0) },
        { type: "品質低下", score: Math.max(0, 100 - safeNumber(product.quality, 0)) }
      ];
      candidates.forEach(function (candidate) {
        if (candidate.score > best.score) {
          best = { definition: definition, product: product, type: candidate.type, score: candidate.score };
        }
      });
      return best;
    }, { definition: null, product: null, type: "", score: 0 });
  }

  function renderActivity() {
    const element = document.getElementById("activityText");
    const panel = document.getElementById("activityPanel");
    if (!element) return;
    const rates = getRates();
    const currentOperationalRisk = getHighestOperationalRisk();
    if (panel) panel.classList.toggle("danger", getDashboardBugLevel() >= 80 || state.fire >= 80 || currentOperationalRisk.score >= 55);
    if (!hasAnyEmployee() && !hasActiveAssignment()) {
      element.textContent = "AI社員の起動待ちです。まず無料雇用かAI社長のタスク割り振りを使いましょう。";
      return;
    }
    const parts = [];
    const dashboardBugLevel = getDashboardBugLevel();
    if (dashboardBugLevel >= 100) parts.push("バグ100: 事故イベント発生注意 / " + getBugMitigationText());
    else if (dashboardBugLevel >= 80) parts.push("バグ高: " + getBugMitigationText());
    if (state.fire >= 100) parts.push("炎上100: 離脱イベント注意");
    else if (state.fire >= 80) parts.push("炎上高: 火消し優先");
    if (rates.money > 0) parts.push("売上 +" + formatCurrency(rates.money) + "/秒");
    if (rates.money < 0) parts.push("売上 -" + formatCurrency(Math.abs(rates.money)) + "/秒");
    if (rates.bugs > 0) parts.push("バグ +" + rates.bugs.toFixed(1) + "/秒");
    if (rates.fire > 0) parts.push("炎上 +" + rates.fire.toFixed(1) + "/秒");
    if (rates.productRevenue > 0) parts.push("MRR継続 +" + formatCurrencyPrecise(rates.productRevenue) + "/秒");
    if (rates.baseMoney !== 0) parts.push("基礎受託 " + formatSignedCurrencyRate(rates.baseMoney) + "/秒");
    const hasActiveSalesWork = PRODUCTS.some(function (definition) { return getProduct(definition.id).status === "selling" && getAssignedWorkersForProduct("sales", definition.id).length; });
    if (hasActiveSalesWork) parts.push("顧客獲得判定中");
    const operationRisk = getHighestOperationalRisk();
    if (operationRisk.definition && operationRisk.score >= 55) parts.push(operationRisk.definition.name + "の" + operationRisk.type + " " + Math.round(operationRisk.score));
    if (rates.bugs < 0) parts.push("バグ " + rates.bugs.toFixed(1) + "/秒");
    if (rates.fire < 0) parts.push("炎上 " + rates.fire.toFixed(1) + "/秒");
    element.textContent = parts.join(" / ") || "AI社員は静かに待機中です。";
  }

  function getTutorialStage() {
    if (tutorialReplayStep >= 1 && tutorialReplayStep <= 3) return tutorialReplayStep;
    if (state.tutorialCompleted) return 4;
    const hired = EMPLOYEES.some(function (employee) { return (state.employees[employee.id] || 0) > 0; });
    if (!hired) return 1;
    const hasFirstRevenue = state.totalMoney > 0 || hasRevenueProduct() || PRODUCTS.some(function (definition) { return getProductUnitsSold(getProduct(definition.id)) > 0; });
    if (hasFirstRevenue) return 4;
    const hiredWorkerAssigned = EMPLOYEES.some(function (employee) { return (state.employees[employee.id] || 0) > 0 && Boolean(getOfficeWorkerAssignment(employee.id)); });
    if (!hiredWorkerAssigned) return 2;
    return 3;
  }

  function getTutorialContent(stage) {
    if (stage === 1) return { title: "最初の仲間を迎えよう", text: "Dev-01かSales-02を創業クレジットで無料雇用します。社員カードから実際に選んでください。", label: "AI社員を選ぶ", characterId: "boss" };
    if (stage === 2) return { title: "仕事をひとつ任せよう", text: "雇ったAIをAI日報メーカーの開発へ割り振ります。担当変更画面で内容を確認して決定してください。", label: "担当を決める", characterId: getFirstHiredWorkerId() };
    return { title: "最初の売上をつくろう", text: "製品完成後に販売担当を設定すると売上判定が始まります。いま必要な操作を製品画面で確認しましょう。", label: "製品を確認する", characterId: getFirstHiredWorkerId() };
  }

  function getFirstHiredWorkerId() {
    const employee = EMPLOYEES.find(function (item) { return (state.employees[item.id] || 0) > 0; });
    return employee ? employee.id : "boss";
  }

  function renderOnboarding() {
    const panel = document.getElementById("tutorialPanel");
    if (!panel) return;
    const stage = getTutorialStage();
    const targetPage = stage === 3 ? "products" : "team";
    const shouldHide = state.tutorialDismissed || stage > 3;
    const contextVisible = currentAppPage === "home";
    const officeStage = document.getElementById("officeStage");
    panel.hidden = shouldHide || !contextVisible;
    if (officeStage && typeof officeStage.setAttribute === "function") officeStage.setAttribute("data-tutorial-stage", shouldHide || !contextVisible ? "0" : String(stage));
    if (typeof document.querySelectorAll === "function") document.querySelectorAll(".tutorial-target").forEach(function (element) { element.classList.remove("tutorial-target"); });
    if (shouldHide || !contextVisible) return;
    const content = getTutorialContent(stage);
    if (typeof panel.setAttribute === "function") panel.setAttribute("data-target-page", targetPage);
    setText("tutorialStepLabel", stage + " / 3");
    setText("tutorialTitle", content.title);
    setText("tutorialText", content.text);
    setText("tutorialAction", content.label);
    const progress = document.getElementById("tutorialProgressBar");
    if (progress && progress.style) progress.style.width = Math.round(stage / 3 * 100) + "%";
    const character = document.getElementById("tutorialCharacter");
    if (character) { character.innerHTML = getCharacterAvatarHtml(content.characterId, "tutorial-avatar", false); activateCharacterImageFallbacks(character); }
    if (typeof panel.setAttribute === "function") panel.setAttribute("data-tutorial-stage", String(stage));
    let tutorialTarget = null;
    if (typeof document.querySelector === "function") {
      if (stage === 1) tutorialTarget = document.querySelector('[data-office-worker="boss"]');
      else if (stage === 2) tutorialTarget = document.querySelector('[data-office-worker="' + getFirstHiredWorkerId() + '"]');
      else tutorialTarget = document.getElementById("officeProductHotspot");
    }
    if (tutorialTarget && tutorialTarget.classList) {
      tutorialTarget.classList.add("tutorial-target");
      const targetX = tutorialTarget.style && tutorialTarget.style.getPropertyValue ? tutorialTarget.style.getPropertyValue("--worker-x") : "";
      if (panel.style && panel.style.setProperty) panel.style.setProperty("--coach-arrow-x", targetX || (stage === 3 ? "88%" : "50%"));
    }
  }

  function handleTutorialAction() {
    const stage = getTutorialStage();
    const replaying = tutorialReplayStep > 0;
    if (stage === 1) {
      if (replaying) tutorialReplayStep = 2;
      navigateToPage("team", { updateHistory: true, scrollTop: true });
      focusMainContent();
      dashboardUi.employeesExpanded = true;
      renderEmployees();
      scrollToElement("employeePanel");
      return;
    }
    if (stage === 2) {
      if (replaying) tutorialReplayStep = 3;
      navigateToPage("team", { updateHistory: true, scrollTop: true });
      focusMainContent();
      openWorkerAssignmentModal(getFirstHiredWorkerId());
      renderOnboarding();
      return;
    }
    if (replaying) { tutorialReplayStep = 0; state.tutorialDismissed = true; }
    navigateToPage("products", { updateHistory: true, scrollTop: true });
    focusMainContent();
    scrollToElement("primaryProductPanel");
  }

  function skipTutorial() { tutorialReplayStep = 0; state.tutorialDismissed = true; saveGame(); renderOnboarding(); }
  function replayTutorial() { tutorialReplayStep = 1; state.tutorialDismissed = false; navigateToPage("home", { updateHistory: true, scrollTop: true }); focusMainContent(); renderOnboarding(); }

  function renderCompanyDetails() {
    const details = document.getElementById("companyDetailMetrics");
    const toggle = document.getElementById("toggleCompanyDetails");
    if (!details || !toggle) return;
    const highRisk = getDashboardBugLevel() >= 50 || state.fire >= 50 || getHighestOperationalRisk().score >= 50;
    const expanded = dashboardUi.companyDetailsExpanded === null ? highRisk : dashboardUi.companyDetailsExpanded;
    details.hidden = !expanded;
    if (typeof toggle.setAttribute === "function") toggle.setAttribute("aria-expanded", String(expanded));
    toggle.textContent = expanded ? "スキャンを閉じる" : "リスクスキャン";
    toggle.classList.toggle("risk-attention", highRisk);
  }

  function toggleCompanyDetails() {
    const details = document.getElementById("companyDetailMetrics");
    dashboardUi.companyDetailsExpanded = details ? details.hidden : dashboardUi.companyDetailsExpanded !== true;
    renderCompanyDetails();
  }


  function renderNextRecommendationPanel() {
    const panel = document.getElementById("nextRecommendationPanel");
    if (!panel) return;
    const recommendation = getNextRecommendation();
    const actionHtml = recommendation.ctaLabel ? '<div class="next-recommendation-action-row"><button type="button" class="next-recommendation-button" data-recommendation-action="' + escapeHtml(recommendation.action) + '" data-recommendation-product="' + escapeHtml(recommendation.productId || '') + '" data-recommendation-task="' + escapeHtml(recommendation.taskId || '') + '" data-recommendation-mode="' + escapeHtml(recommendation.mode || 'normal') + '" data-recommendation-worker="' + escapeHtml(recommendation.workerId || '') + '" data-recommendation-target="' + escapeHtml(recommendation.targetId || '') + '">' + escapeHtml(recommendation.ctaLabel) + '</button></div>' : '';
    const pathHtml = recommendation.path ? '<p class="next-recommendation-path">押す場所: ' + escapeHtml(recommendation.path) + '</p>' : '';
    panel.innerHTML = '<div class="section-heading"><h2>次のおすすめ</h2><span>次の一手</span></div><p class="next-recommendation-text">' + escapeHtml(recommendation.text) + '</p>' + pathHtml + actionHtml;
    const buttons = panel.querySelectorAll ? panel.querySelectorAll("button[data-recommendation-action]") : [];
    const button = buttons[0];
    if (button) button.addEventListener("click", function () { handleRecommendationAction(button); });
  }

  function createRecommendation(text, options) {
    const base = { text: text, ctaLabel: "", action: "", productId: "", taskId: "", mode: "normal", workerId: "", targetId: "", path: "" };
    const recommendation = Object.assign(base, options || {});
    if (recommendation.action === "product" && recommendation.taskId && (!recommendation.ctaLabel || recommendation.ctaLabel === "操作を開く")) recommendation.ctaLabel = getRecommendationCtaLabel(recommendation.taskId, recommendation.mode);
    if (recommendation.action === "product" && recommendation.productId && recommendation.taskId) recommendation.path = getRecommendationDirectPath(recommendation);
    return recommendation;
  }

  function getRecommendationDirectPath(recommendation) {
    return "このボタンで" + getRecommendationCtaLabel(recommendation.taskId, recommendation.mode) + "を開きます";
  }

  function getRecommendationCtaLabel(taskId, mode) {
    if (taskId === "development" && mode === "upgrade") return "vNext開発担当を選ぶ";
    if (taskId === "development") return "開発担当を選ぶ";
    if (taskId === "sales") return "販売担当を選ぶ";
    if (taskId === "marketing") return "広報担当を選ぶ";
    if (taskId === "support") return "サポート担当を選ぶ";
    if (taskId === "crisis") return "炎上対応を選ぶ";
    if (taskId === "qa") return "品質管理担当を選ぶ";
    return "操作を開く";
  }

  function handleRecommendationAction(button) {
    const action = button.getAttribute("data-recommendation-action") || "";
    const productId = button.getAttribute("data-recommendation-product") || "";
    const taskId = button.getAttribute("data-recommendation-task") || "";
    const mode = button.getAttribute("data-recommendation-mode") || "normal";
    const workerId = button.getAttribute("data-recommendation-worker") || "";
    const targetId = button.getAttribute("data-recommendation-target") || "";
    if (action === "decision") { scrollToElement("decisionPanel"); return; }
    if (action === "missions") { dashboardUi.missionsExpanded = true; renderMissions(); scrollToElement("missionPanel"); return; }
    if (action === "company") { expandCompanyLevel(); return; }
    if (action === "product" && productId && taskId) { openProductAssignmentModal(taskId, productId, mode); return; }
    if (action === "product" && productId) { openProductActionMenu(productId); return; }
    if (action === "employees") { dashboardUi.employeesExpanded = true; renderEmployees(); scrollToElement("employeePanel"); return; }
    if (action === "worker" && workerId) { openWorkerAssignmentModal(workerId); return; }
    if (targetId) scrollToElement(targetId);
  }

  function scrollToElement(elementId) {
    const pageId = ELEMENT_PAGE_MAP[elementId];
    const pageChanged = Boolean(pageId && currentAppPage !== pageId);
    if (pageId) navigateToPage(pageId, { updateHistory: currentAppPage !== pageId, scrollTop: false });
    if (pageChanged) focusMainContent();
    const element = document.getElementById(elementId);
    if (!element || !element.scrollIntoView) return;
    const run = function () { element.scrollIntoView({ behavior: "smooth", block: "start" }); };
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(run);
    else run();
  }

  function getNextRecommendation() {
    const pendingDecision = normalizeDecisionEvent(state.pendingDecisionEvent);
    if (pendingDecision) {
      const decision = getDecisionEventDefinition(pendingDecision.id);
      const product = getProductDefinition(pendingDecision.productId);
      return createRecommendation("社長判断を確認しましょう: " + product.name + " / " + (decision ? decision.label : "提案あり"), { ctaLabel: "社長判断を見る", action: "decision", targetId: "decisionPanel", path: "社長判断カード → 承認/却下" });
    }
    if (getClaimableMissions().length > 0) return createRecommendation("達成済みミッションの報酬を受け取りましょう。", { ctaLabel: "ミッションを見る", action: "missions", targetId: "missionPanel", path: "現在のミッション → 報酬を受け取る" });
    if (canExpandCompany()) return createRecommendation("会社を拡張してLvを上げましょう。", { ctaLabel: "会社を拡張する", action: "company", path: "会社Lvアップ可能 → 会社を拡張する" });
    const productFireHeavy = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return getProductFire(product) >= 60 && canAssignTaskToProduct("crisis", definition.id); });
    if (productFireHeavy) {
      const crisisWorker = isWorkerAvailable("fire05", state.employees) ? "Fire-05" : "AI社長";
      return createRecommendation(productFireHeavy.name + "の製品炎上が高いです。" + crisisWorker + "を炎上対応に割り振りましょう。", { ctaLabel: "炎上対応を開く", action: "product", productId: productFireHeavy.id, taskId: "crisis", path: "製品一覧 → " + productFireHeavy.name + " → 操作 → 炎上対応" });
    }
    const churnHeavy = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return definition.type === "subscription" && product.churnRisk >= 45 && canAssignTaskToProduct("support", definition.id); });
    const supportHeavy = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return definition.type === "subscription" && product.supportLoad >= 50 && canAssignTaskToProduct("support", definition.id); });
    if (churnHeavy) return createRecommendation("解約リスクが高い" + churnHeavy.name + "をサポートしましょう。", { ctaLabel: "操作を開く", action: "product", productId: churnHeavy.id, taskId: "support", path: "製品一覧 → " + churnHeavy.name + " → 操作 → サポート" });
    if (supportHeavy) {
      const supportWorker = isWorkerAvailable("care04", state.employees) ? "Care-04" : "AI社長";
      return createRecommendation(supportWorker + "を" + supportHeavy.name + "のサポートに割り振りましょう。", { ctaLabel: "操作を開く", action: "product", productId: supportHeavy.id, taskId: "support", path: "製品一覧 → " + supportHeavy.name + " → 操作 → サポート" });
    }
    if (state.fire >= 70) {
      if (state.companyLevel >= 4 && (state.employees.fire05 || 0) <= 0) return createRecommendation("炎上が高いのでFire-05を雇用しましょう。", { ctaLabel: "社員を見る", action: "employees", path: "AI社員 → Fire-05 → 雇用" });
      const crisisTarget = PRODUCTS.find(function (definition) { return canAssignTaskToProduct("crisis", definition.id); }) || getPrimaryProductDefinition();
      const crisisWorker = isWorkerAvailable("fire05", state.employees) ? "Fire-05" : "AI社長";
      return createRecommendation(crisisWorker + "を炎上対応へ割り振りましょう。Care-04はサポート面から火消しを補助できます。", { ctaLabel: "操作を開く", action: "product", productId: crisisTarget.id, taskId: "crisis", path: "製品一覧 → " + crisisTarget.name + " → 操作 → 炎上対応" });
    }
    if (getDashboardBugLevel() >= 70) {
      if (state.companyLevel >= 5 && (state.employees.security06 || 0) <= 0) return createRecommendation("バグが高いのでSecurity-06を雇用しましょう。", { ctaLabel: "社員を見る", action: "employees", path: "AI社員 → Security-06 → 雇用" });
      const qaTarget = getHighestBugProductDefinition() || getPrimaryProductDefinition();
      return createRecommendation("バグが高いのでSecurity-06を品質管理へ割り振りましょう。", { ctaLabel: "操作を開く", action: "product", productId: qaTarget.id, taskId: "qa", path: "製品一覧 → " + qaTarget.name + " → 操作 → 品質管理" });
    }
    const riskyQualityProduct = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return product.status !== "idea" && !getAssignedWorkersForProduct("qa", definition.id).length && (product.bugs >= 45 || product.quality <= 45); });
    if (riskyQualityProduct) {
      const product = getProduct(riskyQualityProduct.id);
      const reason = product.bugs >= 45 ? "製品バグが高い" : "品質が低下している";
      return createRecommendation(reason + riskyQualityProduct.name + "を品質管理しましょう。", { ctaLabel: "操作を開く", action: "product", productId: riskyQualityProduct.id, taskId: "qa", path: "製品一覧 → " + riskyQualityProduct.name + " → 操作 → 品質管理" });
    }
    const pausedUpgrade = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return definition.type === "subscription" && product.upgradeStatus === "upgrading" && !getAssignedWorkersForProduct("development", definition.id).length; });
    if (pausedUpgrade) return createRecommendation(pausedUpgrade.name + "のvNext開発が止まっています。AI社長かDev-01を割り振りましょう。", { ctaLabel: "操作を開く", action: "product", productId: pausedUpgrade.id, taskId: "development", mode: "upgrade", path: "製品一覧 → " + pausedUpgrade.name + " → 操作 → vNext開発担当" });
    const developing = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return product.status === "developing" && !getAssignedWorkersForProduct("development", definition.id).length; });
    if (developing) return createRecommendation((isWorkerIdle("dev01") ? "Dev-01が空いています。" : "") + developing.name + "の開発に割り振りましょう。", { ctaLabel: "操作を開く", action: "product", productId: developing.id, taskId: "development", mode: "newProduct", path: "製品一覧 → " + developing.name + " → 操作 → 開発担当" });
    const ready = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return ["ready", "selling"].indexOf(product.status) !== -1 && !getAssignedWorkersForProduct("sales", definition.id).length; });
    if (ready) return createRecommendation((isWorkerIdle("sales02") ? "Sales-02が空いています。" : "") + ready.name + "の販売に割り振りましょう。", { ctaLabel: "操作を開く", action: "product", productId: ready.id, taskId: "sales", path: "製品一覧 → " + ready.name + " → 操作 → 販売担当" });
    const lowAwarenessWithSales = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return product.status !== "idea" && product.awareness < 50 && getAssignedWorkersForProduct("sales", definition.id).length && !getAssignedWorkersForProduct("marketing", definition.id).length; });
    if (lowAwarenessWithSales) return createRecommendation(lowAwarenessWithSales.name + "は販売中ですが認知度が低めです。Buzz-03で広報しましょう。", { ctaLabel: "操作を開く", action: "product", productId: lowAwarenessWithSales.id, taskId: "marketing", path: "製品一覧 → " + lowAwarenessWithSales.name + " → 操作 → 広報" });
    const nextIdea = PRODUCTS.find(function (definition) { return getProduct(definition.id).status === "idea"; });
    if (nextIdea) return createRecommendation(nextIdea.name + "の開発を始めましょう。", { ctaLabel: "操作を開く", action: "product", productId: nextIdea.id, taskId: "development", mode: "newProduct", path: "製品一覧 → " + nextIdea.name + " → 操作 → 開発する" });
    const openSlotRecommendation = getOpenSlotRecommendationText();
    if (openSlotRecommendation) return createRecommendation(openSlotRecommendation, { ctaLabel: "社員を見る", action: "employees", path: "AI社員 → 仕事を割り振る" });
    const idleWorkerRecommendation = getIdleWorkerRecommendationText();
    if (idleWorkerRecommendation) return createRecommendation(idleWorkerRecommendation, { ctaLabel: "社員を見る", action: "employees", path: "AI社員 → 仕事を割り振る" });
    const lowAwareness = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return product.status !== "idea" && product.awareness < 50 && !getAssignedWorkersForProduct("marketing", definition.id).length; });
    if (lowAwareness) return createRecommendation(lowAwareness.name + "を広報して認知度を上げましょう。", { ctaLabel: "操作を開く", action: "product", productId: lowAwareness.id, taskId: "marketing", path: "製品一覧 → " + lowAwareness.name + " → 操作 → 広報" });
    const upgrade = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return definition.type === "subscription" && (product.status === "ready" || product.status === "selling") && product.upgradeStatus === "idle"; });
    if (upgrade) return createRecommendation(upgrade.name + "のバージョンアップを検討しましょう。", { ctaLabel: "操作を開く", action: "product", productId: upgrade.id, taskId: "development", mode: "upgrade", path: "製品一覧 → " + upgrade.name + " → 操作 → バージョンアップ" });
    const lowQuality = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return product.status !== "idea" && (product.quality < 70 || product.bugs >= 30); });
    if (lowQuality) return createRecommendation(lowQuality.name + "を品質管理してバグを下げましょう。", { ctaLabel: "操作を開く", action: "product", productId: lowQuality.id, taskId: "qa", path: "製品一覧 → " + lowQuality.name + " → 操作 → 品質管理" });
    return createRecommendation("製品目標を確認し、主力製品の販売・広報・品質管理を回しましょう。", { ctaLabel: "製品一覧を開く", action: "product", productId: getPrimaryProductDefinition().id, path: "製品ポートフォリオ → 操作" });
  }


  function renderDecisionPanel() {
    const panel = document.getElementById("decisionPanel");
    if (!panel) return;
    const event = normalizeDecisionEvent(state.pendingDecisionEvent);
    if (!event) {
      panel.hidden = true;
      panel.classList.remove("decision-warning");
      panel.innerHTML = "";
      return;
    }
    const definition = getDecisionEventDefinition(event.id);
    const productDefinition = getProductDefinition(event.productId);
    panel.hidden = false;
    panel.classList.toggle("decision-warning", definition.riskLevel === "warning");
    panel.innerHTML = '<div class="section-heading"><h2>社長判断</h2><span>' + escapeHtml(productDefinition.name) + '</span></div>' +
      '<div class="decision-speaker">' + getCharacterAvatarHtml(definition.workerId || "boss", "decision-character-avatar", false) + '<div class="decision-body"><strong>' + escapeHtml(definition.label) + (definition.riskLevel === "warning" ? ' <em class="decision-risk-label">リスクあり</em>' : '') + '</strong><p>' + escapeHtml(definition.message) + '</p>' +
      '<span class="decision-impact-heading">影響</span><ul class="decision-impact-list"><li>' + escapeHtml(definition.approveImpact) + '</li><li>' + escapeHtml(definition.rejectImpact) + '</li></ul></div></div>' +
      '<div class="decision-actions"><button type="button" id="approveDecisionButton" class="decision-approve-button' + (definition.riskLevel === "warning" ? ' decision-risk-button' : '') + '">承認する</button><button type="button" id="rejectDecisionButton" class="decision-reject-button">却下する</button></div>';
    activateCharacterImageFallbacks(panel);
    const approveButton = document.getElementById("approveDecisionButton");
    const rejectButton = document.getElementById("rejectDecisionButton");
    if (approveButton) approveButton.addEventListener("click", function () { applyDecisionEventChoice("approve"); });
    if (rejectButton) rejectButton.addEventListener("click", function () { applyDecisionEventChoice("reject"); });
  }

  function getDecisionEventDefinition(eventId) {
    return DECISION_EVENTS.find(function (event) { return event.id === eventId; }) || null;
  }

  function normalizeDecisionEvent(event) {
    if (!event || typeof event !== "object") return null;
    const definition = getDecisionEventDefinition(event.id);
    if (!definition) return null;
    const productId = getProductDefinition(event.productId).id;
    return { id: definition.id, productId: productId, createdAt: safeNumber(event.createdAt, Date.now()) };
  }

  // === Decision Event Runtime ===
  function applyDecisionEventGeneration() {
    state.pendingDecisionEvent = normalizeDecisionEvent(state.pendingDecisionEvent);
    if (state.pendingDecisionEvent) return;
    state.decisionEventCooldown = Math.max(0, Math.floor(safeNumber(state.decisionEventCooldown, 0)) - 1);
    const hasDueFollowup = Object.keys(state.decisionThreads || {}).some(function (key) { const thread = state.decisionThreads[key]; return thread && !thread.resolved && thread.dueIn <= 0; });
    if (state.decisionEventCooldown > 0 && !hasDueFollowup) return;
    const candidates = getDecisionEventCandidates();
    const dueFollowup = candidates.find(function (candidate) { const event = getDecisionEventDefinition(candidate.id); return event && event.followup; });
    if (!candidates.length) {
      state.decisionEventCooldown = DECISION_EVENT_RETRY_SECONDS;
      return;
    }
    if (!dueFollowup && Math.random() >= DECISION_EVENT_ROLL_CHANCE) return;
    const candidate = dueFollowup || selectDecisionEventCandidate(candidates);
    state.pendingDecisionEvent = { id: candidate.id, productId: candidate.productId, createdAt: Date.now() };
    state.decisionEventCooldown = DECISION_EVENT_COOLDOWN_SECONDS;
  }

  function getDecisionEventCandidates() {
    const candidates = [];
    const salesThread = state.decisionThreads.sales_contract;
    const campaignThread = state.decisionThreads.campaign_aftershock;
    if (salesThread && !salesThread.resolved && salesThread.dueIn <= 0) candidates.push({ id: "sales_contract_followup", productId: salesThread.productId, priority: 200 });
    if (campaignThread && !campaignThread.resolved && campaignThread.dueIn <= 0) candidates.push({ id: "campaign_aftershock", productId: campaignThread.productId, priority: 200 });
    if (state.fire >= 50 && isWorkerAvailable("fire05", state.employees)) {
      const productId = getDecisionProductForFire();
      if (productId) candidates.push({ id: "fire05_crisis_statement", productId: productId, priority: 100 });
    }
    if (state.fire >= 40 && isWorkerAvailable("fire05", state.employees)) {
      const productId = getDecisionProductForFire();
      if (productId) candidates.push({ id: "sns_fire_response", productId: productId, priority: 78 });
    }
    PRODUCTS.forEach(function (definition) {
      const product = getProduct(definition.id);
      if (isWorkerAvailable("care04", state.employees) && definition.type === "subscription" && product.status === "selling" && (product.churnRisk >= 35 || product.supportLoad >= 45)) candidates.push({ id: "care_customer_priority", productId: definition.id, priority: 90 });
      if (isWorkerAvailable("care04", state.employees) && definition.type === "subscription" && product.status === "selling" && getProductCustomers(product) >= 5 && (product.satisfaction < 85 || product.churnRisk >= 20)) candidates.push({ id: "vip_customer_support", productId: definition.id, priority: 76 });
      if (isWorkerAvailable("security06", state.employees) && product.bugs >= 40 && product.status !== "idea") candidates.push({ id: "emergency_quality_fix", productId: definition.id, priority: 85 });
      if (isWorkerAvailable("security06", state.employees) && product.status !== "idea" && (product.bugs >= 35 || getAssignedWorkersForProduct("qa", definition.id).indexOf("security06") !== -1)) candidates.push({ id: "security_quality_pause", productId: definition.id, priority: 80 });
      if (isWorkerAvailable("security06", state.employees) && product.status !== "idea" && (product.bugs >= 20 || product.quality <= 75)) candidates.push({ id: "quality_audit", productId: definition.id, priority: 74 });
      if (definition.type === "subscription" && isWorkerAvailable("dev01", state.employees) && product.upgradeStatus === "upgrading" && product.upgradeProgress >= 50) candidates.push({ id: "vnext_fast_track", productId: definition.id, priority: 75 });
      if (definition.type === "oneShot" && product.status === "selling" && getAssignedWorkersForProduct("sales", definition.id).indexOf("sales02") !== -1 && product.awareness >= 30) candidates.push({ id: "limited_one_shot_sale", productId: definition.id, priority: 66 });
      if (isWorkerAvailable("fire05", state.employees) && product.status !== "idea" && (getProductFire(product) >= 45 || product.bugs >= 45)) candidates.push({ id: "server_outage_response", productId: definition.id, priority: 82 });
      if (isWorkerAvailable("care04", state.employees) && definition.type === "subscription" && product.status === "selling" && product.churnRisk >= 45 && getProductCustomers(product) >= 2) candidates.push({ id: "support_discount_offer", productId: definition.id, priority: 84 });
      if (isWorkerAvailable("care04", state.employees) && definition.type === "subscription" && product.status === "selling" && getProductCustomers(product) >= 5 && product.satisfaction >= 35 && !getProductFlags(definition.id).impossibleRequestHandled && (product.supportLoad >= 15 || product.churnRisk >= 15 || product.satisfaction < 75)) candidates.push({ id: "customer_impossible_request", productId: definition.id, priority: 64 });
      if (product.status !== "idea" && hasAssignedSpecialistForProduct(definition.id) && !getProductFlags(definition.id).aiRunawayHandled && (product.awareness < 90 || product.bugs < 80 || getProductFire(product) < 80)) candidates.push({ id: "ai_runaway_proposal", productId: definition.id, priority: 56 });
      if (isWorkerAvailable("security06", state.employees) && product.status !== "idea" && (product.bugs >= 30 || getProductFire(product) >= 35)) candidates.push({ id: "security_audit_push", productId: definition.id, priority: 73 });
      if ((product.status === "developing" || product.upgradeStatus === "upgrading") && state.money >= 1200) candidates.push({ id: "outsourcing_offer", productId: definition.id, priority: 58 });
      if (definition.type === "oneShot" && product.status === "selling" && getAssignedWorkersForProduct("sales", definition.id).indexOf("sales02") !== -1) candidates.push({ id: "one_shot_bulk_sale", productId: definition.id, priority: 72 });
      if (definition.type === "subscription" && getAssignedWorkersForProduct("sales", definition.id).indexOf("sales02") !== -1 && ["ready", "selling"].indexOf(product.status) !== -1) candidates.push({ id: "sales_big_contract", productId: definition.id, priority: 70 });
      if (definition.type === "subscription" && getAssignedWorkersForProduct("sales", definition.id).indexOf("sales02") !== -1 && product.status === "selling" && getProductCustomers(product) >= 5 && product.satisfaction >= 50 && product.churnRisk < 50) candidates.push({ id: "subscription_price_review", productId: definition.id, priority: 65 });
      if (definition.type === "subscription" && isWorkerAvailable("sales02", state.employees) && ["ready", "selling"].indexOf(product.status) !== -1 && product.awareness >= 20 && getProductCustomers(product) < 50) candidates.push({ id: "free_trial_offer", productId: definition.id, priority: 57 });
      if (isWorkerAvailable("buzz03", state.employees) && product.status !== "idea" && (getAssignedWorkersForProduct("marketing", definition.id).indexOf("buzz03") !== -1 || product.awareness >= 30)) candidates.push({ id: "competitive_campaign", productId: definition.id, priority: 63 });
      if (isWorkerAvailable("security06", state.employees) && product.status !== "idea" && (product.bugs >= 25 || product.quality <= 60)) candidates.push({ id: "tech_debt_repayment", productId: definition.id, priority: 62 });
      if (isWorkerAvailable("care04", state.employees) && definition.type === "subscription" && product.status === "selling" && getProductCustomers(product) >= 3 && product.satisfaction < 85) candidates.push({ id: "customer_interview", productId: definition.id, priority: 61 });
      if (isWorkerAvailable("sales02", state.employees) && product.status === "selling") candidates.push({ id: "mystery_big_deal", productId: definition.id, priority: 59 });
      if (getAssignedWorkersForProduct("marketing", definition.id).indexOf("buzz03") !== -1 && product.status !== "idea") candidates.push({ id: "buzz_bold_ad", productId: definition.id, priority: 60 });
    });
    return candidates.filter(function (candidate) {
      if (candidate.id === "sales_big_contract") return !salesThread || salesThread.resolved;
      if (candidate.id === "buzz_bold_ad") return !campaignThread || campaignThread.resolved;
      return true;
    }).map(function (candidate) {
      candidate.priority = OPERATIONS_RUNTIME.getDecisionPriority(state, getDecisionEventDefinition(candidate.id), candidate.priority);
      return candidate;
    }).sort(function (a, b) { return b.priority - a.priority; });
  }

  function hasAssignedSpecialistForProduct(productId) {
    return TASKS.some(function (task) {
      return getAssignedWorkersForProduct(task.id, productId).some(function (workerId) { return workerId !== "boss"; });
    });
  }

  function getDecisionProductForFire() {
    const active = PRODUCTS.find(function (definition) { return getProduct(definition.id).status === "selling"; });
    if (active) return active.id;
    const primary = getPrimaryProductDefinition();
    return primary ? primary.id : PRODUCTS[0].id;
  }



  function getDecisionContext(eventId, product, definition) {
    return { eventId: eventId, product: product, definition: definition, flags: getProductFlags(product.id) };
  }

  function applyDecisionHandlerChoice(choice, eventId, product, definition) {
    const handler = getDecisionEventHandler(eventId);
    if (!handler || typeof handler[choice] !== "function") {
      addLog("system", "社長判断イベント " + eventId + " の処理が未定義です。", "company");
      return false;
    }
    handler[choice](getDecisionContext(eventId, product, definition));
    clampDecisionRuntime(product, definition);
    return true;
  }

  function decisionAddRevenue(amount) {
    const value = Math.max(0, safeNumber(amount, 0));
    state.money = Math.max(0, state.money + value);
    state.totalMoney = Math.max(0, state.totalMoney + value);
    return value;
  }

  function decisionAddCost(amount) {
    const value = Math.max(0, safeNumber(amount, 0));
    const paid = Math.min(state.money, value);
    const shortfall = Math.max(0, value - paid);
    state.money = Math.max(0, state.money - value);
    if (shortfall > 0) {
      state.fire = clamp(state.fire + clamp(shortfall / 500, 1, 6), 0, 100);
    }
    return paid;
  }

  function decisionAddCustomers(product, amount) {
    product.customers = getProductCustomers(product) + Math.max(0, Math.floor(safeNumber(amount, 0)));
    if (product.customers > 0) product.status = "selling";
    return product.customers;
  }

  function decisionAddOneShotSales(product, definition, units) {
    const count = Math.max(0, Math.floor(safeNumber(units, 0)));
    const revenue = safeNumber(definition.price, 0) * count;
    if (count <= 0) return 0;
    product.status = "selling";
    product.unitsSold = getProductUnitsSold(product) + count;
    product.lifetimeRevenue = Math.max(0, safeNumber(product.lifetimeRevenue, 0) + revenue);
    decisionAddRevenue(revenue);
    return revenue;
  }

  function decisionAddProductFire(product, amount) { return adjustProductFire(product, safeNumber(amount, 0)); }
  function decisionAddGlobalFire(amount) { state.fire = clamp(safeNumber(state.fire, 0) + safeNumber(amount, 0), 0, 100); return state.fire; }
  function decisionAddProductBugs(product, amount) { product.bugs = clamp(safeNumber(product.bugs, 0) + safeNumber(amount, 0), 0, 100); return product.bugs; }
  function decisionAddProductQuality(product, amount) { product.quality = clamp(safeNumber(product.quality, 0) + safeNumber(amount, 0), 0, 100); return product.quality; }
  function decisionAddAwareness(product, amount) { product.awareness = clamp(safeNumber(product.awareness, 0) + safeNumber(amount, 0), 0, 100); return product.awareness; }
  function decisionAddSupportLoad(product, amount) { product.supportLoad = clamp(safeNumber(product.supportLoad, 0) + safeNumber(amount, 0), 0, 100); return product.supportLoad; }
  function decisionAddSatisfaction(product, amount) { product.satisfaction = clamp(safeNumber(product.satisfaction, 70) + safeNumber(amount, 0), 0, 100); return product.satisfaction; }
  function decisionAddChurnRisk(product, amount) {
    const value = safeNumber(amount, 0);
    product.churnRisk = clamp(safeNumber(product.churnRisk, 0) + value, 0, 100);
    if (value > 0) {
      product.supportLoad = clamp(safeNumber(product.supportLoad, 0) + value * 0.35, 0, 100);
      product.satisfaction = clamp(safeNumber(product.satisfaction, 70) - value * 0.25, 0, 100);
    } else if (value < 0) {
      product.supportLoad = clamp(safeNumber(product.supportLoad, 0) + value * 0.25, 0, 100);
      product.satisfaction = clamp(safeNumber(product.satisfaction, 70) - value * 0.15, 0, 100);
    }
    return product.churnRisk;
  }
  function decisionAddPriceAdjustment(product, amount) { product.priceAdjustment = clamp(safeNumber(product.priceAdjustment, 0) + safeNumber(amount, 0), -0.2, 0.6); return product.priceAdjustment; }

  function clampDecisionRuntime(product, definition) {
    clampRuntimeProduct(product, definition);
    state.money = Math.max(0, safeNumber(state.money, 0));
    state.totalMoney = Math.max(0, safeNumber(state.totalMoney, 0));
    state.fire = clamp(safeNumber(state.fire, 0), 0, 100);
  }

  function approveSubscriptionPriceReview(context) {
    decisionAddPriceAdjustment(context.product, 0.05);
    decisionAddAwareness(context.product, 6);
    decisionAddSatisfaction(context.product, -5);
    decisionAddChurnRisk(context.product, 5);
    addLog("normal", context.definition.name + "の上位プラン準備を承認しました。月額単価は少し伸びますが、既存顧客の視線は厳しめです。", "sales02");
  }

  function rejectSubscriptionPriceReview(context) {
    decisionAddSatisfaction(context.product, 2);
    addLog("support", context.definition.name + "の値上げ準備を見送りました。既存顧客の安心感を優先しました。", "sales02");
  }

  function approveFreeTrialOffer(context) {
    decisionAddCustomers(context.product, 1);
    decisionAddAwareness(context.product, 10);
    decisionAddSupportLoad(context.product, 5);
    addLog("success", context.definition.name + "の無料トライアルを承認しました。導入社は増えましたが、サポート窓口も少し忙しくなりました。", "sales02");
  }

  function rejectFreeTrialOffer(context) {
    addLog("normal", context.definition.name + "の無料トライアルを見送りました。通常販売を続けます。", "sales02");
  }

  function approveVipCustomerSupport(context) {
    decisionAddSatisfaction(context.product, 10);
    decisionAddChurnRisk(context.product, -5);
    decisionAddCost(700);
    addLog("support", context.definition.name + "のVIP顧客対応を承認しました。費用はかかりましたが、解約リスクを少し抑えました。", "care04");
  }

  function rejectVipCustomerSupport(context) {
    decisionAddSatisfaction(context.product, -3);
    addLog("support", context.definition.name + "のVIP顧客対応を見送りました。満足度が少し下がりました。", "care04");
  }

  function approveSnsFireResponse(context) {
    decisionAddGlobalFire(-15);
    decisionAddProductFire(context.product, -12);
    decisionAddCost(400);
    addLog("crisis", "Fire-05のSNS火消し案を承認しました。通知欄の温度が少し下がりました。", "fire05");
  }

  function rejectSnsFireResponse(context) {
    decisionAddGlobalFire(6);
    decisionAddProductFire(context.product, 4);
    addLog("fire", "Fire-05のSNS火消し案を保留しました。通知欄が少し熱くなりました。", "fire05");
  }

  function approveQualityAudit(context) {
    decisionAddProductBugs(context.product, -12);
    decisionAddProductQuality(context.product, 5);
    decisionAddCost(500);
    addLog("support", context.definition.name + "の品質監査を承認しました。製品バグが少し整理されました。", "security06");
  }

  function rejectQualityAudit(context) {
    decisionAddProductBugs(context.product, 3);
    addLog("bug", context.definition.name + "の品質監査を見送りました。製品バグが少し積み上がりました。", "security06");
  }

  function approveLimitedOneShotSale(context) {
    const units = 2;
    const revenue = decisionAddOneShotSales(context.product, context.definition, units);
    decisionAddAwareness(context.product, 4);
    decisionAddGlobalFire(4);
    decisionAddProductFire(context.product, 8);
    addLog("success", context.definition.name + "の期間限定セールを承認しました。" + units + "本分の即時売上 " + formatCurrency(revenue) + " を獲得しました。", "sales02");
  }

  function rejectLimitedOneShotSale(context) {
    decisionAddProductFire(context.product, -1);
    addLog("normal", context.definition.name + "の期間限定セールを見送りました。売り急ぎを避けました。", "sales02");
  }

  function approveServerOutageResponse(context) {
    decisionAddProductBugs(context.product, -5);
    decisionAddProductFire(context.product, -18);
    decisionAddCost(600);
    addLog("crisis", context.definition.name + "の障害告知を承認しました。費用はかかりましたが、製品炎上が下がりました。", "fire05");
  }

  function rejectServerOutageResponse(context) {
    decisionAddGlobalFire(4);
    decisionAddProductFire(context.product, 8);
    addLog("fire", context.definition.name + "の障害告知を保留しました。製品炎上が上がりました。", "fire05");
  }

  function approveSupportDiscountOffer(context) {
    decisionAddPriceAdjustment(context.product, -0.03);
    decisionAddSatisfaction(context.product, 8);
    decisionAddChurnRisk(context.product, -8);
    decisionAddSupportLoad(context.product, -5);
    decisionAddCost(500);
    addLog("support", context.definition.name + "の解約寸前顧客に一時値引きと個別対応を行いました。MRR単価は下がり、短期費用もかかりましたが、継続率を守りました。", "care04");
  }

  function rejectSupportDiscountOffer(context) {
    decisionAddChurnRisk(context.product, 3);
    addLog("support", context.definition.name + "の解約寸前顧客対応を見送りました。解約リスクが少し上がりました。", "care04");
  }

  function approveSecurityAuditPush(context) {
    decisionAddProductBugs(context.product, -18);
    decisionAddProductQuality(context.product, 6);
    decisionAddProductFire(context.product, -5);
    decisionAddCost(900);
    addLog("support", context.definition.name + "のセキュリティ監査を承認しました。短期費用で事故の種を減らしました。", "security06");
  }

  function rejectSecurityAuditPush(context) {
    decisionAddProductBugs(context.product, 2);
    decisionAddProductFire(context.product, 3);
    addLog("bug", context.definition.name + "のセキュリティ監査を見送りました。小さな不安が残りました。", "security06");
  }

  function approveCustomerImpossibleRequest(context) {
    context.flags.impossibleRequestHandled = true;
    decisionAddSatisfaction(context.product, 5);
    decisionAddSupportLoad(context.product, 10);
    decisionAddProductBugs(context.product, 5);
    addLog("support", context.definition.name + "の無茶な顧客要望を受けました。満足度は上がりましたが、現場負荷と製品バグも増えました。", "care04");
  }

  function rejectCustomerImpossibleRequest(context) {
    context.flags.impossibleRequestHandled = true;
    decisionAddSatisfaction(context.product, -3);
    decisionAddSupportLoad(context.product, -2);
    addLog("support", context.definition.name + "の無茶な顧客要望を見送りました。運用負荷を優先しました。", "care04");
  }

  function approveAiRunawayProposal(context) {
    context.flags.aiRunawayHandled = true;
    decisionAddAwareness(context.product, 8);
    if (context.definition.type === "subscription" && context.product.status === "selling") decisionAddCustomers(context.product, 1);
    if (context.definition.type === "oneShot" && context.product.status === "selling") decisionAddOneShotSales(context.product, context.definition, 1);
    decisionAddGlobalFire(8);
    decisionAddProductFire(context.product, 10);
    addLog("fire", context.definition.name + "の強めの自動化案を承認しました。短期成果と説明責任が同時に増えました。", "boss");
  }

  function rejectAiRunawayProposal(context) {
    context.flags.aiRunawayHandled = true;
    decisionAddGlobalFire(-1);
    addLog("normal", context.definition.name + "の強めの自動化案を見送りました。今日は説明可能な範囲で進めます。", "boss");
  }

  function approveOutsourcingOffer(context) {
    decisionAddCost(1200);
    decisionAddProductBugs(context.product, 6);
    if (context.product.upgradeStatus === "upgrading") {
      context.product.upgradeProgress = clamp(context.product.upgradeProgress + 18, 0, 100);
      if (context.product.upgradeProgress >= 100) completeSubscriptionUpgrade(context.product, context.definition);
    } else {
      context.product.status = context.product.status === "idea" ? "developing" : context.product.status;
      context.product.progress = clamp(context.product.progress + 25, 0, context.definition.developmentRequired);
      if (context.product.progress >= context.definition.developmentRequired) completeNewProductDevelopment(context.product, context.definition);
    }
    addLog("bug", context.definition.name + "の外注提案を承認しました。進捗は買えましたが、製品バグも少し増えました。", "boss");
  }

  function rejectOutsourcingOffer(context) {
    addLog("normal", context.definition.name + "の外注提案を見送りました。内製で進めます。", "boss");
  }


  function recordDecisionThread(eventId, choice, productId) {
    if (eventId === "sales_big_contract" && choice === "approve") {
      state.decisionThreads.sales_contract = { choice: choice, dueIn: 20, resolved: false, productId: productId };
    } else if (eventId === "buzz_bold_ad") {
      state.decisionThreads.campaign_aftershock = { choice: choice, dueIn: 15, resolved: false, productId: productId };
    }
  }

  function approveSalesContractFollowup(context) {
    decisionAddCost(800);
    decisionAddProductBugs(context.product, -6);
    context.product.quality = clamp(context.product.quality + 4, 0, 100);
    context.product.satisfaction = clamp(context.product.satisfaction + 5, 0, 100);
    if (state.decisionThreads.sales_contract) state.decisionThreads.sales_contract.resolved = true;
    addLog("support", context.definition.name + "の大型契約へ追加対応しました。以前の承認判断を品質で回収しています。", "sales02");
  }

  function rejectSalesContractFollowup(context) {
    decisionAddProductFire(context.product, 10);
    context.product.satisfaction = clamp(context.product.satisfaction - 6, 0, 100);
    if (state.decisionThreads.sales_contract) state.decisionThreads.sales_contract.resolved = true;
    addLog("fire", context.definition.name + "の大型契約追加対応を見送りました。以前の約束が製品炎上として戻ってきました。", "sales02");
  }

  function approveCampaignAftershock(context) {
    decisionAddGlobalFire(-10);
    decisionAddProductFire(context.product, -8);
    context.product.awareness = clamp(context.product.awareness - 4, 0, 100);
    if (state.decisionThreads.campaign_aftershock) state.decisionThreads.campaign_aftershock.resolved = true;
    addLog("support", context.definition.name + "の広告余波へ訂正文を出しました。以前の判断を穏当に着地させました。", "buzz03");
  }

  function rejectCampaignAftershock(context) {
    context.product.awareness = clamp(context.product.awareness + 10, 0, 100);
    decisionAddGlobalFire(8);
    decisionAddProductFire(context.product, 6);
    if (state.decisionThreads.campaign_aftershock) state.decisionThreads.campaign_aftershock.resolved = true;
    addLog("fire", context.definition.name + "の広告余波に乗り続けました。認知度と熱量がもう一段伸びました。", "buzz03");
  }
  function applyDecisionEventChoice(choice) {
    const event = normalizeDecisionEvent(state.pendingDecisionEvent);
    if (!event || (choice !== "approve" && choice !== "reject")) return false;
    const definition = getDecisionEventDefinition(event.id);
    const productDefinition = getProductDefinition(event.productId);
    const product = getProduct(productDefinition.id);
    if (!applyDecisionHandlerChoice(choice, definition.id, product, productDefinition)) return false;
    recordDecisionThread(definition.id, choice, productDefinition.id);
    state.decisionStats = normalizeDecisionStats(state.decisionStats);
    if (choice === "approve") state.decisionStats.approved += 1;
    else state.decisionStats.rejected += 1;
    recalculateProductMrr(product, productDefinition);
    applyProductMilestones(product, productDefinition);
    state.pendingDecisionEvent = null;
    state.decisionEventCooldown = DECISION_EVENT_COOLDOWN_SECONDS;
    applyAchievements(false);
    saveGame();
    render();
    showAppToast(choice === "approve" ? "社長判断を承認しました" : "社長判断を見送りました", choice === "approve" ? "success" : "warning");
    scheduleNextTick();
    return true;
  }




  function applyDecisionApprovalLegacy(eventId, product, definition) { LEGACY_DECISION_RUNTIME.applyApproval(eventId, product, definition); }

  function applyDecisionRejectionLegacy(eventId, product, definition) { LEGACY_DECISION_RUNTIME.applyRejection(eventId, product, definition); }

  function clearProductAssignmentWithoutRender(taskId, productId) {
    clearTaskProductAssignment(taskId, productId);
  }

  function renderCompanyExpansionPanel() {
    const panel = document.getElementById("companyExpansionPanel");
    if (!panel) return;
    if (!canExpandCompany()) {
      panel.hidden = true;
      panel.innerHTML = "";
      return;
    }
    panel.hidden = false;
    const nextLevel = state.companyLevel + 1;
    const unlockText = getNextUnlockText();
    panel.innerHTML = '<div class="section-heading"><h2>会社Lvアップ可能</h2><span>次: 会社Lv' + nextLevel + '</span></div>' +
      '<p class="dashboard-summary">条件達成: 累計売上 ' + formatCurrency(LEVEL_THRESHOLDS[nextLevel - 1]) + '</p>' +
      (unlockText ? '<p class="company-unlock-preview">解放予定: ' + escapeHtml(unlockText) + '</p>' : '') +
      '<button type="button" id="expandCompanyButton" class="modal-apply-button">会社を拡張する</button>';
    const button = document.getElementById("expandCompanyButton");
    if (button) button.addEventListener("click", expandCompanyLevel);
  }

  // === Recommendation Runtime ===
  function getOpenSlotRecommendationText() {
    const assistBoss = PRODUCTS.find(function (definition) {
      return TASKS.some(function (task) {
        const assignment = getProductAssignment(task.id, definition.id);
        return assignment.aiIds.length === 1 && assignment.aiIds.indexOf("boss") === -1 && canWorkerAssignToTask("boss", task.id, state.employees) && isWorkerIdle("boss");
      });
    });
    if (assistBoss) return "AI社長が空いています。" + assistBoss.name + "の担当枠に補助として入れられます。";
    const specialistPairs = [
      { workerId: "dev01", taskId: "development", label: "開発" },
      { workerId: "sales02", taskId: "sales", label: "販売" },
      { workerId: "buzz03", taskId: "marketing", label: "広報" },
      { workerId: "care04", taskId: "support", label: "サポート" },
      { workerId: "security06", taskId: "qa", label: "品質管理" },
      { workerId: "fire05", taskId: "crisis", label: "炎上対応" }
    ];
    const pair = specialistPairs.find(function (item) { return isWorkerIdle(item.workerId) && PRODUCTS.some(function (definition) { const assignment = getProductAssignment(item.taskId, definition.id); return assignment.aiIds.length === 1 && assignment.aiIds.indexOf("boss") !== -1 && canWorkerAssignToTask(item.workerId, item.taskId, state.employees); }); });
    if (!pair) return "";
    const product = PRODUCTS.find(function (definition) { const assignment = getProductAssignment(pair.taskId, definition.id); return assignment.aiIds.length === 1 && assignment.aiIds.indexOf("boss") !== -1; });
    return getWorkerLabel(pair.workerId) + "が空いています。" + (product ? product.name + "の" : "") + pair.label + "に専門AIとして追加できます。";
  }

  function getIdleWorkerRecommendationText() {
    if (isWorkerIdle("dev01")) {
      const target = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return (product.status === "idea" || product.status === "developing" || product.upgradeStatus === "upgrading") && !getAssignedWorkersForProduct("development", definition.id).length; });
      if (target) {
        const product = getProduct(target.id);
        if (product.upgradeStatus === "upgrading") return "Dev-01が空いています。" + target.name + "のv" + (getProductVersion(product) + 1) + "開発に割り振りましょう。";
        return "Dev-01が空いています。" + target.name + "の開発に割り振りましょう。";
      }
    }
    if (isWorkerIdle("sales02")) {
      const target = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return ["ready", "selling"].indexOf(product.status) !== -1 && !getAssignedWorkersForProduct("sales", definition.id).length; });
      if (target) return "Sales-02が空いています。" + target.name + "の販売に割り振りましょう。";
    }
    if (isWorkerIdle("buzz03")) {
      const target = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return product.status !== "idea" && product.awareness < 55 && !getAssignedWorkersForProduct("marketing", definition.id).length; });
      if (target) return "Buzz-03が空いています。" + target.name + "を広報して認知度を上げましょう。";
    }
    if (isWorkerIdle("care04")) {
      const target = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return definition.type === "subscription" && product.status === "selling" && (product.supportLoad >= 25 || product.churnRisk >= 25) && !getAssignedWorkersForProduct("support", definition.id).length; });
      if (target) return "Care-04が空いています。" + target.name + "をサポートして解約リスクを抑えましょう。";
    }
    if (isWorkerIdle("security06")) {
      const target = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return product.status !== "idea" && (product.bugs >= 20 || product.quality < 75) && !getAssignedWorkersForProduct("qa", definition.id).length; });
      if (target) return "Security-06が空いています。" + target.name + "を品質管理してバグを下げましょう。";
    }
    if (isWorkerIdle("fire05") && state.fire >= 40) return "Fire-05が空いています。炎上度が高い時は炎上対応に回しましょう。";
    if (isWorkerIdle("boss")) {
      const assistTarget = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return product.status !== "idea" && (getAssignedWorkersForProduct("sales", definition.id).length || getAssignedWorkersForProduct("marketing", definition.id).length || getAssignedWorkersForProduct("support", definition.id).length) && getProductAssignment("sales", definition.id).aiIds.indexOf("boss") === -1 && getProductAssignment("marketing", definition.id).aiIds.indexOf("boss") === -1 && getProductAssignment("support", definition.id).aiIds.indexOf("boss") === -1; });
      if (assistTarget) return "AI社長が空いています。" + assistTarget.name + "の販売・広報・サポートを補助できます。";
      return "AI社長が空いています。販売・広報・サポートの補助に回せます。";
    }
    return "";
  }

  function isWorkerIdle(workerId) {
    if (!isWorkerAvailable(workerId, state.employees)) return false;
    return TASKS.every(function (task) {
      return PRODUCTS.every(function (definition) {
        return getProductAssignment(task.id, definition.id).aiIds.indexOf(workerId) === -1;
      });
    });
  }

  function getPrimaryProductRecommendation(product, definition) {
    if (product.status === "idea") return "開発する";
    if (product.status === "developing" || product.upgradeStatus === "upgrading") return getAssignedWorkersForProduct("development", definition.id).length ? "開発を継続" : "開発担当を割り振る";
    if ((product.status === "ready" || product.status === "selling") && !getAssignedWorkersForProduct("sales", definition.id).length) return "販売担当を割り振る";
    if (product.awareness < 50) return "広報で認知度を上げる";
    if (product.bugs >= 25 || product.quality < 70) return "品質管理でバグを下げる";
    if (definition.type === "subscription" && product.upgradeStatus === "idle") return "バージョンアップを検討";
    return "販売と広報を継続";
  }

  function renderPrimaryProductPanel() {
    const panel = document.getElementById("primaryProductPanel");
    if (!panel) return;
    const definition = getPrimaryProductDefinition();
    const product = getProduct(definition.id);
    panel.innerHTML = '<div class="section-heading"><h2>現在の主力製品</h2><span>' + escapeHtml(getPrimaryProductValueText(product, definition)) + '</span></div>' +
      '<article class="primary-product-card"><div><strong>' + escapeHtml(getPrimaryProductTitle(product, definition)) + '</strong><span>' + escapeHtml(getPrimaryProductSummary(product, definition)) + '</span>' + getPrimaryProductRiskHtml(product, definition) + '<em>おすすめ: ' + escapeHtml(getPrimaryProductRecommendation(product, definition)) + '</em></div><div class="assignment-badge-list">' + getProductAssignmentBadges(definition.id) + '</div><div class="primary-product-actions"><button type="button" class="product-action-button" data-primary-product-menu="' + definition.id + '">操作メニューへ</button><button type="button" class="product-action-button product-detail-button" data-primary-product-detail="' + definition.id + '">詳細</button></div></article>';
    panel.querySelectorAll("button[data-primary-product-menu]").forEach(function (button) {
      button.addEventListener("click", function () { openProductActionMenu(button.getAttribute("data-primary-product-menu")); });
    });
    panel.querySelectorAll("button[data-primary-product-detail]").forEach(function (button) {
      button.addEventListener("click", function () { openProductDetailModal(button.getAttribute("data-primary-product-detail")); });
    });
  }

  function renderProductPanel() {
    const panel = document.getElementById("productPanel");
    if (!panel) return;
    const body = dashboardUi.productsExpanded ? '<div class="portfolio-products">' + PRODUCTS.map(function (definition) { return getProductCardHtml(definition); }).join('') + '</div>' : getProductPortfolioPreviewHtml();
    panel.innerHTML = '<div class="section-heading"><div><span class="section-kicker">PRODUCT LINE</span><h2>製品ポートフォリオ</h2></div><button type="button" id="toggleProductsButton" class="change-assignment-button">' + (dashboardUi.productsExpanded ? '製品一覧を閉じる' : '製品一覧を開く') + '</button></div>' +
      '<p class="dashboard-summary">' + PRODUCTS.length + '製品運用 / 総MRR ' + formatCurrency(getTotalProductMrr()) + '/月 / 売り切り累計 ' + formatCurrency(getTotalOneShotRevenue()) + '</p>' + body;
    const toggle = document.getElementById("toggleProductsButton");
    if (toggle) toggle.addEventListener("click", function () { toggleDashboardPanel("productsExpanded"); });
    panel.querySelectorAll("button[data-product-detail]").forEach(function (button) {
      button.addEventListener("click", function () { openProductDetailModal(button.getAttribute("data-product-detail")); });
    });
    panel.querySelectorAll("button[data-product-menu]").forEach(function (button) {
      button.addEventListener("click", function () { openProductActionMenu(button.getAttribute("data-product-menu")); });
    });
  }

  function getProductPortfolioPreviewHtml() {
    const statusIcons = { idea: "01", developing: "02", ready: "03", selling: "LIVE" };
    return '<div class="product-portfolio-preview" aria-label="製品ラインの稼働状況">' + PRODUCTS.map(function (definition, index) {
      const product = getProduct(definition.id);
      const progress = product.status === "idea" ? 0 : (product.status === "developing" ? clamp(product.progress, 0, 100) : 100);
      const value = definition.type === "subscription" ? formatCurrency(getProductMrr(product, definition)) + "/月" : formatCurrency(safeNumber(product.lifetimeRevenue, 0));
      return '<button type="button" class="portfolio-preview-item status-' + product.status + '" data-product-detail="' + definition.id + '">' +
        '<span class="portfolio-preview-index" aria-hidden="true">0' + (index + 1) + '</span>' +
        '<span class="portfolio-preview-icon" aria-hidden="true">' + (statusIcons[product.status] || "01") + '</span>' +
        '<span class="portfolio-preview-copy"><strong>' + escapeHtml(definition.name) + '</strong><small>' + escapeHtml(getProductStatusLabel(product.status)) + ' · ' + escapeHtml(value) + '</small></span>' +
        '<span class="portfolio-preview-progress" aria-hidden="true"><i style="width:' + progress + '%"></i></span>' +
      '</button>';
    }).join("") + '</div>';
  }

  function getProductCardHtml(definition) {
    const product = getProduct(definition.id);
    const progressPercent = product.upgradeStatus === "upgrading" ? clamp(product.upgradeProgress, 0, 100) : getProductProgressPercent(product, definition);
    const shouldShowProgress = product.status === "developing" || product.upgradeStatus === "upgrading";
    return '<article class="product-card product-' + product.status + '">' +
      '<div class="product-top"><div><strong>' + escapeHtml(getProductDisplayName(product, definition)) + '</strong><span>' + escapeHtml(getProductTypeLine(definition, product)) + '</span></div><div class="level-badge">' + getProductStatusLabel(product.status) + '</div></div>' +
      (shouldShowProgress ? '<div class="product-progress"><span style="width:' + progressPercent + '%"></span></div>' : '') +
      '<div class="product-metrics product-summary-metrics">' + getProductSummaryMetrics(product, definition, progressPercent) + '</div>' +
      getProductActionHint(product, definition) +
      getProductActionButtons(product, definition) +
      '</article>';
  }


  function toggleDashboardPanel(key) {
    dashboardUi[key] = !dashboardUi[key];
    render();
  }

  function getPrimaryProductTitle(product, definition) {
    if (definition.type === "subscription") return definition.name + " v" + getProductVersion(product);
    return definition.name;
  }

  function getPrimaryProductSummary(product, definition) {
    if (definition.type === "oneShot") return getProductUnitsSold(product) + "本販売 / 累計売上 " + formatCurrency(product.lifetimeRevenue);
    return formatCustomers(getProductCustomers(product)) + " / MRR " + formatCurrency(getProductMrr(product, definition)) + "/月";
  }

  function getPrimaryProductRiskHtml(product, definition) {
    return getProductRiskChipsHtml(product, definition, { compact: true });
  }

  function getPrimaryProductValueText(product, definition) {
    if (definition.type === "oneShot") return "累計 " + formatCurrency(product.lifetimeRevenue);
    return "MRR " + formatCurrency(getProductMrr(product, definition)) + "/月";
  }

  function getTotalProductCustomers() {
    return PRODUCTS.reduce(function (sum, definition) { return definition.type === "subscription" ? sum + getProductCustomers(getProduct(definition.id)) : sum; }, 0);
  }

  function getTotalOneShotRevenue() {
    return PRODUCTS.reduce(function (sum, definition) { return definition.type === "oneShot" ? sum + safeNumber(getProduct(definition.id).lifetimeRevenue, 0) : sum; }, 0);
  }

  function getProductBugLevel() {
    return PRODUCTS.reduce(function (max, definition) {
      const product = getProduct(definition.id);
      return product.status === "idea" ? max : Math.max(max, safeNumber(product.bugs, 0));
    }, 0);
  }

  function getHighestBugProductDefinition() {
    return PRODUCTS.reduce(function (best, definition) {
      const product = getProduct(definition.id);
      if (product.status === "idea") return best;
      return !best || safeNumber(product.bugs, 0) > safeNumber(getProduct(best.id).bugs, 0) ? definition : best;
    }, null);
  }

  function getDashboardBugLevel() {
    return clamp(getProductBugLevel(), 0, 100);
  }

  function getHiredEmployeeSummary() {
    const roles = { dev01: "開発", sales02: "販売", buzz03: "広報", care04: "サポート", fire05: "炎上対応", security06: "品質管理" };
    const hired = EMPLOYEES.filter(function (employee) { return (state.employees[employee.id] || 0) > 0; }).map(function (employee) { return employee.code + " Lv" + (state.employees[employee.id] || 0) + " " + (roles[employee.id] || employee.role); });
    return hired.length ? hired.join(" / ") : "未雇用";
  }

  function renderAssignments() {
    const panel = document.getElementById("assignmentPanel");
    if (!panel) return;
    panel.innerHTML = '<div class="section-heading"><h2>現在の担当</h2><button type="button" id="openAssignmentModal" class="change-assignment-button">担当を変更</button></div>' +
      '<p class="assignment-rule">AIたちが担当中の製品です。</p>' +
      '<div class="assignment-summary-list">' + TASKS.map(function (task) { return getAssignmentSummaryHtml(task.id); }).join('') + '</div>';
    const openButton = document.getElementById("openAssignmentModal");
    if (openButton) openButton.addEventListener("click", openAssignmentModal);
    renderAssignmentModal();
  }

  function renderTaskPresetPanel() {
    const panel = document.getElementById("taskPresetPanel");
    if (!panel) return;
    const resultHtml = dashboardUi.presetResult ? '<p class="preset-result" role="status">' + escapeHtml(dashboardUi.presetResult) + '</p>' : '';
    const body = dashboardUi.presetsExpanded ? '<div class="preset-list">' + TASK_PRESETS.map(function (preset) {
      return '<article class="preset-card"><div><strong>' + escapeHtml(preset.label) + '</strong><span>' + escapeHtml(preset.description) + '</span><small>通常UIでは空きAIだけを追加します。既存担当は外しません。</small></div><button type="button" class="change-assignment-button" data-task-preset="' + preset.id + '">' + escapeHtml(preset.label) + '配置</button></article>';
    }).join('') + '</div>' : '';
    panel.innerHTML = '<div class="section-heading"><h2>配置プリセット</h2><button type="button" id="togglePresetsButton" class="change-assignment-button">' + (dashboardUi.presetsExpanded ? 'プリセットを閉じる' : 'プリセットを見る') + '</button></div>' +
      '<p class="dashboard-summary">空いているAIを中心に、既存の制約を守って配置します。既存担当を動かす再配置はdebug専用です。</p>' + resultHtml + body;
    const toggle = document.getElementById("togglePresetsButton");
    if (toggle) toggle.addEventListener("click", function () { toggleDashboardPanel("presetsExpanded"); });
    panel.querySelectorAll("button[data-task-preset]").forEach(function (button) {
      button.addEventListener("click", function () { applyTaskPreset(button.getAttribute("data-task-preset"), { allowStateBoost: false }); });
    });
  }

  // === Rendering: Modals ===
  function isAnyModalOpen() { return assignmentModalOpen || productDetailModalOpen || productActionMenuOpen || storyModalOpen; }

  function syncModalIsolation() {
    const active = isAnyModalOpen();
    if (document.body && document.body.classList) document.body.classList.toggle("modal-active", active);
    if (typeof document.querySelectorAll !== "function") return;
    document.querySelectorAll(".hero, .tutorial-panel, .page-location, .app-page, .bottom-nav, .command-sidebar, .skip-link").forEach(function (element) {
      element.inert = active;
      if (typeof element.setAttribute === "function" && active) element.setAttribute("aria-hidden", "true");
      else if (typeof element.removeAttribute === "function") element.removeAttribute("aria-hidden");
    });
  }

  function renderAssignmentModal() {
    const modal = document.getElementById("assignmentModal");
    if (!modal) return;
    modal.hidden = !assignmentModalOpen;
    modal.classList.toggle("open", assignmentModalOpen);
    if (!assignmentModalOpen) { modal.innerHTML = ""; syncModalIsolation(); return; }
    const selectedTask = TASKS.find(function (task) { return task.id === assignmentDraft.taskId; }) || TASKS[0];
    const simpleMode = assignmentModalMode === "product";
    const employeeMode = assignmentModalMode === "employee";
    const upgradeMode = assignmentDraft.mode === "upgrade";
    const productAssignable = isAssignmentDraftProductAvailable();
    const selectedAssignment = getProductAssignment(selectedTask.id, assignmentDraft.productId);
    const currentAiIds = selectedAssignment.aiIds;
    const selectedAiIds = normalizeAssignmentDraftAiIds(selectedTask.id, assignmentDraft.aiIds || []);
    const selectionValid = selectedAiIds.length > 0 && selectedAiIds.length <= 2 && selectedAiIds.every(function (workerId) { return canWorkerAssignToTask(workerId, selectedTask.id, state.employees); });
    const assignable = Boolean(assignmentDraft.taskId && assignmentDraft.productId) && productAssignable && selectionValid;
    const taskOptions = employeeMode ? getAssignableTasksForWorker(assignmentDraft.aiId) : TASKS;
    const productButtons = PRODUCTS.map(function (definition) {
      const enabled = employeeMode ? isWorkerProductTaskAvailable(assignmentDraft.aiId, assignmentDraft.taskId, definition.id) : canAssignTaskToProduct(assignmentDraft.taskId, definition.id);
      const reason = enabled ? "" : getWorkerProductTaskDisabledReason(assignmentDraft.aiId, assignmentDraft.taskId, definition.id);
      return '<button type="button" class="modal-option' + (assignmentDraft.productId === definition.id ? ' active' : '') + '" data-modal-product="' + definition.id + '"' + (enabled ? '' : ' disabled') + '>' + escapeHtml(definition.name) + (reason ? '<span>' + escapeHtml(reason) + '</span>' : '') + '</button>';
    }).join('');
    const workerButtons = getAllWorkerIds().map(function (workerId) {
      const selected = selectedAiIds.indexOf(workerId) !== -1;
      const taskCompatible = selectedTask.workers.indexOf(workerId) !== -1;
      const available = isWorkerAvailable(workerId, state.employees);
      const canAssign = taskCompatible && available;
      const maxReached = selectedAiIds.length >= MAX_AI_PER_TASK_PRODUCT && !selected;
      const enabled = selected || (productAssignable && canAssign && !maxReached);
      let detail = getWorkerTaskDescription(workerId, selectedTask.id);
      if (!taskCompatible) detail = "対応不可";
      else if (!available) detail = workerId === "boss" ? "利用可能" : "未雇用";
      else if (selected) detail += " / 選択済み";
      else if (maxReached) detail += " / この仕事は満員です（最大2体まで）";
      return '<button type="button" class="modal-option worker-option' + (selected ? ' active' : '') + '" data-modal-ai="' + workerId + '"' + (enabled ? '' : ' disabled') + '><strong>' + escapeHtml(getWorkerLabel(workerId)) + (selected ? ' 選択中' : '') + '</strong><span>' + escapeHtml(detail) + '</span></button>';
    }).join('');
    const currentWorkersHtml = '<div class="modal-current">現在担当: ' + escapeHtml(getWorkerGroupLabel(currentAiIds) || 'なし') + '</div>' +
      '<div class="modal-current selected-workers">選択中: ' + escapeHtml(getWorkerGroupLabel(selectedAiIds) || 'なし') + '（' + selectedAiIds.length + '/2）</div>';
    const workerSelector = currentWorkersHtml + '<div class="modal-group"><span>担当AIを選択 最大2体</span><div class="modal-option-grid worker-grid">' + workerButtons + '</div></div>';
    const noTaskMessage = employeeMode && taskOptions.length === 0 ? '<p class="modal-warning">このAIに割り振れるタスクは現在ありません。</p>' : '';
    const warningText = !productAssignable ? 'この製品では選択中のタスクを使えません。' : (!selectionValid ? (selectedAiIds.length === 0 ? '担当AIを1体以上選んでください。' : '選択中AIに担当できないAIが含まれています。') : '');
    modal.innerHTML = '<div class="assignment-modal-backdrop" data-modal-close="1"></div><div class="assignment-dialog" aria-labelledby="assignmentDialogTitle">' +
      '<div class="assignment-dialog-head"><strong id="assignmentDialogTitle">' + escapeHtml(getAssignmentModalTitle()) + '</strong><button type="button" class="modal-close-button" data-modal-close="1">閉じる</button></div>' +
      '<p class="modal-description">' + escapeHtml(getAssignmentModalDescription(upgradeMode, simpleMode, employeeMode)) + '</p>' +
      noTaskMessage +
      (simpleMode ? '' : '<div class="modal-group"><span>タスク選択</span><div class="modal-option-grid">' + taskOptions.map(function (task) { return '<button type="button" class="modal-option' + (assignmentDraft.taskId === task.id ? ' active' : '') + '" data-modal-task="' + task.id + '">' + escapeHtml(task.label) + '</button>'; }).join('') + '</div></div>') +
      (simpleMode ? '' : '<div class="modal-group"><span>対象製品選択</span><div class="modal-option-grid">' + productButtons + '</div></div>') +
      workerSelector +
      '<div class="modal-current">対象: ' + escapeHtml(selectedTask.label) + ' / ' + escapeHtml(getProductDefinition(assignmentDraft.productId).name) + '</div>' +
      '<p class="modal-help">この仕事には最大2体までAIを割り振れます。2体選択中は他のAIを選べません。同じAIは別の仕事から外れます。</p>' +
      (warningText ? '<p class="modal-warning">' + escapeHtml(warningText) + '</p>' : '') +
      '<div class="modal-actions"><button type="button" id="applyAssignmentButton" class="modal-apply-button"' + (assignable ? '' : ' disabled') + '>この担当にする</button><button type="button" id="clearAssignmentButton" class="modal-subtle-button modal-clear-button">担当を解除</button><button type="button" class="modal-subtle-button" data-modal-close="1">閉じる</button></div>' +
      '</div>';
    modal.querySelectorAll("[data-modal-close]").forEach(function (button) { button.addEventListener("click", closeAssignmentModal); });
    modal.querySelectorAll("button[data-modal-task]").forEach(function (button) { button.addEventListener("click", function () { selectAssignmentTask(button.getAttribute("data-modal-task")); }); });
    modal.querySelectorAll("button[data-modal-product]").forEach(function (button) { button.addEventListener("click", function () { assignmentDraft.productId = button.getAttribute("data-modal-product"); updateAssignmentDraftMode(); refreshAssignmentDraftAiIds(); renderAssignmentModal(); }); });
    modal.querySelectorAll("button[data-modal-ai]").forEach(function (button) { button.addEventListener("click", function () { toggleAssignmentDraftAi(button.getAttribute("data-modal-ai")); }); });
    const applyButton = document.getElementById("applyAssignmentButton");
    if (applyButton) applyButton.addEventListener("click", function () { setTaskAis(assignmentDraft.taskId, assignmentDraft.productId, normalizeAssignmentDraftAiIds(assignmentDraft.taskId, assignmentDraft.aiIds || []), assignmentDraft.mode); closeAssignmentModal(); });
    const clearButton = document.getElementById("clearAssignmentButton");
    if (clearButton) clearButton.addEventListener("click", function () { clearProductAssignment(assignmentDraft.taskId, assignmentDraft.productId); closeAssignmentModal(); });
  }

  function getAllWorkerIds() {
    return ["boss"].concat(EMPLOYEES.map(function (employee) { return employee.id; }));
  }

  function normalizeAssignmentDraftAiIds(taskId, aiIds) {
    const normalized = [];
    (aiIds || []).forEach(function (workerId) {
      if (!workerId || normalized.indexOf(workerId) !== -1 || normalized.length >= 2) return;
      if (!canWorkerAssignToTask(workerId, taskId, state.employees)) return;
      normalized.push(workerId);
    });
    return normalized;
  }

  function getInitialAssignmentAiIds(taskId, productId, preferredWorkerId) {
    const assignment = getProductAssignment(taskId, productId);
    const aiIds = normalizeAssignmentDraftAiIds(taskId, assignment.aiIds);
    if (preferredWorkerId && canWorkerAssignToTask(preferredWorkerId, taskId, state.employees) && aiIds.indexOf(preferredWorkerId) === -1 && aiIds.length < 2) aiIds.push(preferredWorkerId);
    return aiIds;
  }

  function refreshAssignmentDraftAiIds() {
    const preferredWorkerId = assignmentModalMode === "employee" ? assignmentDraft.aiId : null;
    assignmentDraft.aiIds = getInitialAssignmentAiIds(assignmentDraft.taskId, assignmentDraft.productId, preferredWorkerId);
  }

  function toggleAssignmentDraftAi(workerId) {
    const selectedAiIds = normalizeAssignmentDraftAiIds(assignmentDraft.taskId, assignmentDraft.aiIds || []);
    const index = selectedAiIds.indexOf(workerId);
    if (index !== -1) {
      selectedAiIds.splice(index, 1);
      assignmentDraft.aiIds = selectedAiIds;
      renderAssignmentModal();
      return;
    }
    if (!canWorkerAssignToTask(workerId, assignmentDraft.taskId, state.employees) || selectedAiIds.length >= MAX_AI_PER_TASK_PRODUCT) return;
    selectedAiIds.push(workerId);
    assignmentDraft.aiIds = selectedAiIds;
    renderAssignmentModal();
  }

  function getAssignmentModalDescription(upgradeMode, simpleMode, employeeMode) {
    if (upgradeMode) {
      const definition = getProductDefinition(assignmentDraft.productId);
      const product = getProduct(definition.id);
      if (product.upgradeStatus === "upgrading") return "担当AIを選ぶとvNext開発が進みます。この仕事には最大2体までAIを割り振れます。";
      return "担当AIを選んでください。この仕事には最大2体までAIを割り振れます。効果: 月額価格+20%、品質+8、認知+5。副作用: 製品バグ+5。";
    }
    if (employeeMode) return "このAIに任せるタスクと対象製品を選びます。最大2体まで同時に選択できます。";
    if (simpleMode) return "担当AIを選んでください。専門AIにAI社長を加えることもできます。最大2体まで選択できます。";
    return "タスク・対象製品・担当AIを選んで割り振ります。最大2体まで選択できます。販売担当を外しても、既存顧客のMRRは継続します。";
  }

  function isAssignmentDraftProductAvailable() {
    if (!canAssignTaskToProduct(assignmentDraft.taskId, assignmentDraft.productId)) return false;
    if (assignmentModalMode !== "employee") return true;
    return canWorkerAssignToTask(assignmentDraft.aiId, assignmentDraft.taskId, state.employees);
  }


  function renderProductDetailModal() {
    const modal = document.getElementById("productDetailModal");
    if (!modal) return;
    modal.hidden = !productDetailModalOpen;
    modal.classList.toggle("open", productDetailModalOpen);
    if (!productDetailModalOpen) { modal.innerHTML = ""; syncModalIsolation(); return; }
    const definition = getProductDefinition(productDetailProductId);
    const product = getProduct(definition.id);
    const progressPercent = getProductProgressPercent(product, definition);
    modal.innerHTML = '<div class="assignment-modal-backdrop product-detail-backdrop" data-product-detail-close="1"></div><div class="product-detail-dialog" aria-labelledby="productDetailTitle">' +
      '<div class="assignment-dialog-head"><strong id="productDetailTitle">' + escapeHtml(definition.name) + 'の詳細</strong><button type="button" class="modal-close-button" data-product-detail-close="1">閉じる</button></div>' +
      '<div class="product-detail-status"><span>' + escapeHtml(getProductTypeLine(definition, product)) + ' / ' + escapeHtml(getProductCategoryLabel(definition)) + '</span><strong>' + escapeHtml(getProductStatusLabel(product.status)) + '</strong></div>' +
      '<div class="product-detail-grid">' +
      getProductSpecificDetailHtml(product, definition) +
      '<span class="product-detail-heading">品質</span>' +
      '<span class="product-detail-item">進捗 <strong>' + Math.floor(progressPercent) + '%</strong></span>' +
      '<span class="product-detail-item">品質 <strong>' + Math.round(product.quality) + '</strong></span>' +
      '<span class="product-detail-item">製品バグ <strong>' + product.bugs.toFixed(1) + '</strong></span>' +
      '<span class="product-detail-item">認知度 <strong>' + Math.round(product.awareness) + '</strong></span>' +
      '<span class="product-detail-heading">担当</span>' +
      '<span class="product-detail-item wide">担当中タスク <strong class="assignment-badge-list">' + getProductAssignmentBadges(definition.id) + '</strong></span>' +
      '<span class="product-detail-item wide">最新状態 <strong>' + escapeHtml(getProductLatestStateText(product, definition)) + '</strong></span>' +
      '</div>' +
      '<div class="product-detail-actions"><button type="button" class="product-action-button" data-product-menu="' + definition.id + '">操作メニューへ</button><button type="button" class="modal-subtle-button" data-product-detail-close="1">閉じる</button></div>' +
      '</div>';
    modal.querySelectorAll("[data-product-detail-close]").forEach(function (button) { button.addEventListener("click", closeProductDetailModal); });
    modal.querySelectorAll("button[data-product-menu]").forEach(function (button) {
      button.addEventListener("click", function () {
        closeProductDetailModal();
        openProductActionMenu(button.getAttribute("data-product-menu"));
      });
    });
  }

  function openProductDetailModal(productId) {
    rememberModalTrigger();
    productDetailProductId = getProductDefinition(productId).id;
    productDetailModalOpen = true;
    renderProductDetailModal();
    focusModal("productDetailModal");
  }

  function closeProductDetailModal() {
    productDetailModalOpen = false;
    renderProductDetailModal();
    restoreModalFocus();
  }

  function getProductRiskDetailHtml(product, definition) {
    const chipsHtml = getProductRiskChipsHtml(product, definition, { compact: false });
    return '<div class="product-detail-item wide product-risk-detail"><span>運用リスク</span>' + (chipsHtml || '<span class="risk-chip risk-chip-muted">平常</span>') + '</div>';
  }

  function getProductSpecificDetailHtml(product, definition) {
    if (definition.type === "oneShot") {
      return '<span class="product-detail-heading">収益</span>' +
        '<span class="product-detail-item">価格 <strong>' + formatCurrency(definition.price) + '</strong></span>' +
        '<span class="product-detail-item">販売数 <strong>' + getProductUnitsSold(product) + '本</strong></span>' +
        '<span class="product-detail-item">累計売上 <strong>' + formatCurrency(product.lifetimeRevenue) + '</strong></span>' +
        '<span class="product-detail-item">MRR <strong>なし</strong></span>' +
        '<span class="product-detail-heading">運用</span>' +
        getProductRiskDetailHtml(product, definition) +
        '<span class="product-detail-item">製品炎上 <strong>' + Math.round(getProductFire(product)) + '</strong></span>' +
        '<span class="product-detail-item wide">売り切り収益 <strong>販売成功時に即時売上が入ります</strong></span>';
    }
    return '<span class="product-detail-heading">収益</span>' +
      '<span class="product-detail-item">現行版 <strong>v' + getProductVersion(product) + '</strong></span>' +
      '<span class="product-detail-item">次期版 <strong>' + escapeHtml(product.upgradeStatus === "upgrading" ? 'v' + (getProductVersion(product) + 1) + ' 開発中 ' + Math.floor(product.upgradeProgress) + '%' : '待機中') + '</strong></span>' +
      '<span class="product-detail-item">月額価格 <strong>' + formatCurrency(getCurrentMonthlyPrice(product, definition)) + '</strong></span>' +
      '<span class="product-detail-item">顧客数 <strong>' + formatCustomers(getProductCustomers(product)) + '</strong></span>' +
      '<span class="product-detail-item">MRR <strong>' + formatCurrency(getProductMrr(product, definition)) + '/月</strong></span>' +
      '<span class="product-detail-item">製品売上/秒 <strong>' + formatCurrencyPrecise(getProductRevenuePerSecond(product, definition)) + '/秒</strong></span>' +
      '<span class="product-detail-heading">運用</span>' +
      getProductRiskDetailHtml(product, definition) +
      '<span class="product-detail-item">製品炎上 <strong>' + Math.round(getProductFire(product)) + '</strong></span>' +
      '<span class="product-detail-item">満足度 <strong>' + Math.round(product.satisfaction) + '</strong></span>' +
      '<span class="product-detail-item">サポート負荷 <strong>' + Math.round(product.supportLoad) + '</strong></span>' +
      '<span class="product-detail-item">解約リスク <strong>' + Math.round(product.churnRisk) + '</strong></span>' +
      '<span class="product-detail-item wide">次期版の効果 <strong>月額価格+20%、品質+8、認知+5。副作用: 製品バグ+5</strong></span>';
  }

  function getProductLatestStateText(product, definition) {
    if (definition.type === "oneShot") {
      if (product.status === "selling" && getAssignedWorkersForProduct("sales", definition.id).length) return "販売判定中";
      return getProductUnitsSold(product) > 0 ? "販売実績あり" : "販売担当待ち";
    }
    if (product.upgradeStatus === "upgrading") return "v" + (getProductVersion(product) + 1) + "を開発中です。";
    if (product.status === "selling" && getAssignedWorkersForProduct("sales", definition.id).length) return "顧客獲得判定中";
    if (getProductCustomers(product) > 0) return "既存顧客は継続課金中";
    return "販売担当待ち";
  }


  function renderProductActionMenuModal() {
    const modal = document.getElementById("productActionMenuModal");
    if (!modal) return;
    modal.hidden = !productActionMenuOpen;
    modal.classList.toggle("open", productActionMenuOpen);
    if (!productActionMenuOpen) { modal.innerHTML = ""; syncModalIsolation(); return; }
    const definition = getProductDefinition(productActionMenuProductId);
    const product = getProduct(definition.id);
    const actions = getProductAvailableActions(product, definition);
    modal.innerHTML = '<div class="assignment-modal-backdrop product-action-menu-backdrop" data-product-menu-close="1"></div><div class="product-action-menu-dialog" aria-labelledby="productActionMenuTitle">' +
      '<div class="assignment-dialog-head"><strong id="productActionMenuTitle">' + escapeHtml(definition.name) + 'の操作</strong><button type="button" class="modal-close-button" data-product-menu-close="1">閉じる</button></div>' +
      '<p class="modal-description">操作を選ぶと、担当AI選択へ進みます。</p>' +
      renderProductActionMenuList(actions, definition.id) +
      '<div class="product-detail-actions"><button type="button" class="modal-subtle-button" data-product-detail="' + definition.id + '">詳細を見る</button><button type="button" class="modal-subtle-button" data-product-menu-close="1">閉じる</button></div>' +
      '</div>';
    modal.querySelectorAll("[data-product-menu-close]").forEach(function (button) { button.addEventListener("click", closeProductActionMenu); });
    modal.querySelectorAll("button[data-product-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        closeProductActionMenu();
        openProductAssignmentModal(button.getAttribute("data-product-action"), button.getAttribute("data-product-id"), button.getAttribute("data-product-mode") || "normal");
      });
    });
    modal.querySelectorAll("button[data-product-detail]").forEach(function (button) {
      button.addEventListener("click", function () {
        closeProductActionMenu();
        openProductDetailModal(button.getAttribute("data-product-detail"));
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
      return '<div class="product-action-menu-group"><span class="product-action-menu-heading">' + escapeHtml(group.label) + '</span>' + groupActions.map(function (action) {
        return '<button type="button" class="product-action-menu-button' + (action.enabled ? '' : ' disabled-action') + '" data-product-action="' + action.taskId + '" data-product-action-id="' + action.id + '" data-product-id="' + productId + '" data-product-mode="' + action.mode + '"' + (action.enabled ? '' : ' disabled') + '><strong>' + escapeHtml(action.label) + '</strong><span>' + escapeHtml(action.enabled ? action.description : action.disabledReason) + '</span></button>';
      }).join('') + '</div>';
    }).join('') + '</div>';
  }

  function openProductActionMenu(productId) {
    rememberModalTrigger();
    productActionMenuProductId = getProductDefinition(productId).id;
    productActionMenuOpen = true;
    renderProductActionMenuModal();
    focusModal("productActionMenuModal");
  }

  function closeProductActionMenu() {
    productActionMenuOpen = false;
    renderProductActionMenuModal();
    restoreModalFocus();
  }


  function renderProductObjectives() {
    const panel = document.getElementById("productObjectivePanel");
    if (!panel) return;
    const pending = PRODUCT_OBJECTIVES.filter(function (objective) { return !objective.done(); });
    const visible = dashboardUi.objectivesExpanded ? PRODUCT_OBJECTIVES : pending.slice(0, 2);
    panel.innerHTML = '<div class="mission-head"><strong>製品目標</strong><button type="button" id="toggleObjectivesButton" class="change-assignment-button">' + (dashboardUi.objectivesExpanded ? '目標を閉じる' : 'すべての目標を見る') + '</button></div>' +
      '<div class="mission-list" id="productObjectiveList">' + visible.map(function (objective) {
        const done = Boolean(objective.done());
        return '<div class="mission-item' + (done ? ' done' : '') + '"><span class="mission-check">' + (done ? '✓' : '') + '</span><span class="mission-text">' + escapeHtml(objective.text) + '</span></div>';
      }).join("") + '</div>';
    const toggle = document.getElementById("toggleObjectivesButton");
    if (toggle) toggle.addEventListener("click", function () { toggleDashboardPanel("objectivesExpanded"); });
  }

  // === Rendering: Missions ===
  function renderMissions() {
    const list = document.getElementById("missionList");
    const label = document.getElementById("missionStage");
    if (!list || !label) return;
    const stage = getCurrentMissionStage();
    label.textContent = dashboardUi.missionsExpanded ? stage.label : "次のおすすめに集約";
    const missionItems = stage.missions.map(function (mission) {
      const done = Boolean(mission.done());
      const claimed = isMissionClaimed(mission.id);
      const pending = done && !claimed;
      const stateHtml = claimed || pending ? '<span class="mission-state">' + (claimed ? '受け取り済み' : '達成済み・未受け取り') + '</span>' : '';
      const rewardHtml = pending ? '<div class="mission-claim-block"><span class="mission-reward-row">報酬: +' + formatCurrency(mission.reward) + '</span><button type="button" class="mission-claim-button" data-claim-mission="' + mission.id + '">報酬を受け取る</button></div>' : (claimed ? '' : '<span class="mission-reward-row">報酬: +' + formatCurrency(mission.reward) + '</span>');
      return '<div class="mission-item' + (done ? ' done' : '') + (claimed ? ' claimed' : '') + (pending ? ' claimable' : '') + '"><span class="mission-check">' + (done ? '✓' : '○') + '</span><span class="mission-text">' + escapeHtml(mission.text) + '</span>' + stateHtml + rewardHtml + '</div>';
    }).join("");
    const claimable = getClaimableMissions()[0];
    const collapsedClaim = claimable ? '<div class="mission-item done claimable"><span class="mission-check">✓</span><span class="mission-text">' + escapeHtml(claimable.text) + '</span><span class="mission-state">達成済み・未受け取り</span><div class="mission-claim-block"><span class="mission-reward-row">報酬: +' + formatCurrency(claimable.reward) + '</span><button type="button" class="mission-claim-button" data-claim-mission="' + claimable.id + '">報酬を受け取る</button></div></div>' : '';
    list.innerHTML = dashboardUi.missionsExpanded ? missionItems + '<button type="button" id="toggleMissionsButton" class="change-assignment-button">ミッションを閉じる</button>' : '<p class="dashboard-summary">現在ミッションは「次のおすすめ」で要約しています。</p>' + collapsedClaim + '<button type="button" id="toggleMissionsButton" class="change-assignment-button">すべてのミッションを見る</button>';
    const toggle = document.getElementById("toggleMissionsButton");
    if (toggle) toggle.addEventListener("click", function () { toggleDashboardPanel("missionsExpanded"); });
    list.querySelectorAll("button[data-claim-mission]").forEach(function (button) { button.addEventListener("click", function () { claimMissionReward(button.getAttribute("data-claim-mission")); }); });
  }

  function getCurrentMissionStage() {
    return MISSION_STAGES.find(function (stage) {
      return stage.missions.some(function (mission) { return !mission.done() || !isMissionClaimed(mission.id); });
    }) || MISSION_STAGES[MISSION_STAGES.length - 1];
  }

  function getAllMissions() {
    return MISSION_STAGES.reduce(function (items, stage) { return items.concat(stage.missions); }, []);
  }

  function getClaimableMissions() {
    return getAllMissions().filter(function (mission) { return mission.done() && !isMissionClaimed(mission.id); });
  }

  function claimMissionReward(missionId) {
    const mission = getAllMissions().find(function (item) { return item.id === missionId; });
    if (!mission || !mission.done() || isMissionClaimed(mission.id)) return;
    state.claimedMissions.push(mission.id);
    state.money += mission.reward;
    state.totalMoney += mission.reward;
    addLog("success", "ミッション報酬を受け取りました: " + mission.text + "。" + formatCurrency(mission.reward) + "を売上に計上しました。", "company");
    applyAchievements(false);
    saveGame();
    render();
    showAppToast("ミッション報酬 " + formatCurrency(mission.reward) + " を受け取りました", "success");
  }

  function isMissionClaimed(missionId) {
    return state.claimedMissions.indexOf(missionId) !== -1;
  }


  function applyAchievements(silent) {
    state.achievements = normalizeAchievements(state.achievements);
    const unlockedNow = [];
    ACHIEVEMENTS.forEach(function (achievement) {
      const record = state.achievements[achievement.id];
      if (record && record.unlocked) return;
      if (!achievement.done()) return;
      state.achievements[achievement.id] = { unlocked: true, unlockedAt: Date.now() };
      unlockedNow.push(achievement);
    });
    if (!silent && unlockedNow.length) logAchievementUnlocks(unlockedNow);
  }

  function logAchievementUnlocks(unlockedNow) {
    if (unlockedNow.length <= ACHIEVEMENT_TOAST_LIMIT) {
      unlockedNow.forEach(function (achievement) { addLog("success", "実績解除: " + achievement.title + "。" + achievement.description, "company"); });
      return;
    }
    const sample = unlockedNow.slice(0, ACHIEVEMENT_TOAST_LIMIT).map(function (achievement) { return achievement.title; }).join(" / ");
    addLog("success", "実績を" + unlockedNow.length + "件解除しました: " + sample + " ほか。", "company");
  }

  function getAchievementRecord(achievementId) {
    state.achievements = normalizeAchievements(state.achievements);
    return state.achievements[achievementId] || { unlocked: false, unlockedAt: 0 };
  }

  function getUnlockedAchievementCount() {
    return ACHIEVEMENTS.filter(function (achievement) { return getAchievementRecord(achievement.id).unlocked; }).length;
  }

  // === Rendering: Achievements ===
  function renderAchievements() {
    const panel = document.getElementById("achievementPanel");
    if (!panel) return;
    const unlockedCount = getUnlockedAchievementCount();
    const visible = getVisibleAchievementsForDashboard();
    panel.innerHTML = '<div class="section-heading"><h2>実績</h2><button type="button" id="toggleAchievementsButton" class="change-assignment-button">' + (dashboardUi.achievementsExpanded ? '実績を閉じる' : '実績を見る') + '</button></div>' +
      '<p class="dashboard-summary">解除済み: ' + unlockedCount + '/' + ACHIEVEMENTS.length + '</p>' +
      '<div class="achievement-list">' + (visible.length ? getAchievementListHtml(visible, dashboardUi.achievementsExpanded) : '<p class="dashboard-summary">まだ解除済み実績はありません。製品を動かすと増えていきます。</p>') + '</div>';
    const toggle = document.getElementById("toggleAchievementsButton");
    if (toggle) toggle.addEventListener("click", function () { toggleDashboardPanel("achievementsExpanded"); });
  }

  function getVisibleAchievementsForDashboard() {
    if (dashboardUi.achievementsExpanded) return ACHIEVEMENTS;
    const visible = ACHIEVEMENTS.filter(function (achievement) { return getAchievementRecord(achievement.id).unlocked; }).slice(0, 2);
    const nextLocked = ACHIEVEMENTS.find(function (achievement) { return !getAchievementRecord(achievement.id).unlocked; });
    if (nextLocked) visible.push(nextLocked);
    return visible;
  }

  function getAchievementListHtml(achievements, grouped) {
    if (!grouped) return achievements.map(getAchievementItemHtml).join('');
    const categories = [];
    achievements.forEach(function (achievement) { if (categories.indexOf(achievement.category || '実績') === -1) categories.push(achievement.category || '実績'); });
    return categories.map(function (category) {
      const items = achievements.filter(function (achievement) { return (achievement.category || '実績') === category; });
      const unlocked = items.filter(function (achievement) { return getAchievementRecord(achievement.id).unlocked; }).length;
      return '<section class="achievement-category-group"><h3>' + escapeHtml(category) + ' <span>' + unlocked + '/' + items.length + '</span></h3>' + items.map(getAchievementItemHtml).join('') + '</section>';
    }).join('');
  }

  function getAchievementItemHtml(achievement) {
    const unlocked = getAchievementRecord(achievement.id).unlocked;
    return '<article class="achievement-item' + (unlocked ? ' unlocked' : '') + '"><em class="achievement-category">' + escapeHtml(achievement.category || '実績') + '</em><strong>' + escapeHtml(unlocked ? '✓ ' + achievement.title : '○ ' + achievement.title) + '</strong><span>' + escapeHtml(achievement.description) + '</span></article>';
  }

  function getBugMitigationText() {
    if (state.companyLevel < 5) return "会社Lv5でSecurity-06解放";
    if ((state.employees.security06 || 0) <= 0) return "Security-06を雇うとバグを下げられます";
    return "Security-06がバグを整理中";
  }

  function renderRiskPanel() {
    const panel = document.getElementById("riskPanel");
    const title = document.getElementById("riskTitle");
    const text = document.getElementById("riskText");
    if (!panel || !title || !text) return;
    const dashboardBugLevel = getDashboardBugLevel();
    const bugDefinition = getHighestBugProductDefinition();
    const bugRisk = dashboardBugLevel >= 40;
    const fireRisk = state.fire >= 40;
    const operationRisk = getHighestOperationalRisk();
    const productRisk = operationRisk.definition && operationRisk.score >= 45;
    const productRiskText = productRisk ? operationRisk.definition.name + "の" + operationRisk.type + " " + Math.round(operationRisk.score) : "";
    panel.className = "risk-panel";
    if (!bugRisk && !fireRisk && !productRisk) {
      title.textContent = "リスク監視: 平常";
      text.textContent = "バグ・炎上・製品運用リスクが上がると事故や解約が起きやすくなります。";
      return;
    }
    panel.classList.add("visible");
    if (fireRisk && (bugRisk || productRisk)) {
      panel.classList.add("warn-both");
      title.textContent = dashboardBugLevel >= 80 || state.fire >= 80 || operationRisk.score >= 80 ? "危険: 複合リスク発生注意" : "予兆: 複数リスクが同時に上昇中";
      text.textContent = "全社炎上 " + Math.round(state.fire) + (bugRisk && bugDefinition ? " / " + bugDefinition.name + "の製品バグ " + Math.round(dashboardBugLevel) : "") + (productRiskText && operationRisk.type !== "製品バグ" ? " / " + productRiskText : "") + "。Care-04 / Fire-05 / Security-06の担当を確認しましょう。";
    } else if (fireRisk) {
      panel.classList.add("warn-fire");
      title.textContent = state.fire >= 80 ? "危険: 炎上事故イベント発生注意" : "予兆: 炎上度が上がっています";
      text.textContent = "炎上度50以上で売上減少や解約リスク上昇が起きる可能性があります。" + (productRiskText ? productRiskText + "。" : "") + "Care-04 / Fire-05で対策できます。";
    } else if (bugRisk) {
      panel.classList.add("warn-bug");
      title.textContent = dashboardBugLevel >= 80 ? "危険: 製品バグ事故イベント発生注意" : "予兆: 製品バグが増えています";
      text.textContent = (bugDefinition ? bugDefinition.name + "の" : "") + "製品バグが50以上になると、売上5%減の事故イベントが発生する可能性があります。" + getBugMitigationText() + "。";
    } else {
      panel.classList.add("warn-ops");
      title.textContent = "予兆: 製品運用リスクが上がっています";
      text.textContent = productRiskText + "。サポート・品質管理・炎上対応の担当を確認しましょう。";
    }
  }


  function getOfficeLevel() {
    return Math.min(5, Math.max(1, Math.floor(safeNumber(state.companyLevel, 1))));
  }

  function getOfficeWorkerAssignment(workerId) {
    for (let taskIndex = 0; taskIndex < TASKS.length; taskIndex += 1) {
      const task = TASKS[taskIndex];
      for (let productIndex = 0; productIndex < PRODUCTS.length; productIndex += 1) {
        const definition = PRODUCTS[productIndex];
        const assignment = getProductAssignment(task.id, definition.id);
        if (assignment.aiIds.indexOf(workerId) >= 0) return { task: task, definition: definition, mode: assignment.mode };
      }
    }
    return null;
  }

  function getOfficeTaskSymbol(taskId) {
    return { development: "{ }", qa: "✓", sales: "↗", marketing: "✦", support: "♡", crisis: "!" }[taskId] || "…";
  }

  function getOfficeWorkerState(workerId, assignment) {
    const latest = state.logs.find(function (log) { return log.employeeId === workerId || (workerId === "boss" && log.employeeId === "company"); });
    if (latest && Date.now() - latest.createdAt < 9000 && latest.type === "success") return "success";
    if (assignment && assignment.task.id === "crisis") return "crisis";
    if ((state.fire >= 70 && workerId === "fire05") || (getDashboardBugLevel() >= 70 && workerId === "security06")) return "alert";
    return assignment ? "working" : "resting";
  }

  function getOfficeWorkerDialogue(workerId, assignment) {
    const character = CHARACTER_ASSETS[workerId] || {};
    if (state.fire >= 70 && (workerId === "boss" || workerId === "fire05")) return "炎上 " + Math.round(state.fire) + "。いま火消しを！";
    if (getDashboardBugLevel() >= 70 && (workerId === "boss" || workerId === "security06")) return "バグ " + Math.round(getDashboardBugLevel()) + "。品質確認します";
    const latest = state.logs.find(function (log) { return log.employeeId === workerId && Date.now() - log.createdAt < 16000; });
    if (latest) return latest.text.length > 34 ? latest.text.slice(0, 33) + "…" : latest.text;
    if (assignment) {
      if (assignment.task.id === "sales") return "MRR " + formatCurrency(getTotalProductMrr()) + "。商談中です";
      if (assignment.task.id === "development") return assignment.definition.name + "を開発中です";
      return assignment.task.label + "を進めています";
    }
    const dialogue = Array.isArray(character.dialogue) ? character.dialogue : [];
    return dialogue.length ? dialogue[(state.playSeconds + workerId.length) % dialogue.length] : "次の仕事を待っています";
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
    const character = CHARACTER_ASSETS[workerId] || {};
    const assignment = getOfficeWorkerAssignment(workerId);
    const label = character.label || getWorkerLabel(workerId);
    const detail = assignment ? assignment.definition.name + "の" + assignment.task.label + "を担当中" : "待機中。タップして仕事を割り振る";
    const src = character.officeSrc || character.src || "";
    const workerState = getOfficeWorkerState(workerId, assignment);
    const dialogue = getOfficeWorkerDialogue(workerId, assignment);
    const selected = dashboardUi.officeWorkerSelected === workerId;
    return '<button type="button" class="office-worker' + (selected ? ' selected' : '') + '" data-office-worker="' + escapeHtml(workerId) + '" data-task="' + escapeHtml(assignment ? assignment.task.id : "idle") + '" data-worker-state="' + escapeHtml(workerState) + '" data-zone-slot="' + zoneSlot + '" style="--worker-index:' + index + ';--worker-x:' + position.x + '%;--worker-y:' + position.y + '%" aria-pressed="' + String(selected) + '" aria-label="' + escapeHtml(label + "、" + detail + "。" + dialogue) + '"><span class="office-speech" aria-hidden="true">' + escapeHtml(dialogue) + '</span><span class="office-work-effect" aria-hidden="true"><i></i><b>' + escapeHtml(assignment ? getOfficeTaskSymbol(assignment.task.id) : "☕") + '</b></span><span class="office-worker-fallback" aria-hidden="true">' + escapeHtml(character.shortLabel || "AI") + '</span>' + (src ? '<img data-office-character-image src="' + escapeHtml(src + "?v=" + APP_ASSET_TOKEN) + '" alt="" width="512" height="768" decoding="async">' : '') + '<span class="office-worker-status"><span aria-hidden="true">' + escapeHtml(assignment ? getOfficeTaskSymbol(assignment.task.id) : "☕") + '</span> ' + escapeHtml(assignment ? assignment.task.label : "待機") + '</span></button>';
  }

  function getOfficeEquipmentHtml(officeLevel) {
    return Object.keys(OFFICE_TASK_ZONES).map(function (taskId) {
      const zone = OFFICE_TASK_ZONES[taskId];
      const locked = officeLevel < zone.unlock;
      return '<button type="button" class="office-zone zone-' + taskId + (locked ? ' locked' : '') + '" data-office-zone="' + taskId + '" data-zone-label="' + escapeHtml(zone.shortLabel) + '" style="--zone-x:' + zone.x + '%;--zone-y:' + zone.y + '%"' + (locked ? ' disabled' : '') + ' aria-label="' + escapeHtml(zone.label + (locked ? '、会社Lv' + zone.unlock + 'で解放' : 'を操作')) + '"><b aria-hidden="true">' + zone.icon + '</b><span>' + escapeHtml(zone.label) + '</span>' + (locked ? '<small>Lv' + zone.unlock + '</small>' : '') + '</button>';
    }).join("");
  }

  function handleOfficeZoneAction(taskId) {
    const task = TASKS.find(function (item) { return item.id === taskId; });
    if (!task) return;
    const assignedDefinition = PRODUCTS.find(function (definition) { return getProductAssignment(taskId, definition.id).aiIds.length > 0; });
    const target = assignedDefinition || PRODUCTS.find(function (definition) { return canAssignTaskToProduct(taskId, definition.id); }) || getPrimaryProductDefinition();
    if (!target || !canAssignTaskToProduct(taskId, target.id)) {
      navigateToPage("products", { updateHistory: true, scrollTop: true });
      focusMainContent();
      return;
    }
    const product = getProduct(target.id);
    const mode = taskId === "development" && product.upgradeStatus === "upgrading" ? "upgrade" : "normal";
    openProductAssignmentModal(taskId, target.id, mode);
  }

  function renderOfficeWorkerInspector() {
    const panel = document.getElementById("officeWorkerInspector");
    if (!panel) return;
    const workerId = dashboardUi.officeWorkerSelected;
    const hired = workerId === "boss" || EMPLOYEES.some(function (employee) { return employee.id === workerId && (state.employees[employee.id] || 0) > 0; });
    if (!workerId || !hired) { panel.hidden = true; panel.innerHTML = ""; return; }
    const character = CHARACTER_ASSETS[workerId] || {};
    const assignment = getOfficeWorkerAssignment(workerId);
    const label = character.label || getWorkerLabel(workerId);
    const taskLine = assignment ? assignment.definition.name + " / " + assignment.task.label : "待機中 / 新しい指令を待っています";
    panel.hidden = false;
    panel.innerHTML = '<button type="button" class="office-inspector-close" data-office-inspector-close aria-label="社員詳細を閉じる">×</button>' + getCharacterAvatarHtml(workerId, "office-inspector-avatar", false) + '<div class="office-inspector-copy"><span>SELECTED AI</span><strong>' + escapeHtml(label) + '</strong><p>' + escapeHtml(taskLine) + '</p><small>' + escapeHtml(getOfficeWorkerDialogue(workerId, assignment)) + '</small></div><button type="button" class="office-inspector-assign" data-office-inspector-assign="' + escapeHtml(workerId) + '">担当を変更</button>';
    activateCharacterImageFallbacks(panel);
    const closeButton = panel.querySelector("[data-office-inspector-close]");
    if (closeButton) closeButton.addEventListener("click", function () { dashboardUi.officeWorkerSelected = ""; renderOffice(); });
    const assignButton = panel.querySelector("[data-office-inspector-assign]");
    if (assignButton) assignButton.addEventListener("click", function () { openWorkerAssignmentModal(workerId); });
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
    const level = state.companyLevel;
    officeName.textContent = officeNames[officeLevel - 1];
    setText("officeCompanyLevel", officeLevel);
    const officeStage = document.getElementById("officeStage");
    if (officeStage && typeof officeStage.setAttribute === "function") officeStage.setAttribute("data-office-level", String(officeLevel));
    const bugLevel = getDashboardBugLevel();
    officeMood.textContent = bugLevel >= 70 && state.fire >= 70 ? "警告灯が会議室より多く点灯しています。" : state.fire >= 60 ? "広報チャンネルが高温話題化しています。" : bugLevel >= 60 ? "未分類機能が廊下を歩いています。" : level >= 5 ? "全フロアが自律稼働中。停止ボタンは申請制です。" : level >= 3 ? "自動化が進み、誰が何を自動化したか不明です。" : level >= 2 ? "人員は少ないですが、全員が24時間います。" : "起業直後。まだクラウド代の方が重いです。";
    officePanel.classList.toggle("alert", bugLevel >= 65 || state.fire >= 65);
    const background = document.getElementById("officeBackground");
    if (background && typeof background.getAttribute === "function") {
      const nextSrc = "assets/office/backgrounds/office-level-" + officeLevel + ".webp?v=" + APP_ASSET_TOKEN;
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
    const hiredWorkerIds = ["boss"].concat(EMPLOYEES.filter(function (employee) { return (state.employees[employee.id] || 0) > 0; }).map(function (employee) { return employee.id; }));
    const workers = document.getElementById("officeWorkers");
    if (workers) {
      const workerSignature = hiredWorkerIds.map(function (workerId) {
        const assignment = getOfficeWorkerAssignment(workerId);
        const latest = state.logs.find(function (log) { return log.employeeId === workerId || (workerId === "boss" && log.employeeId === "company"); });
        return workerId + ":" + (assignment ? assignment.task.id + ":" + assignment.definition.id + ":" + assignment.mode : "idle") + ":" + getOfficeWorkerState(workerId, assignment) + ":" + (latest ? String(latest.id || latest.createdAt || "") + ":" + latest.text : "");
      }).join("|") + "|selected:" + dashboardUi.officeWorkerSelected;
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
        workers.querySelectorAll("button[data-office-worker]").forEach(function (button) { button.addEventListener("click", function () { dashboardUi.officeWorkerSelected = button.getAttribute("data-office-worker"); renderOffice(); }); });
        activateOfficeImageFallbacks(workers);
      }
    }
    renderOfficeWorkerInspector();
    const workingCount = hiredWorkerIds.filter(function (workerId) { return Boolean(getOfficeWorkerAssignment(workerId)); }).length;
    const summary = document.getElementById("officeSummary");
    const summaryText = "稼働中 " + workingCount + "体 / 待機中 " + (hiredWorkerIds.length - workingCount) + "体。キャラクターをタップすると担当を変更できます。";
    if (summary && summary.textContent !== summaryText) summary.textContent = summaryText;
    const decisionHotspot = document.getElementById("officeDecisionHotspot");
    if (decisionHotspot) decisionHotspot.hidden = !state.pendingDecisionEvent;
  }

  // === Rendering: Employees ===
  function renderEmployees() {
    const panel = document.getElementById("employeePanel");
    if (!panel) return;
    const roster = dashboardUi.employeesExpanded ? "" : getTeamRosterPreviewHtml();
    panel.innerHTML = '<div class="section-heading"><div><span class="section-kicker">AI CREW</span><h2>AI社員</h2></div><button type="button" id="toggleEmployeesButton" class="change-assignment-button">' + (dashboardUi.employeesExpanded ? '社員を閉じる' : '社員を見る') + '</button></div>' +
      roster +
      '<p class="dashboard-summary">雇用済み: ' + escapeHtml(getHiredEmployeeSummary()) + '</p>' +
      '<div class="employee-list" id="employeeList">' + (dashboardUi.employeesExpanded ? getEmployeeCardsHtml() : '') + '</div>';
    const toggle = document.getElementById("toggleEmployeesButton");
    if (toggle) toggle.addEventListener("click", function () { toggleDashboardPanel("employeesExpanded"); });
    const list = document.getElementById("employeeList");
    if (list) list.querySelectorAll("button[data-employee-id]").forEach(function (button) { button.addEventListener("click", function () { hireOrUpgradeEmployee(button.getAttribute("data-employee-id")); }); });
    if (list) list.querySelectorAll("button[data-worker-assign]").forEach(function (button) { button.addEventListener("click", function () { openWorkerAssignmentModal(button.getAttribute("data-worker-assign")); }); });
    panel.querySelectorAll("button[data-roster-worker]").forEach(function (button) { button.addEventListener("click", function () { openWorkerAssignmentModal(button.getAttribute("data-roster-worker")); }); });
    panel.querySelectorAll("button[data-roster-hire]").forEach(function (button) { button.addEventListener("click", function () { dashboardUi.employeesExpanded = true; renderEmployees(); scrollToElement("employeeList"); }); });
    activateCharacterImageFallbacks(panel);
  }

  function getTeamRosterPreviewHtml() {
    const boss = '<button type="button" class="team-roster-member hired featured" data-roster-worker="boss">' + getCharacterAvatarHtml("boss", "team-roster-avatar", true) + '<span class="roster-member-copy"><strong>AI社長</strong><small>COMMAND / 常駐</small></span><i aria-hidden="true">編成</i></button>';
    const members = EMPLOYEES.map(function (employee) {
      const level = state.employees[employee.id] || 0;
      const locked = !canUnlockEmployee(employee.id);
      const status = locked ? "locked" : (level > 0 ? "hired" : "available");
      const statusLabel = locked ? "会社Lv" + employee.unlockLevel + "で解放" : (level > 0 ? employee.role + " / Lv" + level : employee.role + " / 採用可能");
      const actionAttribute = locked ? " disabled" : (level > 0 ? ' data-roster-worker="' + employee.id + '"' : ' data-roster-hire="' + employee.id + '"');
      return '<button type="button" class="team-roster-member ' + status + '"' + actionAttribute + '>' + getCharacterAvatarHtml(employee.id, "team-roster-avatar", true) + '<span class="roster-member-copy"><strong>' + escapeHtml(employee.code) + '</strong><small>' + escapeHtml(statusLabel) + '</small></span><i aria-hidden="true">' + (locked ? "LOCK" : (level > 0 ? "編成" : "採用")) + '</i></button>';
    }).join("");
    return '<div class="team-roster-preview" aria-label="AI社員の在籍状況">' + boss + members + '</div>';
  }

  function getEmployeeCardsHtml() {
    return getBossWorkerCardHtml() + EMPLOYEES.map(function (employee) {
      const level = state.employees[employee.id] || 0;
      const locked = !canUnlockEmployee(employee.id);
      const maxed = level >= MAX_LEVEL;
      const cost = getEmployeeCost(employee.id);
      const startupCredit = isStartupCreditAvailable(employee.id);
      const action = level === 0 ? "雇用" : "強化";
      const recommended = startupCredit && (employee.id === "dev01" || employee.id === "sales02");
      const profileHtml = getEmployeePipelineProfileHtml(employee.id);
      if (locked) return '<article class="employee-card locked compact-locked"><div class="employee-top">' + getCharacterAvatarHtml(employee.id, "employee-character-avatar", true) + '<div class="employee-name"><strong>' + escapeHtml(employee.code) + ' / ' + escapeHtml(employee.nickname) + '</strong><span>' + escapeHtml(employee.role) + '</span></div><div class="level-badge">Lv ' + employee.unlockLevel + '</div></div>' + profileHtml + '<span class="lock-note">会社Lv' + employee.unlockLevel + 'で解放</span><div class="employee-action"><button type="button" class="worker-assign-button" disabled>仕事を割り振る</button></div></article>';
      if (level === 0) {
        return '<article class="employee-card compact-unhired' + (recommended ? ' recommended' : '') + '"><div class="employee-top">' + getCharacterAvatarHtml(employee.id, "employee-character-avatar", true) + '<div class="employee-name"><strong>' + escapeHtml(employee.code) + ' / ' + escapeHtml(employee.nickname) + '</strong><span>' + escapeHtml(employee.role) + '</span></div><div class="level-badge">未雇用</div></div>' + profileHtml + '<div class="employee-action"><span class="cost-line">' + (startupCredit ? '初回創業クレジット: ¥0' : '雇用コスト: ' + formatCurrency(cost)) + '</span><button type="button" data-employee-id="' + employee.id + '">' + (startupCredit ? '雇用 ¥0' : '雇用 ' + formatCurrency(cost)) + '</button><button type="button" class="worker-assign-button" disabled>仕事を割り振る</button>' + (startupCredit ? '<span class="startup-note">最初の1体だけ無料です。</span>' : '') + '</div></article>';
      }
      return '<article class="employee-card hired"><div class="employee-top">' + getCharacterAvatarHtml(employee.id, "employee-character-avatar", true) + '<div class="employee-name"><strong>' + escapeHtml(employee.code) + ' / ' + escapeHtml(employee.nickname) + '</strong><span>' + escapeHtml(employee.role) + '</span></div><div class="level-badge">Lv ' + level + '</div></div>' + profileHtml + '<div class="quote compact-quote">「' + escapeHtml(employee.catchphrase) + '」</div><div class="employee-action"><span class="cost-line">' + action + 'コスト: ' + formatCurrency(cost) + '</span><button type="button" data-employee-id="' + employee.id + '"' + (maxed ? ' disabled' : '') + '>' + (maxed ? '最大Lv' : action + ' ' + formatCurrency(cost)) + '</button><button type="button" class="worker-assign-button" data-worker-assign="' + employee.id + '">仕事を割り振る</button></div></article>';
    }).join("");
  }

  function getBossWorkerCardHtml() {
    return '<article class="employee-card hired boss-worker-card"><div class="employee-top">' + getCharacterAvatarHtml("boss", "employee-character-avatar", true) + '<div class="employee-name"><strong>AI社長</strong><span>初期担当AI</span></div><div class="level-badge">常駐</div></div>' + getEmployeePipelineProfileHtml("boss") + '<div class="employee-action"><button type="button" class="worker-assign-button" data-worker-assign="boss">仕事を割り振る</button></div></article>';
  }

  function getWorkerRelationshipSummary(workerId) {
    const relationships = AI_RELATIONSHIPS.filter(function (relationship) { return relationship.workers.indexOf(workerId) >= 0; });
    return relationships.length ? relationships.map(function (relationship) { return relationship.label + "（" + relationship.workers.filter(function (id) { return id !== workerId; }).map(getWorkerLabel).join("・") + "）"; }).join(" / ") : "全員の仕事を補助";
  }

  function getEmployeePipelineProfileHtml(workerId) {
    const profile = WORKER_TASK_PROFILES[workerId] || { specialty: "補助", description: "製品タスクを補助します。", levelHint: "Lvアップで担当効果UP" };
    const employee = getEmployee(workerId);
    const personality = employee ? employee.personality : "会社全体を見ながら、空いている仕事を静かに引き受ける。";
    return '<details class="employee-task-profile"><summary><span class="employee-specialty">得意: ' + escapeHtml(profile.specialty) + '</span><span>プロフィールを見る</span></summary><p class="employee-desc">' + escapeHtml(profile.description) + '</p><p class="employee-personality"><strong>性格</strong> ' + escapeHtml(personality) + '</p><p class="employee-affinity"><strong>相性</strong> ' + escapeHtml(getWorkerRelationshipSummary(workerId)) + '</p><span class="employee-level-hint">' + escapeHtml(profile.levelHint) + '</span><span class="employee-current-task">現在担当: ' + escapeHtml(getWorkerAssignmentSummary(workerId)) + '</span></details>';
  }

  function getWorkerAssignmentSummary(workerId) {
    const assignments = TASKS.map(function (task) {
      const productLabels = PRODUCTS.map(function (definition) {
        const assignment = getProductAssignment(task.id, definition.id);
        if (assignment.aiIds.indexOf(workerId) === -1) return "";
        return task.label + " → " + definition.name;
      }).filter(Boolean);
      return productLabels.join(" / ");
    }).filter(Boolean);
    return assignments.length ? assignments.join(" / ") : "なし";
  }

  function renderLatestLog() {
    const latest = state.logs[0];
    const text = document.getElementById("latestLogText");
    const type = document.getElementById("latestLogType");
    const panel = document.getElementById("latestLogPanel");
    const avatar = document.getElementById("latestLogAvatar");
    if (!latest || !text || !type) return;
    const logType = LOG_LABELS[latest.type] ? latest.type : "normal";
    text.textContent = latest.text;
    type.textContent = LOG_LABELS[logType];
    if (avatar) { avatar.innerHTML = getCharacterAvatarHtml(latest.employeeId, "latest-character-avatar", false); activateCharacterImageFallbacks(avatar); }
    if (panel) panel.className = "latest-log-panel latest-" + logType;
    const activityPanel = document.getElementById("activityPanel");
    if (activityPanel) activityPanel.classList.toggle("latest-danger", logType === "bug" || logType === "fire");
  }

  function renderLogs() {
    const panel = document.getElementById("logPanel");
    if (!panel) return;
    panel.innerHTML = '<div class="section-heading"><h2>業務報告ログ</h2><button type="button" id="toggleLogsButton" class="change-assignment-button">' + (dashboardUi.logsExpanded ? 'ログを閉じる' : 'ログを見る') + '</button></div>' +
      '<div class="log-list" id="logList" aria-live="polite">' + (dashboardUi.logsExpanded ? getLogListHtml() : getLogListHtml(5)) + '</div>';
    const toggle = document.getElementById("toggleLogsButton");
    if (toggle) toggle.addEventListener("click", function () { toggleDashboardPanel("logsExpanded"); });
    activateCharacterImageFallbacks(panel);
  }

  function getLogListHtml(limit) {
    return state.logs.slice(1, limit ? limit + 1 : undefined).map(function (log, index) {
      const type = LOG_LABELS[log.type] ? log.type : "normal";
      const ageClass = index >= 5 ? ' old-log' : '';
      return '<article class="log-item log-' + type + ageClass + (log.boot ? ' boot-log' : '') + '">' + getCharacterAvatarHtml(log.employeeId, "log-character-avatar", false) + '<div class="log-content"><div class="log-head"><span class="log-type">' + LOG_LABELS[type] + '</span><span class="log-time">' + formatTime(log.createdAt) + '</span></div><p>' + escapeHtml(log.text) + '</p></div></article>';
    }).join("");
  }

  function isDebugMode() {
    const search = window.location && typeof window.location.search === "string" ? window.location.search : (typeof location !== "undefined" && typeof location.search === "string" ? location.search : "");
    return /(?:\?|&)debug=1(?:&|$)/.test(search);
  }

  // === Debug Tools ===
  function renderDebugPanel() {
    const panel = document.getElementById("debugPanel");
    if (!panel) return;
    if (!isDebugMode()) {
      panel.hidden = true;
      panel.innerHTML = "";
      return;
    }
    panel.hidden = false;
    panel.innerHTML = DEBUG_RENDERER.getHtml(APP_VERSION);
    panel.querySelectorAll("button[data-debug-action]").forEach(function (button) {
      button.addEventListener("click", function () { applyDebugAction(button.getAttribute("data-debug-action")); });
    });
  }

  // === Debug Runtime ===
  function applyDebugAction(action) {
    if (!isDebugMode()) return false;
    if (action === "money100k") {
      state.money += 100000;
      state.totalMoney += 100000;
      addLog("system", "デバッグ: 売上を+100Kしました。", "company");
    } else if (action === "customers5") {
      const definition = PRODUCTS.find(function (item) { return item.type === "subscription"; }) || PRODUCTS[0];
      const product = getProduct(definition.id);
      product.status = product.status === "idea" ? "selling" : product.status;
      product.customers = getProductCustomers(product) + 5;
      recalculateProductMrr(product, definition);
      addLog("system", "デバッグ: " + definition.name + "の顧客を+5しました。", definition.id);
    } else if (action === "fire50") {
      state.fire = clamp(state.fire + 50, 0, 100);
      addLog("system", "デバッグ: 炎上度を+50しました。", "company");
    } else if (action === "bugs50") {
      const definition = getPrimaryProductDefinition();
      const product = getProduct(definition.id);
      product.bugs = clamp(product.bugs + 50, 0, 100);
      addLog("system", "デバッグ: " + definition.name + "の製品バグを+50しました。", definition.id);
    } else if (action === "unlockAllAi") {
      EMPLOYEES.forEach(function (employee) { state.employees[employee.id] = Math.max(1, state.employees[employee.id] || 0); });
      addLog("system", "デバッグ: 全AIを雇用済みにしました。", "company");
    } else if (action === "completeProducts") {
      PRODUCTS.forEach(function (definition) {
        const product = getProduct(definition.id);
        if (product.status === "idea" || product.status === "developing") product.status = "ready";
        product.progress = definition.developmentRequired;
      });
      addLog("system", "デバッグ: 全製品を完成状態にしました。", "company");
    } else if (action === "decisionNow") {
      if (state.pendingDecisionEvent) {
        addLog("system", "デバッグ: 未処理の社長判断があるため上書きしません。", "company");
      } else {
        state.decisionEventCooldown = 0;
        const candidates = getDecisionEventCandidates();
    const dueFollowup = candidates.find(function (candidate) { const event = getDecisionEventDefinition(candidate.id); return event && event.followup; });
        const candidate = candidates.length ? selectDecisionEventCandidate(candidates) : null;
        if (candidate) {
          state.pendingDecisionEvent = { id: candidate.id, productId: candidate.productId, createdAt: Date.now() };
          state.decisionEventCooldown = DECISION_EVENT_COOLDOWN_SECONDS;
          addLog("system", "デバッグ: 社長判断を発生させました。", "company");
        } else {
          addLog("system", "デバッグ: 発生条件を満たす社長判断がありません。", "company");
        }
      }
    } else if (action === "decisionClearPending") {
      state.pendingDecisionEvent = null;
      addLog("system", "デバッグ: 未処理の社長判断をクリアしました。", "company");
    } else if (action === "decisionResetCooldown") {
      state.decisionEventCooldown = 0;
      addLog("system", "デバッグ: 社長判断クールダウンを解除しました。", "company");
    } else if (action === "decisionHighChurn") {
      const definition = PRODUCTS.find(function (item) { return item.type === "subscription"; }) || getPrimaryProductDefinition();
      const product = getProduct(definition.id);
      product.status = "selling";
      product.customers = Math.max(getProductCustomers(product), 8);
      product.supportLoad = 70;
      product.satisfaction = 35;
      product.churnRisk = 70;
      state.employees.care04 = Math.max(1, state.employees.care04 || 0);
      state.decisionEventCooldown = 0;
      addLog("system", "デバッグ: " + definition.name + "を高解約判断シナリオにしました。", definition.id);
    } else if (action === "decisionHandlersReport") {
      const missing = getDecisionHandlerMissingEventIds();
      console.log("Decision handlers", { count: DECISION_EVENTS.length, missing: missing });
      addLog("system", "デバッグ: 社長判断handlerをconsoleへ出力しました。未定義" + missing.length + "件。", "company");
    } else if (action === "tick10") {
      runDebugTicks(10);
      addLog("system", "デバッグ: 10秒分のtickを実行しました。", "company");
    } else if (action === "tick60") {
      runDebugTicks(60);
      addLog("system", "デバッグ: 60秒分のtickを実行しました。", "company");
    } else if (action === "runtimeClamp") {
      clampRuntimeState();
      addLog("system", "デバッグ: runtime clampを実行しました。", "company");
    } else if (action === "runtimeSummary") {
      console.log("AI_BLACK_STARTUP_TICK_SUMMARY", JSON.stringify(getRuntimeDebugSummary()));
      addLog("system", "デバッグ: tick概要をconsoleへ出力しました。", "company");
    } else if (action === "scenario10min") {
      state.money += 100000;
      state.totalMoney += 100000;
      EMPLOYEES.forEach(function (employee) { state.employees[employee.id] = Math.max(1, state.employees[employee.id] || 0); });
      const daily = getProduct("dailyReportAi");
      daily.status = "selling";
      daily.progress = getProductDefinition("dailyReportAi").developmentRequired;
      daily.customers = Math.max(getProductCustomers(daily), 8);
      daily.awareness = Math.max(daily.awareness, 45);
      const meeting = getProduct("meetingMinutesAi");
      meeting.status = "developing";
      meeting.progress = Math.max(meeting.progress, 120);
      const slide = getProduct("slideKitAi");
      slide.status = "ready";
      slide.progress = getProductDefinition("slideKitAi").developmentRequired;
      addLog("system", "デバッグ: 10分プレイテスト状態を作りました。", "company");
    } else if (action === "mrrBoost") {
      PRODUCTS.filter(function (definition) { return definition.type === "subscription"; }).forEach(function (definition) {
        const product = getProduct(definition.id);
        product.status = "selling";
        product.customers = getProductCustomers(product) + 20;
        recalculateProductMrr(product, definition);
      });
      addLog("system", "デバッグ: サブスク顧客を増やしてMRR確認状態にしました。", "company");
    } else if (action === "vnextReady") {
      const definition = PRODUCTS.find(function (item) { return item.type === "subscription"; }) || PRODUCTS[0];
      const product = getProduct(definition.id);
      product.status = "selling";
      product.upgradeStatus = "upgrading";
      product.upgradeProgress = 90;
      addLog("system", "デバッグ: " + definition.name + "のvNextを90%にしました。", definition.id);
    } else if (action === "crisisScenario") {
      state.fire = 85;
      const definition = getProductDefinition("dailyReportAi");
      const product = getProduct(definition.id);
      product.status = "selling";
      product.customers = Math.max(getProductCustomers(product), 10);
      product.supportLoad = 70;
      product.satisfaction = 35;
      product.churnRisk = 65;
      adjustProductFire(product, 60);
      addLog("system", "デバッグ: 炎上/解約リスクのテスト状態を作りました。", definition.id);
    } else if (action === "productFireScenario") {
      const definition = getPrimaryProductDefinition();
      const product = getProduct(definition.id);
      product.status = product.status === "idea" ? "selling" : product.status;
      adjustProductFire(product, 70);
      addLog("system", "デバッグ: " + definition.name + "の製品炎上を上げました。", definition.id);
    } else if (action === "riskChipsScenario") {
      PRODUCTS.forEach(function (definition) {
        const product = getProduct(definition.id);
        product.status = product.status === "idea" ? "selling" : product.status;
        product.progress = Math.max(product.progress, definition.developmentRequired || 0);
        product.productFire = Math.max(getProductFire(product), 82);
        product.bugs = Math.max(product.bugs, 72);
        product.quality = Math.min(product.quality, 38);
        if (definition.type === "subscription") {
          product.customers = Math.max(getProductCustomers(product), 8);
          product.supportLoad = Math.max(product.supportLoad, 84);
          product.churnRisk = Math.max(product.churnRisk, 76);
          product.satisfaction = Math.min(product.satisfaction, 34);
        }
      });
      addLog("system", "デバッグ: リスクchip確認用に全製品の運用リスクを上げました。", "company");
    } else if (action === "presetGrowth") {
      EMPLOYEES.forEach(function (employee) { state.employees[employee.id] = Math.max(1, state.employees[employee.id] || 0); });
      applyTaskPreset("growth", { allowStateBoost: true, allowReassign: true });
    } else if (action === "presetCash") {
      EMPLOYEES.forEach(function (employee) { state.employees[employee.id] = Math.max(1, state.employees[employee.id] || 0); });
      applyTaskPreset("cash", { allowStateBoost: true, allowReassign: true });
    } else if (action === "presetFirefighting") {
      EMPLOYEES.forEach(function (employee) { state.employees[employee.id] = Math.max(1, state.employees[employee.id] || 0); });
      applyTaskPreset("firefighting", { allowStateBoost: true, allowReassign: true });
    } else if (action === "presetSupport") {
      EMPLOYEES.forEach(function (employee) { state.employees[employee.id] = Math.max(1, state.employees[employee.id] || 0); });
      applyTaskPreset("support", { allowStateBoost: true, allowReassign: true });
    } else if (action === "presetVnext") {
      EMPLOYEES.forEach(function (employee) { state.employees[employee.id] = Math.max(1, state.employees[employee.id] || 0); });
      applyTaskPreset("vnext", { allowStateBoost: true, allowReassign: true });
    } else if (action === "presetStability") {
      EMPLOYEES.forEach(function (employee) { state.employees[employee.id] = Math.max(1, state.employees[employee.id] || 0); });
      applyTaskPreset("stability", { allowStateBoost: true, allowReassign: true });
    } else if (action === "allAiLevel5") {
      EMPLOYEES.forEach(function (employee) { state.employees[employee.id] = Math.max(5, state.employees[employee.id] || 0); });
      addLog("system", "デバッグ: 全AIをLv5にしました。", "company");
    } else if (action === "companyExpansionReady") {
      if (state.companyLevel < MAX_LEVEL) state.totalMoney = Math.max(state.totalMoney, LEVEL_THRESHOLDS[state.companyLevel]);
      state.money = Math.max(state.money, 10000);
      addLog("system", "デバッグ: 会社Lvアップ可能状態にしました。", "company");
    } else if (action === "allProductsV5") {
      PRODUCTS.forEach(function (definition) {
        const product = getProduct(definition.id);
        product.status = "selling";
        product.progress = definition.developmentRequired;
        product.quality = Math.max(product.quality, 75);
        product.awareness = Math.max(product.awareness, 60);
        if (definition.type === "subscription") {
          product.version = Math.max(getProductVersion(product), 5);
          product.customers = Math.max(getProductCustomers(product), 10);
          product.satisfaction = Math.max(product.satisfaction, 75);
          recalculateProductMrr(product, definition);
        } else {
          product.unitsSold = Math.max(getProductUnitsSold(product), 10);
          product.lifetimeRevenue = Math.max(safeNumber(product.lifetimeRevenue, 0), definition.price * product.unitsSold);
        }
      });
      addLog("system", "デバッグ: 全製品を販売中・v5相当にしました。", "company");
    } else if (action === "unlockAchievements") {
      ACHIEVEMENTS.forEach(function (achievement) { state.achievements[achievement.id] = { unlocked: true, unlockedAt: Date.now() }; });
      addLog("system", "デバッグ: 全実績を解除しました。", "company");
    } else if (action === "stateSummary") {
      console.log("AI_BLACK_STARTUP_STATE_SUMMARY", JSON.stringify(getDebugStateSummary()));
      addLog("system", "デバッグ: state概要をconsoleへ出力しました。", "company");
    } else if (action === "dumpSave") {
      console.log("AI_BLACK_STARTUP_SAVE", JSON.stringify(state));
      addLog("system", "デバッグ: save内容をconsoleへ出力しました。", "company");
    } else {
      return false;
    }
    applyAchievements(false);
    saveGame();
    render();
    scheduleNextTick();
    return true;
  }

  function runDebugTicks(count) {
    const safeCount = clamp(Math.floor(safeNumber(count, 0)), 0, 600);
    for (let index = 0; index < safeCount; index += 1) runGameTick({ save: false });
    saveGame();
  }

  function setUnsafeRuntimeStateForTest(patch) {
    if (!patch || typeof patch !== "object") return;
    Object.keys(patch).forEach(function (key) {
      if (key === "products" && patch.products && typeof patch.products === "object") {
        Object.keys(patch.products).forEach(function (productId) {
          state.products[productId] = Object.assign({}, state.products[productId] || {}, patch.products[productId]);
        });
      } else {
        state[key] = patch[key];
      }
    });
  }

  function getRuntimeDebugSummary() {
    return {
      version: APP_VERSION,
      money: Math.round(state.money),
      totalMoney: Math.round(state.totalMoney),
      totalMrr: getTotalProductMrr(),
      productRevenuePerSecond: Math.round(getProductRevenuePerSecondTotal() * 10) / 10,
      baseRevenuePerSecond: Math.round(getRates().baseMoney * 10) / 10,
      fire: Math.round(state.fire),
      bugs: Math.round(getDashboardBugLevel()),
      pendingDecision: state.pendingDecisionEvent ? state.pendingDecisionEvent.id : null,
      products: PRODUCTS.map(function (definition) {
        const product = getProduct(definition.id);
        return {
          id: definition.id,
          status: product.status,
          customers: getProductCustomers(product),
          mrr: getProductMrr(product, definition),
          unitsSold: getProductUnitsSold(product),
          supportLoad: Math.round(safeNumber(product.supportLoad, 0)),
          satisfaction: Math.round(safeNumber(product.satisfaction, 70)),
          churnRisk: Math.round(safeNumber(product.churnRisk, 0)),
          productFire: Math.round(getProductFire(product))
        };
      })
    };
  }

  function getDebugStateSummary() {
    return {
      version: APP_VERSION,
      companyLevel: state.companyLevel,
      money: Math.round(state.money),
      totalMoney: Math.round(state.totalMoney),
      totalMrr: getTotalProductMrr(),
      totalCustomers: getTotalProductCustomers(),
      fire: Math.round(state.fire),
      bugs: Math.round(getDashboardBugLevel()),
      products: PRODUCTS.map(function (definition) {
        const product = getProduct(definition.id);
        return { id: definition.id, status: product.status, customers: getProductCustomers(product), unitsSold: getProductUnitsSold(product), productFire: Math.round(getProductFire(product)) };
      })
    };
  }

  function applyTaskPreset(presetId, options) {
    const preset = TASK_PRESETS.find(function (item) { return item.id === presetId; });
    const allowStateBoost = Boolean(options && options.allowStateBoost);
    const allowReassign = Boolean(options && (options.allowReassign || options.allowStateBoost));
    if (!preset) return false;
    const results = [];
    function trySet(taskId, productId, aiIds, mode) {
      const current = getProductAssignment(taskId, productId);
      const selected = allowReassign ? [] : current.aiIds.slice(0, MAX_AI_PER_TASK_PRODUCT);
      let added = false;
      (aiIds || []).forEach(function (aiId) {
        if (!isWorkerAvailable(aiId, state.employees) || selected.indexOf(aiId) !== -1 || selected.length >= MAX_AI_PER_TASK_PRODUCT) return;
        if (allowReassign || isWorkerIdle(aiId) || current.aiIds.indexOf(aiId) !== -1) {
          selected.push(aiId);
          if (current.aiIds.indexOf(aiId) === -1) added = true;
        }
      });
      if (!selected.length || (!allowReassign && !added)) return false;
      const ok = setTaskAis(taskId, productId, selected.slice(0, MAX_AI_PER_TASK_PRODUCT), mode || "normal", { commit: false });
      if (ok) results.push(getTaskLabel(taskId) + " → " + getProductDefinition(productId).name);
      return ok;
    }
    const primary = getPrimaryProductDefinition();
    const oneShotTarget = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return definition.type === "oneShot" && ["ready", "selling"].indexOf(product.status) !== -1 && (definition.category === "oneShotTool" || definition.category === "crisis"); }) || PRODUCTS.find(function (definition) { return definition.type === "oneShot" && definition.category === "oneShotTool"; }) || PRODUCTS.find(function (definition) { return definition.type === "oneShot"; }) || primary;
    const supportProduct = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return definition.type === "subscription" && (product.churnRisk >= 35 || product.supportLoad >= 35); }) || PRODUCTS.find(function (definition) { return definition.type === "subscription" && definition.category === "support"; }) || PRODUCTS.find(function (definition) { return definition.type === "subscription"; }) || primary;
    const riskyProduct = PRODUCTS.find(function (definition) { return getProductFire(getProduct(definition.id)) >= 40; }) || PRODUCTS.find(function (definition) { return definition.category === "crisis"; }) || primary;
    const buggyProduct = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return product.status !== "idea" && (product.bugs >= 20 || product.quality < 75); }) || PRODUCTS.find(function (definition) { return definition.category === "security" || definition.category === "document"; }) || primary;
    const devTarget = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return product.status === "idea" || product.status === "developing" || product.upgradeStatus === "upgrading"; }) || primary;
    if (presetId === "growth") {
      const devMode = getProduct(devTarget.id).upgradeStatus === "upgrading" ? "upgrade" : "newProduct";
      if (allowStateBoost || getProduct(devTarget.id).upgradeStatus === "upgrading" || ["idea", "developing"].indexOf(getProduct(devTarget.id).status) !== -1) trySet("development", devTarget.id, ["boss", "dev01"], devMode);
      trySet("sales", primary.id, ["sales02"], "normal");
      trySet("marketing", primary.id, ["buzz03"], "normal");
    } else if (presetId === "cash") {
      if (allowStateBoost) {
        if (getProduct(oneShotTarget.id).status === "idea") getProduct(oneShotTarget.id).status = "developing";
        if (getProduct(oneShotTarget.id).status === "developing" && getProduct(oneShotTarget.id).progress < oneShotTarget.developmentRequired) getProduct(oneShotTarget.id).progress = oneShotTarget.developmentRequired;
        if (getProduct(oneShotTarget.id).status !== "selling") getProduct(oneShotTarget.id).status = "ready";
      }
      if (["ready", "selling"].indexOf(getProduct(oneShotTarget.id).status) !== -1) {
        trySet("sales", oneShotTarget.id, ["boss", "sales02"], "normal");
        trySet("marketing", oneShotTarget.id, ["buzz03"], "normal");
      } else {
        trySet("development", oneShotTarget.id, ["boss", "dev01"], "newProduct");
        trySet("marketing", oneShotTarget.id, ["buzz03"], "normal");
      }
    } else if (presetId === "firefighting") {
      trySet("crisis", riskyProduct.id, ["boss", "fire05"], "normal");
      trySet("support", supportProduct.id, ["care04"], "normal");
      trySet("qa", buggyProduct.id, ["security06"], "normal");
    } else if (presetId === "quality") {
      trySet("qa", buggyProduct.id, ["boss", "security06"], "normal");
    } else if (presetId === "support") {
      trySet("support", supportProduct.id, ["boss", "care04"], "normal");
      trySet("crisis", riskyProduct.id, ["fire05"], "normal");
    } else if (presetId === "vnext") {
      const upgradingTarget = PRODUCTS.find(function (definition) { return definition.type === "subscription" && getProduct(definition.id).upgradeStatus === "upgrading"; });
      const readyUpgradeTarget = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return definition.type === "subscription" && product.status === "selling" && getProductCustomers(product) > 0; });
      const upgradeTarget = upgradingTarget || (allowStateBoost ? readyUpgradeTarget : null) || devTarget;
      const upgradeProduct = getProduct(upgradeTarget.id);
      if (upgradingTarget || (allowStateBoost && upgradeTarget.type === "subscription" && ["ready", "selling"].indexOf(upgradeProduct.status) !== -1)) {
        if (allowStateBoost && upgradeProduct.upgradeStatus !== "upgrading") startSubscriptionUpgrade(upgradeTarget.id);
        trySet("development", upgradeTarget.id, ["boss", "dev01"], "upgrade");
      } else if (["idea", "developing"].indexOf(getProduct(devTarget.id).status) !== -1) {
        trySet("development", devTarget.id, ["boss", "dev01"], "newProduct");
      }
      trySet("qa", upgradeTarget.id, ["security06"], "normal");
    } else if (presetId === "stability") {
      trySet("support", supportProduct.id, ["care04"], "normal");
      trySet("crisis", riskyProduct.id, ["boss", "fire05"], "normal");
      trySet("qa", buggyProduct.id, ["security06"], "normal");
    }
    const resultText = results.length ? "プリセット「" + preset.label + "」を適用しました: " + results.join(" / ") : "プリセット「" + preset.label + "」で割り振れる空きAIがいませんでした。";
    dashboardUi.presetResult = resultText;
    addLog(results.length ? "system" : "normal", resultText, "company");
    applyAchievements(false);
    saveGame();
    render();
    scheduleNextTick();
    return results.length > 0;
  }

  function getSelectedSaveSlotId() {
    const select = document.getElementById("saveSlotSelect");
    return select && /^[1-3]$/.test(select.value) ? select.value : "1";
  }

  function getStorageModeNotice() {
    return STORAGE.isPersistent() ? "" : "端末保存を利用できないため、このタブを閉じるまでの一時保存で動作しています。";
  }

  function setSaveManagerStatus(message) {
    const notice = getStorageModeNotice();
    setText("saveManagerStatus", notice ? notice + " " + message : message);
  }

  function saveToSlot(slotId) {
    commitRuntimeStateBeforeSave();
    state.lastSavedAt = Date.now();
    SAVE_RUNTIME.saveSlot(STORAGE, slotId || getSelectedSaveSlotId(), state);
    setSaveManagerStatus("スロット" + (slotId || getSelectedSaveSlotId()) + "へ保存しました。");
    renderSaveManagerPanel();
    return true;
  }

  function loadFromSlot(slotId, skipConfirm) {
    const id = slotId || getSelectedSaveSlotId();
    if (!skipConfirm && !window.confirm("スロット" + id + "の状態へ切り替えますか？現在の状態はバックアップへ退避します。")) return false;
    try {
      const loaded = SAVE_RUNTIME.loadSlot(STORAGE, id);
      saveGame();
      SAVE_RUNTIME.backupCurrent(STORAGE);
      state = normalizeState(loaded.data);
      TICK_RUNTIME.resetPenaltyElapsed();
      addLog("system", "スロット" + id + "から保存データを読み込みました。", "company");
      saveGame();
      scheduleNextTick();
      render();
      setSaveManagerStatus("スロット" + id + "を読み込みました。");
      return true;
    } catch (error) {
      setSaveManagerStatus("スロット" + id + "を読み込めませんでした。");
      return false;
    }
  }

  function exportSaveJson(skipDownload) {
    commitRuntimeStateBeforeSave();
    const text = SAVE_RUNTIME.exportData(state);
    if (skipDownload) return text;
    try {
      const blob = new Blob([text], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "ai-black-startup-save-" + Date.now() + ".json";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
      setSaveManagerStatus("JSONセーブを書き出しました。");
    } catch (error) {
      copyShareText(text);
      setSaveManagerStatus("ダウンロード非対応のためJSONをコピーしました。");
    }
    return text;
  }

  function importSaveText(text, skipConfirm) {
    if (!skipConfirm && !window.confirm("JSONの保存状態を読み込みますか？現在の状態はバックアップへ退避します。")) return false;
    try {
      const imported = SAVE_RUNTIME.importData(text);
      saveGame();
      SAVE_RUNTIME.backupCurrent(STORAGE);
      state = normalizeState(imported);
      TICK_RUNTIME.resetPenaltyElapsed();
      addLog("system", "JSONから保存データを読み込みました。", "company");
      saveGame();
      scheduleNextTick();
      render();
      setSaveManagerStatus("JSONセーブを読み込みました。");
      return true;
    } catch (error) {
      setSaveManagerStatus("JSONセーブを読み込めませんでした。形式を確認してください。");
      return false;
    }
  }

  function importSelectedSaveFile() {
    const input = document.getElementById("importSaveInput");
    const file = input && input.files && input.files[0];
    if (!file || typeof FileReader === "undefined") return;
    const reader = new FileReader();
    reader.onload = function () { importSaveText(String(reader.result || ""), false); input.value = ""; };
    reader.onerror = function () { setSaveManagerStatus("JSONファイルを読み込めませんでした。"); };
    reader.readAsText(file);
  }

  function getPlaytestReport() {
    updatePlaytestStage();
    return OPERATIONS_RUNTIME.createPlaytestReport(state, {
      mrr: getTotalProductMrr(), customers: getTotalProductCustomers(), bugs: getDashboardBugLevel(), productFire: getMaxProductFireLevel()
    }, getCurrentMissionStage());
  }

  function copyPlaytestReport() {
    const text = JSON.stringify(getPlaytestReport(), null, 2);
    copyShareText(text);
    setSaveManagerStatus("個人情報を含まないプレイ結果をコピーしました。");
    return text;
  }

  // === Share / PWA / Boot ===
  function createShareText() {
    const primaryDefinition = getPrimaryProductDefinition();
    const primaryProduct = getProduct(primaryDefinition.id);
    return [
      "AI社長のブラック起業",
      "会社Lv: " + state.companyLevel,
      "売上: " + formatCurrency(state.money),
      "総MRR: " + formatCurrency(getTotalProductMrr()) + "/月",
      "総顧客: " + formatCustomers(getTotalProductCustomers()),
      "主力: " + primaryDefinition.name + " / " + getProductStatusLabel(primaryProduct.status),
      PUBLIC_URL
    ].join("\n");
  }

  function shareGameStatus() {
    const text = createShareText();
    const shareData = { title: "AI社長のブラック起業", text: text };
    if (navigator.share) {
      navigator.share(shareData).then(function () {
        addLog("success", "現在の経営状況を共有しました。投資家の通知欄が少し明るくなりました。", "company");
        renderLatestLog();
        renderLogs();
      }).catch(function (error) {
        if (error && error.name === "AbortError") return;
        copyShareText(text);
      });
      return;
    }
    copyShareText(text);
  }

  function copyShareText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        addLog("success", "共有テキストをクリップボードにコピーしました。", "company");
        renderLatestLog();
        renderLogs();
      }).catch(function () {
        fallbackCopyShareText(text);
      });
      return;
    }
    fallbackCopyShareText(text);
  }

  function fallbackCopyShareText(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    let copied = false;
    try { copied = document.execCommand("copy"); }
    catch (error) { copied = false; }
    document.body.removeChild(textarea);
    addLog(copied ? "success" : "normal", copied ? "共有テキストをクリップボードにコピーしました。" : "共有テキストの自動コピーに失敗しました。ブラウザの共有メニューを確認してください。", "company");
    renderLatestLog();
    renderLogs();
  }

  function getRates() {
    const rates = { baseMoney: getBaseContractRevenuePerSecond(), productRevenue: getProductRevenuePerSecondTotal(), money: 0, users: 0, bugs: 0, fire: 0 };
    rates.money = rates.baseMoney + rates.productRevenue;
    return rates;
  }

  function getBaseContractRevenuePerSecond() {
    const hiredCount = EMPLOYEES.reduce(function (sum, employee) { return sum + ((state.employees[employee.id] || 0) > 0 ? 1 : 0); }, 0);
    if (hiredCount === 0 && !hasActiveAssignment()) return 0;
    const hiredLevelTotal = EMPLOYEES.reduce(function (sum, employee) { return sum + (state.employees[employee.id] || 0); }, 0);
    const baseContractPerTenSeconds = state.companyLevel * 8 + hiredCount * 4 + hiredLevelTotal * 2;
    return baseContractPerTenSeconds * getEarlyStageMultiplier() / EFFECTS_PER_SECONDS;
  }


  function getNextUnlockText() {
    const next = EMPLOYEES.find(function (employee) { return employee.unlockLevel > state.companyLevel; });
    return next ? '次に解放: ' + next.code : '';
  }

  function getEarlyStageMultiplier() {
    return state.companyLevel === 1 && hasAnyEmployee() ? EARLY_STAGE_MULTIPLIER : 1;
  }

  function hasAnyEmployee() {
    return EMPLOYEES.some(function (employee) { return (state.employees[employee.id] || 0) > 0; });
  }

  function hasActiveAssignment() {
    return TASKS.some(function (task) { return PRODUCTS.some(function (definition) { return getProductAssignment(task.id, definition.id).aiIds.length > 0; }); });
  }

  function getAssignmentSummaryHtml(taskId) {
    const task = TASKS.find(function (item) { return item.id === taskId; }) || TASKS[0];
    const rows = PRODUCTS.map(function (definition) {
      const assignment = getProductAssignment(taskId, definition.id);
      if (!assignment.aiIds.length) return "";
      const product = getProduct(definition.id);
      const suffix = taskId === "development" && definition.type === "subscription" && product.upgradeStatus === "upgrading" ? " v" + (getProductVersion(product) + 1) : "";
      return '<span class="assignment-work-line">' + escapeHtml(getWorkerGroupLabel(assignment.aiIds) + ' → ' + definition.name + suffix) + '</span>';
    }).filter(Boolean);
    return '<article class="assignment-summary-item"><span>' + escapeHtml(task.label) + '</span><strong>' + (rows.length ? rows.join('') : '未割り振り') + '</strong></article>';
  }

  function getProductAssignmentBadges(productId) {
    const labels = TASKS.map(function (task) {
      const assignment = getProductAssignment(task.id, productId);
      if (!assignment.aiIds.length) return "";
      const definition = getProductDefinition(productId);
      const product = getProduct(definition.id);
      let taskLabel = task.label + "中";
      if (task.id === "development" && definition.type === "subscription" && product.upgradeStatus === "upgrading") taskLabel = "v" + (getProductVersion(product) + 1) + "開発中";
      return '<span class="product-assignment-badge">' + escapeHtml(getWorkerGroupLabel(assignment.aiIds)) + 'が' + escapeHtml(taskLabel) + '</span>';
    });
    const activeLabels = labels.filter(Boolean);
    return activeLabels.length ? activeLabels.join('') : '<span class="product-assignment-badge muted">担当なし</span>';
  }

  function getProductActionHint(product, definition) {
    const developmentAssignment = getProductAssignment("development", definition.id);
    const salesAssignment = getProductAssignment("sales", definition.id);
    const qaAssignment = getProductAssignment("qa", definition.id);
    const marketingAssignment = getProductAssignment("marketing", definition.id);
    if (product.status === "idea" && qaAssignment.aiIds.length) return '<p class="product-action-hint">開発開始後に品質管理できます。</p>';
    if (product.status === "idea" && marketingAssignment.aiIds.length) return '<p class="product-action-hint">開発開始後に広報できます。</p>';
    if (definition.type === "subscription" && product.upgradeStatus === "upgrading") {
      const nextVersion = getProductVersion(product) + 1;
      if (developmentAssignment.aiIds.length) return '<p class="product-action-hint">v' + nextVersion + '開発中です。</p>';
      return '<p class="product-action-hint">v' + nextVersion + '開発は一時停止中。vNext開発担当を置くと再開します。</p>';
    }
    if (product.status === "developing" && !developmentAssignment.aiIds.length) {
      return '<p class="product-action-hint">開発担当を置くと開発が進みます。</p>';
    }
    if ((product.status === "ready" || product.status === "selling") && !salesAssignment.aiIds.length) {
      const salesHint = definition.type === "subscription" && product.status === "selling" ? "販売担当なし。既存MRRは継続します。販売担当を置くと新規顧客を獲得できます。" : (definition.type === "oneShot" ? "販売担当を置くと販売判定が進みます。" : "販売担当を割り振ると顧客を獲得できます。");
      return '<p class="product-action-hint">' + escapeHtml(salesHint) + '</p>';
    }
    if (definition.type === "subscription" && (product.status === "ready" || product.status === "selling") && product.upgradeStatus === "idle") return '';
    return '';
  }

  function openAssignmentModal() {
    rememberModalTrigger();
    assignmentModalMode = "detail";
    assignmentModalOpen = true;
    assignmentDraft.mode = "normal";
    const current = getAssignment(assignmentDraft.taskId);
    assignmentDraft.productId = current.productId;
    assignmentDraft.aiId = current.aiIds[0] || null;
    assignmentDraft.aiIds = current.aiIds.slice(0, 2);
    renderAssignmentModal();
    focusModal("assignmentModal");
  }

  function openProductAssignmentModal(taskId, productId, mode) {
    rememberModalTrigger();
    const definition = getProductDefinition(productId);
    const product = getProduct(definition.id);
    const action = getProductAvailableActions(product, definition).find(function (item) { return item.taskId === taskId && item.mode === (mode || "normal"); });
    if (action && !action.enabled) return;
    assignmentModalMode = "product";
    assignmentModalOpen = true;
    const assignment = getProductAssignment(taskId, definition.id);
    assignmentDraft.taskId = taskId;
    assignmentDraft.productId = definition.id;
    assignmentDraft.aiId = assignment.aiIds[0] || null;
    assignmentDraft.aiIds = assignment.aiIds.slice(0, 2);
    assignmentDraft.mode = mode || "normal";
    renderAssignmentModal();
    focusModal("assignmentModal");
  }

  function openWorkerAssignmentModal(workerId) {
    rememberModalTrigger();
    if (!isWorkerAvailable(workerId, state.employees)) return;
    assignmentModalMode = "employee";
    assignmentModalOpen = true;
    assignmentDraft.aiId = workerId;
    const tasks = getAssignableTasksForWorker(workerId);
    assignmentDraft.taskId = tasks.length ? tasks[0].id : "development";
    assignmentDraft.productId = getFirstAvailableProductForWorkerTask(workerId, assignmentDraft.taskId) || PRODUCTS[0].id;
    updateAssignmentDraftMode();
    refreshAssignmentDraftAiIds();
    renderAssignmentModal();
    focusModal("assignmentModal");
  }

  function getAssignableTasksForWorker(workerId) {
    return TASKS.filter(function (task) { return task.workers.indexOf(workerId) !== -1; });
  }

  function getFirstAvailableProductForWorkerTask(workerId, taskId) {
    const definition = PRODUCTS.find(function (item) { return isWorkerProductTaskAvailable(workerId, taskId, item.id); });
    return definition ? definition.id : null;
  }

  function getFirstAvailableProductForTask(taskId) {
    const definition = PRODUCTS.find(function (item) { return canAssignTaskToProduct(taskId, item.id); });
    return definition ? definition.id : PRODUCTS[0].id;
  }

  function canAssignTaskToProduct(taskId, productId) {
    if (!TASKS.some(function (task) { return task.id === taskId; })) return false;
    const definition = getProductDefinition(productId);
    const product = getProduct(definition.id);
    if (taskId === "development") {
      if (product.status === "idea" || product.status === "developing") return true;
      return definition.type === "subscription" && (product.status === "ready" || product.status === "selling") && (product.upgradeStatus === "idle" || product.upgradeStatus === "upgrading");
    }
    if (taskId === "sales") return product.status === "ready" || product.status === "selling";
    if (taskId === "qa" || taskId === "marketing") return product.status === "developing" || product.status === "ready" || product.status === "selling";
    if (taskId === "support") return definition.type === "subscription" && product.status === "selling" && getProductCustomers(product) > 0;
    if (taskId === "crisis") return product.status === "selling" || ((state.fire >= 50 || getProductFire(product) >= 40) && product.status !== "idea");
    return false;
  }

  function isWorkerProductTaskAvailable(workerId, taskId, productId) {
    return canWorkerAssignToTask(workerId, taskId, state.employees) && canAssignTaskToProduct(taskId, productId);
  }

  function getWorkerProductTaskDisabledReason(workerId, taskId, productId) {
    const definition = getProductDefinition(productId);
    const product = getProduct(definition.id);
    if (!canWorkerAssignToTask(workerId, taskId, state.employees)) return "担当不可";
    if (taskId === "development") return definition.type === "subscription" ? "未着手/開発中/vNext開発中で有効" : "未着手/開発中のみ";
    if (taskId === "sales") return "完成後に有効";
    if (taskId === "support") return definition.type === "subscription" ? "販売中かつ顧客あり" : "サブスクのみ";
    if (taskId === "crisis") return "販売中または炎上高で有効";
    if (taskId === "qa" || taskId === "marketing") return "開発開始後に有効";
    return product.status === "idea" ? "未着手" : "対象外";
  }

  function updateAssignmentDraftMode() {
    assignmentDraft.mode = getWorkerAssignmentMode(assignmentDraft.aiId, assignmentDraft.taskId, assignmentDraft.productId);
  }

  function getWorkerAssignmentMode(workerId, taskId, productId) {
    if (taskId !== "development") return "normal";
    const assignmentMode = getDevelopmentAssignmentMode(taskId, productId, null);
    return assignmentMode === "upgrade" ? "upgrade" : "newProduct";
  }

  function closeAssignmentModal() {
    assignmentModalOpen = false;
    assignmentModalMode = "detail";
    assignmentDraft.mode = "normal";
    assignmentDraft.aiIds = [];
    renderAssignmentModal();
    restoreModalFocus();
  }

  function selectAssignmentTask(taskId) {
    assignmentDraft.taskId = TASKS.some(function (task) { return task.id === taskId; }) ? taskId : TASKS[0].id;
    if (assignmentModalMode === "employee") {
      assignmentDraft.productId = getFirstAvailableProductForWorkerTask(assignmentDraft.aiId, assignmentDraft.taskId) || PRODUCTS[0].id;
      updateAssignmentDraftMode();
      refreshAssignmentDraftAiIds();
      renderAssignmentModal();
      return;
    }
    const assignment = getAssignment(assignmentDraft.taskId);
    assignmentDraft.productId = canAssignTaskToProduct(assignmentDraft.taskId, assignment.productId) ? assignment.productId : getFirstAvailableProductForTask(assignmentDraft.taskId);
    assignmentDraft.aiId = assignment.aiIds[0] || null;
    assignmentDraft.aiIds = assignment.aiIds.slice(0, 2);
    updateAssignmentDraftMode();
    refreshAssignmentDraftAiIds();
    renderAssignmentModal();
  }

  function getProductTypeLine(definition, product) {
    if (definition.type === "oneShot") return "売り切り / 価格 " + formatCurrency(definition.price);
    return "サブスク / 月額 " + formatCurrency(getCurrentMonthlyPrice(product || getProduct(definition.id), definition));
  }

  function getProductDisplayName(product, definition) {
    return definition.name;
  }

  function getSubscriptionVersionLine(product) {
    const current = "v" + getProductVersion(product) + "運用中";
    if (product.upgradeStatus === "upgrading") return current + " / v" + (getProductVersion(product) + 1) + "開発中 " + Math.floor(product.upgradeProgress) + "%";
    return current;
  }

  function getMarketingEffectHint(productId) {
    return getAssignedWorkersForProduct("marketing", productId).length ? '<span class="marketing-effect">広報中 <strong>認知度UP → 販売成功率UP / 炎上微増</strong></span>' : '';
  }


  function getProductSummaryMetrics(product, definition, progressPercent) {
    if (definition.type === "oneShot") {
      return '<span class="primary-metric">販売数 <strong>' + getProductUnitsSold(product) + '本</strong></span>' +
        '<span class="primary-metric">累計売上 <strong>' + formatCurrency(product.lifetimeRevenue) + '</strong></span>' +
        '<span class="primary-metric wide">担当中 <strong class="assignment-badge-list">' + getProductAssignmentBadges(definition.id) + '</strong></span>' +
        getMarketingEffectHint(definition.id) + getProductRiskChipsHtml(product, definition, { compact: true }) + getGlobalFireRiskChipHtmlForProduct(product, state.fire);
    }
    return '<span class="primary-metric wide">バージョン <strong>' + getSubscriptionVersionLine(product) + '</strong></span>' +
      '<span class="primary-metric">顧客数 <strong>' + formatCustomers(getProductCustomers(product)) + '</strong></span>' +
      '<span class="primary-metric">MRR <strong>' + formatCurrency(getProductMrr(product, definition)) + '/月</strong></span>' +
      '<span class="primary-metric wide">担当中 <strong class="assignment-badge-list">' + getProductAssignmentBadges(definition.id) + '</strong></span>' +
      getMarketingEffectHint(definition.id) + getProductRiskChipsHtml(product, definition, { compact: true }) + getGlobalFireRiskChipHtmlForProduct(product, state.fire);
  }

  function getProductAvailableActions(product, definition) {
    const isSubscription = definition.type === "subscription";
    const isOneShot = definition.type === "oneShot";
    const isIdea = product.status === "idea";
    const isDeveloping = product.status === "developing";
    const isReady = product.status === "ready";
    const isSelling = product.status === "selling";
    const canOperate = isDeveloping || isReady || isSelling;
    const hasCustomers = getProductCustomers(product) > 0;
    if (isIdea) return [
      { id: "newProduct", label: "開発する", description: "新製品の開発を開始", taskId: "development", mode: "newProduct", category: "growth", enabled: true, disabledReason: "" }
    ];
    return [
      { id: "newProduct", label: "開発担当", description: "開発担当を変更", taskId: "development", mode: "newProduct", category: "growth", enabled: isDeveloping, disabledReason: getProductActionDisabledReason("newProduct", product, definition) },
      { id: "vNextDevelopment", label: "vNext開発担当", description: "vNext開発を進める", taskId: "development", mode: "upgrade", category: "growth", enabled: isSubscription && product.upgradeStatus === "upgrading", disabledReason: getProductActionDisabledReason("vNextDevelopment", product, definition) },
      { id: "sales", label: isReady ? "販売する" : "販売担当", description: isOneShot ? "販売成功で即時売上UP" : "顧客獲得 / MRR UP", taskId: "sales", mode: "normal", category: "revenue", enabled: isReady || isSelling, disabledReason: getProductActionDisabledReason("sales", product, definition) },
      { id: "qa", label: "品質管理", description: "品質UP / 製品バグDOWN", taskId: "qa", mode: "normal", category: "operations", enabled: canOperate, disabledReason: getProductActionDisabledReason("qa", product, definition) },
      { id: "marketing", label: "広報", description: "認知度UP / 販売成功率UP / 炎上微増", taskId: "marketing", mode: "normal", category: "growth", enabled: canOperate, disabledReason: getProductActionDisabledReason("marketing", product, definition) },
      { id: "support", label: "サポート", description: "サポート負荷DOWN / 満足度UP / 解約リスクDOWN", taskId: "support", mode: "normal", category: "operations", enabled: isSubscription && isSelling && hasCustomers, disabledReason: getProductActionDisabledReason("support", product, definition) },
      { id: "crisis", label: "炎上対応", description: "炎上度DOWN / 売上機会を少し消費", taskId: "crisis", mode: "normal", category: "operations", enabled: isSelling || ((state.fire >= 50 || getProductFire(product) >= 40) && canOperate), disabledReason: getProductActionDisabledReason("crisis", product, definition) },
      { id: "upgrade", label: "バージョンアップ", description: "月額価格UP / 品質UP / 製品バグ増", taskId: "development", mode: "upgrade", category: "growth", enabled: isSubscription && (isReady || isSelling) && product.upgradeStatus === "idle", disabledReason: getProductActionDisabledReason("upgrade", product, definition) }
    ].filter(function (action) {
      if (action.id === "vNextDevelopment") return isSubscription && product.upgradeStatus === "upgrading";
      if (action.id === "support") return isSubscription;
      if (action.id === "upgrade") return isSubscription && (isReady || isSelling) && product.upgradeStatus !== "upgrading";
      if (action.id === "newProduct") return isIdea || isDeveloping;
      if (action.id === "sales") return isReady || isSelling;
      if (action.id === "qa" || action.id === "marketing" || action.id === "crisis") return !isIdea;
      return true;
    });
  }

  function getProductActionDisabledReason(actionId, product, definition) {
    const isSubscription = definition.type === "subscription";
    if (actionId === "vNextDevelopment") {
      if (!isSubscription) return "サブスク製品のみ";
      return product.upgradeStatus === "upgrading" ? "vNext開発中です" : "vNext開発中のみ";
    }
    if (actionId === "upgrade") {
      if (!isSubscription) return "サブスク製品のみ";
      if (product.upgradeStatus === "upgrading") return "現在vNextを開発中です";
      if (product.status === "idea" || product.status === "developing") return "完成後に有効";
      return "完成後に有効";
    }
    if (actionId === "newProduct") return product.status === "idea" || product.status === "developing" ? "開発中に有効" : "開発済み製品はバージョンアップへ";
    if (actionId === "sales") return product.status === "idea" || product.status === "developing" ? "完成後に有効" : "販売できます";
    if (actionId === "qa") return product.status === "idea" ? "開発開始後に有効" : "品質管理できます";
    if (actionId === "marketing") return product.status === "idea" ? "開発開始後に有効" : "広報できます";
    if (actionId === "support") {
      if (!isSubscription) return "サブスク製品のみ";
      if (product.status !== "selling") return "販売中のサブスクで有効";
      if (getProductCustomers(product) <= 0) return "顧客獲得後に有効";
      return "サポートできます";
    }
    if (actionId === "crisis") return product.status === "idea" ? "開発開始後に有効" : "販売中または炎上/製品炎上高で有効";
    return "対象外";
  }

  function getProductAssignmentActions(product, definition) {
    return getProductAvailableActions(product, definition).filter(function (action) { return action.enabled; });
  }

  function getProductActionButtons(product, definition) {
    return '<div class="product-actions compact-product-actions"><button type="button" class="product-action-button" data-product-menu="' + definition.id + '">操作メニューへ</button><button type="button" class="product-action-button product-detail-button" data-product-detail="' + definition.id + '">詳細</button></div>';
  }

  function getAssignmentModalTitle() {
    const definition = getProductDefinition(assignmentDraft.productId);
    const product = getProduct(definition.id);
    if (assignmentModalMode === "employee") return getWorkerLabel(assignmentDraft.aiId) + "に仕事を割り振る";
    if (assignmentDraft.mode === "upgrade" && product.upgradeStatus === "upgrading") return definition.name + "のv" + (getProductVersion(product) + 1) + "開発担当を選ぶ";
    if (assignmentDraft.mode === "upgrade") return definition.name + "をバージョンアップする";
    if (assignmentDraft.taskId === "development") return definition.name + "を開発する";
    if (assignmentDraft.taskId === "sales") return definition.name + "を販売する";
    if (assignmentDraft.taskId === "marketing") return definition.name + "を広報する";
    if (assignmentDraft.taskId === "support") return definition.name + "をサポートする";
    if (assignmentDraft.taskId === "crisis") return definition.name + "の炎上対応をする";
    return definition.name + "の品質管理";
  }


  function getWorkerTaskDescription(workerId, taskId) {
    const descriptions = {
      development: { boss: "何でもできるが低速", dev01: "開発が速いがバグ増加" },
      sales: { boss: "低速で顧客獲得", sales02: "顧客獲得が速いが炎上微増" },
      marketing: { boss: "ゆっくり認知度を上げる", buzz03: "認知度を大きく上げるが炎上微増" },
      support: { boss: "低速でサポート負荷を下げる", care04: "サポート負荷と炎上を大きく下げる" },
      crisis: { boss: "ゆっくり火消し", fire05: "炎上対応が速いが、少し機会損失" },
      qa: { boss: "ゆっくり品質改善", security06: "品質改善とバグ削減が得意" }
    };
    return descriptions[taskId] && descriptions[taskId][workerId] ? descriptions[taskId][workerId] : "担当できます";
  }

  function startProductDevelopmentIfNeeded(productId, options) {
    const definition = getProductDefinition(productId);
    const product = getProduct(definition.id);
    if (product.status !== "idea") return;
    startProductDevelopmentCore(definition.id);
    if (!options || options.commit !== false) commitAssignmentChange();
  }

  function startProductDevelopmentCore(productId) {
    const definition = getProductDefinition(productId || PRODUCTS[0].id);
    const product = getProduct(definition.id);
    const flags = getProductFlags(product.id);
    if (product.status !== "idea") return false;

    const developmentAssignment = getProductAssignment("development", definition.id);
    setProductAssignmentEntry("development", definition.id, { aiIds: developmentAssignment.aiIds.slice(0, MAX_AI_PER_TASK_PRODUCT), mode: "newProduct" });
    assignmentDraft.productId = assignmentDraft.taskId === "development" ? definition.id : assignmentDraft.productId;
    product.status = "developing";
    addLog("normal", getProductLogText(product.id, "developmentTargetChanged", "開発対象を" + definition.name + "に設定しました。"), product.id);
    if (!developmentAssignment.aiIds.length) addLog("normal", getProductLogText(product.id, "noDevelopmentWorker", "次に開発担当を割り振りましょう。"), product.id);
    if (!flags.startedLogged) {
      flags.startedLogged = true;
      addLog("success", getProductLogText(product.id, "started", definition.name + "の開発を開始しました。"), product.id);
    }
    return true;
  }

  function startProductDevelopment(productId) {
    if (!startProductDevelopmentCore(productId)) return;
    commitAssignmentChange();
  }

  function startSubscriptionUpgrade(productId) {
    const definition = getProductDefinition(productId);
    const product = getProduct(definition.id);
    if (!canStartSubscriptionUpgrade(product, definition)) return;
    product.upgradeStatus = "upgrading";
    product.upgradeProgress = 0;
    addLog("normal", getProductLogText(product.id, "upgradeStarted", definition.name + " v{version} の開発を開始しました。").replace("{version}", getProductVersion(product) + 1), product.id);
  }

  function canStartSubscriptionUpgrade(product, definition) {
    return definition.type === "subscription" && ["ready", "selling"].indexOf(product.status) !== -1 && product.upgradeStatus === "idle";
  }

  function shouldStartUpgradeOnDevelopmentAssignment(product, definition) {
    return canStartSubscriptionUpgrade(product, definition);
  }

  function getAssignment(taskId) {
    const taskAssignment = getTaskAssignment(taskId);
    const assignedProduct = PRODUCTS.find(function (definition) { return taskAssignment.productAssignments[definition.id].aiIds.length > 0; });
    return getProductAssignment(taskId, assignedProduct ? assignedProduct.id : PRODUCTS[0].id);
  }

  function getTaskAssignment(taskId) {
    const fallback = createInitialAssignments()[taskId] || { productAssignments: createInitialProductAssignments(taskId) };
    const assignment = state.assignments && state.assignments[taskId] ? state.assignments[taskId] : fallback;
    if (!assignment.productAssignments) {
      const normalized = normalizeAssignments((function () { const wrapper = {}; wrapper[taskId] = assignment; return wrapper; })(), state.employees);
      return normalized[taskId];
    }
    const productAssignments = createInitialProductAssignments(taskId);
    PRODUCTS.forEach(function (definition) {
      const entry = assignment.productAssignments[definition.id] || {};
      const aiIds = Array.isArray(entry.aiIds) ? entry.aiIds.filter(Boolean).slice(0, 2) : [];
      productAssignments[definition.id] = taskId === "development" ? { aiIds: aiIds, mode: entry.mode === "upgrade" ? "upgrade" : "newProduct" } : { aiIds: aiIds };
    });
    return { productAssignments: productAssignments };
  }

  // === Assignment Helpers ===
  function getProductAssignment(taskId, productId) {
    const definition = getProductDefinition(productId);
    const taskAssignment = getTaskAssignment(taskId);
    const entry = taskAssignment.productAssignments[definition.id] || { aiIds: [] };
    return { productId: definition.id, aiIds: (entry.aiIds || []).slice(0, MAX_AI_PER_TASK_PRODUCT), mode: taskId === "development" ? (entry.mode === "upgrade" ? "upgrade" : "newProduct") : "normal" };
  }


  function getTaskProductAssignment(taskId, productId) {
    return getProductAssignment(taskId, productId);
  }

  function getAssignedAiIds(taskId, productId) {
    return getTaskProductAssignment(taskId, productId).aiIds;
  }

  function getDevelopmentAssignmentMode(taskId, productId, mode) {
    if (taskId !== "development") return "normal";
    if (mode === "newProduct") return "newProduct";
    if (mode === "upgrade") return "upgrade";
    const definition = getProductDefinition(productId);
    const product = getProduct(definition.id);
    if (definition.type === "subscription" && (product.status === "ready" || product.status === "selling")) return "upgrade";
    return "newProduct";
  }

  function setAssignedAiIds(taskId, productId, aiIds, mode) {
    const assignmentMode = getDevelopmentAssignmentMode(taskId, productId, mode);
    setProductAssignmentEntry(taskId, productId, { aiIds: (aiIds || []).slice(0, 2), mode: assignmentMode });
  }

  function canAssignAiToTaskProduct(taskId, productId, aiId) {
    return canWorkerAssignToTask(aiId, taskId, state.employees) && canAssignTaskToProduct(taskId, productId);
  }

  function removeAiFromTaskProduct(taskId, productId, aiId) {
    const assignment = getTaskProductAssignment(taskId, productId);
    setAssignedAiIds(taskId, productId, assignment.aiIds.filter(function (id) { return id !== aiId; }), assignment.mode);
  }

  function clearTaskProductAssignment(taskId, productId) {
    const assignment = getTaskProductAssignment(taskId, productId);
    const mode = taskId === "development" ? "newProduct" : assignment.mode;
    setAssignedAiIds(taskId, productId, [], mode);
  }

  function normalizeProductAssignments(taskId, rawAssignment) {
    const wrapper = {};
    wrapper[taskId] = rawAssignment;
    return normalizeAssignments(wrapper, state.employees)[taskId].productAssignments;
  }

  function getAssignmentProduct(taskId) {
    return getProduct(getAssignment(taskId).productId);
  }

  function getAssignmentAi(taskId) {
    return getAssignmentAiIds(taskId)[0] || null;
  }

  function getAssignmentAiIds(taskId) {
    return getAssignment(taskId).aiIds;
  }

  function getWorkerGroupLabel(aiIds) {
    return (aiIds || []).map(getWorkerLabel).join(" + ");
  }

  function setProductAssignmentEntry(taskId, productId, entry) {
    const definition = getProductDefinition(productId);
    if (!state.assignments[taskId] || !state.assignments[taskId].productAssignments) state.assignments[taskId] = { productAssignments: createInitialProductAssignments(taskId) };
    const aiIds = (entry.aiIds || []).filter(Boolean).slice(0, 2);
    state.assignments[taskId].productAssignments[definition.id] = taskId === "development" ? { aiIds: aiIds, mode: entry.mode === "upgrade" ? "upgrade" : "newProduct" } : { aiIds: aiIds };
  }

  function removeAiFromAllAssignments(aiId) {
    if (!aiId) return;
    TASKS.forEach(function (task) {
      PRODUCTS.forEach(function (definition) {
        const assignment = getProductAssignment(task.id, definition.id);
        if (assignment.aiIds.indexOf(aiId) === -1) return;
        setAssignedAiIds(task.id, definition.id, assignment.aiIds.filter(function (id) { return id !== aiId; }), assignment.mode);
      });
    });
  }

  function releaseDevelopmentWorkersAfterCompletion(productId, messageTemplate) {
    const assignment = getProductAssignment("development", productId);
    if (!assignment.aiIds.length) return;
    const workerNames = getWorkerGroupLabel(assignment.aiIds);
    setAssignedAiIds("development", productId, [], "newProduct");
    addLog("normal", messageTemplate.replace("{workers}", workerNames), productId);
  }

  function setTaskAis(taskId, productId, aiIds, mode, options) {
    if (!TASKS.some(function (task) { return task.id === taskId; })) return false;
    const normalizedProductId = getProductDefinition(productId).id;
    if (!canAssignTaskToProduct(taskId, normalizedProductId)) return false;
    state.assignments = normalizeAssignments(state.assignments, state.employees);
    const assignmentMode = getDevelopmentAssignmentMode(taskId, normalizedProductId, mode);
    const selectedAiIds = [];
    (aiIds || []).forEach(function (aiId) {
      if (!aiId || selectedAiIds.indexOf(aiId) !== -1 || selectedAiIds.length >= MAX_AI_PER_TASK_PRODUCT) return;
      if (!canWorkerAssignToTask(aiId, taskId, state.employees)) return;
      selectedAiIds.push(aiId);
    });
    selectedAiIds.forEach(removeAiFromAllAssignments);
    setAssignedAiIds(taskId, normalizedProductId, selectedAiIds, assignmentMode);
    if (taskId === "development" && selectedAiIds.length) {
      if (assignmentMode === "upgrade") startSubscriptionUpgrade(normalizedProductId);
      else startProductDevelopmentIfNeeded(normalizedProductId, options);
    }
    if (!options || options.commit !== false) commitAssignmentChange();
    return true;
  }

  function commitAssignmentChange() {
    applyAchievements(false);
    saveGame();
    render();
    showAppToast("担当を更新しました。AIが新しい仕事を開始します", "success");
    scheduleNextTick();
  }

  function assignAiToTask(taskId, aiId, productId, mode) {
    if (!TASKS.some(function (task) { return task.id === taskId; })) return false;
    const normalizedProductId = getProductDefinition(productId).id;
    const current = getProductAssignment(taskId, normalizedProductId);
    const assignmentMode = getDevelopmentAssignmentMode(taskId, normalizedProductId, mode || "normal");
    const aiIds = current.aiIds.slice(0, MAX_AI_PER_TASK_PRODUCT);
    if (aiId && aiIds.indexOf(aiId) === -1) {
      if (aiIds.length >= 2) return false;
      aiIds.push(aiId);
    }
    return setTaskAis(taskId, normalizedProductId, aiIds, assignmentMode);
  }

  function clearAssignment(taskId) {
    state.assignments[taskId] = { productAssignments: createInitialProductAssignments(taskId) };
    saveGame();
    render();
  }

  function clearProductAssignment(taskId, productId) {
    clearTaskProductAssignment(taskId, productId);
    saveGame();
    render();
    showAppToast("担当を解除しました", "warning");
  }

  function removeAiFromTask(taskId, productId, aiId) {
    removeAiFromTaskProduct(taskId, productId, aiId);
    saveGame();
    render();
  }


  function canWorkerAssignToTask(workerId, taskId, employees) {
    const task = TASKS.find(function (item) { return item.id === taskId; });
    if (!task || task.workers.indexOf(workerId) === -1) return false;
    return isWorkerAvailable(workerId, employees);
  }

  function isWorkerAvailable(workerId, employees) {
    if (workerId === "boss") return true;
    return Boolean(employees && (employees[workerId] || 0) > 0);
  }


  function getProductFire(product) {
    return clamp(safeNumber(product && product.productFire, 0), 0, 100);
  }

  function adjustProductFire(product, amount) {
    if (!product) return 0;
    const definition = getProductDefinition(product.id);
    const rawAmount = safeNumber(amount, 0);
    const riskMultiplier = rawAmount > 0 ? clamp(safeNumber(definition.risk, 1), 0.7, 1.4) : 1;
    product.productFire = clamp(getProductFire(product) + rawAmount * riskMultiplier, 0, 100);
    return product.productFire;
  }


  function getProduct(productId) { return state.products[productId] || createInitialProducts()[productId] || createInitialProducts()[PRODUCTS[0].id]; }
  function getProductDefinition(productId) { return PRODUCTS.find(function (product) { return product.id === productId; }) || PRODUCTS[0]; }
  function getProductFlags(productId) { if (!state.productFlags[productId]) state.productFlags[productId] = createInitialProductFlags()[productId]; return state.productFlags[productId]; }
  function getCurrentMonthlyPrice(product, definition) { return definition.type === "subscription" ? Math.max(0, Math.round(definition.monthlyPrice * (1 + VERSION_PRICE_BONUS * (getProductVersion(product) - 1) + safeNumber(product && product.priceAdjustment, 0)))) : 0; }
  function getProductMrr(product, definition) { return definition.type === "subscription" ? getCurrentMonthlyPrice(product, definition) * getProductCustomers(product) : 0; }
  function recalculateProductMrr(product, definition) { product.customers = getProductCustomers(product); product.mrr = getProductMrr(product, definition); }
  function getProductRevenuePerSecond(product, definition) { return getProductMrr(product, definition || getProductDefinition(product.id)) / MRR_TO_REVENUE_DIVISOR; }
  // === Product Calculations ===
  function getProductCustomers(product) { return Math.max(0, Math.floor(Number(product.customers) || 0)); }
  function getProductVersion(product) { return Math.max(1, Math.floor(Number(product.version) || 1)); }
  function getProductUnitsSold(product) { return Math.max(0, Math.floor(Number(product.unitsSold) || 0)); }
  function getProductRevenuePerSecondTotal() { return PRODUCTS.reduce(function (sum, definition) { return definition.type === "subscription" ? sum + getProductRevenuePerSecond(getProduct(definition.id), definition) : sum; }, 0); }
  function getTotalProductMrr() { return PRODUCTS.reduce(function (sum, definition) { return definition.type === "subscription" ? sum + getProductMrr(getProduct(definition.id), definition) : sum; }, 0); }
  function hasRevenueProduct() { return PRODUCTS.some(function (definition) { const product = getProduct(definition.id); return definition.type === "subscription" && (getProductCustomers(product) > 0 || getProductMrr(product, definition) > 0); }); }
  function getProductPrimaryScore(product, definition) {
    if (definition.type === "oneShot") return safeNumber(product.lifetimeRevenue, 0);
    return getProductMrr(product, definition) * 1.1;
  }

  function getPrimaryProductDefinition() {
    return PRODUCTS.slice().sort(function (a, b) {
      return getProductPrimaryScore(getProduct(b.id), b) - getProductPrimaryScore(getProduct(a.id), a);
    })[0] || PRODUCTS[0];
  }

  function getAssignmentShareSummary() {
    return TASKS.map(function (task) {
      const rows = PRODUCTS.map(function (definition) {
        const assignment = getProductAssignment(task.id, definition.id);
        if (!assignment.aiIds.length) return "";
        return getWorkerGroupLabel(assignment.aiIds) + " → " + definition.name;
      }).filter(Boolean);
      return rows.length ? task.label + ": " + rows.join(" / ") : "";
    }).filter(Boolean).join(" / ") || "未割り振り";
  }


  function getProductProgressPercent(product, definition) {
    return clamp((safeNumber(product.progress, 0) / definition.developmentRequired) * 100, 0, 100);
  }


  function getAssignedWorkersForProduct(taskId, productId) {
    return getProductAssignment(taskId, productId).aiIds;
  }


  function getProductLogText(productId, key, fallback) {
    const texts = PRODUCT_LOG_TEXTS[productId] || {};
    return texts[key] || fallback;
  }

  function getProductStatusLabel(status) { return { idea: "未着手", developing: "開発中", ready: "完成", selling: "販売中" }[status] || "未着手"; }
  function getWorkerLabel(workerId) { return WORKERS[workerId] ? WORKERS[workerId].label : workerId; }
  function getTaskLabel(taskId) { const task = TASKS.find(function (item) { return item.id === taskId; }); return task ? task.label : taskId; }


  function getEmployee(employeeId) { return EMPLOYEES.find(function (employee) { return employee.id === employeeId; }); }

  function clampRuntimeState() {
    state.money = Math.max(0, safeNumber(state.money, 0));
    state.totalMoney = Math.max(0, safeNumber(state.totalMoney, 0));
    state.users = Math.max(0, safeNumber(state.users, 0));
    state.fire = clamp(safeNumber(state.fire, 0), 0, 100);
    PRODUCTS.forEach(function (definition) { clampRuntimeProduct(getProduct(definition.id), definition); });
    state.decisionStats = normalizeDecisionStats(state.decisionStats);
    state.churnCount = Math.max(0, Math.floor(safeNumber(state.churnCount, 0)));
    state.pendingDecisionEvent = normalizeDecisionEvent(state.pendingDecisionEvent);
    state.decisionEventCooldown = clamp(Math.floor(safeNumber(state.decisionEventCooldown, DECISION_EVENT_RETRY_SECONDS)), 0, DECISION_EVENT_COOLDOWN_SECONDS);
    state.strategyId = OPERATIONS_RUNTIME.getStrategy(state.strategyId).id;
    state.decisionThreads = normalizeDecisionThreads(state.decisionThreads);
    state.metricHistory = OPERATIONS_RUNTIME.normalizeHistory(state.metricHistory, 120);
    state.playSeconds = Math.max(0, Math.floor(safeNumber(state.playSeconds, 0)));
    state.relationshipFlags = normalizeBooleanMap(state.relationshipFlags);
    state.aiUsageSeconds = normalizeAiUsageSeconds(state.aiUsageSeconds);
    state.playtestStageId = MISSION_STAGES.some(function (stage) { return stage.id === state.playtestStageId; }) ? state.playtestStageId : "";
    state.playtestStageEnteredAt = clamp(Math.floor(safeNumber(state.playtestStageEnteredAt, 0)), 0, state.playSeconds);
    state.companyLevel = clamp(Math.floor(safeNumber(state.companyLevel, 1)), 1, MAX_LEVEL);
  }

  function clampRuntimeProduct(product, definition) {
    product.progress = clamp(safeNumber(product.progress, 0), 0, definition.developmentRequired);
    product.quality = clamp(safeNumber(product.quality, definition.initialQuality), 0, 100);
    product.bugs = clamp(safeNumber(product.bugs, 0), 0, 100);
    product.awareness = clamp(safeNumber(product.awareness, 0), 0, 100);
    product.productFire = clamp(safeNumber(product.productFire, 0), 0, 100);
    product.priceAdjustment = definition.type === "subscription" ? clamp(safeNumber(product.priceAdjustment, 0), -0.2, 0.6) : 0;
    product.supportLoad = clamp(safeNumber(product.supportLoad, 0), 0, 100);
    product.satisfaction = clamp(safeNumber(product.satisfaction, 70), 0, 100);
    product.churnRisk = clamp(safeNumber(product.churnRisk, 0), 0, 100);
    product.customers = getProductCustomers(product);
    product.unitsSold = getProductUnitsSold(product);
    product.lifetimeRevenue = definition.type === "oneShot" ? Math.max(0, safeNumber(product.lifetimeRevenue, 0), safeNumber(definition.price, 0) * product.unitsSold) : Math.max(0, safeNumber(product.lifetimeRevenue, 0));
    product.version = Math.max(1, Math.floor(safeNumber(product.version, 1)));
    recalculateProductMrr(product, definition);
  }
  function formatNumber(value) { const number = Math.max(0, safeNumber(value, 0)); if (number >= 1000000000) return (number / 1000000000).toFixed(1) + "B"; if (number >= 1000000) return (number / 1000000).toFixed(1) + "M"; if (number >= 1000) return (number / 1000).toFixed(1) + "K"; return Math.floor(number).toString(); }
  function formatCurrency(value) { return "¥" + formatNumber(value); }
  function formatCurrencyPrecise(value) { const number = Math.max(0, safeNumber(value, 0)); return "¥" + (number > 0 && number < 10 ? number.toFixed(1) : formatNumber(number)); }
  function formatCustomers(value) { return formatNumber(getProductCustomers({ customers: value })) + "社"; }
  function formatSignedCurrencyRate(value) { const number = safeNumber(value, 0); return (number >= 0 ? "+" : "-") + formatCurrency(Math.abs(number)); }
  function signedNumber(value) { const number = safeNumber(value, 0); return (number >= 0 ? "+" : "-") + formatNumber(Math.abs(number)) + " / 10秒"; }
  function signedCurrency(value) { const number = safeNumber(value, 0); return (number >= 0 ? "+" : "-") + "¥" + formatNumber(Math.abs(number)) + " / 10秒"; }
  function formatTime(timestamp) { return new Date(safeNumber(timestamp, Date.now())).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }); }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function safeNumber(value, fallback) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }
  function setText(id, value) { const element = document.getElementById(id); if (element) element.textContent = value; }
  function getCharacterAsset(sourceId) {
    const id = sourceId === "company" ? "boss" : String(sourceId || "");
    return CHARACTER_ASSETS[id] ? { id: id, asset: CHARACTER_ASSETS[id] } : null;
  }

  function getCharacterAvatarHtml(sourceId, className, descriptive) {
    const match = getCharacterAsset(sourceId);
    const classes = "character-avatar " + String(className || "");
    if (!match) return '<span class="' + escapeHtml(classes + ' character-avatar-generic') + '" aria-hidden="true"><span class="character-avatar-fallback">AI</span></span>';
    const asset = match.asset;
    const alt = descriptive ? asset.label + "のキャラクター画像" : "";
    return '<span class="' + escapeHtml(classes) + '" data-character-id="' + escapeHtml(match.id) + '"><span class="character-avatar-fallback" aria-hidden="true">' + escapeHtml(asset.shortLabel) + '</span><img data-character-image src="' + escapeHtml(asset.src + "?v=" + APP_ASSET_TOKEN) + '" alt="' + escapeHtml(alt) + '" width="128" height="128" loading="lazy" decoding="async"></span>';
  }

  function activateCharacterImageFallbacks(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll("img[data-character-image]").forEach(function (image) {
      function showFallback() {
        image.hidden = true;
        if (image.parentElement) image.parentElement.classList.add("image-failed");
      }
      image.addEventListener("error", showFallback, { once: true });
      if (image.complete && image.naturalWidth === 0) showFallback();
    });
  }
  function escapeHtml(value) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

  function rememberModalTrigger() {
    const active = document.activeElement;
    if (active && typeof active.focus === "function") lastModalTrigger = active;
  }

  function focusModal(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel || panel.hidden) return;
    const target = typeof panel.querySelector === "function" ? panel.querySelector("button:not([disabled]), select:not([disabled]), input:not([disabled])") : null;
    if (target && typeof target.focus === "function") target.focus();
    syncModalIsolation();
  }

  function restoreModalFocus() {
    const target = lastModalTrigger;
    lastModalTrigger = null;
    if (target && typeof target.focus === "function") target.focus();
  }

  function trapModalFocus(event) {
    if (!event || event.key !== "Tab") return false;
    const panelId = storyModalOpen ? "storyModal" : (productActionMenuOpen ? "productActionMenuModal" : (productDetailModalOpen ? "productDetailModal" : (assignmentModalOpen ? "assignmentModal" : "")));
    const panel = panelId ? document.getElementById(panelId) : null;
    if (!panel || typeof panel.querySelectorAll !== "function") return false;
    const focusable = Array.prototype.slice.call(panel.querySelectorAll('button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    if (!focusable.length) return false;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    const outside = typeof panel.contains === "function" && !panel.contains(active);
    if (event.shiftKey && (active === first || outside)) {
      event.preventDefault();
      last.focus();
      return true;
    }
    if (!event.shiftKey && (active === last || outside)) {
      event.preventDefault();
      first.focus();
      return true;
    }
    return false;
  }

  function handleGlobalKeydown(event) {
    if (event && event.key === "Tab") { trapModalFocus(event); return; }
    if (!event || event.key !== "Escape") return;
    if (storyModalOpen) closeStoryModal();
    else if (productActionMenuOpen) closeProductActionMenu();
    else if (productDetailModalOpen) closeProductDetailModal();
    else if (assignmentModalOpen) closeAssignmentModal();
    else if (dashboardUi.officeWorkerSelected) { dashboardUi.officeWorkerSelected = ""; renderOffice(); }
  }

  function boot() {
    loadGame();
    initializePageNavigation();
    render();
    scheduleRandomReport();
    scheduleNextTick();
    window.setInterval(saveGame, AUTO_SAVE_MS);
    document.getElementById("saveButton").addEventListener("click", function () { addLog("success", "手動保存しました。AI社長の記憶領域に刻まれています。", "company"); saveGame(); renderLatestLog(); renderLogs(); showAppToast("ゲームを保存しました", "success"); });
    const shareButton = document.getElementById("shareButton");
    if (shareButton) shareButton.addEventListener("click", shareGameStatus);
    document.getElementById("resetButton").addEventListener("click", resetGame);
    const restoreButton = document.getElementById("restoreBackupButton");
    if (restoreButton) restoreButton.addEventListener("click", restoreBackupSave);
    const saveSlotButton = document.getElementById("saveSlotButton");
    if (saveSlotButton) saveSlotButton.addEventListener("click", function () { saveToSlot(); });
    const loadSlotButton = document.getElementById("loadSlotButton");
    if (loadSlotButton) loadSlotButton.addEventListener("click", function () { loadFromSlot(); });
    const exportButton = document.getElementById("exportSaveButton");
    if (exportButton) exportButton.addEventListener("click", function () { exportSaveJson(false); });
    const importButton = document.getElementById("importSaveButton");
    const importInput = document.getElementById("importSaveInput");
    if (importButton && importInput) importButton.addEventListener("click", function () { importInput.click(); });
    if (importInput) importInput.addEventListener("change", importSelectedSaveFile);
    const playtestButton = document.getElementById("copyPlaytestButton");
    if (playtestButton) playtestButton.addEventListener("click", copyPlaytestReport);
    document.addEventListener("keydown", handleGlobalKeydown);
    const tutorialAction = document.getElementById("tutorialAction");
    if (tutorialAction) tutorialAction.addEventListener("click", handleTutorialAction);
    const tutorialSkip = document.getElementById("tutorialSkip");
    if (tutorialSkip) tutorialSkip.addEventListener("click", skipTutorial);
    const replayTutorialButton = document.getElementById("replayTutorialButton");
    if (replayTutorialButton) replayTutorialButton.addEventListener("click", replayTutorial);
    const detailsToggle = document.getElementById("toggleCompanyDetails");
    if (detailsToggle) detailsToggle.addEventListener("click", toggleCompanyDetails);
    const storyClose = document.getElementById("storyClose");
    if (storyClose) storyClose.addEventListener("click", closeStoryModal);
    window.addEventListener("beforeunload", saveGame);
    registerServiceWorker();
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    let reloadingForNewServiceWorker = false;
    if (navigator.serviceWorker.addEventListener) {
      navigator.serviceWorker.addEventListener("controllerchange", function () {
        if (reloadingForNewServiceWorker) return;
        reloadingForNewServiceWorker = true;
        if (window.location && window.location.reload) window.location.reload();
      });
    }
    navigator.serviceWorker.register("sw.js?v=20260524-60").then(function (registration) {
      if (registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
      registration.addEventListener("updatefound", function () {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", function () {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            worker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    }).catch(function (error) {
      console.warn("Service worker registration failed.", error);
    });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
