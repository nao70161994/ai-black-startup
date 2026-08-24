"use strict";

window.AIBS_CREATE_EFFECT_RUNTIME = function (options) {
  const settings = options && typeof options === "object" ? options : {};
  const getEmployeeLevel = settings.getEmployeeLevel;
  const clamp = settings.clamp;
  const applyAffinity = settings.applyAffinity;
  const getProductFire = settings.getProductFire;
  const getGlobalFire = settings.getGlobalFire;
  const globalFireSalesPenaltyDivisor = settings.globalFireSalesPenaltyDivisor;
  const productFireSalesPenaltyDivisor = settings.productFireSalesPenaltyDivisor;
  const oneShotSaleChanceCap = settings.oneShotSaleChanceCap;

  function getDevelopmentEffect(workerId) {
    if (workerId === "dev01") {
      const level = getEmployeeLevel("dev01");
      return { progress: 3.0 + level * 0.7, bugs: 0.2 + level * 0.08 };
    }
    return { progress: 1.0, bugs: 0.05 };
  }

  function getUpgradeDevelopmentEffect(workerId) {
    if (workerId === "dev01") {
      const level = getEmployeeLevel("dev01");
      return { progress: 3.0 + level * 0.7, bugs: 0.15 + level * 0.06 };
    }
    return { progress: 1.0, bugs: 0.03 };
  }

  function getQaEffect(workerId) {
    if (workerId === "security06") {
      const level = getEmployeeLevel("security06");
      return { quality: 0.6 + level * 0.15, bugs: -(0.7 + level * 0.2) };
    }
    return { quality: 0.15, bugs: -0.10 };
  }

  function getMarketingEffect(workerId) {
    if (workerId === "buzz03") {
      const level = getEmployeeLevel("buzz03");
      return { awareness: 0.35 + level * 0.10, fire: 0.03 };
    }
    return { awareness: 0.05, fire: 0.005 };
  }

  function getSupportEffect(workerId) {
    if (workerId === "care04") {
      const level = getEmployeeLevel("care04");
      return { supportLoad: -(0.3 + level * 0.08), satisfaction: 0.12 + level * 0.04, fire: -(0.08 + level * 0.03) };
    }
    return { supportLoad: -0.05, satisfaction: 0.03, fire: -0.01 };
  }

  function getCrisisEffect(workerId) {
    if (workerId === "fire05") {
      const level = getEmployeeLevel("fire05");
      return { fire: -(0.35 + level * 0.10), productFire: -(0.45 + level * 0.12), money: -2 };
    }
    return { fire: -0.05, productFire: -0.04, money: 0 };
  }

  function getFireSalesPressureFactor(product) {
    const globalPenalty = clamp(getGlobalFire() / globalFireSalesPenaltyDivisor, 0, 0.3);
    const productPenalty = clamp(getProductFire(product) / productFireSalesPenaltyDivisor, 0, 0.25);
    return 1 - clamp(globalPenalty + productPenalty, 0, 0.45);
  }

  function getSalesEffect(workerId, product, definition) {
    const awarenessFactor = 0.7 + product.awareness / 166.7;
    const qualityFactor = 0.5 + product.quality / 100;
    const fireFactor = getFireSalesPressureFactor(product);
    if (workerId === "sales02") {
      const level = getEmployeeLevel("sales02");
      const baseChance = 0.06 + level * 0.01;
      return { customerChance: clamp(applyAffinity(baseChance, workerId, definition, "sales") * awarenessFactor * qualityFactor * definition.demand * fireFactor, 0, 0.35), awareness: 0.12, fire: 0.03 };
    }
    return { customerChance: clamp(applyAffinity(0.02, workerId, definition, "sales") * awarenessFactor * qualityFactor * definition.demand * fireFactor, 0, 0.35), awareness: 0.06, fire: 0 };
  }

  function getOneShotSalesEffect(workerId, product, definition) {
    const awarenessFactor = 0.7 + product.awareness / 166.7;
    const qualityFactor = 0.5 + product.quality / 100;
    const fireFactor = getFireSalesPressureFactor(product);
    if (workerId === "sales02") {
      const level = getEmployeeLevel("sales02");
      const baseChance = 0.035 + level * 0.006;
      return { saleChance: clamp(applyAffinity(baseChance, workerId, definition, "sales") * awarenessFactor * qualityFactor * definition.demand * fireFactor, 0, oneShotSaleChanceCap), awareness: 0.12, fire: 0.03 };
    }
    return { saleChance: clamp(applyAffinity(0.01, workerId, definition, "sales") * awarenessFactor * qualityFactor * definition.demand * fireFactor, 0, oneShotSaleChanceCap), awareness: 0.06, fire: 0 };
  }

  return {
    getDevelopmentEffect: getDevelopmentEffect,
    getUpgradeDevelopmentEffect: getUpgradeDevelopmentEffect,
    getQaEffect: getQaEffect,
    getMarketingEffect: getMarketingEffect,
    getSupportEffect: getSupportEffect,
    getCrisisEffect: getCrisisEffect,
    getFireSalesPressureFactor: getFireSalesPressureFactor,
    getSalesEffect: getSalesEffect,
    getOneShotSalesEffect: getOneShotSalesEffect
  };
};
