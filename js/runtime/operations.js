"use strict";

window.AIBS_CREATE_OPERATIONS_RUNTIME = function (options) {
  const settings = options && typeof options === "object" ? options : {};
  const strategies = Array.isArray(settings.strategies) ? settings.strategies : [];
  const synergies = Array.isArray(settings.synergies) ? settings.synergies : [];
  const relationships = Array.isArray(settings.relationships) ? settings.relationships : [];
  const products = Array.isArray(settings.products) ? settings.products : [];
  const tasks = Array.isArray(settings.tasks) ? settings.tasks : [];
  const businessUnits = Array.isArray(settings.businessUnits) ? settings.businessUnits : [];
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

  function getBusinessUnitEvaluations(state) {
    const enabled = Boolean(state && state.secondFounding && state.secondFounding.unlocked && state.businessUnits && state.businessUnits.enabled);
    return businessUnits.map(function (unit) {
      const definitions = unit.productIds.map(function (productId) {
        return products.find(function (definition) { return definition.id === productId; });
      }).filter(Boolean);
      const records = definitions.map(function (definition) {
        return state.products && state.products[definition.id] || {};
      });
      const salesValue = definitions.reduce(function (sum, definition, index) {
        const product = records[index];
        return sum + (definition.type === "subscription"
          ? Math.max(0, Number(product.mrr) || 0)
          : Math.max(0, Number(product.lifetimeRevenue) || 0));
      }, 0);
      const salesScore = Math.max(0, Math.min(100, salesValue / 50000 * 100));
      const average = function (key, fallback) {
        if (!records.length) return fallback;
        return records.reduce(function (sum, product) {
          return sum + Math.max(0, Math.min(100, Number(product[key]) || 0));
        }, 0) / records.length;
      };
      const quality = average("quality", 0);
      const satisfaction = average("satisfaction", 0);
      const fireRisk = 100 - average("productFire", 0);
      const score = Math.round(salesScore * 0.4 + quality * 0.2 + satisfaction * 0.2 + fireRisk * 0.2);
      const grade = score >= 90 ? "S" : score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : "D";
      const bonus = enabled ? ({ S: 0.10, A: 0.06, B: 0.03 }[grade] || 0) : 0;
      return {
        id: unit.id, name: unit.name, description: unit.description,
        productIds: unit.productIds.slice(), enabled: enabled,
        score: score, grade: grade, bonus: bonus,
        metrics: { sales: Math.round(salesScore), quality: Math.round(quality), satisfaction: Math.round(satisfaction), fireSafety: Math.round(fireRisk) }
      };
    });
  }

  function getBusinessUnitForProduct(productId) {
    return businessUnits.find(function (unit) { return unit.productIds.indexOf(productId) !== -1; }) || null;
  }

  function getBusinessUnitBonus(state, targetDefinition) {
    if (!targetDefinition) return 0;
    const unit = getBusinessUnitForProduct(targetDefinition.id);
    if (!unit) return 0;
    const evaluation = getBusinessUnitEvaluations(state).find(function (item) { return item.id === unit.id; });
    return evaluation ? evaluation.bonus : 0;
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
      const businessUnitBonus = getBusinessUnitBonus(state, targetDefinition);
      if (businessUnitBonus > 0) {
        ["development", "qa", "sales", "marketing", "support", "crisis"].forEach(function (key) {
          modifiers[key] *= 1 + businessUnitBonus;
        });
      }
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
    getBusinessUnitEvaluations: getBusinessUnitEvaluations,
    getBusinessUnitForProduct: getBusinessUnitForProduct,
    getBusinessUnitBonus: getBusinessUnitBonus,
    getActiveSynergies: getActiveSynergies,
    getActiveRelationships: getActiveRelationships,
    getAllActiveRelationships: getAllActiveRelationships,
    getDecisionPriority: getDecisionPriority,
    normalizeHistory: normalizeHistory,
    sampleMetrics: sampleMetrics,
    createPlaytestReport: createPlaytestReport
  };
};
