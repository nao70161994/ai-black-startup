"use strict";

window.AIBS_CREATE_ASSIGNMENT_RUNTIME = function (options) {
  const settings = options && typeof options === "object" ? options : {};
  const tasks = Array.isArray(settings.tasks) ? settings.tasks : [];
  const products = Array.isArray(settings.products) ? settings.products : [];
  const maxWorkers = Math.max(1, Math.floor(Number(settings.maxWorkers) || 2));
  const createInitialAssignments = settings.createInitialAssignments;
  const canWorkerAssignToTask = settings.canWorkerAssignToTask;

  function getProductDefinition(productId) {
    return products.find(function (product) { return product.id === productId; }) || products[0];
  }

  function normalizeProductAssignmentEntry(taskId, entry, employees, usedWorkers) {
    const rawAiIds = entry && Array.isArray(entry.aiIds) ? entry.aiIds : (entry && entry.aiId ? [entry.aiId] : []);
    const aiIds = [];
    rawAiIds.forEach(function (aiId) {
      if (!aiId || aiIds.length >= maxWorkers || usedWorkers.indexOf(aiId) !== -1) return;
      if (!canWorkerAssignToTask(aiId, taskId, employees)) return;
      aiIds.push(aiId);
      usedWorkers.push(aiId);
    });
    const normalized = { aiIds: aiIds };
    if (taskId === "development") normalized.mode = entry && entry.mode === "upgrade" ? "upgrade" : "newProduct";
    return normalized;
  }

  function mergeFallbackProductAssignment(target, fallback, taskId) {
    fallback.aiIds.forEach(function (aiId) {
      if (target.aiIds.indexOf(aiId) === -1 && target.aiIds.length < maxWorkers) target.aiIds.push(aiId);
    });
    if (taskId === "development" && target.mode !== "upgrade") target.mode = fallback.mode === "upgrade" ? "upgrade" : target.mode;
  }

  function normalizeAssignments(savedAssignments, employees) {
    const assignments = createInitialAssignments();
    const source = savedAssignments && typeof savedAssignments === "object" ? savedAssignments : {};
    const usedWorkers = [];
    tasks.forEach(function (task) {
      const saved = source[task.id];
      if (saved && typeof saved === "object" && saved.productAssignments) {
        products.forEach(function (definition) {
          const entry = saved.productAssignments[definition.id] || {};
          assignments[task.id].productAssignments[definition.id] = normalizeProductAssignmentEntry(task.id, entry, employees, usedWorkers);
        });
        Object.keys(saved.productAssignments).forEach(function (rawProductId) {
          if (products.some(function (definition) { return definition.id === rawProductId; })) return;
          const fallback = normalizeProductAssignmentEntry(task.id, saved.productAssignments[rawProductId], employees, usedWorkers);
          mergeFallbackProductAssignment(assignments[task.id].productAssignments[products[0].id], fallback, task.id);
        });
        return;
      }
      const productId = saved && typeof saved === "object" ? saved.productId : products[0].id;
      const normalizedProductId = getProductDefinition(productId).id;
      const legacyEntry = saved && typeof saved === "object" ? saved : { aiId: saved };
      assignments[task.id].productAssignments[normalizedProductId] = normalizeProductAssignmentEntry(task.id, legacyEntry, employees, usedWorkers);
    });
    return assignments;
  }

  return { normalizeAssignments: normalizeAssignments };
};
