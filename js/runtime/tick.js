"use strict";

window.AIBS_CREATE_TICK_RUNTIME = function (options) {
  const settings = options && typeof options === "object" ? options : {};
  let penaltyElapsed = 0;

  function run(runOptions) {
    const elapsedForPenalty = settings.isFirstTickDone() ? settings.tickMs : settings.firstTickMs;
    settings.applyRecurringRuntime();
    settings.applyDecisionEventTick();
    settings.applyAchievementTick();
    settings.markFirstTickDone();
    penaltyElapsed += elapsedForPenalty;
    if (penaltyElapsed >= settings.penaltyMs) {
      penaltyElapsed = 0;
      settings.applyPenalties();
    }
    settings.finalizeTickState();
    if (!runOptions || runOptions.save !== false) settings.applyAutosaveTick();
  }

  function resetPenaltyElapsed() {
    penaltyElapsed = 0;
  }

  function getPenaltyElapsed() {
    return penaltyElapsed;
  }

  return { run: run, resetPenaltyElapsed: resetPenaltyElapsed, getPenaltyElapsed: getPenaltyElapsed };
};
