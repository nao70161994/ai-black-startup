"use strict";

window.AIBS_CREATE_DECISION_RUNTIME = function (options) {
  const settings = options && typeof options === "object" ? options : {};
  const events = Array.isArray(settings.events) ? settings.events : [];
  const handlers = {};

  (settings.legacyEventIds || []).forEach(function (eventId) {
    handlers[eventId] = {
      approve: function (context) { settings.applyLegacy("approve", eventId, context); },
      reject: function (context) { settings.applyLegacy("reject", eventId, context); }
    };
  });
  Object.keys(settings.handlers || {}).forEach(function (eventId) {
    const handler = settings.handlers[eventId] || {};
    handlers[eventId] = { approve: handler.approve, reject: handler.reject };
  });

  function selectDecisionEventCandidate(candidates, randomValue) {
    const list = Array.isArray(candidates) ? candidates : [];
    if (!list.length) return null;
    const totalPriority = list.reduce(function (sum, candidate) { return sum + Math.max(1, candidate.priority || 1); }, 0);
    let roll = (typeof randomValue === "number" ? randomValue : Math.random()) * totalPriority;
    for (let index = 0; index < list.length; index += 1) {
      roll -= Math.max(1, list[index].priority || 1);
      if (roll <= 0) return list[index];
    }
    return list[0];
  }

  function getDecisionEventHandler(eventId) {
    return handlers[eventId] || null;
  }

  function getDecisionHandlerMissingEventIds() {
    return events.filter(function (event) { return !getDecisionEventHandler(event.id); }).map(function (event) { return event.id; });
  }

  return {
    selectDecisionEventCandidate: selectDecisionEventCandidate,
    getDecisionEventHandler: getDecisionEventHandler,
    getDecisionHandlerMissingEventIds: getDecisionHandlerMissingEventIds
  };
};
