"use strict";

window.AIBS_CREATE_OPERATIONS_RUNTIME = function (options) {
  const settings = options && typeof options === "object" ? options : {};
  const strategies = Array.isArray(settings.strategies) ? settings.strategies : [];
  const synergies = Array.isArray(settings.synergies) ? settings.synergies : [];
  const relationships = Array.isArray(settings.relationships) ? settings.relationships : [];
  const products = Array.isArray(settings.products) ? settings.products : [];
  const tasks = Array.isArray(settings.tasks) ? settings.tasks : [];
  const defaults = { development: 1, bugGeneration: 1, qa: 1, marketing: 1, fireGeneration: 1, sales: 1, support: 1, crisis: 1, churnPressure: 1, revenue: 1 };

  function getStrategy(strategyId) {
    return strategies.find(function (strategy) { return strategy.id === strategyId; }) || strategies[0] || { id: "balanced", label: "バランス経営", modifiers: {} };
  }

  function multiplyModifiers(target, source) {
    Object.keys(source || {}).forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(target, key)) target[key] *= Number(source[key]) || 1;
    });
  }

  function getProductWorkers(state, productId) {
    const workers = [];
    tasks.forEach(function (task) {
      const assignment = state.assignments && state.assignments[task.id];
      const entry = assignment && assignment.productAssignments && assignment.productAssignments[productId];
      (entry && Array.isArray(entry.aiIds) ? entry.aiIds : []).forEach(function (workerId) {
        if (workers.indexOf(workerId) === -1) workers.push(workerId);
      });
    });
    return workers;
  }

  function getActiveRelationships(state, productId) {
    const workers = getProductWorkers(state, productId);
    return relationships.filter(function (relationship) {
      return relationship.workers.every(function (workerId) { return workers.indexOf(workerId) !== -1; });
    }).map(function (relationship) {
      return Object.assign({ productId: productId }, relationship);
    });
  }

  function getAllActiveRelationships(state) {
    return products.reduce(function (items, product) {
      return items.concat(getActiveRelationships(state, product.id));
    }, []);
  }

  function getActiveSynergies(state, targetDefinition) {
    return synergies.filter(function (synergy) {
      const source = state.products && state.products[synergy.productId];
      if (!source || source.status !== "selling") return false;
      return !(synergy.subscriptionOnly && targetDefinition && targetDefinition.type !== "subscription");
    });
  }

  function getModifiers(state, targetDefinition) {
    const modifiers = Object.assign({}, defaults);
    multiplyModifiers(modifiers, getStrategy(state.strategyId).modifiers);
    getActiveSynergies(state, targetDefinition).forEach(function (synergy) {
      if (synergy.modifier) {
        const single = {};
        single[synergy.modifier] = synergy.value;
        multiplyModifiers(modifiers, single);
      }
      multiplyModifiers(modifiers, synergy.modifiers);
    });
    if (targetDefinition) {
      getActiveRelationships(state, targetDefinition.id).forEach(function (relationship) {
        multiplyModifiers(modifiers, relationship.modifiers);
      });
    }
    return modifiers;
  }

  function getDecisionPriority(state, event, priority) {
    const strategy = getStrategy(state.strategyId);
    const multiplier = Number(strategy.decisionWorkers && strategy.decisionWorkers[event && event.workerId]) || 1;
    return Math.max(1, Math.round((Number(priority) || 1) * multiplier));
  }

  function normalizeHistory(history, limit) {
    const max = Math.max(10, Math.floor(Number(limit) || 120));
    if (!Array.isArray(history)) return [];
    return history.filter(function (point) { return point && typeof point === "object"; }).map(function (point) {
      return {
        t: Math.max(0, Math.floor(Number(point.t) || 0)),
        money: Math.max(0, Number(point.money) || 0),
        mrr: Math.max(0, Number(point.mrr) || 0),
        customers: Math.max(0, Math.floor(Number(point.customers) || 0)),
        bugs: Math.max(0, Math.min(100, Number(point.bugs) || 0)),
        fire: Math.max(0, Math.min(100, Number(point.fire) || 0)),
        productFire: Math.max(0, Math.min(100, Number(point.productFire) || 0))
      };
    }).slice(-max);
  }

  function sampleMetrics(state, metrics) {
    return {
      t: Math.max(0, Math.floor(Number(state.playSeconds) || 0)),
      money: Math.max(0, Number(state.money) || 0),
      mrr: Math.max(0, Number(metrics.mrr) || 0),
      customers: Math.max(0, Math.floor(Number(metrics.customers) || 0)),
      bugs: Math.max(0, Math.min(100, Number(metrics.bugs) || 0)),
      fire: Math.max(0, Math.min(100, Number(state.fire) || 0)),
      productFire: Math.max(0, Math.min(100, Number(metrics.productFire) || 0))
    };
  }

  function getWorkerUsage(state) {
    const usage = {};
    tasks.forEach(function (task) {
      products.forEach(function (product) {
        getProductWorkersForTask(state, task.id, product.id).forEach(function (workerId) {
          usage[workerId] = (usage[workerId] || 0) + 1;
        });
      });
    });
    return usage;
  }

  function getProductWorkersForTask(state, taskId, productId) {
    const assignment = state.assignments && state.assignments[taskId];
    const entry = assignment && assignment.productAssignments && assignment.productAssignments[productId];
    return entry && Array.isArray(entry.aiIds) ? entry.aiIds : [];
  }

  function createPlaytestReport(state, metrics, missionStage) {
    const playSeconds = Math.max(0, Math.floor(Number(state.playSeconds) || 0));
    const stageEnteredAt = Math.max(0, Math.min(playSeconds, Math.floor(Number(state.playtestStageEnteredAt) || 0)));
    const timeInStageSeconds = Math.max(0, playSeconds - stageEnteredAt);
    return {
      format: "aibs-playtest-v1",
      appVersion: String(state.appVersion || ""),
      playSeconds: playSeconds,
      companyLevel: Math.max(1, Math.floor(Number(state.companyLevel) || 1)),
      strategyId: getStrategy(state.strategyId).id,
      totalMoney: Math.round(Math.max(0, Number(state.totalMoney) || 0)),
      totalMrr: Math.round(Math.max(0, Number(metrics.mrr) || 0)),
      totalCustomers: Math.max(0, Math.floor(Number(metrics.customers) || 0)),
      maxProductBugs: Math.round(Math.max(0, Number(metrics.bugs) || 0)),
      companyFire: Math.round(Math.max(0, Number(state.fire) || 0)),
      maxProductFire: Math.round(Math.max(0, Number(metrics.productFire) || 0)),
      employeeUsageSeconds: Object.assign({}, state.aiUsageSeconds || {}),
      activeEmployeeAssignments: getWorkerUsage(state),
      currentMissionStage: missionStage ? { id: missionStage.id, label: missionStage.label, reachedAtSeconds: stageEnteredAt, timeInStageSeconds: timeInStageSeconds } : null,
      stalledStage: missionStage && timeInStageSeconds >= 300 ? { id: missionStage.id, label: missionStage.label, stalledSeconds: timeInStageSeconds } : null,
      products: products.map(function (definition) {
        const product = state.products && state.products[definition.id] || {};
        return { id: definition.id, status: product.status || "idea", version: Math.max(1, Math.floor(Number(product.version) || 1)) };
      })
    };
  }

  return {
    getStrategy: getStrategy,
    getModifiers: getModifiers,
    getActiveSynergies: getActiveSynergies,
    getActiveRelationships: getActiveRelationships,
    getAllActiveRelationships: getAllActiveRelationships,
    getDecisionPriority: getDecisionPriority,
    normalizeHistory: normalizeHistory,
    sampleMetrics: sampleMetrics,
    createPlaytestReport: createPlaytestReport
  };
};
