"use strict";

// Product simulation has no DOM, timer, storage, or navigation side effects.
window.AIBS_CREATE_PRODUCT_TASK_RUNTIME = function (context) {
  const { CHURN_CHANCE_MAX, ONE_SHOT_BOSS_PITY_LIMIT, ONE_SHOT_FIRST_SALE_GUARANTEE_SECONDS, ONE_SHOT_SALES02_PITY_LIMIT, PRODUCTS, PRODUCT_FIRE_CHURN_FACTOR, PRODUCT_FIRE_SATISFACTION_PRESSURE, PRODUCT_FIRE_SUPPORT_LOAD_WEIGHT, SUBSCRIPTION_BOSS_PITY_LIMIT, SUBSCRIPTION_SALES02_PITY_LIMIT, SUPPORT_LOAD_RATE, addLog, adjustProductFire, applyAffinity, clamp, formatCurrency, getAssignedWorkersForProduct, getCrisisEffect, getDevelopmentEffect, getMarketingEffect, getOneShotSalesEffect, getOperationModifiers, getProduct, getProductCustomers, getProductFire, getProductFlags, getProductLogText, getProductMrr, getProductRevenuePerSecond, getProductUnitsSold, getProductVersion, getQaEffect, getSalesEffect, getSupportEffect, getUpgradeDevelopmentEffect, recalculateProductMrr, releaseDevelopmentWorkersAfterCompletion, safeNumber } = context;
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
      context.state.fire = clamp(context.state.fire + marketing.fire * modifiers.fireGeneration, 0, 100);
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
    const firePenalty = (context.state.fire + getProductFire(product) * PRODUCT_FIRE_SUPPORT_LOAD_WEIGHT) / 160;
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
      context.state.fire = clamp(context.state.fire + support.fire * modifiers.support, 0, 100);
    });
  }

  function applyCrisisTask(product, definition) {
    const modifiers = getOperationModifiers(definition);
    const crisisWorkers = getAssignedWorkersForProduct("crisis", product.id);
    if (!crisisWorkers.length || !canApplyCrisis(product, definition)) return;
    const previousFire = context.state.fire;
    const previousProductFire = getProductFire(product);
    crisisWorkers.forEach(function (workerId) {
      const crisis = getCrisisEffect(workerId);
      context.state.fire = clamp(context.state.fire + applyAffinity(crisis.fire, workerId, definition, "crisis") * modifiers.crisis, 0, 100);
      adjustProductFire(product, applyAffinity(crisis.productFire || crisis.fire * 0.6, workerId, definition, "crisis") * modifiers.crisis);
      if (crisis.money) context.state.money = Math.max(0, context.state.money + crisis.money);
    });
    const flags = getProductFlags(product.id);
    if (crisisWorkers.indexOf("fire05") !== -1 && !flags.crisisStartedLogged) {
      flags.crisisStartedLogged = true;
      addLog("crisis", "Fire-05が炎上対応を開始しました。謝罪文の下書きが自動生成されました。", product.id);
    }
    if ((previousFire >= 50 && context.state.fire < 50 || previousProductFire >= 50 && getProductFire(product) < 50) && !flags.crisisContainedLogged) {
      flags.crisisContainedLogged = true;
      addLog("success", "Fire-05の対応で" + definition.name + "まわりの炎上が鎮火し始めました。", product.id);
    }
  }

  function canApplyCrisis(product, definition) {
    return product.status === "selling" || ((context.state.fire >= 50 || getProductFire(product) >= 40) && product.status !== "idea");
  }

  function canApplySupport(product, definition) {
    return definition.type === "subscription" && product.status === "selling" && getProductCustomers(product) > 0;
  }

  function updateSubscriptionSatisfaction(product, definition) {
    const modifiers = getOperationModifiers(definition);
    const pressure = product.supportLoad * 0.003 + product.bugs * 0.002 + Math.max(0, 60 - product.quality) * 0.002 + context.state.fire * 0.0015 + getProductFire(product) * PRODUCT_FIRE_SATISFACTION_PRESSURE;
    const recovery = product.quality >= 75 && product.bugs <= 15 ? 0.03 : 0;
    product.satisfaction = clamp(product.satisfaction - pressure * modifiers.churnPressure + recovery, 0, 100);
  }

  function updateChurnRisk(product, definition) {
    const modifiers = getOperationModifiers(definition);
    const crisisWorkers = getAssignedWorkersForProduct("crisis", product.id);
    const crisisMitigation = crisisWorkers.indexOf("fire05") !== -1 ? 6 : (crisisWorkers.length ? 2 : 0);
    const risk = Math.max(0, 70 - product.satisfaction) * 0.55 + product.supportLoad * 0.28 + product.bugs * 0.22 + context.state.fire * 0.15 + getProductFire(product) * PRODUCT_FIRE_CHURN_FACTOR - crisisMitigation;
    product.churnRisk = clamp(risk * modifiers.churnPressure, 0, 100);
  }

  function applyChurn(product, definition) {
    if (getProductCustomers(product) <= 0 || product.status !== "selling") return;
    const churnChance = clamp(product.churnRisk / 3500, 0, CHURN_CHANCE_MAX);
    if (Math.random() >= churnChance) return;
    product.customers = Math.max(0, getProductCustomers(product) - 1);
    context.state.churnCount = Math.max(0, Math.floor(safeNumber(context.state.churnCount, 0))) + 1;
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
    context.state.fire = clamp(context.state.fire + sales.fire * modifiers.fireGeneration, 0, 100);
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
    context.state.fire = clamp(context.state.fire + sales.fire * modifiers.fireGeneration, 0, 100);
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
    context.state.money = Math.max(0, context.state.money + price);
    context.state.totalMoney = Math.max(0, context.state.totalMoney + price);
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


  return { applyDevelopmentTask, completeNewProductDevelopment, applySubscriptionUpgradeDevelopment, completeSubscriptionUpgrade, applyQaTask, canApplyQa, applyMarketingTask, canApplyMarketing, applySupportOperations, applySupportLoadGrowth, applySupportTask, applyCrisisTask, canApplyCrisis, canApplySupport, updateSubscriptionSatisfaction, updateChurnRisk, applyChurn, applySalesTask, applySalesActivity, applyOneShotSalesActivity, addOneShotSale, addProductCustomer, applyProductMilestones, applyProductRevenue, applySubscriptionRevenue, applyOneShotRevenue };
};
