#!/usr/bin/env node
"use strict";

const fs = require("fs");
const vm = require("vm");

const context = { window: {} };
vm.createContext(context);
["js/data/balance.js", "js/data/employees.js", "js/data/products.js", "js/data/strategies.js"].forEach(function (file) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
});

const BALANCE = context.window.AIBS_BALANCE;
const PRODUCTS = context.window.AIBS_PRODUCTS;
const EMPLOYEES = context.window.AIBS_EMPLOYEES;
const STRATEGIES = context.window.AIBS_STRATEGIES;

function seededRandom(seed) {
  let value = seed >>> 0;
  return function () {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function strategy(id) {
  return STRATEGIES.find(function (item) { return item.id === id; }) || STRATEGIES[0];
}

function modifier(plan, key) {
  return Number(plan.modifiers && plan.modifiers[key]) || 1;
}

function simulate(seconds, strategyId, seed) {
  const random = seededRandom(seed);
  const plan = strategy(strategyId);
  const products = PRODUCTS.map(function (definition) {
    return { definition, status: "idea", progress: 0, quality: definition.initialQuality, bugs: 0, awareness: 0, customers: 0, unitsSold: 0, version: 1, revenue: 0 };
  });
  const employees = {};
  const utilization = { boss: 0 };
  let money = 0;
  let totalMoney = 0;
  let companyLevel = 1;
  let lastProgressAt = 0;
  let maxStallSeconds = 0;
  let currentStall = 0;

  for (let second = 1; second <= seconds; second += 1) {
    while (companyLevel < BALANCE.MAX_LEVEL && totalMoney >= BALANCE.LEVEL_THRESHOLDS[companyLevel]) companyLevel += 1;
    EMPLOYEES.forEach(function (employee) {
      if (employee.unlockLevel <= companyLevel && !employees[employee.id] && money >= employee.baseCost) {
        employees[employee.id] = 1;
        money -= employee.baseCost;
      }
    });

    const hired = Object.keys(employees).length;
    const baseIncome = (companyLevel * 8 + hired * 4 + hired * 2) / BALANCE.EFFECTS_PER_SECONDS * (companyLevel === 1 && hired ? BALANCE.EARLY_STAGE_MULTIPLIER : 1);
    money += baseIncome;
    totalMoney += baseIncome;

    const usedWorkers = {};
    const developing = products.find(function (product) { return product.status === "developing"; }) || products.find(function (product) { return product.status === "idea"; });
    if (developing) {
      if (developing.status === "idea") developing.status = "developing";
      const worker = employees.dev01 ? "dev01" : "boss";
      const level = employees.dev01 || 0;
      const progress = (worker === "dev01" ? 3 + level * 0.7 : 1) * modifier(plan, "development");
      const bugs = (worker === "dev01" ? 0.2 + level * 0.08 : 0.05) * modifier(plan, "bugGeneration");
      developing.progress += progress;
      developing.bugs = Math.min(100, developing.bugs + bugs);
      usedWorkers[worker] = true;
      utilization[worker] = (utilization[worker] || 0) + 1;
      if (developing.progress >= developing.definition.developmentRequired) {
        developing.progress = developing.definition.developmentRequired;
        developing.status = "selling";
        lastProgressAt = second;
      }
    }

    const selling = products.filter(function (product) { return product.status === "selling"; });
    const salesTarget = selling.length ? selling[second % selling.length] : null;
    const salesWorker = employees.sales02 ? "sales02" : (!usedWorkers.boss ? "boss" : null);
    if (salesTarget && salesWorker) {
      usedWorkers[salesWorker] = true;
      utilization[salesWorker] = (utilization[salesWorker] || 0) + 1;
    }
    const buzzTarget = employees.buzz03 && selling.length ? selling[(second + 1) % selling.length] : null;
    if (buzzTarget) {
      buzzTarget.awareness = Math.min(100, buzzTarget.awareness + 0.45 * modifier(plan, "marketing"));
      utilization.buzz03 = (utilization.buzz03 || 0) + 1;
    }
    const qaTarget = employees.security06 ? selling.reduce(function (best, product) { return !best || product.bugs > best.bugs ? product : best; }, null) : null;
    if (qaTarget && qaTarget.bugs > 5) {
      qaTarget.bugs = Math.max(0, qaTarget.bugs - 0.9 * modifier(plan, "qa"));
      utilization.security06 = (utilization.security06 || 0) + 1;
    }
    if (employees.care04 && selling.some(function (product) { return product.definition.type === "subscription"; })) utilization.care04 = (utilization.care04 || 0) + 1;
    if (employees.fire05 && selling.length) utilization.fire05 = (utilization.fire05 || 0) + 1;

    selling.forEach(function (product) {
      if (product === salesTarget && salesWorker) {
        const salesLevel = employees.sales02 || 0;
        const chance = (salesWorker === "sales02" ? 0.06 + salesLevel * 0.01 : 0.02) * modifier(plan, "sales") * (0.7 + product.awareness / 166.7) * (0.5 + product.quality / 100) * product.definition.demand;
        product.awareness = Math.min(100, product.awareness + 0.06);
        if (product.definition.type === "subscription" && random() < Math.min(0.35, chance)) {
          product.customers += 1;
          lastProgressAt = second;
        } else if (product.definition.type === "oneShot" && random() < Math.min(BALANCE.ONE_SHOT_SALE_CHANCE_CAP, chance * 0.4)) {
          product.unitsSold += 1;
          product.revenue += product.definition.price;
          money += product.definition.price;
          totalMoney += product.definition.price;
          lastProgressAt = second;
        }
      }
      if (product.definition.type === "subscription") {
        const mrr = product.customers * product.definition.monthlyPrice * (1 + (product.version - 1) * BALANCE.VERSION_PRICE_BONUS);
        const income = mrr / BALANCE.MRR_TO_REVENUE_DIVISOR;
        product.revenue += income;
        money += income;
        totalMoney += income;
      }
    });

    currentStall = second - lastProgressAt;
    maxStallSeconds = Math.max(maxStallSeconds, currentStall);
  }

  const totalMrr = products.reduce(function (sum, product) {
    return sum + (product.definition.type === "subscription" ? product.customers * product.definition.monthlyPrice * (1 + (product.version - 1) * BALANCE.VERSION_PRICE_BONUS) : 0);
  }, 0);
  const productsSelling = products.filter(function (product) { return product.status === "selling"; }).length;
  const totalCustomers = products.reduce(function (sum, product) { return sum + product.customers; }, 0);
  const totalUnitsSold = products.reduce(function (sum, product) { return sum + product.unitsSold; }, 0);
  const utilizationRate = {};
  Object.keys(utilization).forEach(function (workerId) { utilizationRate[workerId] = Number((utilization[workerId] / seconds).toFixed(4)); });
  const softlocked = productsSelling === 0 || (currentStall >= 600 && totalMrr === 0 && totalUnitsSold === 0);
  return {
    seconds,
    strategyId: plan.id,
    seed,
    companyLevel,
    totalMoney: Math.round(totalMoney),
    money: Math.round(money),
    totalMrr: Math.round(totalMrr),
    customers: totalCustomers,
    unitsSold: totalUnitsSold,
    productsSelling,
    maxProductBugs: Math.round(products.reduce(function (max, product) { return Math.max(max, product.bugs); }, 0)),
    maxStallSeconds,
    currentStallSeconds: currentStall,
    softlocked,
    softlockReason: softlocked ? (productsSelling === 0 ? "no_product_released" : "no_revenue_progress_for_600_seconds") : null,
    growthPerMinute: Math.round(totalMoney / Math.max(1, seconds / 60)),
    employeeUtilizationSeconds: utilization,
    employeeUtilizationRate: utilizationRate
  };
}

const horizons = [600, 1800, 7200];
const runs = horizons.map(function (seconds, index) { return simulate(seconds, "balanced", 70161994 + index); });
const strategyComparison = STRATEGIES.map(function (item) { return simulate(1800, item.id, 8100); });
const report = { format: "aibs-balance-v1", deterministic: true, horizons: runs, strategyComparison };

if (process.argv.indexOf("--assert") !== -1) {
  const failures = [];
  if (runs[0].productsSelling < 1) failures.push("10-minute run did not release a product");
  if (runs[1].totalMoney <= runs[0].totalMoney) failures.push("30-minute growth did not exceed 10-minute growth");
  if (runs[2].companyLevel < runs[1].companyLevel) failures.push("2-hour company level regressed");
  if (runs.some(function (run) { return run.softlocked; })) failures.push("a required horizon is softlocked");
  if (!(runs[0].growthPerMinute < runs[1].growthPerMinute && runs[1].growthPerMinute < runs[2].growthPerMinute)) failures.push("growth per minute did not increase across horizons");
  if (!runs[2].employeeUtilizationSeconds.boss) failures.push("boss was never utilized");
  runs.concat(strategyComparison).forEach(function (run) {
    Object.keys(run.employeeUtilizationSeconds).forEach(function (workerId) {
      if (run.employeeUtilizationSeconds[workerId] > run.seconds) failures.push(workerId + " exceeds one assignment per second");
      if (run.employeeUtilizationRate[workerId] < 0 || run.employeeUtilizationRate[workerId] > 1) failures.push(workerId + " utilization rate is out of range");
    });
  });
  if (strategyComparison.some(function (run) { return run.productsSelling < 1; })) failures.push("a strategy cannot release a product in 30 minutes");
  if (failures.length) {
    console.error(JSON.stringify({ failures, report }, null, 2));
    process.exit(1);
  }
}
console.log(JSON.stringify(report, null, 2));
