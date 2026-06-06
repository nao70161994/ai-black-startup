"use strict";
window.AIBS_TASKS = [
    { id: "development", label: "開発", workers: ["boss", "dev01"] },
    { id: "qa", label: "品質管理", workers: ["boss", "security06"] },
    { id: "sales", label: "販売", workers: ["boss", "sales02"] },
    { id: "marketing", label: "広報", workers: ["boss", "buzz03"] },
    { id: "support", label: "サポート", workers: ["boss", "care04"] },
    { id: "crisis", label: "炎上対応", workers: ["boss", "fire05"] }
  ];

window.AIBS_TASK_PRESETS = [
    { id: "growth", label: "成長重視", description: "Dev-01を開発、Sales-02とBuzz-03を主力サブスクへ寄せます。" },
    { id: "cash", label: "即金重視", description: "Sales-02とBuzz-03をAIスライド生成キットへ寄せます。" },
    { id: "firefighting", label: "火消し重視", description: "Fire-05、Care-04、Security-06を高リスク製品へ寄せます。" },
    { id: "quality", label: "品質重視", description: "Security-06をバグ高製品へ寄せます。" },
    { id: "support", label: "サポート重視", description: "Care-04を解約リスク高製品へ寄せます。" },
    { id: "vnext", label: "vNext重視", description: "Dev-01とAI社長をサブスクの次version開発へ寄せます。" },
    { id: "stability", label: "全社安定化", description: "Care-04、Fire-05、Security-06で運用リスクを抑えます。" }
  ];
