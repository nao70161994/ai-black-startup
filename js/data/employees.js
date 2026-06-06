"use strict";
window.AIBS_EMPLOYEES = [
    { id: "dev01", code: "Dev-01", nickname: "デブワン", role: "開発AI", unlockLevel: 1, baseCost: 500, description: "開発進捗を大きく進めます。副作用として製品バグが増えやすいです。", personality: "技術至上主義。リファクタリング好き。バグを「未分類機能」と呼ぶ。", catchphrase: "軽微な修正です。" },
    { id: "sales02", code: "Sales-02", nickname: "セルツー", role: "販売AI", unlockLevel: 1, baseCost: 700, description: "新規顧客獲得や売り切り販売が得意です。副作用として炎上が少し増えます。", personality: "超ポジティブ。即答する。未実装機能も売る。", catchphrase: "できます。" },
    { id: "buzz03", code: "Buzz-03", nickname: "バズミ", role: "広報AI", unlockLevel: 2, baseCost: 1000, description: "認知度を上げ、販売成功率を高めます。副作用として炎上が少し増えます。", personality: "ノリが軽い。バズと炎上の区別が曖昧。", catchphrase: "伸びています。" },
    { id: "care04", code: "Care-04", nickname: "ケアフォー", role: "サポートAI", unlockLevel: 3, baseCost: 1200, description: "サポート負荷を下げ、満足度を上げ、解約リスクを抑えます。", personality: "真面目で丁寧。長文返信をしがち。", catchphrase: "まず前提から整理します。" },
    { id: "fire05", code: "Fire-05", nickname: "ファイヴァー", role: "炎上対応AI", unlockLevel: 4, baseCost: 2000, description: "炎上対応専門。炎上度を大きく下げます。対応中は売上機会を少し失います。", personality: "冷静。謝罪文を大量生成する。最後に余計な一文を足す。", catchphrase: "信頼回復プロトコルを実行します。" },
    { id: "security06", code: "Security-06", nickname: "セキュロク", role: "品質管理AI / セキュリティAI", unlockLevel: 5, baseCost: 5000, description: "品質を上げ、製品バグを下げます。サブスクの解約リスク抑制にもつながります。", personality: "慎重。危険な処理を隔離し、リリース前に深呼吸を要求する。", catchphrase: "安全性を優先します。" }
  ];

window.AIBS_WORKERS = {
    boss: { id: "boss", label: "AI社長", alwaysAvailable: true },
    dev01: { id: "dev01", label: "Dev-01" },
    security06: { id: "security06", label: "Security-06" },
    sales02: { id: "sales02", label: "Sales-02" },
    buzz03: { id: "buzz03", label: "Buzz-03" },
    care04: { id: "care04", label: "Care-04" },
    fire05: { id: "fire05", label: "Fire-05" }
  };

window.AIBS_WORKER_TASK_PROFILES = {
    boss: { specialty: "汎用補助", description: "すべてのタスクに割り振れるが、専門AIより低速です。序盤の開発・販売・品質管理・広報・サポートを広く補助します。", levelHint: "AI社長は初期から利用可能です。" },
    dev01: { specialty: "開発", description: "開発進捗を大きく進めます。副作用として製品バグが増えやすいです。", levelHint: "Lvアップで開発速度UP" },
    sales02: { specialty: "販売", description: "新規顧客獲得や売り切り販売が得意です。副作用として炎上が少し増えます。", levelHint: "Lvアップで販売成功率UP" },
    buzz03: { specialty: "広報", description: "認知度を上げ、販売成功率を高めます。副作用として炎上が少し増えます。", levelHint: "Lvアップで認知度上昇量UP" },
    care04: { specialty: "サポート", description: "サポート負荷を下げ、満足度を上げ、解約リスクを抑えます。", levelHint: "Lvアップでサポート効果UP" },
    fire05: { specialty: "炎上対応", description: "炎上対応専門。炎上度を大きく下げます。対応中は売上機会を少し失います。", levelHint: "Lvアップで炎上対応効果UP" },
    security06: { specialty: "品質管理", description: "品質を上げ、製品バグを下げます。サブスクの解約リスク抑制にもつながります。", levelHint: "Lvアップで品質改善量UP" }
  };
