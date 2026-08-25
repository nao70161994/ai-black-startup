"use strict";

window.AIBS_CREATE_STATE_RUNTIME = function (options) {
  const settings = options && typeof options === "object" ? options : {};
  const products = Array.isArray(settings.products) ? settings.products : [];
  const tasks = Array.isArray(settings.tasks) ? settings.tasks : [];
  const employees = Array.isArray(settings.employees) ? settings.employees : [];
  const achievements = Array.isArray(settings.achievements) ? settings.achievements : [];
  const missionStages = Array.isArray(settings.missionStages) ? settings.missionStages : [];
  const characterAssets = settings.characterAssets && typeof settings.characterAssets === "object" ? settings.characterAssets : {};
  const initialLogs = Array.isArray(settings.initialLogs) ? settings.initialLogs : [];
  const logLabels = settings.logLabels && typeof settings.logLabels === "object" ? settings.logLabels : {};
  const safeNumber = settings.safeNumber;
  const clamp = settings.clamp;
  const createLog = settings.createLog;
  const normalizeDecisionEvent = settings.normalizeDecisionEvent;
  const normalizeAssignments = settings.normalizeAssignments;
  const getProductCustomers = settings.getProductCustomers;
  const getProductUnitsSold = settings.getProductUnitsSold;
  const recalculateProductMrr = settings.recalculateProductMrr;
  const getStrategy = settings.getStrategy;
  const normalizeHistory = settings.normalizeHistory;
  const maxLevel = settings.maxLevel;
  const maxLogs = settings.maxLogs;
  const schemaVersion = settings.schemaVersion;
  const appVersion = settings.appVersion;
  const decisionRetrySeconds = settings.decisionRetrySeconds;
  const decisionCooldownSeconds = settings.decisionCooldownSeconds;
  const productFlagNames = [
    "startedLogged", "completedLogged", "salesStartedLogged", "firstCustomerGranted", "customer10Logged", "customer50Logged", "customer100Logged",
    "mrr10kLogged", "mrr100kLogged", "firstSaleLogged", "sales10Logged", "sales50Logged", "sales100Logged", "unit10Logged", "qaLogShown",
    "marketingStartedLogged", "marketingFireLogged", "awareness50Logged", "awareness100Logged", "supportLoad50Logged", "satisfaction40Logged",
    "churnRisk50Logged", "firstChurnLogged", "productFire50Logged", "productFire80Logged", "productFire100Logged", "crisisStartedLogged",
    "crisisContainedLogged", "impossibleRequestHandled", "aiRunawayHandled"
  ];

  function createInitialProducts() {
    const result = {};
    products.forEach(function (product) {
      result[product.id] = { id: product.id, status: "idea", progress: 0, quality: product.initialQuality, bugs: 0, awareness: 0, productFire: 0, priceAdjustment: 0, customers: 0, unitsSold: 0, mrr: 0, lifetimeRevenue: 0, salesPityCounter: 0, oneShotSalesPityCounter: 0, sellingSeconds: 0, version: 1, upgradeProgress: 0, upgradeStatus: "idle", supportLoad: 0, satisfaction: 70, churnRisk: 0 };
    });
    return result;
  }

  function createInitialProductAssignments(taskId) {
    const productAssignments = {};
    products.forEach(function (product) {
      productAssignments[product.id] = taskId === "development" ? { aiIds: [], mode: "newProduct" } : { aiIds: [] };
    });
    return productAssignments;
  }

  function createInitialAssignments() {
    const assignments = {};
    tasks.forEach(function (task) {
      assignments[task.id] = { productAssignments: createInitialProductAssignments(task.id) };
    });
    return assignments;
  }

  function createInitialProductFlags() {
    const flags = {};
    products.forEach(function (product) {
      flags[product.id] = {};
      productFlagNames.forEach(function (flagName) { flags[product.id][flagName] = false; });
    });
    return flags;
  }

  function createInitialAchievements() {
    const result = {};
    achievements.forEach(function (achievement) {
      result[achievement.id] = { unlocked: false, unlockedAt: 0 };
    });
    return result;
  }

  function createInitialState() {
    const employeeLevels = {};
    employees.forEach(function (employee) { employeeLevels[employee.id] = 0; });
    const state = {
      schemaVersion: schemaVersion,
      appVersion: appVersion,
      money: 0,
      totalMoney: 0,
      users: 0,
      fire: 0,
      companyLevel: 1,
      employees: employeeLevels,
      products: createInitialProducts(),
      assignments: createInitialAssignments(),
      productFlags: createInitialProductFlags(),
      logs: [],
      onboardingDismissed: false,
      tutorialDismissed: false,
      tutorialCompleted: false,
      storyEvent: null,
      seenStoryEvents: {},
      firstHireHelpShown: false,
      firstFastTickDone: false,
      claimedMissions: [],
      achievements: createInitialAchievements(),
      decisionStats: { approved: 0, rejected: 0 },
      churnCount: 0,
      pendingDecisionEvent: null,
      decisionEventCooldown: decisionRetrySeconds,
      strategyId: "balanced",
      decisionThreads: {},
      metricHistory: [],
      playSeconds: 0,
      relationshipFlags: {},
      aiUsageSeconds: {},
      playtestStageId: missionStages[0] ? missionStages[0].id : "",
      playtestStageEnteredAt: 0,
      lastSavedAt: Date.now()
    };
    initialLogs.slice().reverse().forEach(function (text, index) {
      const log = createLog(index < 2 ? "success" : "normal", text, "company");
      log.boot = true;
      log.createdAt = Date.now() - index * 700;
      state.logs.unshift(log);
    });
    return state;
  }

  function normalizeAchievements(savedAchievements) {
    const result = createInitialAchievements();
    const source = savedAchievements && typeof savedAchievements === "object" ? savedAchievements : {};
    achievements.forEach(function (achievement) {
      const saved = source[achievement.id];
      if (saved === true) result[achievement.id] = { unlocked: true, unlockedAt: 0 };
      else if (saved && typeof saved === "object") result[achievement.id] = { unlocked: Boolean(saved.unlocked), unlockedAt: Math.max(0, safeNumber(saved.unlockedAt, 0)) };
    });
    return result;
  }

  function normalizeDecisionStats(savedStats) {
    const source = savedStats && typeof savedStats === "object" ? savedStats : {};
    return { approved: Math.max(0, Math.floor(safeNumber(source.approved, 0))), rejected: Math.max(0, Math.floor(safeNumber(source.rejected, 0))) };
  }

  function normalizeDecisionThreads(savedThreads) {
    const source = savedThreads && typeof savedThreads === "object" ? savedThreads : {};
    const threads = {};
    const allowedThreadIds = ["sales_contract", "campaign_aftershock"];
    Object.keys(source).slice(0, 10).forEach(function (key) {
      const item = source[key];
      if (allowedThreadIds.indexOf(key) === -1 || !item || typeof item !== "object") return;
      threads[key] = {
        choice: item.choice === "approve" ? "approve" : "reject",
        dueIn: clamp(Math.floor(safeNumber(item.dueIn, 0)), 0, 3600),
        resolved: Boolean(item.resolved),
        productId: products.some(function (product) { return product.id === item.productId; }) ? item.productId : products[0].id
      };
    });
    return threads;
  }

  function normalizeBooleanMap(savedMap) {
    const source = savedMap && typeof savedMap === "object" ? savedMap : {};
    const normalized = {};
    Object.keys(source).slice(0, 50).forEach(function (key) {
      const safeKey = key.length <= 100 && /^[A-Za-z0-9_:.-]+$/.test(key) && ["__proto__", "prototype", "constructor"].indexOf(key) === -1;
      if (safeKey && source[key]) normalized[key] = true;
    });
    return normalized;
  }

  function normalizeAiUsageSeconds(savedMap) {
    const source = savedMap && typeof savedMap === "object" ? savedMap : {};
    const normalized = {};
    ["boss"].concat(employees.map(function (employee) { return employee.id; })).forEach(function (workerId) {
      const seconds = Math.max(0, Math.floor(safeNumber(source[workerId], 0)));
      if (seconds > 0) normalized[workerId] = seconds;
    });
    return normalized;
  }

  function normalizeText(value, maxLength) {
    return String(value == null ? "" : value).slice(0, Math.max(0, maxLength));
  }

  function normalizeLogs(savedLogs, fallbackLogs) {
    const source = Array.isArray(savedLogs) ? savedLogs : fallbackLogs;
    const allowedSources = ["company", "boss"].concat(employees.map(function (employee) { return employee.id; }), products.map(function (product) { return product.id; }));
    const now = Date.now();
    return source.slice(0, maxLogs).filter(function (log) { return log && typeof log === "object"; }).map(function (log, index) {
      const normalized = {
        id: /^[A-Za-z0-9_-]{1,80}$/.test(String(log.id || "")) ? String(log.id) : "log-" + now + "-" + index,
        type: logLabels[log.type] ? log.type : "normal",
        text: normalizeText(log.text, 500),
        employeeId: allowedSources.indexOf(log.employeeId) >= 0 ? log.employeeId : "company",
        createdAt: clamp(Math.floor(safeNumber(log.createdAt, now)), 0, now)
      };
      if (log.boot) normalized.boot = true;
      if (log.upgradeLog) { normalized.upgradeLog = true; normalized.upgradeCount = clamp(Math.floor(safeNumber(log.upgradeCount, 1)), 1, maxLevel); }
      return normalized;
    });
  }

  function normalizeClaimedMissions(savedClaims) {
    const validIds = missionStages.reduce(function (ids, stage) {
      const missions = Array.isArray(stage.missions) ? stage.missions : [];
      return ids.concat(missions.map(function (mission) { return mission.id; }));
    }, []);
    return (Array.isArray(savedClaims) ? savedClaims : []).filter(function (id, index, source) { return validIds.indexOf(id) >= 0 && source.indexOf(id) === index; });
  }

  function normalizeStoryEvent(event) {
    if (!event || typeof event !== "object" || !event.title || !event.text) return null;
    const rawId = normalizeText(event.id || "story", 100);
    const id = /^[A-Za-z0-9_.:-]{1,100}$/.test(rawId) && ["__proto__", "prototype", "constructor"].indexOf(rawId) === -1 ? rawId : "story";
    const characterId = Object.prototype.hasOwnProperty.call(characterAssets, event.characterId) ? String(event.characterId) : "boss";
    return { id: id, kicker: normalizeText(event.kicker || "COMPANY NEWS", 40), title: normalizeText(event.title, 160), text: normalizeText(event.text, 500), impact: normalizeText(event.impact, 240), characterId: characterId };
  }

  function normalizeProducts(savedProducts) {
    const result = createInitialProducts();
    const source = savedProducts && typeof savedProducts === "object" ? savedProducts : {};
    products.forEach(function (definition) {
      const saved = source[definition.id] && typeof source[definition.id] === "object" ? source[definition.id] : {};
      const product = result[definition.id];
      const allowedStatus = ["idea", "developing", "ready", "selling"];
      product.status = allowedStatus.indexOf(saved.status) >= 0 ? saved.status : product.status;
      product.progress = clamp(safeNumber(saved.progress, product.progress), 0, definition.developmentRequired);
      product.quality = clamp(safeNumber(saved.quality, product.quality), 0, 100);
      product.bugs = clamp(safeNumber(saved.bugs, product.bugs), 0, 100);
      product.awareness = clamp(safeNumber(saved.awareness, product.awareness), 0, 100);
      product.productFire = clamp(safeNumber(saved.productFire, product.productFire), 0, 100);
      product.priceAdjustment = definition.type === "subscription" ? clamp(safeNumber(saved.priceAdjustment, product.priceAdjustment), -0.2, 0.6) : 0;
      product.supportLoad = clamp(safeNumber(saved.supportLoad, product.supportLoad), 0, 100);
      product.satisfaction = clamp(safeNumber(saved.satisfaction, product.satisfaction), 0, 100);
      product.churnRisk = clamp(safeNumber(saved.churnRisk, product.churnRisk), 0, 100);
      product.customers = getProductCustomers({ customers: safeNumber(saved.customers, product.customers) });
      product.unitsSold = getProductUnitsSold({ unitsSold: safeNumber(saved.unitsSold, product.unitsSold) });
      product.salesPityCounter = Math.max(0, safeNumber(saved.salesPityCounter, product.salesPityCounter));
      product.oneShotSalesPityCounter = Math.max(0, safeNumber(saved.oneShotSalesPityCounter, product.oneShotSalesPityCounter));
      product.sellingSeconds = Math.max(0, safeNumber(saved.sellingSeconds, product.sellingSeconds));
      product.version = Math.max(1, Math.floor(safeNumber(saved.version, product.version)));
      const canResumeUpgrade = definition.type === "subscription" && ["ready", "selling"].indexOf(product.status) !== -1 && saved.upgradeStatus === "upgrading";
      product.upgradeStatus = canResumeUpgrade ? "upgrading" : "idle";
      product.upgradeProgress = canResumeUpgrade ? clamp(safeNumber(saved.upgradeProgress, product.upgradeProgress), 0, 100) : 0;
      product.mrr = 0;
      product.lifetimeRevenue = Math.max(0, safeNumber(saved.lifetimeRevenue, safeNumber(saved.totalRevenue, safeNumber(saved.totalSales, product.lifetimeRevenue))));
      recalculateProductMrr(product, definition);
    });
    return result;
  }

  function normalizeProductFlags(savedFlags) {
    const flags = createInitialProductFlags();
    const source = savedFlags && typeof savedFlags === "object" ? savedFlags : {};
    products.forEach(function (product) {
      const current = source[product.id] && typeof source[product.id] === "object" ? source[product.id] : {};
      productFlagNames.forEach(function (flagName) { flags[product.id][flagName] = Boolean(current[flagName]); });
      flags[product.id].salesStartedLogged = Boolean(current.salesStartedLogged || (product.id === "dailyReportAi" && source.dailyReportSalesStartedLogged));
      flags[product.id].mrr10kLogged = Boolean(current.mrr10kLogged || (product.id === "dailyReportAi" && source.dailyReportMrr10kLogged));
      flags[product.id].sales10Logged = Boolean(current.sales10Logged || current.unit10Logged);
      flags[product.id].qaLogShown = Boolean(current.qaLogShown || (product.id === "dailyReportAi" && source.dailyReportQaLogShown));
    });
    return flags;
  }

  function normalizeState(saved) {
    saved = saved && typeof saved === "object" ? saved : {};
    const base = createInitialState();
    const normalized = {
      schemaVersion: schemaVersion,
      appVersion: appVersion,
      money: safeNumber(saved.money, 0),
      totalMoney: safeNumber(saved.totalMoney, 0),
      users: safeNumber(saved.users, 0),
      fire: clamp(safeNumber(saved.fire, 0), 0, 100),
      companyLevel: 1,
      employees: Object.assign({}, base.employees),
      products: normalizeProducts(saved.products),
      assignments: createInitialAssignments(),
      productFlags: normalizeProductFlags(saved.productFlags),
      logs: normalizeLogs(saved.logs, base.logs),
      onboardingDismissed: Boolean(saved.onboardingDismissed),
      tutorialDismissed: Boolean(saved.tutorialDismissed),
      tutorialCompleted: Boolean(saved.tutorialCompleted),
      storyEvent: normalizeStoryEvent(saved.storyEvent),
      seenStoryEvents: normalizeBooleanMap(saved.seenStoryEvents),
      firstHireHelpShown: Boolean(saved.firstHireHelpShown),
      firstFastTickDone: Boolean(saved.firstFastTickDone),
      claimedMissions: normalizeClaimedMissions(saved.claimedMissions),
      achievements: normalizeAchievements(saved.achievements),
      decisionStats: normalizeDecisionStats(saved.decisionStats),
      churnCount: Math.max(0, Math.floor(safeNumber(saved.churnCount, 0))),
      pendingDecisionEvent: normalizeDecisionEvent(saved.pendingDecisionEvent),
      decisionEventCooldown: clamp(Math.floor(safeNumber(saved.decisionEventCooldown, decisionRetrySeconds)), 0, decisionCooldownSeconds),
      strategyId: getStrategy(saved.strategyId).id,
      decisionThreads: normalizeDecisionThreads(saved.decisionThreads),
      metricHistory: normalizeHistory(saved.metricHistory, 120),
      playSeconds: Math.max(0, Math.floor(safeNumber(saved.playSeconds, 0))),
      relationshipFlags: normalizeBooleanMap(saved.relationshipFlags),
      aiUsageSeconds: normalizeAiUsageSeconds(saved.aiUsageSeconds),
      playtestStageId: missionStages.some(function (stage) { return stage.id === saved.playtestStageId; }) ? saved.playtestStageId : "",
      playtestStageEnteredAt: Math.max(0, Math.floor(safeNumber(saved.playtestStageEnteredAt, 0))),
      lastSavedAt: safeNumber(saved.lastSavedAt, Date.now())
    };
    const legacyBugLevel = clamp(safeNumber(saved.legacyGlobalBugs, 0), 0, 100);
    if (legacyBugLevel > 0) {
      const legacyBugTarget = products.find(function (definition) { return normalized.products[definition.id].status !== "idea"; }) || products[0];
      normalized.products[legacyBugTarget.id].bugs = Math.max(normalized.products[legacyBugTarget.id].bugs, legacyBugLevel);
    }
    const savedEmployees = saved.employees && typeof saved.employees === "object" ? saved.employees : {};
    employees.forEach(function (employee) { normalized.employees[employee.id] = clamp(Math.floor(safeNumber(savedEmployees[employee.id], 0)), 0, maxLevel); });
    normalized.assignments = normalizeAssignments(saved.assignments, normalized.employees);
    normalized.money = Math.max(0, normalized.money);
    normalized.totalMoney = Math.max(0, normalized.totalMoney);
    normalized.users = Math.max(0, normalized.users);
    normalized.companyLevel = clamp(Math.floor(safeNumber(saved.companyLevel, base.companyLevel)), 1, maxLevel);
    return normalized;
  }

  return {
    createInitialState: createInitialState,
    createInitialProducts: createInitialProducts,
    createInitialProductAssignments: createInitialProductAssignments,
    createInitialAssignments: createInitialAssignments,
    createInitialProductFlags: createInitialProductFlags,
    createInitialAchievements: createInitialAchievements,
    normalizeAchievements: normalizeAchievements,
    normalizeDecisionStats: normalizeDecisionStats,
    normalizeDecisionThreads: normalizeDecisionThreads,
    normalizeBooleanMap: normalizeBooleanMap,
    normalizeAiUsageSeconds: normalizeAiUsageSeconds,
    normalizeText: normalizeText,
    normalizeLogs: normalizeLogs,
    normalizeClaimedMissions: normalizeClaimedMissions,
    normalizeStoryEvent: normalizeStoryEvent,
    normalizeState: normalizeState,
    normalizeProducts: normalizeProducts,
    normalizeProductFlags: normalizeProductFlags
  };
};
