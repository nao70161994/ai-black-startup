"use strict";
window.AIBS_CREATE_DEBUG_RENDERER = function () {
  const ACTION_GROUPS = [
    { label: "売上/製品", actions: [["money100k", "売上 +100K"], ["customers5", "主力サブスク 顧客+5"], ["mrrBoost", "MRR確認 顧客+20"], ["completeProducts", "全製品完成"], ["vnextReady", "vNext 90%"]] },
    { label: "リスク/判断", actions: [["fire50", "炎上 +50"], ["bugs50", "主力製品 バグ+50"], ["crisisScenario", "炎上/解約テスト"], ["productFireScenario", "製品炎上+70"], ["riskChipsScenario", "リスクchip確認状態"], ["decisionNow", "社長判断を即発生"], ["decisionClearPending", "社長判断をクリア"], ["decisionResetCooldown", "判断クールダウン解除"], ["decisionHighChurn", "高解約判断シナリオ"], ["decisionHandlersReport", "判断handler一覧"]] },
    { label: "Tick/Runtime", actions: [["tick10", "10秒tick実行"], ["tick60", "60秒tick実行"], ["runtimeClamp", "runtime clamp"], ["runtimeSummary", "tick概要console出力"]] },
    { label: "AI/プリセット", actions: [["unlockAllAi", "全AI解放"], ["allAiLevel5", "全AI Lv5"], ["presetGrowth", "プリセット: 成長"], ["presetCash", "プリセット: 即金"], ["presetFirefighting", "プリセット: 火消し"], ["presetSupport", "プリセット: サポート"], ["presetVnext", "プリセット: vNext"], ["presetStability", "プリセット: 安定化"]] },
    { label: "実績/状態", actions: [["scenario10min", "10分テスト状態"], ["companyExpansionReady", "会社Lvアップ可能"], ["allProductsV5", "全製品v5/販売中"], ["unlockAchievements", "全実績解除"], ["stateSummary", "state概要をconsole出力"], ["dumpSave", "saveをconsole出力"]] }
  ];

  function getHtml(appVersion) {
    const actions = ACTION_GROUPS.map(function (group) {
      return "<h3>" + group.label + "</h3>" + group.actions.map(function (action) {
        return '<button type="button" data-debug-action="' + action[0] + '">' + action[1] + "</button>";
      }).join("");
    }).join("");
    return '<div class="section-heading"><h2>開発用デバッグ</h2><span>?debug=1</span></div>' +
      '<p class="dashboard-summary">通常プレイでは非表示です。プレイテスト用の危険操作です。APP_VERSION: ' + appVersion + "</p>" +
      '<div class="debug-actions">' + actions + "</div>";
  }

  return { ACTION_GROUPS: ACTION_GROUPS, getHtml: getHtml };
};
