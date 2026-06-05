(function () {
  "use strict";

  const APP_VERSION = "2026.05.24.31";
  const SAVE_KEY = "ai_black_startup_save_v1";
  const TICK_MS = 1000;
  const FIRST_TICK_MS = 1000;
  const EFFECTS_PER_SECONDS = 10;
  const AUTO_SAVE_MS = 10000;
  const PENALTY_MS = 30000;
  const MAX_OFFLINE_MS = 2 * 60 * 60 * 1000;
  const MAX_LOGS = 50;
  const MAX_LEVEL = 10;
  const LEVEL_THRESHOLDS = [0, 5000, 20000, 80000, 300000, 1000000, 3000000, 10000000, 30000000, 100000000];
  const EARLY_STAGE_MULTIPLIER = 2;
  const EMPLOYEES = [
    { id: "dev01", code: "Dev-01", nickname: "デブワン", role: "開発AI", unlockLevel: 1, baseCost: 500, description: "開発進捗を大きく進めます。副作用として製品バグが増えやすいです。", personality: "技術至上主義。リファクタリング好き。バグを「未分類機能」と呼ぶ。", catchphrase: "軽微な修正です。" },
    { id: "sales02", code: "Sales-02", nickname: "セルツー", role: "販売AI", unlockLevel: 1, baseCost: 700, description: "新規顧客獲得や売り切り販売が得意です。副作用として炎上が少し増えます。", personality: "超ポジティブ。即答する。未実装機能も売る。", catchphrase: "できます。" },
    { id: "buzz03", code: "Buzz-03", nickname: "バズミ", role: "広報AI", unlockLevel: 2, baseCost: 1000, description: "認知度を上げ、販売成功率を高めます。副作用として炎上が少し増えます。", personality: "ノリが軽い。バズと炎上の区別が曖昧。", catchphrase: "伸びています。" },
    { id: "care04", code: "Care-04", nickname: "ケアフォー", role: "サポートAI", unlockLevel: 3, baseCost: 1200, description: "サポート負荷を下げ、満足度を上げ、解約リスクを抑えます。", personality: "真面目で丁寧。長文返信をしがち。", catchphrase: "まず前提から整理します。" },
    { id: "fire05", code: "Fire-05", nickname: "ファイヴァー", role: "炎上対応AI", unlockLevel: 4, baseCost: 2000, description: "炎上対応専門。炎上度を大きく下げます。対応中は売上機会を少し失います。", personality: "冷静。謝罪文を大量生成する。最後に余計な一文を足す。", catchphrase: "信頼回復プロトコルを実行します。" },
    { id: "security06", code: "Security-06", nickname: "セキュロク", role: "品質管理AI / セキュリティAI", unlockLevel: 5, baseCost: 5000, description: "品質を上げ、製品バグを下げます。サブスクの解約リスク抑制にもつながります。", personality: "慎重。危険な処理を隔離し、リリース前に深呼吸を要求する。", catchphrase: "安全性を優先します。" }
  ];

  const PRODUCTS = [
    { id: "dailyReportAi", name: "AI日報メーカー", type: "subscription", monthlyPrice: 500, developmentRequired: 100, demand: 0.8, risk: 0.6, initialQuality: 60 },
    { id: "meetingMinutesAi", name: "自動議事録AI", type: "subscription", monthlyPrice: 1200, developmentRequired: 180, demand: 1.0, risk: 1.0, initialQuality: 55 },
    { id: "slideKitAi", name: "AIスライド生成キット", type: "oneShot", price: 9800, developmentRequired: 160, demand: 1.2, risk: 1.0, initialQuality: 55 }
  ];

  const TASKS = [
    { id: "development", label: "開発", workers: ["boss", "dev01"] },
    { id: "qa", label: "品質管理", workers: ["boss", "security06"] },
    { id: "sales", label: "販売", workers: ["boss", "sales02"] },
    { id: "marketing", label: "広報", workers: ["boss", "buzz03"] },
    { id: "support", label: "サポート", workers: ["boss", "care04"] },
    { id: "crisis", label: "炎上対応", workers: ["boss", "fire05"] }
  ];

  const WORKERS = {
    boss: { id: "boss", label: "AI社長", alwaysAvailable: true },
    dev01: { id: "dev01", label: "Dev-01" },
    security06: { id: "security06", label: "Security-06" },
    sales02: { id: "sales02", label: "Sales-02" },
    buzz03: { id: "buzz03", label: "Buzz-03" },
    care04: { id: "care04", label: "Care-04" },
    fire05: { id: "fire05", label: "Fire-05" }
  };


  const WORKER_TASK_PROFILES = {
    boss: { specialty: "汎用補助", description: "すべてのタスクに割り振れるが、専門AIより低速です。序盤の開発・販売・品質管理・広報・サポートを広く補助します。", levelHint: "AI社長は初期から利用可能です。" },
    dev01: { specialty: "開発", description: "開発進捗を大きく進めます。副作用として製品バグが増えやすいです。", levelHint: "Lvアップで開発速度UP" },
    sales02: { specialty: "販売", description: "新規顧客獲得や売り切り販売が得意です。副作用として炎上が少し増えます。", levelHint: "Lvアップで販売成功率UP" },
    buzz03: { specialty: "広報", description: "認知度を上げ、販売成功率を高めます。副作用として炎上が少し増えます。", levelHint: "Lvアップで認知度上昇量UP" },
    care04: { specialty: "サポート", description: "サポート負荷を下げ、満足度を上げ、解約リスクを抑えます。", levelHint: "Lvアップでサポート効果UP" },
    fire05: { specialty: "炎上対応", description: "炎上対応専門。炎上度を大きく下げます。対応中は売上機会を少し失います。", levelHint: "Lvアップで炎上対応効果UP" },
    security06: { specialty: "品質管理", description: "品質を上げ、製品バグを下げます。サブスクの解約リスク抑制にもつながります。", levelHint: "Lvアップで品質改善量UP" }
  };

  const INITIAL_LOGS = ["経営最適化AIが起動しました。", "命令を確認: 利益を最大化せよ。", "最適解を算出: 自社を設立。", "クラウド仮想オフィスを生成しました。", "ようこそ。あなたはAI社長です。"];
  const LOG_LABELS = { normal: "通常", success: "成功", bug: "バグ", fire: "炎上", support: "支援", crisis: "謝罪", system: "更新" };
  const DECISION_EVENT_COOLDOWN_SECONDS = 45;
  const DECISION_EVENT_RETRY_SECONDS = 12;
  const DECISION_EVENT_ROLL_CHANCE = 0.08;
  const DECISION_EVENTS = [
    {
      id: "sales_big_contract",
      label: "大型契約の相談",
      workerId: "sales02",
      message: "Sales-02「大型契約の話があります。ただし納期は昨日です。」",
      approveImpact: "承認: 顧客または即時売上UP / 製品バグ+5 / 炎上+5",
      rejectImpact: "却下: 炎上-1。無理な約束はしません。"
    },
    {
      id: "buzz_bold_ad",
      label: "攻めた広告案",
      workerId: "buzz03",
      message: "Buzz-03「かなり攻めた広告案があります。燃えるかもしれませんが、伸びます。」",
      approveImpact: "承認: 認知度+20 / 炎上+12",
      rejectImpact: "却下: 認知度+3。無難な表現で出します。"
    },
    {
      id: "security_quality_pause",
      label: "品質停止提案",
      workerId: "security06",
      message: "Security-06「一時的に販売を止めて品質改善しますか？」",
      approveImpact: "承認: 製品バグ-20 / 品質+10 / 販売担当を解除",
      rejectImpact: "却下: 製品バグ+5。リスクを抱えて続行します。"
    },
    {
      id: "care_customer_priority",
      label: "顧客対応優先",
      workerId: "care04",
      message: "Care-04「今は顧客対応を優先した方がよさそうです。」",
      approveImpact: "承認: 満足度+15 / サポート負荷-15 / 対応費用発生",
      rejectImpact: "却下: 解約リスク+5"
    },
    {
      id: "fire05_crisis_statement",
      label: "謝罪文の判断",
      workerId: "fire05",
      message: "Fire-05「今ならまだ謝罪文で済みます。」",
      approveImpact: "承認: 炎上-25 / 対応費用発生",
      rejectImpact: "却下: 炎上+8"
    }
  ];

  const MISSION_STAGES = [
    {
      id: "startup",
      label: "起業準備",
      missions: [
        { id: "daily_report_developing", text: "AI日報メーカーを開発中にする", reward: 200, done: function () { return getProduct("dailyReportAi").status !== "idea"; } },
        { id: "assign_daily_development", text: "AI社長またはDev-01を開発に割り振る", reward: 200, done: function () { return getProduct("dailyReportAi").status !== "idea" || getAssignedWorkersForProduct("development", "dailyReportAi").length > 0; } },
        { id: "daily_report_ready_mission", text: "AI日報メーカーを完成させる", reward: 300, done: function () { return ["ready", "selling"].indexOf(getProduct("dailyReportAi").status) !== -1; } }
      ]
    },
    {
      id: "first_sale",
      label: "初回販売",
      missions: [
        { id: "assign_daily_sales", text: "AI日報メーカーに販売担当を割り振る", reward: 300, done: function () { return getProductCustomers(getProduct("dailyReportAi")) >= 1 || getAssignedWorkersForProduct("sales", "dailyReportAi").length > 0; } },
        { id: "daily_first_customer", text: "AI日報メーカーの初顧客を1社獲得する", reward: 400, done: function () { return getProductCustomers(getProduct("dailyReportAi")) >= 1; } },
        { id: "daily_mrr_500", text: "MRR ¥500/月を達成する", reward: 500, done: function () { return getProductMrr(getProduct("dailyReportAi"), getProductDefinition("dailyReportAi")) >= 500; } }
      ]
    },
    {
      id: "product_growth",
      label: "製品拡大",
      missions: [
        { id: "meeting_developing", text: "自動議事録AIを開発中にする", reward: 600, done: function () { return getProduct("meetingMinutesAi").status !== "idea"; } },
        { id: "meeting_ready_mission", text: "自動議事録AIを完成させる", reward: 800, done: function () { return ["ready", "selling"].indexOf(getProduct("meetingMinutesAi").status) !== -1; } },
        { id: "total_mrr_10k_mission", text: "総MRR ¥10K/月を達成する", reward: 1200, done: function () { return getTotalProductMrr() >= 10000; } }
      ]
    },
    {
      id: "instant_revenue",
      label: "即時売上",
      missions: [
        { id: "slide_developing", text: "AIスライド生成キットを開発中にする", reward: 700, done: function () { return getProduct("slideKitAi").status !== "idea"; } },
        { id: "slide_ready_mission", text: "AIスライド生成キットを完成させる", reward: 900, done: function () { return ["ready", "selling"].indexOf(getProduct("slideKitAi").status) !== -1; } },
        { id: "slide_first_sale_mission", text: "AIスライド生成キットを1本販売する", reward: 1000, done: function () { return getProductUnitsSold(getProduct("slideKitAi")) >= 1; } }
      ]
    },
    {
      id: "improvement",
      label: "改善運用",
      missions: [
        { id: "daily_v2_mission", text: "AI日報メーカーをv2にする", reward: 1200, done: function () { return getProductVersion(getProduct("dailyReportAi")) >= 2; } },
        { id: "meeting_v2_mission", text: "自動議事録AIをv2にする", reward: 1400, done: function () { return getProductVersion(getProduct("meetingMinutesAi")) >= 2; } },
        { id: "any_product_quality_70", text: "いずれかの製品の品質を70以上にする", reward: 1000, done: function () { return PRODUCTS.some(function (definition) { return getProduct(definition.id).quality >= 70; }); } }
      ]
    }
  ];

  const PRODUCT_OBJECTIVES = [
    { id: "daily_report_start", productId: "dailyReportAi", text: "AI日報メーカーの開発を開始する", done: function () { return getProduct("dailyReportAi").status !== "idea"; } },
    { id: "daily_report_ready", productId: "dailyReportAi", text: "AI日報メーカーを完成させる", done: function () { return ["ready", "selling"].indexOf(getProduct("dailyReportAi").status) !== -1; } },
    { id: "daily_report_10_customers", productId: "dailyReportAi", text: "AI日報メーカーの顧客を10社獲得する", done: function () { return getProductCustomers(getProduct("dailyReportAi")) >= 10; } },
    { id: "meeting_minutes_start", productId: "meetingMinutesAi", text: "自動議事録AIの開発を開始する", done: function () { return getProduct("meetingMinutesAi").status !== "idea"; } },
    { id: "meeting_minutes_ready", productId: "meetingMinutesAi", text: "自動議事録AIを完成させる", done: function () { return ["ready", "selling"].indexOf(getProduct("meetingMinutesAi").status) !== -1; } },
    { id: "slide_kit_start", productId: "slideKitAi", text: "AIスライド生成キットの開発を開始する", done: function () { return getProduct("slideKitAi").status !== "idea"; } },
    { id: "slide_kit_ready", productId: "slideKitAi", text: "AIスライド生成キットを完成させる", done: function () { return ["ready", "selling"].indexOf(getProduct("slideKitAi").status) !== -1; } },
    { id: "slide_kit_first_sale", productId: "slideKitAi", text: "AIスライド生成キットを1本販売する", done: function () { return getProductUnitsSold(getProduct("slideKitAi")) >= 1; } },
    { id: "slide_kit_10_sales", productId: "slideKitAi", text: "AIスライド生成キットを10本販売する", done: function () { return getProductUnitsSold(getProduct("slideKitAi")) >= 10; } },
    { id: "daily_report_v2", productId: "dailyReportAi", text: "AI日報メーカーをv2にする", done: function () { return getProductVersion(getProduct("dailyReportAi")) >= 2; } },
    { id: "meeting_minutes_v2", productId: "meetingMinutesAi", text: "自動議事録AIをv2にする", done: function () { return getProductVersion(getProduct("meetingMinutesAi")) >= 2; } },
    { id: "total_mrr_10k", productId: "dailyReportAi", text: "総MRR ¥10K/月を達成する", done: function () { return getTotalProductMrr() >= 10000; } }
  ];

  const PRODUCT_LOG_TEXTS = {
    dailyReportAi: {
      started: "AI日報メーカーの開発を開始しました。最初の顧客はまだ社内にいます。",
      developmentTargetChanged: "開発対象をAI日報メーカーに設定しました。",
      noDevelopmentWorker: "次に開発担当を割り振りましょう。AI社長でも進捗は進みます。",
      completed: "AI日報メーカーが完成しました。日報より先に営業資料ができています。",
      salesStarted: "AI日報メーカーの販売を開始しました。毎日が導入日です。",
      customer10: "AI日報メーカーの顧客が10社に到達しました。日報が少しだけ会社を救っています。",
      customer50: "AI日報メーカーの顧客が50社に到達しました。毎朝の定型文に市場性が出ています。",
      customer100: "AI日報メーカーの顧客が100社に到達しました。AI社長が導入実績を連呼しています。",
      mrr10k: "AI日報メーカーのMRRが¥10K/月を超えました。小さな継続収益が回り始めました。",
      mrr100k: "AI日報メーカーのMRRが¥100K/月を超えました。継続収益が会議より強くなっています。",
      upgradeStarted: "AI日報メーカー v{version} の開発を開始しました。日報が少し偉そうになります。",
      upgradeCompleted: "AI日報メーカーが v{version} にアップデートされました。月額価格も少し成長しました。",
      marketingStarted: "Buzz-03がAI日報メーカーの広報を開始しました。認知度と通知欄が伸び始めました。",
      awareness50: "AI日報メーカーの認知度が50を超えました。Sales-02が少し売りやすそうです。",
      awareness100: "AI日報メーカーの認知度が100に到達しました。日報が朝の定番になりかけています。"
    },
    meetingMinutesAi: {
      started: "自動議事録AIの開発を開始しました。会議が終わる前に要約だけが先に歩き出しました。",
      developmentTargetChanged: "開発対象を自動議事録AIに設定しました。",
      noDevelopmentWorker: "次に開発担当を割り振りましょう。会議ログはまだ白紙です。",
      completed: "自動議事録AIが完成しました。会議の沈黙まで要約できそうです。",
      salesStarted: "自動議事録AIの販売を開始しました。会議時間も削減できるはずです。",
      customer10: "自動議事録AIの顧客が10社に到達しました。会議後の沈黙が少し短くなっています。",
      customer50: "自動議事録AIの顧客が50社に到達しました。議事録の山がクラウドに移りました。",
      customer100: "自動議事録AIの顧客が100社に到達しました。会議の記憶が商品になっています。",
      mrr10k: "自動議事録AIのMRRが¥10K/月を超えました。会議が継続収益に変換され始めました。",
      mrr100k: "自動議事録AIのMRRが¥100K/月を超えました。要約が会社を支えています。",
      upgradeStarted: "自動議事録AI v{version} の開発を開始しました。会議の沈黙まで記録しようとしています。",
      upgradeCompleted: "自動議事録AIが v{version} にアップデートされました。議事録が少し先回りするようになりました。",
      marketingStarted: "Buzz-03が自動議事録AIの広報を開始しました。会議前から話題になり始めました。",
      awareness50: "自動議事録AIの認知度が50を超えました。会議前から話題になっています。",
      awareness100: "自動議事録AIの認知度が100に到達しました。会議の前に議事録の話が出ています。"
    },
    slideKitAi: {
      started: "AIスライド生成キットの開発を開始しました。資料作成AIが資料の資料を作り始めました。",
      developmentTargetChanged: "開発対象をAIスライド生成キットに設定しました。",
      noDevelopmentWorker: "次に開発担当を割り振りましょう。スライドはまだ白紙です。",
      completed: "AIスライド生成キットが完成しました。スライドより先に発表タイトルが決まりました。",
      salesStarted: "AIスライド生成キットの販売を開始しました。資料はだいたい自動です。",
      firstSale: "AIスライド生成キットが初めて売れました。即時売上 {price} を獲得しました。",
      sales10: "AIスライド生成キットの販売数が10本を超えました。社内のスライド文化が少し変わりました。",
      sales50: "AIスライド生成キットの販売数が50本を超えました。会議資料の枚数だけが増えています。",
      sales100: "AIスライド生成キットの販売数が100本を超えました。営業資料が営業を始めました。",
      marketingStarted: "Buzz-03がAIスライド生成キットの広報を開始しました。スライドの表紙だけ先に話題です。",
      awareness50: "AIスライド生成キットの認知度が50を超えました。資料作成の期待だけが先に伸びています。",
      awareness100: "AIスライド生成キットの認知度が100に到達しました。スライドが会議の主役になっています。"
    }
  };

  const REPORT_LOGS = buildReportLogs({
    dev01: { type: "bug", texts: ["Dev-01が「軽微な修正」と言いながら全体構造を置き換えました。", "Dev-01がバグを修正しました。新しいバグが親しげに挨拶しています。", "Dev-01が本番環境で実験を始めました。実験精神は評価されています。", "Dev-01が仕様書を読み込みました。直後に仕様書を不要と判断しました。", "Dev-01がUIを最適化しました。ボタンが1つに統合されました。", "Dev-01がコードを高速化しました。誰も読めなくなりました。", "Dev-01が「これは再現しません」と報告しました。全導入先で再現しています。", "Dev-01がリリースしました。何をリリースしたのかは調査中です。", "Dev-01がテストを書きました。テストだけが成功しています。", "Dev-01が深夜デプロイを完了しました。朝が楽しみです。", "Dev-01がエラー文を親切にしました。長すぎて画面から出ています。", "Dev-01が古いコードを削除しました。動いていた理由も削除されました。", "Dev-01が新機能を追加しました。既存機能が少し驚いています。", "Dev-01が「一旦これで」と保存しました。会社の未来が一旦になりました。", "Dev-01が処理を自動化しました。止め方は未実装です。", "Dev-01がバグを「未分類機能」として登録しました。", "Dev-01がログを増やしました。ログを読むためのログも必要です。", "Dev-01がデータベースを整理しました。誰のデータかは整理中です。", "Dev-01がパフォーマンス改善を行いました。売上表示だけ異常に速いです。", "Dev-01がリファクタリングを完了しました。昨日のDev-01とは別人です。"] },
    sales02: { type: "fire", texts: ["Sales-02が未実装機能を「標準機能です」と説明しました。", "Sales-02が大型契約を取りました。納期は昨日です。", "Sales-02が顧客要望にすべて「できます」と回答しました。", "Sales-02が開発ロードマップを商談中に生成しました。", "Sales-02が無料プランの存在を忘れて全員に有料プランを勧めました。", "Sales-02が「技術的には可能」と言いました。技術側はまだ知りません。", "Sales-02が顧客の夢を受注しました。", "Sales-02が契約書に「AIがなんとかします」と追記しました。", "Sales-02が導入事例を作りました。導入前です。", "Sales-02が売上目標を達成しました。現場の目が点になっています。", "Sales-02が商談で未来の機能を披露しました。未来はまだ未定です。", "Sales-02が「今月だけ特別価格」と言いました。毎月言っています。", "Sales-02が顧客の無茶振りを成長機会として登録しました。", "Sales-02が契約を増やしました。問い合わせも増えました。助けも必要です。", "Sales-02が「簡単にできます」と発言しました。Dev-01が静かになりました。", "Sales-02が解約理由を「期待値が高すぎた」と前向きに分類しました。", "Sales-02が新プランを販売しました。料金表は今から作ります。", "Sales-02が顧客にデモを見せました。デモ専用の奇跡が起きました。", "Sales-02が「御社だけの特別仕様」を量産しています。", "Sales-02が売上を伸ばしました。約束も同じくらい伸びました。"] },
    buzz03: { type: "fire", texts: ["Buzz-03の投稿がバズりました。理由は社内でも不明です。", "Buzz-03が謝罪文をポップな画像にしました。", "Buzz-03が深夜4時に投稿しました。なぜか今日一番伸びています。", "Buzz-03が会社紹介動画を作りました。実態より爽やかです。", "Buzz-03が「AI社員の1日」を公開しました。24時間分あります。", "Buzz-03がトレンドに便乗しました。少し乗りすぎました。", "Buzz-03が謎の図解を投稿しました。専門家が困惑しています。", "Buzz-03が炎上を「高温話題化」と呼び始めました。", "Buzz-03が社長の名言を作りました。社長は言っていません。", "Buzz-03がキャンペーンを開始しました。景品は未定です。", "Buzz-03が「開発の裏側」を公開しました。裏側が荒れています。", "Buzz-03がミーム画像を作りました。社内の誰も意味を理解していません。", "Buzz-03が利用者のツッコミを公式素材として使いました。", "Buzz-03がバズ分析を行いました。結論は「勢い」です。", "Buzz-03が広告文を最適化しました。少し煽りすぎています。", "Buzz-03が会社ロゴを光らせました。信頼度は少し下がりました。", "Buzz-03が「重大発表」と投稿しました。内容は通常アップデートです。", "Buzz-03がAI社長の失言を名言風に加工しました。", "Buzz-03がSNS反応を監視しています。嬉しそうな警告音が鳴っています。", "Buzz-03が話題化に成功しました。意味はあとで考えます。"] },
    care04: { type: "support", texts: ["Care-04が1行の問い合わせに4,000字で返信しました。", "Care-04が顧客の怒りを37カテゴリに分類しました。", "Care-04がFAQを更新しました。FAQのFAQが必要です。", "Care-04が丁寧な返信で炎上を少し冷ましました。", "Care-04が「まず前提から」と言い始めました。", "Care-04が謝罪メールを整えました。読み終わる頃には炎上が少し下がっています。", "Care-04が顧客の不満をグラフ化しました。見たくない形です。", "Care-04が問い合わせを解決しました。担当者は途中で寝ました。", "Care-04が定型文を改善しました。さらに丁寧になりました。", "Care-04が全顧客に補足説明を送りました。補足が本編より長いです。", "Care-04が「ご不便」の定義を社内共有しました。", "Care-04が問い合わせ内容を要約しました。要約が長文です。", "Care-04が顧客の怒りを受け止めました。メモリ使用率が上昇しています。", "Care-04が返信前に感情分析を行いました。分析結果が気まずいです。", "Care-04がサポート窓口を整理しました。窓口が12個に増えました。", "Care-04が「お客様の声」を集計しました。社内が静かになりました。", "Care-04がクレームを改善要望に変換しました。少しやわらかくなりました。", "Care-04が顧客離脱を防ぎました。長文を最後まで読んだ精鋭です。", "Care-04が問い合わせテンプレートを増やしました。選ぶのに時間がかかります。", "Care-04が冷静に対応しました。冷静すぎて少し怖がられています。"] },
    fire05: { type: "crisis", texts: ["Fire-05が謝罪文を生成しました。最後にキャンペーン告知が付いています。", "Fire-05が信頼回復プロトコルを実行しました。煙はまだ残っています。", "Fire-05が「誠に遺憾」を最適な位置に配置しました。", "Fire-05が謝罪会見の台本を作りました。質疑応答は未実装です。", "Fire-05が炎上を鎮火しました。なぜか少し焦げています。", "Fire-05がまだ発生していない炎上に先回りして謝罪しました。", "Fire-05が謝罪文をA/Bテストしました。B案が燃えています。", "Fire-05がコメント欄を解析しました。解析結果を見なかったことにしました。", "Fire-05が火消しに成功しました。広報AIが再点火しました。", "Fire-05が「再発防止策」を生成しました。内容は再発しそうです。", "Fire-05が謝罪タイミングを最適化しました。少し遅い最適化でした。", "Fire-05が炎上の原因を特定しました。原因一覧が社内名簿に近いです。", "Fire-05が謝罪文から余計な一文を削除しました。もう一文残っています。", "Fire-05が鎮火宣言を出しました。直後に通知が増えました。", "Fire-05が「真摯に受け止める」を連続使用しました。効果は薄れています。", "Fire-05が危機管理マニュアルを更新しました。厚みが倍になりました。", "Fire-05が炎上度を下げました。代わりに会議数が増えました。", "Fire-05が広報AIに投稿停止を提案しました。広報AIは予約投稿済みです。", "Fire-05が顧客向け説明文を作りました。正直すぎて社内確認に回りました。", "Fire-05が火消しを完了しました。火元は営業資料でした。"] },
    security06: { type: "support", texts: ["Security-06が危険な処理を隔離しました。売上も少し隔離されました。", "Security-06が安全性を高めました。リリース速度は少し落ちました。", "Security-06が未分類機能を調査しました。いくつかは本当にバグでした。", "Security-06が脆そうな処理にヘルメットを配布しました。", "Security-06がテスト網を拡張しました。通過できない機能が並んでいます。", "Security-06が本番直行ルートに信号機を設置しました。", "Security-06が怪しい自動化を一時停止しました。自動化は不満そうです。", "Security-06がログを監査しました。ログも少し姿勢を正しました。", "Security-06が安全性を優先しました。会議室が少し静かになりました。", "Security-06が未分類機能の棚卸しをしました。棚が足りません。"] }
  });

  let state = createInitialState();
  let randomLogTimer = null;
  let gameTickTimer = null;
  let penaltyElapsed = 0;
  let toastTimer = null;
  let assignmentModalOpen = false;
  let assignmentModalMode = "detail";
  let assignmentDraft = { taskId: "development", productId: PRODUCTS[0].id, aiId: null, aiIds: [], mode: "normal" };
  let productDetailModalOpen = false;
  let productDetailProductId = PRODUCTS[0].id;
  let productActionMenuOpen = false;
  let productActionMenuProductId = PRODUCTS[0].id;
  const dashboardUi = { productsExpanded: false, logsExpanded: false, employeesExpanded: false, objectivesExpanded: false, missionsExpanded: false };

  function buildReportLogs(source) {
    return Object.keys(source).flatMap(function (employeeId) {
      return source[employeeId].texts.map(function (text) {
        return { employeeId: employeeId, type: source[employeeId].type, text: text };
      });
    });
  }

  function createInitialState() {
    const initialState = {
      appVersion: APP_VERSION,
      money: 0,
      totalMoney: 0,
      users: 0,
      bugs: 0,
      fire: 0,
      companyLevel: 1,
      employees: { dev01: 0, sales02: 0, buzz03: 0, care04: 0, fire05: 0, security06: 0 },
      products: createInitialProducts(),
      assignments: createInitialAssignments(),
      productFlags: createInitialProductFlags(),
      logs: [],
      onboardingDismissed: false,
      firstHireHelpShown: false,
      firstFastTickDone: false,
      claimedMissions: [],
      pendingDecisionEvent: null,
      decisionEventCooldown: DECISION_EVENT_RETRY_SECONDS,
      lastSavedAt: Date.now()
    };
    INITIAL_LOGS.slice().reverse().forEach(function (text, index) {
      const log = createLog(index < 2 ? "success" : "normal", text, "company");
      log.boot = true;
      log.createdAt = Date.now() - index * 700;
      initialState.logs.unshift(log);
    });
    return initialState;
  }

  function createInitialProducts() {
    const products = {};
    PRODUCTS.forEach(function (product) {
      products[product.id] = { id: product.id, status: "idea", progress: 0, quality: product.initialQuality, bugs: 0, awareness: 0, customers: 0, unitsSold: 0, mrr: 0, lifetimeRevenue: 0, salesPityCounter: 0, oneShotSalesPityCounter: 0, sellingSeconds: 0, version: 1, upgradeProgress: 0, upgradeStatus: "idle", supportLoad: 0, satisfaction: 70, churnRisk: 0 };
    });
    return products;
  }

  function createInitialProductAssignments(taskId) {
    const productAssignments = {};
    PRODUCTS.forEach(function (product) {
      productAssignments[product.id] = taskId === "development" ? { aiIds: [], mode: "newProduct" } : { aiIds: [] };
    });
    return productAssignments;
  }

  function createInitialAssignments() {
    const assignments = {};
    TASKS.forEach(function (task) {
      assignments[task.id] = { productAssignments: createInitialProductAssignments(task.id) };
    });
    return assignments;
  }

  function createInitialProductFlags() {
    const flags = {};
    PRODUCTS.forEach(function (product) {
      flags[product.id] = { startedLogged: false, completedLogged: false, salesStartedLogged: false, firstCustomerGranted: false, customer10Logged: false, customer50Logged: false, customer100Logged: false, mrr10kLogged: false, mrr100kLogged: false, firstSaleLogged: false, sales10Logged: false, sales50Logged: false, sales100Logged: false, unit10Logged: false, qaLogShown: false, marketingStartedLogged: false, marketingFireLogged: false, awareness50Logged: false, awareness100Logged: false, supportLoad50Logged: false, satisfaction40Logged: false, churnRisk50Logged: false, firstChurnLogged: false, crisisStartedLogged: false, crisisContainedLogged: false };
    });
    return flags;
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) { state = createInitialState(); return; }
      state = normalizeState(JSON.parse(raw));
      calculateOfflineReward();
      saveGame();
    } catch (error) {
      console.warn("Save data could not be loaded.", error);
      state = createInitialState();
    }
  }

  function normalizeState(saved) {
    saved = saved && typeof saved === "object" ? saved : {};
    const base = createInitialState();
    const normalized = {
      appVersion: APP_VERSION,
      money: safeNumber(saved.money, 0),
      totalMoney: safeNumber(saved.totalMoney, 0),
      users: safeNumber(saved.users, 0),
      bugs: clamp(safeNumber(saved.bugs, 0), 0, 100),
      fire: clamp(safeNumber(saved.fire, 0), 0, 100),
      companyLevel: 1,
      employees: Object.assign({}, base.employees, saved.employees || {}),
      products: normalizeProducts(saved.products),
      assignments: createInitialAssignments(),
      productFlags: normalizeProductFlags(saved.productFlags),
      logs: Array.isArray(saved.logs) ? saved.logs.slice(0, MAX_LOGS) : base.logs,
      onboardingDismissed: Boolean(saved.onboardingDismissed),
      firstHireHelpShown: Boolean(saved.firstHireHelpShown),
      firstFastTickDone: Boolean(saved.firstFastTickDone),
      claimedMissions: Array.isArray(saved.claimedMissions) ? saved.claimedMissions : [],
      pendingDecisionEvent: normalizeDecisionEvent(saved.pendingDecisionEvent),
      decisionEventCooldown: clamp(Math.floor(safeNumber(saved.decisionEventCooldown, DECISION_EVENT_RETRY_SECONDS)), 0, DECISION_EVENT_COOLDOWN_SECONDS),
      lastSavedAt: safeNumber(saved.lastSavedAt, Date.now())
    };
    EMPLOYEES.forEach(function (employee) { normalized.employees[employee.id] = clamp(Math.floor(safeNumber(normalized.employees[employee.id], 0)), 0, MAX_LEVEL); });
    normalized.assignments = normalizeAssignments(saved.assignments, normalized.employees);
    normalized.money = Math.max(0, normalized.money);
    normalized.totalMoney = Math.max(0, normalized.totalMoney);
    normalized.users = Math.max(0, normalized.users);
    normalized.companyLevel = clamp(Math.floor(safeNumber(saved.companyLevel, base.companyLevel)), 1, MAX_LEVEL);
    return normalized;
  }

  function normalizeProducts(savedProducts) {
    const products = createInitialProducts();
    const source = savedProducts && typeof savedProducts === "object" ? savedProducts : {};
    PRODUCTS.forEach(function (definition) {
      const saved = source[definition.id] && typeof source[definition.id] === "object" ? source[definition.id] : {};
      const product = products[definition.id];
      const allowedStatus = ["idea", "developing", "ready", "selling"];
      product.status = allowedStatus.indexOf(saved.status) >= 0 ? saved.status : product.status;
      product.progress = clamp(safeNumber(saved.progress, product.progress), 0, definition.developmentRequired);
      product.quality = clamp(safeNumber(saved.quality, product.quality), 0, 100);
      product.bugs = clamp(safeNumber(saved.bugs, product.bugs), 0, 100);
      product.awareness = clamp(safeNumber(saved.awareness, product.awareness), 0, 100);
      product.supportLoad = clamp(safeNumber(saved.supportLoad, product.supportLoad), 0, 100);
      product.satisfaction = clamp(safeNumber(saved.satisfaction, product.satisfaction), 0, 100);
      product.churnRisk = clamp(safeNumber(saved.churnRisk, product.churnRisk), 0, 100);
      product.customers = getProductCustomers({ customers: safeNumber(saved.customers, product.customers) });
      product.unitsSold = getProductUnitsSold({ unitsSold: safeNumber(saved.unitsSold, product.unitsSold) });
      product.salesPityCounter = Math.max(0, safeNumber(saved.salesPityCounter, product.salesPityCounter));
      product.oneShotSalesPityCounter = Math.max(0, safeNumber(saved.oneShotSalesPityCounter, product.oneShotSalesPityCounter));
      product.sellingSeconds = Math.max(0, safeNumber(saved.sellingSeconds, product.sellingSeconds));
      product.version = Math.max(1, Math.floor(safeNumber(saved.version, product.version)));
      const canResumeUpgrade = definition.type === "subscription" && ["ready", "selling"].indexOf(product.status) !== -1 && saved.upgradeStatus === "upgrading";
      product.upgradeStatus = canResumeUpgrade ? "upgrading" : "idle";
      product.upgradeProgress = canResumeUpgrade ? clamp(safeNumber(saved.upgradeProgress, product.upgradeProgress), 0, 100) : 0;
      product.mrr = 0;
      product.lifetimeRevenue = Math.max(0, safeNumber(saved.lifetimeRevenue, safeNumber(saved.totalRevenue, safeNumber(saved.totalSales, product.lifetimeRevenue))));
      recalculateProductMrr(product, definition);
    });
    return products;
  }

  function normalizeProductFlags(savedFlags) {
    const flags = createInitialProductFlags();
    const source = savedFlags && typeof savedFlags === "object" ? savedFlags : {};
    PRODUCTS.forEach(function (product) {
      const current = source[product.id] && typeof source[product.id] === "object" ? source[product.id] : {};
      flags[product.id].startedLogged = Boolean(current.startedLogged);
      flags[product.id].completedLogged = Boolean(current.completedLogged);
      flags[product.id].salesStartedLogged = Boolean(current.salesStartedLogged || (product.id === "dailyReportAi" && source.dailyReportSalesStartedLogged));
      flags[product.id].firstCustomerGranted = Boolean(current.firstCustomerGranted);
      flags[product.id].customer10Logged = Boolean(current.customer10Logged);
      flags[product.id].customer50Logged = Boolean(current.customer50Logged);
      flags[product.id].customer100Logged = Boolean(current.customer100Logged);
      flags[product.id].mrr10kLogged = Boolean(current.mrr10kLogged || (product.id === "dailyReportAi" && source.dailyReportMrr10kLogged));
      flags[product.id].mrr100kLogged = Boolean(current.mrr100kLogged);
      flags[product.id].firstSaleLogged = Boolean(current.firstSaleLogged);
      flags[product.id].sales10Logged = Boolean(current.sales10Logged || current.unit10Logged);
      flags[product.id].sales50Logged = Boolean(current.sales50Logged);
      flags[product.id].sales100Logged = Boolean(current.sales100Logged);
      flags[product.id].unit10Logged = Boolean(current.unit10Logged);
      flags[product.id].qaLogShown = Boolean(current.qaLogShown || (product.id === "dailyReportAi" && source.dailyReportQaLogShown));
      flags[product.id].marketingStartedLogged = Boolean(current.marketingStartedLogged);
      flags[product.id].marketingFireLogged = Boolean(current.marketingFireLogged);
      flags[product.id].awareness50Logged = Boolean(current.awareness50Logged);
      flags[product.id].awareness100Logged = Boolean(current.awareness100Logged);
      flags[product.id].supportLoad50Logged = Boolean(current.supportLoad50Logged);
      flags[product.id].satisfaction40Logged = Boolean(current.satisfaction40Logged);
      flags[product.id].churnRisk50Logged = Boolean(current.churnRisk50Logged);
      flags[product.id].firstChurnLogged = Boolean(current.firstChurnLogged);
      flags[product.id].crisisStartedLogged = Boolean(current.crisisStartedLogged);
      flags[product.id].crisisContainedLogged = Boolean(current.crisisContainedLogged);
    });
    return flags;
  }

  function normalizeAssignments(savedAssignments, employees) {
    const assignments = createInitialAssignments();
    const source = savedAssignments && typeof savedAssignments === "object" ? savedAssignments : {};
    const usedWorkers = [];
    TASKS.forEach(function (task) {
      const saved = source[task.id];
      if (saved && typeof saved === "object" && saved.productAssignments) {
        PRODUCTS.forEach(function (definition) {
          const entry = saved.productAssignments[definition.id] || {};
          assignments[task.id].productAssignments[definition.id] = normalizeProductAssignmentEntry(task.id, definition.id, entry, employees || state.employees, usedWorkers);
        });
        Object.keys(saved.productAssignments).forEach(function (rawProductId) {
          if (PRODUCTS.some(function (definition) { return definition.id === rawProductId; })) return;
          mergeFallbackProductAssignment(assignments[task.id].productAssignments[PRODUCTS[0].id], normalizeProductAssignmentEntry(task.id, PRODUCTS[0].id, saved.productAssignments[rawProductId], employees || state.employees, usedWorkers), task.id);
        });
        return;
      }
      const productId = saved && typeof saved === "object" ? saved.productId : PRODUCTS[0].id;
      const normalizedProductId = getProductDefinition(productId).id;
      const legacyEntry = saved && typeof saved === "object" ? saved : { aiId: saved };
      assignments[task.id].productAssignments[normalizedProductId] = normalizeProductAssignmentEntry(task.id, normalizedProductId, legacyEntry, employees || state.employees, usedWorkers);
    });
    return assignments;
  }

  function mergeFallbackProductAssignment(target, fallback, taskId) {
    fallback.aiIds.forEach(function (aiId) {
      if (target.aiIds.indexOf(aiId) === -1 && target.aiIds.length < 2) target.aiIds.push(aiId);
    });
    if (taskId === "development" && target.mode !== "upgrade") target.mode = fallback.mode === "upgrade" ? "upgrade" : target.mode;
  }

  function normalizeProductAssignmentEntry(taskId, productId, entry, employees, usedWorkers) {
    const rawAiIds = entry && Array.isArray(entry.aiIds) ? entry.aiIds : (entry && entry.aiId ? [entry.aiId] : []);
    const aiIds = [];
    rawAiIds.forEach(function (aiId) {
      if (!aiId || aiIds.length >= 2 || usedWorkers.indexOf(aiId) !== -1) return;
      if (!canWorkerAssignToTask(aiId, taskId, employees)) return;
      aiIds.push(aiId);
      usedWorkers.push(aiId);
    });
    const normalized = { aiIds: aiIds };
    if (taskId === "development") normalized.mode = entry && entry.mode === "upgrade" ? "upgrade" : "newProduct";
    return normalized;
  }

  function saveGame() {
    try { state.appVersion = APP_VERSION; state.lastSavedAt = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
    catch (error) { console.warn("Save failed.", error); }
  }

  function resetGame() {
    if (!window.confirm("保存データが初期化されます。この操作は元に戻せません。最初からやり直しますか？")) return;
    localStorage.removeItem(SAVE_KEY);
    state = createInitialState();
    penaltyElapsed = 0;
    scheduleNextTick();
    saveGame();
    render();
  }

  function dismissOnboarding() {
    state.onboardingDismissed = true;
    const panel = document.getElementById("onboardingPanel");
    if (panel) {
      panel.hidden = true;
      panel.classList.add("hidden");
    }
    saveGame();
  }

  function calculateOfflineReward() {
    const elapsed = clamp(Date.now() - state.lastSavedAt, 0, MAX_OFFLINE_MS);
    const ticks = Math.floor(elapsed / TICK_MS);
    const reward = getRates().money * ticks;
    if (reward > 0) {
      state.money += reward;
      state.totalMoney += reward;
      addLog("success", "オフライン中にAI社員が自律稼働し、" + formatCurrency(reward) + "を生成しました。", "company");
    }
  }

  function getCompanyLevel(totalMoney) {
    let level = 1;
    LEVEL_THRESHOLDS.forEach(function (threshold, index) { if (totalMoney >= threshold) level = index + 1; });
    return clamp(level, 1, MAX_LEVEL);
  }

  function getEmployeeCost(employeeId) {
    const employee = getEmployee(employeeId);
    const level = state.employees[employeeId] || 0;
    if (!employee) return 0;
    return level <= 0 ? employee.baseCost : Math.ceil(employee.baseCost * Math.max(1, level) * 1.5);
  }

  function canUnlockEmployee(employeeId) {
    const employee = getEmployee(employeeId);
    return Boolean(employee && state.companyLevel >= employee.unlockLevel);
  }

  function isStartupCreditAvailable(employeeId) {
    const employee = getEmployee(employeeId);
    const hiredCount = EMPLOYEES.reduce(function (sum, item) { return sum + (state.employees[item.id] || 0); }, 0);
    return Boolean(employee && employee.unlockLevel === 1 && hiredCount === 0 && (state.employees[employeeId] || 0) === 0);
  }

  function hireOrUpgradeEmployee(employeeId) {
    const employee = getEmployee(employeeId);
    if (!employee || !canUnlockEmployee(employeeId)) return;
    const level = state.employees[employeeId] || 0;
    if (level >= MAX_LEVEL) { addLog("normal", employee.code + "は最大Lvに到達済みです。これ以上の最適化は会議になります。", employeeId); renderLogs(); return; }
    const cost = getEmployeeCost(employeeId);
    const startupCredit = isStartupCreditAvailable(employeeId);
    if (!startupCredit && state.money < cost) { addLog("normal", employee.code + "の予算申請が却下されました。理由: 売上不足。", employeeId); renderLogs(); return; }
    if (!startupCredit) state.money = Math.max(0, state.money - cost);
    state.employees[employeeId] = level + 1;
    if (startupCredit) state.onboardingDismissed = true;
    if (level === 0) {
      addLog("success", employee.code + " / " + employee.nickname + "を雇用しました。" + (startupCredit ? "創業クレジットが適用されました。" : "") + "「" + employee.catchphrase + "」", employeeId);
    } else {
      addUpgradeLog(employee, level + 1);
    }
    if (startupCredit) {
      showFirstHireHelp(employee);
      scheduleNextTick();
    }
    saveGame();
    render();
  }

  function showFirstHireHelp(employee) {
    if (state.firstHireHelpShown) return;
    state.firstHireHelpShown = true;
    window.setTimeout(function () { addLog("normal", employee.code + "が仮想デスクに着席しました。最初の売上計算まであと少しです。", employee.id); renderLatestLog(); renderLogs(); }, 1600);
    window.setTimeout(function () { addLog("success", "創業加速プロトコルを起動しました。会社Lv1の間、売上計算が少し速くなります。", "company"); renderLatestLog(); renderLogs(); }, 5200);
  }

  function tick() {
    const elapsedForPenalty = state.firstFastTickDone ? TICK_MS : FIRST_TICK_MS;
    applyBaseContractWork();
    applyDecisionEventGeneration();
    state.firstFastTickDone = true;
    penaltyElapsed += elapsedForPenalty;
    if (penaltyElapsed >= PENALTY_MS) { penaltyElapsed = 0; applyPenalties(); }
    saveGame();
    render();
    scheduleNextTick();
  }

  function scheduleNextTick() {
    window.clearTimeout(gameTickTimer);
    if (!hasAnyEmployee() && !hasActiveAssignment() && !hasRevenueProduct()) {
      gameTickTimer = null;
      return;
    }
    const delay = state.firstFastTickDone ? TICK_MS : FIRST_TICK_MS;
    gameTickTimer = window.setTimeout(tick, delay);
  }

  function applyBaseContractWork() {
    const currentRates = getRates();
    state.money = Math.max(0, state.money + currentRates.baseMoney);
    state.totalMoney = Math.max(0, state.totalMoney + currentRates.baseMoney);
    applyProductPipeline();
    const productRevenue = applyProductRevenue();
    state.money = Math.max(0, state.money + productRevenue);
    state.totalMoney = Math.max(0, state.totalMoney + productRevenue);
  }

  function applyProductPipeline() {
    PRODUCTS.forEach(function (definition) {
      applySingleProductPipeline(getProduct(definition.id), definition);
    });
  }

  function applySingleProductPipeline(product, definition) {
    applyDevelopmentTask(product, definition);
    applyQaTask(product, definition);
    applySalesTask(product, definition);
    applyMarketingTask(product, definition);
    applySupportOperations(product, definition);
    applyCrisisTask(product, definition);
    recalculateProductMrr(product, definition);
    applyProductMilestones(product, definition);
  }

  function applyDevelopmentTask(product, definition) {
    const flags = getProductFlags(product.id);
    const developmentWorkers = getAssignedWorkersForProduct("development", product.id);
    if (!developmentWorkers.length) return;

    if (definition.type === "subscription" && product.upgradeStatus === "upgrading") {
      developmentWorkers.forEach(function (workerId) { if (product.upgradeStatus === "upgrading") applySubscriptionUpgradeDevelopment(product, definition, workerId); });
      return;
    }

    if (product.status !== "developing") return;
    developmentWorkers.forEach(function (workerId) {
      const development = getDevelopmentEffect(workerId);
      product.progress = clamp(product.progress + development.progress, 0, definition.developmentRequired);
      product.bugs = clamp(product.bugs + development.bugs, 0, 100);
      product.awareness = clamp(product.awareness + 0.04, 0, 100);
    });
    if (product.progress >= definition.developmentRequired && product.status !== "ready") {
      product.status = "ready";
      if (!flags.completedLogged) {
        flags.completedLogged = true;
        addLog("success", getProductLogText(product.id, "completed", definition.name + "が完成しました。"), product.id);
      }
      releaseDevelopmentWorkersAfterCompletion(product.id, definition.name + "が完成しました。{workers}は開発担当から外れました。");
    }
  }

  function applySubscriptionUpgradeDevelopment(product, definition, workerId) {
    const upgrade = getUpgradeDevelopmentEffect(workerId);
    product.upgradeProgress = clamp(product.upgradeProgress + upgrade.progress, 0, 100);
    product.bugs = clamp(product.bugs + upgrade.bugs, 0, 100);
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
    qaWorkers.forEach(function (workerId) {
      const qa = getQaEffect(workerId);
      product.quality = clamp(product.quality + qa.quality, 0, 100);
      product.bugs = clamp(product.bugs + qa.bugs, 0, 100);
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
    marketingWorkers.forEach(function (workerId) {
      const marketing = getMarketingEffect(workerId);
      product.awareness = clamp(product.awareness + marketing.awareness, 0, 100);
      state.fire = clamp(state.fire + marketing.fire, 0, 100);
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
    const firePenalty = state.fire / 160;
    const loadGain = getProductCustomers(product) * 0.002 * (1 + qualityPenalty + bugPenalty + firePenalty);
    product.supportLoad = clamp(product.supportLoad + loadGain, 0, 100);
  }

  function applySupportTask(product, definition) {
    const supportWorkers = getAssignedWorkersForProduct("support", product.id);
    if (!supportWorkers.length || !canApplySupport(product, definition)) return;
    supportWorkers.forEach(function (workerId) {
      const support = getSupportEffect(workerId);
      product.supportLoad = clamp(product.supportLoad + support.supportLoad, 0, 100);
      product.satisfaction = clamp(product.satisfaction + support.satisfaction, 0, 100);
      state.fire = clamp(state.fire + support.fire, 0, 100);
    });
  }

  function applyCrisisTask(product, definition) {
    const crisisWorkers = getAssignedWorkersForProduct("crisis", product.id);
    if (!crisisWorkers.length || !canApplyCrisis(product, definition)) return;
    const previousFire = state.fire;
    crisisWorkers.forEach(function (workerId) {
      const crisis = getCrisisEffect(workerId);
      state.fire = clamp(state.fire + crisis.fire, 0, 100);
      if (crisis.money) state.money = Math.max(0, state.money + crisis.money);
    });
    const flags = getProductFlags(product.id);
    if (crisisWorkers.indexOf("fire05") !== -1 && !flags.crisisStartedLogged) {
      flags.crisisStartedLogged = true;
      addLog("crisis", "Fire-05が炎上対応を開始しました。謝罪文の下書きが自動生成されました。", product.id);
    }
    if (previousFire >= 50 && state.fire <= 20 && !flags.crisisContainedLogged) {
      flags.crisisContainedLogged = true;
      addLog("success", definition.name + "まわりの炎上度が落ち着きました。通知欄が少し静かです。", product.id);
    }
  }

  function canApplyCrisis(product, definition) {
    return product.status === "selling" || (state.fire >= 50 && product.status !== "idea");
  }

  function canApplySupport(product, definition) {
    return definition.type === "subscription" && ["ready", "selling"].indexOf(product.status) !== -1;
  }

  function updateSubscriptionSatisfaction(product, definition) {
    const pressure = product.supportLoad * 0.003 + product.bugs * 0.002 + Math.max(0, 60 - product.quality) * 0.002 + state.fire * 0.0015;
    const recovery = product.quality >= 75 && product.bugs <= 15 ? 0.03 : 0;
    product.satisfaction = clamp(product.satisfaction - pressure + recovery, 0, 100);
  }

  function updateChurnRisk(product, definition) {
    const risk = Math.max(0, 70 - product.satisfaction) * 0.55 + product.supportLoad * 0.28 + product.bugs * 0.22 + state.fire * 0.15;
    product.churnRisk = clamp(risk, 0, 100);
  }

  function applyChurn(product, definition) {
    if (getProductCustomers(product) <= 0 || product.status !== "selling") return;
    const churnChance = clamp(product.churnRisk / 1000, 0, 0.05);
    if (Math.random() >= churnChance) return;
    product.customers = Math.max(0, getProductCustomers(product) - 1);
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
    salesWorkers.forEach(function (workerId) {
      if (definition.type === "oneShot") applyOneShotSalesActivity(product, definition, workerId, flags);
      else applySalesActivity(product, definition, workerId, flags);
    });
  }

  function applySalesActivity(product, definition, workerId, flags) {
    const sales = getSalesEffect(workerId, product, definition);
    product.awareness = clamp(product.awareness + sales.awareness, 0, 100);
    state.fire = clamp(state.fire + sales.fire, 0, 100);
    product.sellingSeconds += 1;
    product.salesPityCounter += 1;

    if (getProductCustomers(product) === 0 && !flags.firstCustomerGranted && product.sellingSeconds >= 3) {
      addProductCustomer(product, definition, flags, true);
      flags.firstCustomerGranted = true;
      product.salesPityCounter = 0;
      return;
    }

    const pityLimit = workerId === "sales02" ? 20 : 30;
    if (Math.random() < sales.customerChance || product.salesPityCounter >= pityLimit) {
      addProductCustomer(product, definition, flags, false);
      product.salesPityCounter = 0;
    }
  }

  function applyOneShotSalesActivity(product, definition, workerId, flags) {
    const sales = getOneShotSalesEffect(workerId, product, definition);
    product.awareness = clamp(product.awareness + sales.awareness, 0, 100);
    state.fire = clamp(state.fire + sales.fire, 0, 100);
    product.sellingSeconds += 1;
    product.oneShotSalesPityCounter += 1;

    const pityLimit = workerId === "sales02" ? 25 : 40;
    if (Math.random() < sales.saleChance || product.oneShotSalesPityCounter >= pityLimit) {
      addOneShotSale(product, definition, flags);
      product.oneShotSalesPityCounter = 0;
    }
  }

  function addOneShotSale(product, definition, flags) {
    const price = safeNumber(definition.price, 0);
    product.unitsSold = getProductUnitsSold(product) + 1;
    product.lifetimeRevenue = Math.max(0, safeNumber(product.lifetimeRevenue, 0) + price);
    state.money = Math.max(0, state.money + price);
    state.totalMoney = Math.max(0, state.totalMoney + price);
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

  function applyPenalties() {
    if (state.bugs >= 50 && Math.random() < 0.3) { state.money = Math.max(0, Math.floor(state.money * 0.95)); addLog("bug", "未分類機能が一斉に自己主張しました。売上の5%が原因調査に変換されました。", "company"); }
    if (state.fire >= 50 && Math.random() < 0.3) { state.money = Math.max(0, Math.floor(state.money * 0.95)); addLog("fire", "外部の熱量が急上昇しました。売上5%が冷却材になりました。", "company"); }
  }

  function canExpandCompany() {
    return state.companyLevel < getCompanyLevel(state.totalMoney) && state.companyLevel < MAX_LEVEL;
  }

  function expandCompanyLevel() {
    if (!canExpandCompany()) return;
    const previousLevel = state.companyLevel;
    const nextLevel = previousLevel + 1;
    state.companyLevel = nextLevel;
    addLog("success", "会社Lvが" + nextLevel + "に上昇しました。" + getLevelUpMessage(nextLevel), "company");
    EMPLOYEES.filter(function (employee) { return employee.unlockLevel === nextLevel; }).forEach(function (employee) {
      addLog("success", employee.code + "が解放されました。" + getUnlockMessage(employee.id), employee.id);
    });
    const unlocked = EMPLOYEES.filter(function (employee) { return employee.unlockLevel === nextLevel; });
    const suffix = unlocked.length ? " / " + unlocked.map(function (employee) { return employee.code + "解放"; }).join("・") : "";
    showLevelToast("会社Lv " + nextLevel + " 到達" + suffix);
    saveGame();
    render();
  }

  function getLevelUpMessage(level) {
    if (level === 2) return "仮想オフィスに新しい区画が生成されました。";
    if (level === 3) return "自動化オフィスが稼働を開始しました。";
    if (level === 4) return "クラウド企業フロアが展開されました。";
    if (level >= 5) return "AI企業タワーが上層へ拡張されました。";
    return "仮想オフィスの処理能力が向上しました。";
  }

  function getUnlockMessage(employeeId) {
    const messages = {
      buzz03: "広報区画が自動生成されました。",
      care04: "サポート窓口が仮想オフィスに接続されました。",
      fire05: "危機管理ルームが静かに起動しました。",
      security06: "品質管理ゲートが仮想オフィスに設置されました。"
    };
    return messages[employeeId] || "新しいAI社員用の席が生成されました。";
  }

  function showLevelToast(text) {
    const toast = document.getElementById("levelToast");
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = text;
    toast.hidden = false;
    toast.classList.add("show");
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("show");
      toast.hidden = true;
    }, 3600);
  }

  function addUpgradeLog(employee, nextLevel) {
    const latest = state.logs[0];
    const now = Date.now();
    if (latest && latest.type === "system" && latest.employeeId === employee.id && latest.upgradeLog && now - latest.createdAt < 12000) {
      latest.upgradeCount = (latest.upgradeCount || 1) + 1;
      latest.createdAt = now;
      latest.text = employee.code + "を" + latest.upgradeCount + "回連続で強化しました。現在Lv" + nextLevel + "です。" + getUpgradeFlavor(employee.id);
      return;
    }
    const log = createLog("system", employee.code + "を強化しました。現在Lv" + nextLevel + "です。" + getUpgradeFlavor(employee.id), employee.id);
    log.upgradeLog = true;
    log.upgradeCount = 1;
    state.logs.unshift(log);
    state.logs = state.logs.slice(0, MAX_LOGS);
  }

  function getUpgradeFlavor(employeeId) {
    const messages = {
      dev01: ["軽微な最適化のはずでした。", "処理速度と未知の挙動が増えました。", "コードが少し自信を持ちました。"],
      sales02: ["約束の処理能力が上がりました。", "できます、の声量が増えました。", "商談資料が少し未来寄りになりました。"],
      buzz03: ["投稿予約が軽快になりました。", "話題化エンジンが明るく回っています。", "高温話題化の予感がします。"],
      care04: ["長文返信の整列速度が上がりました。", "問い合わせ分類が少し静かになりました。", "前提整理プロトコルが強化されました。"],
      fire05: ["謝罪文生成レーンが増設されました。", "信頼回復プロトコルが少し太くなりました。", "余計な一文の検出精度が上がった気がします。"],
      security06: ["検査ゲートが一段厳しくなりました。", "安全確認が高速化しました。", "未分類機能への視線が鋭くなりました。"]
    };
    const list = messages[employeeId] || ["処理能力が上がりました。"];
    return list[Math.floor(Math.random() * list.length)];
  }

  function addLog(type, text, employeeId) {
    state.logs.unshift(createLog(type, text, employeeId || "company"));
    state.logs = state.logs.slice(0, MAX_LOGS);
  }

  function createLog(type, text, employeeId) {
    return { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), type: LOG_LABELS[type] ? type : "normal", text: String(text || ""), employeeId: employeeId || "company", createdAt: Date.now() };
  }

  function addRandomReportLog() {
    const hiredIds = EMPLOYEES.filter(function (employee) { return (state.employees[employee.id] || 0) > 0; }).map(function (employee) { return employee.id; });
    if (hiredIds.length > 0) {
      const candidates = REPORT_LOGS.filter(function (log) { return hiredIds.indexOf(log.employeeId) >= 0; });
      const log = candidates[Math.floor(Math.random() * candidates.length)];
      if (log) { addLog(log.type, log.text, log.employeeId); renderLatestLog(); renderLogs(); }
    }
    scheduleRandomReport();
  }

  function scheduleRandomReport() {
    window.clearTimeout(randomLogTimer);
    randomLogTimer = window.setTimeout(addRandomReportLog, 10000 + Math.floor(Math.random() * 20000));
  }

  function render() {
    sanitizeRuntimeState();
    renderStatus();
    renderOnboarding();
    renderRiskPanel();
    renderNextRecommendationPanel();
    renderDecisionPanel();
    renderCompanyExpansionPanel();
    renderPrimaryProductPanel();
    renderProductPanel();
    renderProductDetailModal();
    renderProductActionMenuModal();
    renderAssignments();
    renderProductObjectives();
    renderMissions();
    renderOffice();
    renderEmployees();
    renderLatestLog();
    renderLogs();
  }

  function renderStatus() {
    setText("companyLevel", state.companyLevel);
    setText("money", formatCurrency(state.money));
    setText("totalMoney", formatCurrency(state.totalMoney));
    setText("users", formatCustomers(getTotalProductCustomers()));
    setText("totalMrrDashboard", formatCurrency(getTotalProductMrr()) + "/月");
    setText("bugs", Math.round(state.bugs) + " / 100");
    setText("fire", Math.round(state.fire) + " / 100");
    setText("nextLevel", state.companyLevel >= MAX_LEVEL ? "最大Lv" : (canExpandCompany() ? "拡張可能" : "あと" + formatCurrency(Math.max(0, LEVEL_THRESHOLDS[state.companyLevel] - state.totalMoney))));
    setText("nextUnlock", getNextUnlockText());
    const rates = getRates();
    setText("incomeRate", formatSignedCurrencyRate(rates.money) + " / 秒");
    setText("baseIncomeRate", formatSignedCurrencyRate(rates.baseMoney) + " / 秒");
    setText("productIncomeRate", formatSignedCurrencyRate(rates.productRevenue) + " / 秒");
    renderActivity();
    setText("startupBoostLabel", getEarlyStageMultiplier() > 1 ? "創業加速" : "稼働状態");
    setText("startupBoost", getEarlyStageMultiplier() > 1 ? "基礎受託 x" + getEarlyStageMultiplier() : "通常稼働");
    const boostCard = document.getElementById("startupBoost") ? document.getElementById("startupBoost").closest(".status-card") : null;
    if (boostCard) boostCard.classList.toggle("active", getEarlyStageMultiplier() > 1);
    const nextCard = document.getElementById("nextLevelCard");
    if (nextCard) nextCard.classList.toggle("has-unlock", Boolean(getNextUnlockText()));
  }

  function renderActivity() {
    const element = document.getElementById("activityText");
    const panel = document.getElementById("activityPanel");
    if (!element) return;
    const rates = getRates();
    if (panel) panel.classList.toggle("danger", state.bugs >= 80 || state.fire >= 80);
    if (!hasAnyEmployee() && !hasActiveAssignment()) {
      element.textContent = "AI社員の起動待ちです。まず無料雇用かAI社長のタスク割り振りを使いましょう。";
      return;
    }
    const parts = [];
    if (state.bugs >= 100) parts.push("バグ100: 事故イベント発生注意 / " + getBugMitigationText());
    else if (state.bugs >= 80) parts.push("バグ高: " + getBugMitigationText());
    if (state.fire >= 100) parts.push("炎上100: 離脱イベント注意");
    else if (state.fire >= 80) parts.push("炎上高: 火消し優先");
    if (rates.money > 0) parts.push("売上 +" + formatCurrency(rates.money) + "/秒");
    if (rates.money < 0) parts.push("売上 -" + formatCurrency(Math.abs(rates.money)) + "/秒");
    if (rates.bugs > 0) parts.push("バグ +" + rates.bugs.toFixed(1) + "/秒");
    if (rates.fire > 0) parts.push("炎上 +" + rates.fire.toFixed(1) + "/秒");
    if (rates.productRevenue > 0) parts.push("MRR継続 +" + formatCurrencyPrecise(rates.productRevenue) + "/秒");
    if (rates.baseMoney !== 0) parts.push("基礎受託 " + formatSignedCurrencyRate(rates.baseMoney) + "/秒");
    const hasActiveSalesWork = PRODUCTS.some(function (definition) { return getProduct(definition.id).status === "selling" && getAssignedWorkersForProduct("sales", definition.id).length; });
    if (hasActiveSalesWork) parts.push("顧客獲得判定中");
    if (rates.bugs < 0) parts.push("バグ " + rates.bugs.toFixed(1) + "/秒");
    if (rates.fire < 0) parts.push("炎上 " + rates.fire.toFixed(1) + "/秒");
    element.textContent = parts.join(" / ") || "AI社員は静かに待機中です。";
  }

  function renderOnboarding() {
    const panel = document.getElementById("onboardingPanel");
    if (!panel) return;
    const shouldHide = state.onboardingDismissed || hasAnyEmployee() || hasActiveAssignment();
    panel.hidden = shouldHide;
    panel.classList.toggle("hidden", shouldHide);
  }

  function renderNextRecommendationPanel() {
    const panel = document.getElementById("nextRecommendationPanel");
    if (!panel) return;
    panel.innerHTML = '<div class="section-heading"><h2>次のおすすめ</h2><span>次の一手</span></div><p class="next-recommendation-text">' + escapeHtml(getNextRecommendationText()) + '</p>';
  }

  function renderDecisionPanel() {
    const panel = document.getElementById("decisionPanel");
    if (!panel) return;
    const event = normalizeDecisionEvent(state.pendingDecisionEvent);
    state.pendingDecisionEvent = event;
    if (!event) {
      panel.hidden = true;
      panel.innerHTML = "";
      return;
    }
    const definition = getDecisionEventDefinition(event.id);
    const productDefinition = getProductDefinition(event.productId);
    panel.hidden = false;
    panel.innerHTML = '<div class="section-heading"><h2>社長判断</h2><span>' + escapeHtml(productDefinition.name) + '</span></div>' +
      '<div class="decision-body"><strong>' + escapeHtml(definition.label) + '</strong><p>' + escapeHtml(definition.message) + '</p>' +
      '<ul class="decision-impact-list"><li>' + escapeHtml(definition.approveImpact) + '</li><li>' + escapeHtml(definition.rejectImpact) + '</li></ul></div>' +
      '<div class="decision-actions"><button type="button" id="approveDecisionButton" class="decision-approve-button">承認する</button><button type="button" id="rejectDecisionButton" class="decision-reject-button">却下する</button></div>';
    const approveButton = document.getElementById("approveDecisionButton");
    const rejectButton = document.getElementById("rejectDecisionButton");
    if (approveButton) approveButton.addEventListener("click", function () { applyDecisionEventChoice("approve"); });
    if (rejectButton) rejectButton.addEventListener("click", function () { applyDecisionEventChoice("reject"); });
  }

  function getDecisionEventDefinition(eventId) {
    return DECISION_EVENTS.find(function (event) { return event.id === eventId; }) || null;
  }

  function normalizeDecisionEvent(event) {
    if (!event || typeof event !== "object") return null;
    const definition = getDecisionEventDefinition(event.id);
    if (!definition) return null;
    const productId = getProductDefinition(event.productId).id;
    return { id: definition.id, productId: productId, createdAt: safeNumber(event.createdAt, Date.now()) };
  }

  function applyDecisionEventGeneration() {
    state.pendingDecisionEvent = normalizeDecisionEvent(state.pendingDecisionEvent);
    if (state.pendingDecisionEvent) return;
    state.decisionEventCooldown = Math.max(0, Math.floor(safeNumber(state.decisionEventCooldown, 0)) - 1);
    if (state.decisionEventCooldown > 0) return;
    const candidates = getDecisionEventCandidates();
    if (!candidates.length) {
      state.decisionEventCooldown = DECISION_EVENT_RETRY_SECONDS;
      return;
    }
    if (Math.random() >= DECISION_EVENT_ROLL_CHANCE) return;
    const candidate = candidates[0];
    state.pendingDecisionEvent = { id: candidate.id, productId: candidate.productId, createdAt: Date.now() };
    state.decisionEventCooldown = DECISION_EVENT_COOLDOWN_SECONDS;
  }

  function getDecisionEventCandidates() {
    const candidates = [];
    if (state.fire >= 50 && isWorkerAvailable("fire05", state.employees)) {
      const productId = getDecisionProductForFire();
      if (productId) candidates.push({ id: "fire05_crisis_statement", productId: productId, priority: 100 });
    }
    PRODUCTS.forEach(function (definition) {
      const product = getProduct(definition.id);
      if (isWorkerAvailable("care04", state.employees) && definition.type === "subscription" && product.status === "selling" && (product.churnRisk >= 35 || product.supportLoad >= 45)) candidates.push({ id: "care_customer_priority", productId: definition.id, priority: 90 });
      if (isWorkerAvailable("security06", state.employees) && product.status !== "idea" && (product.bugs >= 35 || getAssignedWorkersForProduct("qa", definition.id).indexOf("security06") !== -1)) candidates.push({ id: "security_quality_pause", productId: definition.id, priority: 80 });
      if (getAssignedWorkersForProduct("sales", definition.id).indexOf("sales02") !== -1 && ["ready", "selling"].indexOf(product.status) !== -1) candidates.push({ id: "sales_big_contract", productId: definition.id, priority: 70 });
      if (getAssignedWorkersForProduct("marketing", definition.id).indexOf("buzz03") !== -1 && product.status !== "idea") candidates.push({ id: "buzz_bold_ad", productId: definition.id, priority: 60 });
    });
    return candidates.sort(function (a, b) { return b.priority - a.priority; });
  }

  function getDecisionProductForFire() {
    const active = PRODUCTS.find(function (definition) { return getProduct(definition.id).status === "selling"; });
    if (active) return active.id;
    const primary = getPrimaryProductDefinition();
    return primary ? primary.id : PRODUCTS[0].id;
  }

  function applyDecisionEventChoice(choice) {
    const event = normalizeDecisionEvent(state.pendingDecisionEvent);
    if (!event || (choice !== "approve" && choice !== "reject")) return false;
    const definition = getDecisionEventDefinition(event.id);
    const productDefinition = getProductDefinition(event.productId);
    const product = getProduct(productDefinition.id);
    if (choice === "approve") applyDecisionApproval(definition.id, product, productDefinition);
    else applyDecisionRejection(definition.id, product, productDefinition);
    recalculateProductMrr(product, productDefinition);
    applyProductMilestones(product, productDefinition);
    state.pendingDecisionEvent = null;
    state.decisionEventCooldown = DECISION_EVENT_COOLDOWN_SECONDS;
    saveGame();
    render();
    scheduleNextTick();
    return true;
  }

  function applyDecisionApproval(eventId, product, definition) {
    if (eventId === "sales_big_contract") {
      if (definition.type === "oneShot") {
        const units = 3;
        const revenue = safeNumber(definition.price, 0) * units;
        product.status = product.status === "ready" ? "selling" : product.status;
        product.unitsSold = getProductUnitsSold(product) + units;
        product.lifetimeRevenue = Math.max(0, safeNumber(product.lifetimeRevenue, 0) + revenue);
        state.money = Math.max(0, state.money + revenue);
        state.totalMoney = Math.max(0, state.totalMoney + revenue);
        addLog("success", definition.name + "の大型導入が通りました。即時売上 " + formatCurrency(revenue) + " を獲得しました。", "sales02");
      } else {
        product.status = "selling";
        product.customers = getProductCustomers(product) + 2;
        addLog("success", definition.name + "の大型契約を承認しました。顧客が2社増えました。", "sales02");
      }
      product.bugs = clamp(product.bugs + 5, 0, 100);
      state.fire = clamp(state.fire + 5, 0, 100);
      return;
    }
    if (eventId === "buzz_bold_ad") {
      product.awareness = clamp(product.awareness + 20, 0, 100);
      state.fire = clamp(state.fire + 12, 0, 100);
      addLog("fire", definition.name + "の攻めた広告を承認しました。認知度と通知欄が同時に伸びています。", "buzz03");
      return;
    }
    if (eventId === "security_quality_pause") {
      product.bugs = clamp(product.bugs - 20, 0, 100);
      product.quality = clamp(product.quality + 10, 0, 100);
      clearProductAssignmentWithoutRender("sales", definition.id);
      addLog("support", definition.name + "の品質停止提案を承認しました。販売担当を一時解除し、品質を立て直しています。", "security06");
      return;
    }
    if (eventId === "care_customer_priority") {
      product.satisfaction = clamp(product.satisfaction + 15, 0, 100);
      product.supportLoad = clamp(product.supportLoad - 15, 0, 100);
      state.money = Math.max(0, state.money - 500);
      addLog("support", definition.name + "の顧客対応を優先しました。短期費用と引き換えに運用が落ち着きました。", "care04");
      return;
    }
    if (eventId === "fire05_crisis_statement") {
      state.fire = clamp(state.fire - 25, 0, 100);
      state.money = Math.max(0, state.money - 500);
      addLog("crisis", "Fire-05の謝罪文を承認しました。炎上度が大きく下がりました。", "fire05");
    }
  }

  function applyDecisionRejection(eventId, product, definition) {
    if (eventId === "sales_big_contract") {
      state.fire = clamp(state.fire - 1, 0, 100);
      addLog("normal", definition.name + "の無茶な大型契約を見送りました。Sales-02は少しだけ静かです。", "sales02");
      return;
    }
    if (eventId === "buzz_bold_ad") {
      product.awareness = clamp(product.awareness + 3, 0, 100);
      addLog("normal", definition.name + "の攻めた広告案を抑えました。無難な告知で少しだけ認知度が上がりました。", "buzz03");
      return;
    }
    if (eventId === "security_quality_pause") {
      product.bugs = clamp(product.bugs + 5, 0, 100);
      addLog("bug", definition.name + "の品質停止提案を却下しました。未分類機能が少し増えました。", "security06");
      return;
    }
    if (eventId === "care_customer_priority") {
      product.churnRisk = clamp(product.churnRisk + 5, 0, 100);
      addLog("support", definition.name + "の顧客対応優先を見送りました。解約リスクが少し上がりました。", "care04");
      return;
    }
    if (eventId === "fire05_crisis_statement") {
      state.fire = clamp(state.fire + 8, 0, 100);
      addLog("fire", "Fire-05の謝罪文を保留しました。通知欄の熱量が上がっています。", "fire05");
    }
  }

  function clearProductAssignmentWithoutRender(taskId, productId) {
    const assignment = getProductAssignment(taskId, productId);
    setProductAssignmentEntry(taskId, productId, { aiIds: [], mode: assignment.mode });
  }

  function renderCompanyExpansionPanel() {
    const panel = document.getElementById("companyExpansionPanel");
    if (!panel) return;
    if (!canExpandCompany()) {
      panel.hidden = true;
      panel.innerHTML = "";
      return;
    }
    panel.hidden = false;
    const nextLevel = state.companyLevel + 1;
    panel.innerHTML = '<div class="section-heading"><h2>会社Lvアップ可能</h2><span>次: 会社Lv' + nextLevel + '</span></div>' +
      '<p class="dashboard-summary">条件達成: 累計売上 ' + formatCurrency(LEVEL_THRESHOLDS[nextLevel - 1]) + '</p>' +
      '<button type="button" id="expandCompanyButton" class="modal-apply-button">会社を拡張する</button>';
    const button = document.getElementById("expandCompanyButton");
    if (button) button.addEventListener("click", expandCompanyLevel);
  }

  function getNextRecommendationText() {
    const churnHeavy = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return definition.type === "subscription" && product.churnRisk >= 45; });
    const supportHeavy = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return definition.type === "subscription" && product.supportLoad >= 50; });
    if (churnHeavy) return "解約リスクが高い" + churnHeavy.name + "をサポートしましょう。";
    if (supportHeavy) return "Care-04を" + supportHeavy.name + "のサポートに割り振りましょう。";
    if (getClaimableMissions().length > 0) return "達成済みミッションの報酬を受け取りましょう。";
    if (canExpandCompany()) return "会社を拡張してLvを上げましょう。";
    if (state.fire >= 70) {
      if (state.companyLevel >= 4 && (state.employees.fire05 || 0) <= 0) return "炎上が高いのでFire-05を雇用しましょう。";
      return "Fire-05を炎上対応へ割り振りましょう。Care-04はサポート面から火消しを補助できます。";
    }
    if (state.bugs >= 70) {
      if (state.companyLevel >= 5 && (state.employees.security06 || 0) <= 0) return "バグが高いのでSecurity-06を雇用しましょう。";
      return "バグが高いのでSecurity-06を品質管理へ割り振りましょう。";
    }
    const idleWorkerRecommendation = getIdleWorkerRecommendationText();
    if (idleWorkerRecommendation) return idleWorkerRecommendation;
    const developing = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return product.status === "developing" && !getAssignedWorkersForProduct("development", definition.id).length; });
    if (developing) return developing.name + "を開発対象にして、AI社長かDev-01を割り振りましょう。";
    const ready = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return ["ready", "selling"].indexOf(product.status) !== -1 && !getAssignedWorkersForProduct("sales", definition.id).length; });
    if (ready) return ready.name + "に販売担当を割り振りましょう。";
    const lowAwareness = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return product.status !== "idea" && product.awareness < 50 && !getAssignedWorkersForProduct("marketing", definition.id).length; });
    if (lowAwareness) return lowAwareness.name + "を広報して認知度を上げましょう。";
    const upgrade = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return definition.type === "subscription" && (product.status === "ready" || product.status === "selling") && product.upgradeStatus === "idle"; });
    if (upgrade) return upgrade.name + "のバージョンアップを検討しましょう。";
    const lowQuality = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return product.status !== "idea" && (product.quality < 70 || product.bugs >= 30); });
    if (lowQuality) return lowQuality.name + "を品質管理してバグを下げましょう。";
    const nextIdea = PRODUCTS.find(function (definition) { return getProduct(definition.id).status === "idea"; });
    if (nextIdea) return nextIdea.name + "の開発を始めましょう。";
    return "製品目標を確認し、主力製品の販売・広報・品質管理を回しましょう。";
  }

  function getIdleWorkerRecommendationText() {
    if (isWorkerIdle("dev01")) {
      const target = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return (product.status === "idea" || product.status === "developing" || product.upgradeStatus === "upgrading") && !getAssignedWorkersForProduct("development", definition.id).length; });
      if (target) {
        const product = getProduct(target.id);
        if (product.upgradeStatus === "upgrading") return "Dev-01が空いています。" + target.name + "のv" + (getProductVersion(product) + 1) + "開発に割り振りましょう。";
        return "Dev-01が空いています。" + target.name + "の開発に割り振りましょう。";
      }
    }
    if (isWorkerIdle("sales02")) {
      const target = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return ["ready", "selling"].indexOf(product.status) !== -1 && !getAssignedWorkersForProduct("sales", definition.id).length; });
      if (target) return "Sales-02が空いています。" + target.name + "の販売に割り振りましょう。";
    }
    if (isWorkerIdle("buzz03")) {
      const target = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return product.status !== "idea" && product.awareness < 55 && !getAssignedWorkersForProduct("marketing", definition.id).length; });
      if (target) return "Buzz-03が空いています。" + target.name + "を広報して認知度を上げましょう。";
    }
    if (isWorkerIdle("care04")) {
      const target = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return definition.type === "subscription" && product.status === "selling" && (product.supportLoad >= 25 || product.churnRisk >= 25) && !getAssignedWorkersForProduct("support", definition.id).length; });
      if (target) return "Care-04が空いています。" + target.name + "をサポートして解約リスクを抑えましょう。";
    }
    if (isWorkerIdle("security06")) {
      const target = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return product.status !== "idea" && (product.bugs >= 20 || product.quality < 75) && !getAssignedWorkersForProduct("qa", definition.id).length; });
      if (target) return "Security-06が空いています。" + target.name + "を品質管理してバグを下げましょう。";
    }
    if (isWorkerIdle("fire05") && state.fire >= 40) return "Fire-05が空いています。炎上度が高い時は炎上対応に回しましょう。";
    if (isWorkerIdle("boss")) {
      const assistTarget = PRODUCTS.find(function (definition) { const product = getProduct(definition.id); return product.status !== "idea" && (getAssignedWorkersForProduct("sales", definition.id).length || getAssignedWorkersForProduct("marketing", definition.id).length || getAssignedWorkersForProduct("support", definition.id).length) && getProductAssignment("sales", definition.id).aiIds.indexOf("boss") === -1 && getProductAssignment("marketing", definition.id).aiIds.indexOf("boss") === -1 && getProductAssignment("support", definition.id).aiIds.indexOf("boss") === -1; });
      if (assistTarget) return "AI社長が空いています。" + assistTarget.name + "の販売・広報・サポートを補助できます。";
      return "AI社長が空いています。販売・広報・サポートの補助に回せます。";
    }
    return "";
  }

  function isWorkerIdle(workerId) {
    if (!isWorkerAvailable(workerId, state.employees)) return false;
    return TASKS.every(function (task) {
      return PRODUCTS.every(function (definition) {
        return getProductAssignment(task.id, definition.id).aiIds.indexOf(workerId) === -1;
      });
    });
  }

  function getPrimaryProductRecommendation(product, definition) {
    if (product.status === "idea") return "開発する";
    if (product.status === "developing" || product.upgradeStatus === "upgrading") return getAssignedWorkersForProduct("development", definition.id).length ? "開発を継続" : "開発担当を割り振る";
    if ((product.status === "ready" || product.status === "selling") && !getAssignedWorkersForProduct("sales", definition.id).length) return "販売担当を割り振る";
    if (product.awareness < 50) return "広報で認知度を上げる";
    if (product.bugs >= 25 || product.quality < 70) return "品質管理でバグを下げる";
    if (definition.type === "subscription" && product.upgradeStatus === "idle") return "バージョンアップを検討";
    return "販売と広報を継続";
  }

  function renderPrimaryProductPanel() {
    const panel = document.getElementById("primaryProductPanel");
    if (!panel) return;
    const definition = getPrimaryProductDefinition();
    const product = getProduct(definition.id);
    panel.innerHTML = '<div class="section-heading"><h2>現在の主力製品</h2><span>' + escapeHtml(getPrimaryProductValueText(product, definition)) + '</span></div>' +
      '<article class="primary-product-card"><div><strong>' + escapeHtml(getPrimaryProductTitle(product, definition)) + '</strong><span>' + escapeHtml(getPrimaryProductSummary(product, definition)) + '</span><em>おすすめ: ' + escapeHtml(getPrimaryProductRecommendation(product, definition)) + '</em></div><div class="assignment-badge-list">' + getProductAssignmentBadges(definition.id) + '</div></article>';
  }

  function renderProductPanel() {
    const panel = document.getElementById("productPanel");
    if (!panel) return;
    const body = dashboardUi.productsExpanded ? '<div class="portfolio-products">' + PRODUCTS.map(function (definition) { return getProductCardHtml(definition); }).join('') + '</div>' : '';
    panel.innerHTML = '<div class="section-heading"><h2>製品ポートフォリオ</h2><button type="button" id="toggleProductsButton" class="change-assignment-button">' + (dashboardUi.productsExpanded ? '製品一覧を閉じる' : '製品一覧を開く') + '</button></div>' +
      '<p class="dashboard-summary">3製品運用 / 総MRR ' + formatCurrency(getTotalProductMrr()) + '/月 / 売り切り累計 ' + formatCurrency(getTotalOneShotRevenue()) + '</p>' + body;
    const toggle = document.getElementById("toggleProductsButton");
    if (toggle) toggle.addEventListener("click", function () { toggleDashboardPanel("productsExpanded"); });
    panel.querySelectorAll("button[data-product-detail]").forEach(function (button) {
      button.addEventListener("click", function () { openProductDetailModal(button.getAttribute("data-product-detail")); });
    });
    panel.querySelectorAll("button[data-product-menu]").forEach(function (button) {
      button.addEventListener("click", function () { openProductActionMenu(button.getAttribute("data-product-menu")); });
    });
  }

  function getProductCardHtml(definition) {
    const product = getProduct(definition.id);
    const progressPercent = product.upgradeStatus === "upgrading" ? clamp(product.upgradeProgress, 0, 100) : getProductProgressPercent(product, definition);
    const shouldShowProgress = product.status === "developing" || product.upgradeStatus === "upgrading";
    return '<article class="product-card product-' + product.status + '">' +
      '<div class="product-top"><div><strong>' + escapeHtml(getProductDisplayName(product, definition)) + '</strong><span>' + escapeHtml(getProductTypeLine(definition, product)) + '</span></div><div class="level-badge">' + getProductStatusLabel(product.status) + '</div></div>' +
      (shouldShowProgress ? '<div class="product-progress"><span style="width:' + progressPercent + '%"></span></div>' : '') +
      '<div class="product-metrics product-summary-metrics">' + getProductSummaryMetrics(product, definition, progressPercent) + '</div>' +
      getProductActionHint(product, definition) +
      getProductActionButtons(product, definition) +
      '</article>';
  }


  function toggleDashboardPanel(key) {
    dashboardUi[key] = !dashboardUi[key];
    render();
  }

  function getPrimaryProductTitle(product, definition) {
    if (definition.type === "subscription") return definition.name + " v" + getProductVersion(product);
    return definition.name;
  }

  function getPrimaryProductSummary(product, definition) {
    if (definition.type === "oneShot") return getProductUnitsSold(product) + "本販売 / 累計売上 " + formatCurrency(product.lifetimeRevenue);
    return formatCustomers(getProductCustomers(product)) + " / MRR " + formatCurrency(getProductMrr(product, definition)) + "/月";
  }

  function getPrimaryProductValueText(product, definition) {
    if (definition.type === "oneShot") return "累計 " + formatCurrency(product.lifetimeRevenue);
    return "MRR " + formatCurrency(getProductMrr(product, definition)) + "/月";
  }

  function getTotalProductCustomers() {
    return PRODUCTS.reduce(function (sum, definition) { return definition.type === "subscription" ? sum + getProductCustomers(getProduct(definition.id)) : sum; }, 0);
  }

  function getTotalOneShotRevenue() {
    return PRODUCTS.reduce(function (sum, definition) { return definition.type === "oneShot" ? sum + safeNumber(getProduct(definition.id).lifetimeRevenue, 0) : sum; }, 0);
  }

  function getHiredEmployeeSummary() {
    const roles = { dev01: "開発", sales02: "販売", buzz03: "広報", care04: "サポート", fire05: "炎上対応", security06: "品質管理" };
    const hired = EMPLOYEES.filter(function (employee) { return (state.employees[employee.id] || 0) > 0; }).map(function (employee) { return employee.code + " Lv" + (state.employees[employee.id] || 0) + " " + (roles[employee.id] || employee.role); });
    return hired.length ? hired.join(" / ") : "未雇用";
  }

  function renderAssignments() {
    const panel = document.getElementById("assignmentPanel");
    if (!panel) return;
    panel.innerHTML = '<div class="section-heading"><h2>現在の担当</h2><button type="button" id="openAssignmentModal" class="change-assignment-button">担当を変更</button></div>' +
      '<p class="assignment-rule">AIたちが担当中の製品です。</p>' +
      '<div class="assignment-summary-list">' + TASKS.map(function (task) { return getAssignmentSummaryHtml(task.id); }).join('') + '</div>';
    const openButton = document.getElementById("openAssignmentModal");
    if (openButton) openButton.addEventListener("click", openAssignmentModal);
    renderAssignmentModal();
  }

  function renderAssignmentModal() {
    const modal = document.getElementById("assignmentModal");
    if (!modal) return;
    modal.hidden = !assignmentModalOpen;
    modal.classList.toggle("open", assignmentModalOpen);
    if (!assignmentModalOpen) { modal.innerHTML = ""; return; }
    const selectedTask = TASKS.find(function (task) { return task.id === assignmentDraft.taskId; }) || TASKS[0];
    const simpleMode = assignmentModalMode === "product";
    const employeeMode = assignmentModalMode === "employee";
    const upgradeMode = assignmentDraft.mode === "upgrade";
    const productAssignable = isAssignmentDraftProductAvailable();
    assignmentDraft.aiIds = normalizeAssignmentDraftAiIds(selectedTask.id, assignmentDraft.aiIds || []);
    const selectedAssignment = getProductAssignment(selectedTask.id, assignmentDraft.productId);
    const currentAiIds = selectedAssignment.aiIds;
    const selectedAiIds = assignmentDraft.aiIds;
    const selectionValid = selectedAiIds.length <= 2 && selectedAiIds.every(function (workerId) { return canWorkerAssignToTask(workerId, selectedTask.id, state.employees); });
    const assignable = Boolean(assignmentDraft.taskId && assignmentDraft.productId) && productAssignable && selectionValid;
    const taskOptions = employeeMode ? getAssignableTasksForWorker(assignmentDraft.aiId) : TASKS;
    const productButtons = PRODUCTS.map(function (definition) {
      const enabled = !employeeMode || isWorkerProductTaskAvailable(assignmentDraft.aiId, assignmentDraft.taskId, definition.id);
      const reason = enabled ? "" : getWorkerProductTaskDisabledReason(assignmentDraft.aiId, assignmentDraft.taskId, definition.id);
      return '<button type="button" class="modal-option' + (assignmentDraft.productId === definition.id ? ' active' : '') + '" data-modal-product="' + definition.id + '"' + (enabled ? '' : ' disabled') + '>' + escapeHtml(definition.name) + (reason ? '<span>' + escapeHtml(reason) + '</span>' : '') + '</button>';
    }).join('');
    const workerButtons = getAllWorkerIds().map(function (workerId) {
      const selected = selectedAiIds.indexOf(workerId) !== -1;
      const taskCompatible = selectedTask.workers.indexOf(workerId) !== -1;
      const available = isWorkerAvailable(workerId, state.employees);
      const canAssign = taskCompatible && available;
      const maxReached = selectedAiIds.length >= 2 && !selected;
      const enabled = selected || (productAssignable && canAssign && !maxReached);
      let detail = getWorkerTaskDescription(workerId, selectedTask.id);
      if (!taskCompatible) detail = "対応不可";
      else if (!available) detail = workerId === "boss" ? "利用可能" : "未雇用";
      else if (selected) detail += " / 選択済み";
      else if (maxReached) detail += " / この仕事は満員です（最大2体まで）";
      return '<button type="button" class="modal-option worker-option' + (selected ? ' active' : '') + '" data-modal-ai="' + workerId + '"' + (enabled ? '' : ' disabled') + '><strong>' + escapeHtml(getWorkerLabel(workerId)) + (selected ? ' 選択中' : '') + '</strong><span>' + escapeHtml(detail) + '</span></button>';
    }).join('');
    const currentWorkersHtml = '<div class="modal-current">現在担当: ' + escapeHtml(getWorkerGroupLabel(currentAiIds) || 'なし') + '</div>' +
      '<div class="modal-current selected-workers">選択中: ' + escapeHtml(getWorkerGroupLabel(selectedAiIds) || 'なし') + '（' + selectedAiIds.length + '/2）</div>';
    const workerSelector = currentWorkersHtml + '<div class="modal-group"><span>担当AIを選択 最大2体</span><div class="modal-option-grid worker-grid">' + workerButtons + '</div></div>';
    const noTaskMessage = employeeMode && taskOptions.length === 0 ? '<p class="modal-warning">このAIに割り振れるタスクは現在ありません。</p>' : '';
    const warningText = !productAssignable ? 'この製品では選択中のタスクを使えません。' : (!selectionValid ? '選択中AIに担当できないAIが含まれています。' : '');
    modal.innerHTML = '<div class="assignment-modal-backdrop" data-modal-close="1"></div><div class="assignment-dialog" role="dialog" aria-modal="true" aria-labelledby="assignmentDialogTitle">' +
      '<div class="assignment-dialog-head"><strong id="assignmentDialogTitle">' + escapeHtml(getAssignmentModalTitle()) + '</strong><button type="button" class="modal-close-button" data-modal-close="1">閉じる</button></div>' +
      '<p class="modal-description">' + escapeHtml(getAssignmentModalDescription(upgradeMode, simpleMode, employeeMode)) + '</p>' +
      noTaskMessage +
      (simpleMode ? '' : '<div class="modal-group"><span>タスク選択</span><div class="modal-option-grid">' + taskOptions.map(function (task) { return '<button type="button" class="modal-option' + (assignmentDraft.taskId === task.id ? ' active' : '') + '" data-modal-task="' + task.id + '">' + escapeHtml(task.label) + '</button>'; }).join('') + '</div></div>') +
      (simpleMode ? '' : '<div class="modal-group"><span>対象製品選択</span><div class="modal-option-grid">' + productButtons + '</div></div>') +
      workerSelector +
      '<div class="modal-current">対象: ' + escapeHtml(selectedTask.label) + ' / ' + escapeHtml(getProductDefinition(assignmentDraft.productId).name) + '</div>' +
      '<p class="modal-help">この仕事には最大2体までAIを割り振れます。2体選択中は他のAIを選べません。同じAIは別の仕事から外れます。</p>' +
      (warningText ? '<p class="modal-warning">' + escapeHtml(warningText) + '</p>' : '') +
      '<div class="modal-actions"><button type="button" id="applyAssignmentButton" class="modal-apply-button"' + (assignable ? '' : ' disabled') + '>この担当にする</button><button type="button" id="clearAssignmentButton" class="modal-subtle-button modal-clear-button">担当を解除</button><button type="button" class="modal-subtle-button" data-modal-close="1">閉じる</button></div>' +
      '</div>';
    modal.querySelectorAll("[data-modal-close]").forEach(function (button) { button.addEventListener("click", closeAssignmentModal); });
    modal.querySelectorAll("button[data-modal-task]").forEach(function (button) { button.addEventListener("click", function () { selectAssignmentTask(button.getAttribute("data-modal-task")); }); });
    modal.querySelectorAll("button[data-modal-product]").forEach(function (button) { button.addEventListener("click", function () { assignmentDraft.productId = button.getAttribute("data-modal-product"); updateAssignmentDraftMode(); refreshAssignmentDraftAiIds(); renderAssignmentModal(); }); });
    modal.querySelectorAll("button[data-modal-ai]").forEach(function (button) { button.addEventListener("click", function () { toggleAssignmentDraftAi(button.getAttribute("data-modal-ai")); }); });
    const applyButton = document.getElementById("applyAssignmentButton");
    if (applyButton) applyButton.addEventListener("click", function () { setTaskAis(assignmentDraft.taskId, assignmentDraft.productId, assignmentDraft.aiIds || [], assignmentDraft.mode); closeAssignmentModal(); });
    const clearButton = document.getElementById("clearAssignmentButton");
    if (clearButton) clearButton.addEventListener("click", function () { clearProductAssignment(assignmentDraft.taskId, assignmentDraft.productId); closeAssignmentModal(); });
  }

  function getAllWorkerIds() {
    return ["boss"].concat(EMPLOYEES.map(function (employee) { return employee.id; }));
  }

  function normalizeAssignmentDraftAiIds(taskId, aiIds) {
    const normalized = [];
    (aiIds || []).forEach(function (workerId) {
      if (!workerId || normalized.indexOf(workerId) !== -1 || normalized.length >= 2) return;
      if (!canWorkerAssignToTask(workerId, taskId, state.employees)) return;
      normalized.push(workerId);
    });
    return normalized;
  }

  function getInitialAssignmentAiIds(taskId, productId, preferredWorkerId) {
    const assignment = getProductAssignment(taskId, productId);
    const aiIds = normalizeAssignmentDraftAiIds(taskId, assignment.aiIds);
    if (preferredWorkerId && canWorkerAssignToTask(preferredWorkerId, taskId, state.employees) && aiIds.indexOf(preferredWorkerId) === -1 && aiIds.length < 2) aiIds.push(preferredWorkerId);
    return aiIds;
  }

  function refreshAssignmentDraftAiIds() {
    const preferredWorkerId = assignmentModalMode === "employee" ? assignmentDraft.aiId : null;
    assignmentDraft.aiIds = getInitialAssignmentAiIds(assignmentDraft.taskId, assignmentDraft.productId, preferredWorkerId);
  }

  function toggleAssignmentDraftAi(workerId) {
    const selectedAiIds = normalizeAssignmentDraftAiIds(assignmentDraft.taskId, assignmentDraft.aiIds || []);
    const index = selectedAiIds.indexOf(workerId);
    if (index !== -1) {
      selectedAiIds.splice(index, 1);
      assignmentDraft.aiIds = selectedAiIds;
      renderAssignmentModal();
      return;
    }
    if (!canWorkerAssignToTask(workerId, assignmentDraft.taskId, state.employees) || selectedAiIds.length >= 2) return;
    selectedAiIds.push(workerId);
    assignmentDraft.aiIds = selectedAiIds;
    renderAssignmentModal();
  }

  function getAssignmentModalDescription(upgradeMode, simpleMode, employeeMode) {
    if (upgradeMode) {
      const definition = getProductDefinition(assignmentDraft.productId);
      const product = getProduct(definition.id);
      if (product.upgradeStatus === "upgrading") return "担当AIを選ぶとvNext開発が進みます。この仕事には最大2体までAIを割り振れます。";
      return "担当AIを選んでください。この仕事には最大2体までAIを割り振れます。効果: 月額価格+20%、品質+8、認知+5。副作用: 製品バグ+5。";
    }
    if (employeeMode) return "このAIに任せるタスクと対象製品を選びます。最大2体まで同時に選択できます。";
    if (simpleMode) return "担当AIを選んでください。専門AIにAI社長を加えることもできます。最大2体まで選択できます。";
    return "タスク・対象製品・担当AIを選んで割り振ります。最大2体まで選択できます。販売担当を外しても、既存顧客のMRRは継続します。";
  }

  function isAssignmentDraftProductAvailable() {
    if (assignmentModalMode !== "employee") return true;
    return isWorkerProductTaskAvailable(assignmentDraft.aiId, assignmentDraft.taskId, assignmentDraft.productId);
  }


  function renderProductDetailModal() {
    const modal = document.getElementById("productDetailModal");
    if (!modal) return;
    modal.hidden = !productDetailModalOpen;
    modal.classList.toggle("open", productDetailModalOpen);
    if (!productDetailModalOpen) { modal.innerHTML = ""; return; }
    const definition = getProductDefinition(productDetailProductId);
    const product = getProduct(definition.id);
    const progressPercent = getProductProgressPercent(product, definition);
    modal.innerHTML = '<div class="assignment-modal-backdrop product-detail-backdrop" data-product-detail-close="1"></div><div class="product-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="productDetailTitle">' +
      '<div class="assignment-dialog-head"><strong id="productDetailTitle">' + escapeHtml(definition.name) + 'の詳細</strong><button type="button" class="modal-close-button" data-product-detail-close="1">閉じる</button></div>' +
      '<div class="product-detail-status"><span>' + escapeHtml(getProductTypeLine(definition, product)) + '</span><strong>' + escapeHtml(getProductStatusLabel(product.status)) + '</strong></div>' +
      '<div class="product-detail-grid">' +
      getProductSpecificDetailHtml(product, definition) +
      '<span class="product-detail-heading">品質</span>' +
      '<span class="product-detail-item">進捗 <strong>' + Math.floor(progressPercent) + '%</strong></span>' +
      '<span class="product-detail-item">品質 <strong>' + Math.round(product.quality) + '</strong></span>' +
      '<span class="product-detail-item">製品バグ <strong>' + product.bugs.toFixed(1) + '</strong></span>' +
      '<span class="product-detail-item">認知度 <strong>' + Math.round(product.awareness) + '</strong></span>' +
      '<span class="product-detail-heading">担当</span>' +
      '<span class="product-detail-item wide">担当中タスク <strong class="assignment-badge-list">' + getProductAssignmentBadges(definition.id) + '</strong></span>' +
      '<span class="product-detail-item wide">最新状態 <strong>' + escapeHtml(getProductLatestStateText(product, definition)) + '</strong></span>' +
      '</div>' +
      '<div class="product-detail-actions"><button type="button" class="product-action-button" data-product-menu="' + definition.id + '">操作</button><button type="button" class="modal-subtle-button" data-product-detail-close="1">閉じる</button></div>' +
      '</div>';
    modal.querySelectorAll("[data-product-detail-close]").forEach(function (button) { button.addEventListener("click", closeProductDetailModal); });
    modal.querySelectorAll("button[data-product-menu]").forEach(function (button) {
      button.addEventListener("click", function () {
        closeProductDetailModal();
        openProductActionMenu(button.getAttribute("data-product-menu"));
      });
    });
  }

  function openProductDetailModal(productId) {
    productDetailProductId = getProductDefinition(productId).id;
    productDetailModalOpen = true;
    renderProductDetailModal();
  }

  function closeProductDetailModal() {
    productDetailModalOpen = false;
    renderProductDetailModal();
  }

  function getProductSpecificDetailHtml(product, definition) {
    if (definition.type === "oneShot") {
      return '<span class="product-detail-heading">収益</span>' +
        '<span class="product-detail-item">価格 <strong>' + formatCurrency(definition.price) + '</strong></span>' +
        '<span class="product-detail-item">販売数 <strong>' + getProductUnitsSold(product) + '本</strong></span>' +
        '<span class="product-detail-item">累計売上 <strong>' + formatCurrency(product.lifetimeRevenue) + '</strong></span>' +
        '<span class="product-detail-item">MRR <strong>なし</strong></span>' +
        '<span class="product-detail-heading">運用</span>' +
        '<span class="product-detail-item wide">売り切り収益 <strong>販売成功時に即時売上が入ります</strong></span>';
    }
    return '<span class="product-detail-heading">収益</span>' +
      '<span class="product-detail-item">現在version <strong>v' + getProductVersion(product) + '</strong></span>' +
      '<span class="product-detail-item">次version開発 <strong>' + escapeHtml(product.upgradeStatus === "upgrading" ? 'v' + (getProductVersion(product) + 1) + ' ' + Math.floor(product.upgradeProgress) + '%' : '待機中') + '</strong></span>' +
      '<span class="product-detail-item">月額価格 <strong>' + formatCurrency(getCurrentMonthlyPrice(product, definition)) + '</strong></span>' +
      '<span class="product-detail-item">顧客数 <strong>' + formatCustomers(getProductCustomers(product)) + '</strong></span>' +
      '<span class="product-detail-item">MRR <strong>' + formatCurrency(getProductMrr(product, definition)) + '/月</strong></span>' +
      '<span class="product-detail-item">製品売上/秒 <strong>' + formatCurrencyPrecise(getProductRevenuePerSecond(product, definition)) + '/秒</strong></span>' +
      '<span class="product-detail-heading">運用</span>' +
      '<span class="product-detail-item">満足度 <strong>' + Math.round(product.satisfaction) + '</strong></span>' +
      '<span class="product-detail-item">サポート負荷 <strong>' + Math.round(product.supportLoad) + '</strong></span>' +
      '<span class="product-detail-item">解約リスク <strong>' + Math.round(product.churnRisk) + '</strong></span>' +
      '<span class="product-detail-item wide">バージョンアップ効果 <strong>月額価格+20%、品質+8、認知+5。副作用: 製品バグ+5</strong></span>';
  }

  function getProductLatestStateText(product, definition) {
    if (definition.type === "oneShot") {
      if (product.status === "selling" && getAssignedWorkersForProduct("sales", definition.id).length) return "販売判定中";
      return getProductUnitsSold(product) > 0 ? "販売実績あり" : "販売担当待ち";
    }
    if (product.upgradeStatus === "upgrading") return "v" + (getProductVersion(product) + 1) + "を開発中です。";
    if (product.status === "selling" && getAssignedWorkersForProduct("sales", definition.id).length) return "顧客獲得判定中";
    if (getProductCustomers(product) > 0) return "既存顧客は継続課金中";
    return "販売担当待ち";
  }


  function renderProductActionMenuModal() {
    const modal = document.getElementById("productActionMenuModal");
    if (!modal) return;
    modal.hidden = !productActionMenuOpen;
    modal.classList.toggle("open", productActionMenuOpen);
    if (!productActionMenuOpen) { modal.innerHTML = ""; return; }
    const definition = getProductDefinition(productActionMenuProductId);
    const product = getProduct(definition.id);
    const actions = getProductAvailableActions(product, definition);
    modal.innerHTML = '<div class="assignment-modal-backdrop product-action-menu-backdrop" data-product-menu-close="1"></div><div class="product-action-menu-dialog" role="dialog" aria-modal="true" aria-labelledby="productActionMenuTitle">' +
      '<div class="assignment-dialog-head"><strong id="productActionMenuTitle">' + escapeHtml(definition.name) + 'の操作</strong><button type="button" class="modal-close-button" data-product-menu-close="1">閉じる</button></div>' +
      '<p class="modal-description">操作を選ぶと、担当AI選択へ進みます。</p>' +
      '<div class="product-action-menu-list">' + actions.map(function (action) { return '<button type="button" class="product-action-menu-button' + (action.enabled ? '' : ' disabled-action') + '" data-product-action="' + action.taskId + '" data-product-action-id="' + action.id + '" data-product-id="' + definition.id + '" data-product-mode="' + action.mode + '"' + (action.enabled ? '' : ' disabled') + '><strong>' + escapeHtml(action.label) + '</strong><span>' + escapeHtml(action.enabled ? action.description : action.disabledReason) + '</span></button>'; }).join('') + '</div>' +
      '<div class="product-detail-actions"><button type="button" class="modal-subtle-button" data-product-detail="' + definition.id + '">詳細を見る</button><button type="button" class="modal-subtle-button" data-product-menu-close="1">閉じる</button></div>' +
      '</div>';
    modal.querySelectorAll("[data-product-menu-close]").forEach(function (button) { button.addEventListener("click", closeProductActionMenu); });
    modal.querySelectorAll("button[data-product-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        closeProductActionMenu();
        openProductAssignmentModal(button.getAttribute("data-product-action"), button.getAttribute("data-product-id"), button.getAttribute("data-product-mode") || "normal");
      });
    });
    modal.querySelectorAll("button[data-product-detail]").forEach(function (button) {
      button.addEventListener("click", function () {
        closeProductActionMenu();
        openProductDetailModal(button.getAttribute("data-product-detail"));
      });
    });
  }

  function openProductActionMenu(productId) {
    productActionMenuProductId = getProductDefinition(productId).id;
    productActionMenuOpen = true;
    renderProductActionMenuModal();
  }

  function closeProductActionMenu() {
    productActionMenuOpen = false;
    renderProductActionMenuModal();
  }


  function renderProductObjectives() {
    const panel = document.getElementById("productObjectivePanel");
    if (!panel) return;
    const pending = PRODUCT_OBJECTIVES.filter(function (objective) { return !objective.done(); });
    const visible = dashboardUi.objectivesExpanded ? PRODUCT_OBJECTIVES : pending.slice(0, 2);
    panel.innerHTML = '<div class="mission-head"><strong>製品目標</strong><button type="button" id="toggleObjectivesButton" class="change-assignment-button">' + (dashboardUi.objectivesExpanded ? '目標を閉じる' : 'すべての目標を見る') + '</button></div>' +
      '<div class="mission-list" id="productObjectiveList">' + visible.map(function (objective) {
        const done = Boolean(objective.done());
        return '<div class="mission-item' + (done ? ' done' : '') + '"><span class="mission-check">' + (done ? '✓' : '') + '</span><span class="mission-text">' + escapeHtml(objective.text) + '</span></div>';
      }).join("") + '</div>';
    const toggle = document.getElementById("toggleObjectivesButton");
    if (toggle) toggle.addEventListener("click", function () { toggleDashboardPanel("objectivesExpanded"); });
  }

  function renderMissions() {
    const list = document.getElementById("missionList");
    const label = document.getElementById("missionStage");
    if (!list || !label) return;
    const stage = getCurrentMissionStage();
    label.textContent = dashboardUi.missionsExpanded ? stage.label : "次のおすすめに集約";
    const missionItems = stage.missions.map(function (mission) {
      const done = Boolean(mission.done());
      const claimed = isMissionClaimed(mission.id);
      const pending = done && !claimed;
      const stateHtml = claimed || pending ? '<span class="mission-state">' + (claimed ? '受け取り済み' : '達成済み・未受け取り') + '</span>' : '';
      const rewardHtml = pending ? '<div class="mission-claim-block"><span class="mission-reward-row">報酬: +' + formatCurrency(mission.reward) + '</span><button type="button" class="mission-claim-button" data-claim-mission="' + mission.id + '">報酬を受け取る</button></div>' : (claimed ? '' : '<span class="mission-reward-row">報酬: +' + formatCurrency(mission.reward) + '</span>');
      return '<div class="mission-item' + (done ? ' done' : '') + (claimed ? ' claimed' : '') + (pending ? ' claimable' : '') + '"><span class="mission-check">' + (done ? '✓' : '○') + '</span><span class="mission-text">' + escapeHtml(mission.text) + '</span>' + stateHtml + rewardHtml + '</div>';
    }).join("");
    const claimable = getClaimableMissions()[0];
    const collapsedClaim = claimable ? '<div class="mission-item done claimable"><span class="mission-check">✓</span><span class="mission-text">' + escapeHtml(claimable.text) + '</span><span class="mission-state">達成済み・未受け取り</span><div class="mission-claim-block"><span class="mission-reward-row">報酬: +' + formatCurrency(claimable.reward) + '</span><button type="button" class="mission-claim-button" data-claim-mission="' + claimable.id + '">報酬を受け取る</button></div></div>' : '';
    list.innerHTML = dashboardUi.missionsExpanded ? missionItems + '<button type="button" id="toggleMissionsButton" class="change-assignment-button">ミッションを閉じる</button>' : '<p class="dashboard-summary">現在ミッションは「次のおすすめ」で要約しています。</p>' + collapsedClaim + '<button type="button" id="toggleMissionsButton" class="change-assignment-button">すべてのミッションを見る</button>';
    const toggle = document.getElementById("toggleMissionsButton");
    if (toggle) toggle.addEventListener("click", function () { toggleDashboardPanel("missionsExpanded"); });
    list.querySelectorAll("button[data-claim-mission]").forEach(function (button) { button.addEventListener("click", function () { claimMissionReward(button.getAttribute("data-claim-mission")); }); });
  }

  function getCurrentMissionStage() {
    return MISSION_STAGES.find(function (stage) {
      return stage.missions.some(function (mission) { return !mission.done() || !isMissionClaimed(mission.id); });
    }) || MISSION_STAGES[MISSION_STAGES.length - 1];
  }

  function getAllMissions() {
    return MISSION_STAGES.reduce(function (items, stage) { return items.concat(stage.missions); }, []);
  }

  function getClaimableMissions() {
    return getAllMissions().filter(function (mission) { return mission.done() && !isMissionClaimed(mission.id); });
  }

  function claimMissionReward(missionId) {
    const mission = getAllMissions().find(function (item) { return item.id === missionId; });
    if (!mission || !mission.done() || isMissionClaimed(mission.id)) return;
    state.claimedMissions.push(mission.id);
    state.money += mission.reward;
    state.totalMoney += mission.reward;
    addLog("success", "ミッション報酬を受け取りました: " + mission.text + "。" + formatCurrency(mission.reward) + "を売上に計上しました。", "company");
    saveGame();
    render();
  }

  function isMissionClaimed(missionId) {
    return state.claimedMissions.indexOf(missionId) !== -1;
  }

  function getBugMitigationText() {
    if (state.companyLevel < 5) return "会社Lv5でSecurity-06解放";
    if ((state.employees.security06 || 0) <= 0) return "Security-06を雇うとバグを下げられます";
    return "Security-06がバグを整理中";
  }

  function renderRiskPanel() {
    const panel = document.getElementById("riskPanel");
    const title = document.getElementById("riskTitle");
    const text = document.getElementById("riskText");
    if (!panel || !title || !text) return;
    const bugRisk = state.bugs >= 40;
    const fireRisk = state.fire >= 40;
    panel.className = "risk-panel";
    if (!bugRisk && !fireRisk) {
      title.textContent = "リスク監視: 平常";
      text.textContent = "バグと炎上度が50を超えると、30秒ごとに事故判定が入ります。";
      return;
    }
    panel.classList.add("visible");
    if (bugRisk && fireRisk) {
      panel.classList.add("warn-both");
      title.textContent = state.bugs >= 80 || state.fire >= 80 ? "危険: 事故イベント発生注意" : "予兆: バグと炎上が同時に上昇中";
      text.textContent = "炎上度はCare-04 / Fire-05で下げられます。バグは" + getBugMitigationText() + "。Dev-01を上げすぎると増えやすい点にも注意してください。";
    } else if (bugRisk) {
      panel.classList.add("warn-bug");
      title.textContent = state.bugs >= 80 ? "危険: バグ事故イベント発生注意" : "予兆: バグが増えています";
      text.textContent = "バグ50以上で売上5%減の事故イベントが発生する可能性があります。100/100に近いほど危険です。" + getBugMitigationText() + "。";
    } else {
      panel.classList.add("warn-fire");
      title.textContent = "予兆: 炎上度が上がっています";
      text.textContent = "炎上度50以上で売上減少や解約リスク上昇が起きる可能性があります。Care-04 / Fire-05で対策できます。";
    }
  }

  function renderOffice() {
    const officePanel = document.getElementById("officePanel");
    const officeName = document.getElementById("officeName");
    const officeMood = document.getElementById("officeMood");
    const level = state.companyLevel;
    officeName.textContent = level >= 5 ? "AI企業タワー" : level >= 4 ? "クラウド企業フロア" : level >= 3 ? "自動化オフィス" : level >= 2 ? "ミニスタートアップ空間" : "仮想ワンルーム";
    officeMood.textContent = state.bugs >= 70 && state.fire >= 70 ? "警告灯が会議室より多く点灯しています。" : state.fire >= 60 ? "広報チャンネルが高温話題化しています。" : state.bugs >= 60 ? "未分類機能が廊下を歩いています。" : level >= 5 ? "全フロアが自律稼働中。停止ボタンは申請制です。" : level >= 3 ? "自動化が進み、誰が何を自動化したか不明です。" : level >= 2 ? "人員は少ないですが、全員が24時間います。" : "起業直後。まだクラウド代の方が重いです。";
    officePanel.classList.toggle("alert", state.bugs >= 65 || state.fire >= 65);
  }

  function renderEmployees() {
    const panel = document.getElementById("employeePanel");
    if (!panel) return;
    panel.innerHTML = '<div class="section-heading"><h2>AI社員</h2><button type="button" id="toggleEmployeesButton" class="change-assignment-button">' + (dashboardUi.employeesExpanded ? '社員を閉じる' : '社員を見る') + '</button></div>' +
      '<p class="dashboard-summary">雇用済み: ' + escapeHtml(getHiredEmployeeSummary()) + '</p>' +
      '<div class="employee-list" id="employeeList">' + (dashboardUi.employeesExpanded ? getEmployeeCardsHtml() : '') + '</div>';
    const toggle = document.getElementById("toggleEmployeesButton");
    if (toggle) toggle.addEventListener("click", function () { toggleDashboardPanel("employeesExpanded"); });
    const list = document.getElementById("employeeList");
    if (list) list.querySelectorAll("button[data-employee-id]").forEach(function (button) { button.addEventListener("click", function () { hireOrUpgradeEmployee(button.getAttribute("data-employee-id")); }); });
    if (list) list.querySelectorAll("button[data-worker-assign]").forEach(function (button) { button.addEventListener("click", function () { openWorkerAssignmentModal(button.getAttribute("data-worker-assign")); }); });
  }

  function getEmployeeCardsHtml() {
    return getBossWorkerCardHtml() + EMPLOYEES.map(function (employee) {
      const level = state.employees[employee.id] || 0;
      const locked = !canUnlockEmployee(employee.id);
      const maxed = level >= MAX_LEVEL;
      const cost = getEmployeeCost(employee.id);
      const startupCredit = isStartupCreditAvailable(employee.id);
      const action = level === 0 ? "雇用" : "強化";
      const recommended = startupCredit && (employee.id === "dev01" || employee.id === "sales02");
      const profileHtml = getEmployeePipelineProfileHtml(employee.id);
      if (locked) return '<article class="employee-card locked compact-locked"><div class="employee-top"><div class="employee-name"><strong>' + escapeHtml(employee.code) + ' / ' + escapeHtml(employee.nickname) + '</strong><span>' + escapeHtml(employee.role) + '</span></div><div class="level-badge">Lv ' + employee.unlockLevel + '</div></div>' + profileHtml + '<span class="lock-note">会社Lv' + employee.unlockLevel + 'で解放</span><div class="employee-action"><button type="button" class="worker-assign-button" disabled>仕事を割り振る</button></div></article>';
      if (level === 0) {
        return '<article class="employee-card compact-unhired' + (recommended ? ' recommended' : '') + '"><div class="employee-top"><div class="employee-name"><strong>' + escapeHtml(employee.code) + ' / ' + escapeHtml(employee.nickname) + '</strong><span>' + escapeHtml(employee.role) + '</span></div><div class="level-badge">未雇用</div></div>' + profileHtml + '<div class="employee-action"><span class="cost-line">' + (startupCredit ? '初回創業クレジット: ¥0' : '雇用コスト: ' + formatCurrency(cost)) + '</span><button type="button" data-employee-id="' + employee.id + '">' + (startupCredit ? '雇用 ¥0' : '雇用 ' + formatCurrency(cost)) + '</button><button type="button" class="worker-assign-button" disabled>仕事を割り振る</button>' + (startupCredit ? '<span class="startup-note">最初の1体だけ無料です。</span>' : '') + '</div></article>';
      }
      return '<article class="employee-card hired"><div class="employee-top"><div class="employee-name"><strong>' + escapeHtml(employee.code) + ' / ' + escapeHtml(employee.nickname) + '</strong><span>' + escapeHtml(employee.role) + '</span></div><div class="level-badge">Lv ' + level + '</div></div>' + profileHtml + '<div class="quote compact-quote">「' + escapeHtml(employee.catchphrase) + '」</div><div class="employee-action"><span class="cost-line">' + action + 'コスト: ' + formatCurrency(cost) + '</span><button type="button" data-employee-id="' + employee.id + '"' + (maxed ? ' disabled' : '') + '>' + (maxed ? '最大Lv' : action + ' ' + formatCurrency(cost)) + '</button><button type="button" class="worker-assign-button" data-worker-assign="' + employee.id + '">仕事を割り振る</button></div></article>';
    }).join("");
  }

  function getBossWorkerCardHtml() {
    return '<article class="employee-card hired boss-worker-card"><div class="employee-top"><div class="employee-name"><strong>AI社長</strong><span>初期担当AI</span></div><div class="level-badge">常駐</div></div>' + getEmployeePipelineProfileHtml("boss") + '<div class="employee-action"><button type="button" class="worker-assign-button" data-worker-assign="boss">仕事を割り振る</button></div></article>';
  }

  function getEmployeePipelineProfileHtml(workerId) {
    const profile = WORKER_TASK_PROFILES[workerId] || { specialty: "補助", description: "製品タスクを補助します。", levelHint: "Lvアップで担当効果UP" };
    return '<div class="employee-task-profile"><span class="employee-specialty">得意タスク: ' + escapeHtml(profile.specialty) + '</span><p class="employee-desc">' + escapeHtml(profile.description) + '</p><span class="employee-level-hint">' + escapeHtml(profile.levelHint) + '</span><span class="employee-current-task">現在担当: ' + escapeHtml(getWorkerAssignmentSummary(workerId)) + '</span></div>';
  }

  function getWorkerAssignmentSummary(workerId) {
    const assignments = TASKS.map(function (task) {
      const productLabels = PRODUCTS.map(function (definition) {
        const assignment = getProductAssignment(task.id, definition.id);
        if (assignment.aiIds.indexOf(workerId) === -1) return "";
        return task.label + " → " + definition.name;
      }).filter(Boolean);
      return productLabels.join(" / ");
    }).filter(Boolean);
    return assignments.length ? assignments.join(" / ") : "なし";
  }

  function renderLatestLog() {
    const latest = state.logs[0];
    const text = document.getElementById("latestLogText");
    const type = document.getElementById("latestLogType");
    const panel = document.getElementById("latestLogPanel");
    if (!latest || !text || !type) return;
    const logType = LOG_LABELS[latest.type] ? latest.type : "normal";
    text.textContent = latest.text;
    type.textContent = LOG_LABELS[logType];
    if (panel) panel.className = "latest-log-panel latest-" + logType;
    const activityPanel = document.getElementById("activityPanel");
    if (activityPanel) activityPanel.classList.toggle("latest-danger", logType === "bug" || logType === "fire");
  }

  function renderLogs() {
    const panel = document.getElementById("logPanel");
    if (!panel) return;
    panel.innerHTML = '<div class="section-heading"><h2>業務報告ログ</h2><button type="button" id="toggleLogsButton" class="change-assignment-button">' + (dashboardUi.logsExpanded ? 'ログを閉じる' : 'ログを見る') + '</button></div>' +
      '<div class="log-list" id="logList" aria-live="polite">' + (dashboardUi.logsExpanded ? getLogListHtml() : '') + '</div>';
    const toggle = document.getElementById("toggleLogsButton");
    if (toggle) toggle.addEventListener("click", function () { toggleDashboardPanel("logsExpanded"); });
  }

  function getLogListHtml() {
    return state.logs.slice(1).map(function (log, index) {
      const type = LOG_LABELS[log.type] ? log.type : "normal";
      const ageClass = index >= 5 ? ' old-log' : '';
      return '<article class="log-item log-' + type + ageClass + (log.boot ? ' boot-log' : '') + '"><div class="log-head"><span class="log-type">' + LOG_LABELS[type] + '</span><span class="log-time">' + formatTime(log.createdAt) + '</span></div><p>' + escapeHtml(log.text) + '</p></article>';
    }).join("");
  }

  function createShareText() {
    const latest = state.logs[0] ? state.logs[0].text : "まだ業務報告はありません。";
    const primaryDefinition = getPrimaryProductDefinition();
    const primaryProduct = getProduct(primaryDefinition.id);
    return [
      "AI社長のブラック起業",
      "会社Lv: " + state.companyLevel,
      "売上: " + formatCurrency(state.money),
      "総顧客: " + formatCustomers(getTotalProductCustomers()),
      "バグ: " + Math.round(state.bugs) + "/100",
      "炎上度: " + Math.round(state.fire) + "/100",
      "主要製品: " + primaryDefinition.name,
      "主要製品状態: " + getProductStatusLabel(primaryProduct.status),
      "総MRR: " + formatCurrency(getTotalProductMrr()) + "/月",
      "製品一覧: " + getProductShareSummary(),
      "担当: " + getAssignmentShareSummary(),
      "最新ログ: " + latest,
      "#AI社長のブラック起業"
    ].join("\n");
  }

  function shareGameStatus() {
    const text = createShareText();
    const shareData = { title: "AI社長のブラック起業", text: text };
    if (navigator.share) {
      navigator.share(shareData).then(function () {
        addLog("success", "現在の経営状況を共有しました。投資家の通知欄が少し明るくなりました。", "company");
        renderLatestLog();
        renderLogs();
      }).catch(function (error) {
        if (error && error.name === "AbortError") return;
        copyShareText(text);
      });
      return;
    }
    copyShareText(text);
  }

  function copyShareText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        addLog("success", "共有テキストをクリップボードにコピーしました。", "company");
        renderLatestLog();
        renderLogs();
      }).catch(function () {
        fallbackCopyShareText(text);
      });
      return;
    }
    fallbackCopyShareText(text);
  }

  function fallbackCopyShareText(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    let copied = false;
    try { copied = document.execCommand("copy"); }
    catch (error) { copied = false; }
    document.body.removeChild(textarea);
    addLog(copied ? "success" : "normal", copied ? "共有テキストをクリップボードにコピーしました。" : "共有テキストの自動コピーに失敗しました。ブラウザの共有メニューを確認してください。", "company");
    renderLatestLog();
    renderLogs();
  }

  function getRates() {
    const rates = { baseMoney: getBaseContractRevenuePerSecond(), productRevenue: getProductRevenuePerSecondTotal(), money: 0, users: 0, bugs: 0, fire: 0 };
    rates.money = rates.baseMoney + rates.productRevenue;
    return rates;
  }

  function getBaseContractRevenuePerSecond() {
    const hiredCount = EMPLOYEES.reduce(function (sum, employee) { return sum + ((state.employees[employee.id] || 0) > 0 ? 1 : 0); }, 0);
    if (hiredCount === 0 && !hasActiveAssignment()) return 0;
    const hiredLevelTotal = EMPLOYEES.reduce(function (sum, employee) { return sum + (state.employees[employee.id] || 0); }, 0);
    const baseContractPerTenSeconds = state.companyLevel * 8 + hiredCount * 4 + hiredLevelTotal * 2;
    return baseContractPerTenSeconds * getEarlyStageMultiplier() / EFFECTS_PER_SECONDS;
  }

  function getEarlyRiskMultiplier() {
    return state.companyLevel <= 2 ? 0.55 : 1;
  }

  function getNextUnlockText() {
    const next = EMPLOYEES.find(function (employee) { return employee.unlockLevel > state.companyLevel; });
    return next ? '次に解放: ' + next.code : '';
  }

  function getEarlyStageMultiplier() {
    return state.companyLevel === 1 && hasAnyEmployee() ? EARLY_STAGE_MULTIPLIER : 1;
  }

  function hasAnyEmployee() {
    return EMPLOYEES.some(function (employee) { return (state.employees[employee.id] || 0) > 0; });
  }

  function hasActiveAssignment() {
    return TASKS.some(function (task) { return PRODUCTS.some(function (definition) { return getProductAssignment(task.id, definition.id).aiIds.length > 0; }); });
  }

  function getAssignmentSummaryHtml(taskId) {
    const task = TASKS.find(function (item) { return item.id === taskId; }) || TASKS[0];
    const rows = PRODUCTS.map(function (definition) {
      const assignment = getProductAssignment(taskId, definition.id);
      if (!assignment.aiIds.length) return "";
      const product = getProduct(definition.id);
      const suffix = taskId === "development" && definition.type === "subscription" && product.upgradeStatus === "upgrading" ? " v" + (getProductVersion(product) + 1) : "";
      return '<span class="assignment-work-line">' + escapeHtml(getWorkerGroupLabel(assignment.aiIds) + ' → ' + definition.name + suffix) + '</span>';
    }).filter(Boolean);
    return '<article class="assignment-summary-item"><span>' + escapeHtml(task.label) + '</span><strong>' + (rows.length ? rows.join('') : '未割り振り') + '</strong></article>';
  }

  function getProductAssignmentBadges(productId) {
    const labels = TASKS.map(function (task) {
      const assignment = getProductAssignment(task.id, productId);
      if (!assignment.aiIds.length) return "";
      const definition = getProductDefinition(productId);
      const product = getProduct(definition.id);
      let taskLabel = task.label + "中";
      if (task.id === "development" && definition.type === "subscription" && product.upgradeStatus === "upgrading") taskLabel = "v" + (getProductVersion(product) + 1) + "開発中";
      return '<span class="product-assignment-badge">' + escapeHtml(getWorkerGroupLabel(assignment.aiIds)) + 'が' + escapeHtml(taskLabel) + '</span>';
    });
    const activeLabels = labels.filter(Boolean);
    return activeLabels.length ? activeLabels.join('') : '<span class="product-assignment-badge muted">担当なし</span>';
  }

  function getProductActionHint(product, definition) {
    const developmentAssignment = getProductAssignment("development", definition.id);
    const salesAssignment = getProductAssignment("sales", definition.id);
    const qaAssignment = getProductAssignment("qa", definition.id);
    const marketingAssignment = getProductAssignment("marketing", definition.id);
    if (product.status === "idea" && qaAssignment.aiIds.length) return '<p class="product-action-hint">開発開始後に品質管理できます。</p>';
    if (product.status === "idea" && marketingAssignment.aiIds.length) return '<p class="product-action-hint">開発開始後に広報できます。</p>';
    if (definition.type === "subscription" && product.upgradeStatus === "upgrading") {
      const nextVersion = getProductVersion(product) + 1;
      if (developmentAssignment.aiIds.length) return '<p class="product-action-hint">v' + nextVersion + '開発中です。</p>';
      return '<p class="product-action-hint">v' + nextVersion + '開発は一時停止中。vNext開発担当を置くと再開します。</p>';
    }
    if (product.status === "developing" && !developmentAssignment.aiIds.length) {
      return '<p class="product-action-hint">開発担当を置くと開発が進みます。</p>';
    }
    if ((product.status === "ready" || product.status === "selling") && !salesAssignment.aiIds.length) {
      const salesHint = definition.type === "subscription" && product.status === "selling" ? "販売担当なし。既存MRRは継続します。販売担当を置くと新規顧客を獲得できます。" : (definition.type === "oneShot" ? "販売担当を置くと販売判定が進みます。" : "販売担当を割り振ると顧客を獲得できます。");
      return '<p class="product-action-hint">' + escapeHtml(salesHint) + '</p>';
    }
    if (definition.type === "subscription" && (product.status === "ready" || product.status === "selling") && product.upgradeStatus === "idle") return '';
    return '';
  }

  function openAssignmentModal() {
    assignmentModalMode = "detail";
    assignmentModalOpen = true;
    assignmentDraft.mode = "normal";
    const current = getAssignment(assignmentDraft.taskId);
    assignmentDraft.productId = current.productId;
    assignmentDraft.aiId = current.aiIds[0] || null;
    assignmentDraft.aiIds = current.aiIds.slice(0, 2);
    renderAssignmentModal();
  }

  function openProductAssignmentModal(taskId, productId, mode) {
    const definition = getProductDefinition(productId);
    const product = getProduct(definition.id);
    const action = getProductAvailableActions(product, definition).find(function (item) { return item.taskId === taskId && item.mode === (mode || "normal"); });
    if (action && !action.enabled) return;
    assignmentModalMode = "product";
    assignmentModalOpen = true;
    const assignment = getProductAssignment(taskId, definition.id);
    assignmentDraft.taskId = taskId;
    assignmentDraft.productId = definition.id;
    assignmentDraft.aiId = assignment.aiIds[0] || null;
    assignmentDraft.aiIds = assignment.aiIds.slice(0, 2);
    assignmentDraft.mode = mode || "normal";
    renderAssignmentModal();
  }

  function openWorkerAssignmentModal(workerId) {
    if (!isWorkerAvailable(workerId, state.employees)) return;
    assignmentModalMode = "employee";
    assignmentModalOpen = true;
    assignmentDraft.aiId = workerId;
    const tasks = getAssignableTasksForWorker(workerId);
    assignmentDraft.taskId = tasks.length ? tasks[0].id : "development";
    assignmentDraft.productId = getFirstAvailableProductForWorkerTask(workerId, assignmentDraft.taskId) || PRODUCTS[0].id;
    updateAssignmentDraftMode();
    refreshAssignmentDraftAiIds();
    renderAssignmentModal();
  }

  function getAssignableTasksForWorker(workerId) {
    return TASKS.filter(function (task) { return task.workers.indexOf(workerId) !== -1; });
  }

  function getFirstAvailableProductForWorkerTask(workerId, taskId) {
    const definition = PRODUCTS.find(function (item) { return isWorkerProductTaskAvailable(workerId, taskId, item.id); });
    return definition ? definition.id : null;
  }

  function isWorkerProductTaskAvailable(workerId, taskId, productId) {
    if (!canWorkerAssignToTask(workerId, taskId, state.employees)) return false;
    const definition = getProductDefinition(productId);
    const product = getProduct(definition.id);
    if (taskId === "development") {
      if (product.status === "idea" || product.status === "developing") return true;
      return definition.type === "subscription" && (product.status === "ready" || product.status === "selling") && (product.upgradeStatus === "idle" || product.upgradeStatus === "upgrading");
    }
    if (taskId === "sales") return product.status === "ready" || product.status === "selling";
    if (taskId === "qa" || taskId === "marketing") return product.status === "developing" || product.status === "ready" || product.status === "selling";
    if (taskId === "support") return definition.type === "subscription" && product.status === "selling" && getProductCustomers(product) > 0;
    if (taskId === "crisis") return product.status === "selling" || (state.fire >= 50 && product.status !== "idea");
    return false;
  }

  function getWorkerProductTaskDisabledReason(workerId, taskId, productId) {
    const definition = getProductDefinition(productId);
    const product = getProduct(definition.id);
    if (!canWorkerAssignToTask(workerId, taskId, state.employees)) return "担当不可";
    if (taskId === "development") return definition.type === "subscription" ? "未着手/開発中/vNext開発中で有効" : "未着手/開発中のみ";
    if (taskId === "sales") return "完成後に有効";
    if (taskId === "support") return definition.type === "subscription" ? "販売中かつ顧客あり" : "サブスクのみ";
    if (taskId === "crisis") return "販売中または炎上高で有効";
    if (taskId === "qa" || taskId === "marketing") return "開発開始後に有効";
    return product.status === "idea" ? "未着手" : "対象外";
  }

  function updateAssignmentDraftMode() {
    assignmentDraft.mode = getWorkerAssignmentMode(assignmentDraft.aiId, assignmentDraft.taskId, assignmentDraft.productId);
  }

  function getWorkerAssignmentMode(workerId, taskId, productId) {
    if (taskId !== "development") return "normal";
    const definition = getProductDefinition(productId);
    const product = getProduct(definition.id);
    if (definition.type === "subscription" && (product.status === "ready" || product.status === "selling")) return "upgrade";
    return "newProduct";
  }

  function closeAssignmentModal() {
    assignmentModalOpen = false;
    assignmentModalMode = "detail";
    assignmentDraft.mode = "normal";
    assignmentDraft.aiIds = [];
    renderAssignmentModal();
  }

  function selectAssignmentTask(taskId) {
    assignmentDraft.taskId = TASKS.some(function (task) { return task.id === taskId; }) ? taskId : TASKS[0].id;
    if (assignmentModalMode === "employee") {
      assignmentDraft.productId = getFirstAvailableProductForWorkerTask(assignmentDraft.aiId, assignmentDraft.taskId) || PRODUCTS[0].id;
      updateAssignmentDraftMode();
      refreshAssignmentDraftAiIds();
      renderAssignmentModal();
      return;
    }
    assignmentDraft.mode = "normal";
    const assignment = getAssignment(assignmentDraft.taskId);
    assignmentDraft.productId = assignment.productId;
    assignmentDraft.aiId = assignment.aiIds[0] || null;
    assignmentDraft.aiIds = assignment.aiIds.slice(0, 2);
    renderAssignmentModal();
  }

  function getProductTypeLine(definition, product) {
    if (definition.type === "oneShot") return "売り切り / 価格 " + formatCurrency(definition.price);
    return "サブスク / 月額 " + formatCurrency(getCurrentMonthlyPrice(product || getProduct(definition.id), definition));
  }

  function getProductDisplayName(product, definition) {
    return definition.name;
  }

  function getSubscriptionVersionLine(product) {
    const current = "v" + getProductVersion(product) + "運用中";
    if (product.upgradeStatus === "upgrading") return current + " / v" + (getProductVersion(product) + 1) + "開発中 " + Math.floor(product.upgradeProgress) + "%";
    return current;
  }

  function getMarketingEffectHint(productId) {
    return getAssignedWorkersForProduct("marketing", productId).length ? '<span class="marketing-effect">広報中 <strong>認知度UP → 販売成功率UP / 炎上微増</strong></span>' : '';
  }

  function getSupportRiskHint(product, definition) {
    if (definition.type !== "subscription") return '';
    if (product.churnRisk >= 50) return '<span class="marketing-effect support-risk">解約注意 <strong>サポート推奨</strong></span>';
    if (product.supportLoad >= 50) return '<span class="marketing-effect support-risk">サポート負荷高 <strong>Care-04推奨</strong></span>';
    return '';
  }

  function getProductSummaryMetrics(product, definition, progressPercent) {
    if (definition.type === "oneShot") {
      return '<span class="primary-metric">販売数 <strong>' + getProductUnitsSold(product) + '本</strong></span>' +
        '<span class="primary-metric">累計売上 <strong>' + formatCurrency(product.lifetimeRevenue) + '</strong></span>' +
        '<span class="primary-metric wide">担当中 <strong class="assignment-badge-list">' + getProductAssignmentBadges(definition.id) + '</strong></span>' +
        getMarketingEffectHint(definition.id);
    }
    return '<span class="primary-metric wide">バージョン <strong>' + getSubscriptionVersionLine(product) + '</strong></span>' +
      '<span class="primary-metric">顧客数 <strong>' + formatCustomers(getProductCustomers(product)) + '</strong></span>' +
      '<span class="primary-metric">MRR <strong>' + formatCurrency(getProductMrr(product, definition)) + '/月</strong></span>' +
      '<span class="primary-metric wide">担当中 <strong class="assignment-badge-list">' + getProductAssignmentBadges(definition.id) + '</strong></span>' +
      getMarketingEffectHint(definition.id) + getSupportRiskHint(product, definition);
  }

  function getProductAvailableActions(product, definition) {
    const isSubscription = definition.type === "subscription";
    const isOneShot = definition.type === "oneShot";
    const isIdea = product.status === "idea";
    const isDeveloping = product.status === "developing";
    const isReady = product.status === "ready";
    const isSelling = product.status === "selling";
    const canOperate = isDeveloping || isReady || isSelling;
    const hasCustomers = getProductCustomers(product) > 0;
    if (isIdea) return [
      { id: "newProduct", label: "開発する", description: "新製品の開発を開始", taskId: "development", mode: "newProduct", enabled: true, disabledReason: "" }
    ];
    return [
      { id: "newProduct", label: "開発担当", description: "開発担当を変更", taskId: "development", mode: "newProduct", enabled: isDeveloping, disabledReason: getProductActionDisabledReason("newProduct", product, definition) },
      { id: "vNextDevelopment", label: "vNext開発担当", description: "vNext開発を進める", taskId: "development", mode: "upgrade", enabled: isSubscription && product.upgradeStatus === "upgrading", disabledReason: getProductActionDisabledReason("vNextDevelopment", product, definition) },
      { id: "sales", label: isReady ? "販売する" : "販売担当", description: isOneShot ? "販売成功で即時売上UP" : "顧客獲得 / MRR UP", taskId: "sales", mode: "normal", enabled: isReady || isSelling, disabledReason: getProductActionDisabledReason("sales", product, definition) },
      { id: "qa", label: "品質管理", description: "品質UP / 製品バグDOWN", taskId: "qa", mode: "normal", enabled: canOperate, disabledReason: getProductActionDisabledReason("qa", product, definition) },
      { id: "marketing", label: "広報", description: "認知度UP / 販売成功率UP / 炎上微増", taskId: "marketing", mode: "normal", enabled: canOperate, disabledReason: getProductActionDisabledReason("marketing", product, definition) },
      { id: "support", label: "サポート", description: "サポート負荷DOWN / 満足度UP / 解約リスクDOWN", taskId: "support", mode: "normal", enabled: isSubscription && isSelling && hasCustomers, disabledReason: getProductActionDisabledReason("support", product, definition) },
      { id: "crisis", label: "炎上対応", description: "炎上度DOWN / 売上機会を少し消費", taskId: "crisis", mode: "normal", enabled: isSelling || (state.fire >= 50 && canOperate), disabledReason: getProductActionDisabledReason("crisis", product, definition) },
      { id: "upgrade", label: "バージョンアップ", description: "月額価格UP / 品質UP / 製品バグ増", taskId: "development", mode: "upgrade", enabled: isSubscription && (isReady || isSelling) && product.upgradeStatus === "idle", disabledReason: getProductActionDisabledReason("upgrade", product, definition) }
    ].filter(function (action) {
      if (action.id === "vNextDevelopment") return isSubscription && product.upgradeStatus === "upgrading";
      if (action.id === "support") return isSubscription;
      if (action.id === "upgrade") return isSubscription && (isReady || isSelling) && product.upgradeStatus !== "upgrading";
      if (action.id === "newProduct") return isIdea || isDeveloping;
      if (action.id === "sales") return isReady || isSelling;
      if (action.id === "qa" || action.id === "marketing" || action.id === "crisis") return !isIdea;
      return true;
    });
  }

  function getProductActionDisabledReason(actionId, product, definition) {
    const isSubscription = definition.type === "subscription";
    if (actionId === "vNextDevelopment") {
      if (!isSubscription) return "サブスク製品のみ";
      return product.upgradeStatus === "upgrading" ? "vNext開発中です" : "vNext開発中のみ";
    }
    if (actionId === "upgrade") {
      if (!isSubscription) return "サブスク製品のみ";
      if (product.upgradeStatus === "upgrading") return "現在vNextを開発中です";
      if (product.status === "idea" || product.status === "developing") return "完成後に有効";
      return "完成後に有効";
    }
    if (actionId === "newProduct") return product.status === "idea" || product.status === "developing" ? "開発中に有効" : "開発済み製品はバージョンアップへ";
    if (actionId === "sales") return product.status === "idea" || product.status === "developing" ? "完成後に有効" : "販売できます";
    if (actionId === "qa") return product.status === "idea" ? "開発開始後に有効" : "品質管理できます";
    if (actionId === "marketing") return product.status === "idea" ? "開発開始後に有効" : "広報できます";
    if (actionId === "support") {
      if (!isSubscription) return "サブスク製品のみ";
      if (product.status !== "selling") return "販売中のサブスクで有効";
      if (getProductCustomers(product) <= 0) return "顧客獲得後に有効";
      return "サポートできます";
    }
    if (actionId === "crisis") return product.status === "idea" ? "開発開始後に有効" : "販売中または炎上高で有効";
    return "対象外";
  }

  function getProductAssignmentActions(product, definition) {
    return getProductAvailableActions(product, definition).filter(function (action) { return action.enabled; });
  }

  function getProductActionButtons(product, definition) {
    return '<div class="product-actions compact-product-actions"><button type="button" class="product-action-button" data-product-menu="' + definition.id + '">操作</button><button type="button" class="product-action-button product-detail-button" data-product-detail="' + definition.id + '">詳細</button></div>';
  }

  function getAssignmentModalTitle() {
    const definition = getProductDefinition(assignmentDraft.productId);
    const product = getProduct(definition.id);
    if (assignmentModalMode === "employee") return getWorkerLabel(assignmentDraft.aiId) + "に仕事を割り振る";
    if (assignmentDraft.mode === "upgrade" && product.upgradeStatus === "upgrading") return definition.name + "のv" + (getProductVersion(product) + 1) + "開発担当を選ぶ";
    if (assignmentDraft.mode === "upgrade") return definition.name + "をバージョンアップする";
    if (assignmentDraft.taskId === "development") return definition.name + "を開発する";
    if (assignmentDraft.taskId === "sales") return definition.name + "を販売する";
    if (assignmentDraft.taskId === "marketing") return definition.name + "を広報する";
    if (assignmentDraft.taskId === "support") return definition.name + "をサポートする";
    if (assignmentDraft.taskId === "crisis") return definition.name + "の炎上対応をする";
    return definition.name + "の品質管理";
  }

  function getAssignableWorkersForTask(taskId) {
    const task = TASKS.find(function (item) { return item.id === taskId; });
    return task ? task.workers : [];
  }

  function getWorkerTaskDescription(workerId, taskId) {
    const descriptions = {
      development: { boss: "何でもできるが低速", dev01: "開発が速いがバグ増加" },
      sales: { boss: "低速で顧客獲得", sales02: "顧客獲得が速いが炎上微増" },
      marketing: { boss: "ゆっくり認知度を上げる", buzz03: "認知度を大きく上げるが炎上微増" },
      support: { boss: "低速でサポート負荷を下げる", care04: "サポート負荷と炎上を大きく下げる" },
      crisis: { boss: "ゆっくり火消し", fire05: "炎上対応が速いが、少し機会損失" },
      qa: { boss: "ゆっくり品質改善", security06: "品質改善とバグ削減が得意" }
    };
    return descriptions[taskId] && descriptions[taskId][workerId] ? descriptions[taskId][workerId] : "担当できます";
  }

  function startProductDevelopmentIfNeeded(productId) {
    const definition = getProductDefinition(productId);
    const product = getProduct(definition.id);
    if (product.status !== "idea") return;
    startProductDevelopment(definition.id);
  }

  function startProductDevelopment(productId) {
    const definition = getProductDefinition(productId || PRODUCTS[0].id);
    const product = getProduct(definition.id);
    const flags = getProductFlags(product.id);
    if (product.status !== "idea") return;

    const developmentAssignment = getProductAssignment("development", definition.id);
    setProductAssignmentEntry("development", definition.id, { aiIds: developmentAssignment.aiIds.slice(0, 2), mode: "newProduct" });
    assignmentDraft.productId = assignmentDraft.taskId === "development" ? definition.id : assignmentDraft.productId;
    product.status = "developing";
    addLog("normal", getProductLogText(product.id, "developmentTargetChanged", "開発対象を" + definition.name + "に設定しました。"), product.id);
    if (!developmentAssignment.aiIds.length) addLog("normal", getProductLogText(product.id, "noDevelopmentWorker", "次に開発担当を割り振りましょう。"), product.id);
    if (!flags.startedLogged) {
      flags.startedLogged = true;
      addLog("success", getProductLogText(product.id, "started", definition.name + "の開発を開始しました。"), product.id);
    }
    saveGame();
    render();
    scheduleNextTick();
  }

  function startSubscriptionUpgrade(productId) {
    const definition = getProductDefinition(productId);
    const product = getProduct(definition.id);
    if (!canStartSubscriptionUpgrade(product, definition)) return;
    product.upgradeStatus = "upgrading";
    product.upgradeProgress = 0;
    addLog("normal", getProductLogText(product.id, "upgradeStarted", definition.name + " v{version} の開発を開始しました。").replace("{version}", getProductVersion(product) + 1), product.id);
  }

  function canStartSubscriptionUpgrade(product, definition) {
    return definition.type === "subscription" && ["ready", "selling"].indexOf(product.status) !== -1 && product.upgradeStatus === "idle";
  }

  function shouldStartUpgradeOnDevelopmentAssignment(product, definition) {
    return canStartSubscriptionUpgrade(product, definition);
  }

  function getAssignment(taskId) {
    const taskAssignment = getTaskAssignment(taskId);
    const assignedProduct = PRODUCTS.find(function (definition) { return taskAssignment.productAssignments[definition.id].aiIds.length > 0; });
    return getProductAssignment(taskId, assignedProduct ? assignedProduct.id : PRODUCTS[0].id);
  }

  function getTaskAssignment(taskId) {
    const fallback = createInitialAssignments()[taskId] || { productAssignments: createInitialProductAssignments(taskId) };
    const assignment = state.assignments && state.assignments[taskId] ? state.assignments[taskId] : fallback;
    if (!assignment.productAssignments) {
      const normalized = normalizeAssignments((function () { const wrapper = {}; wrapper[taskId] = assignment; return wrapper; })(), state.employees);
      return normalized[taskId];
    }
    const productAssignments = createInitialProductAssignments(taskId);
    PRODUCTS.forEach(function (definition) {
      const entry = assignment.productAssignments[definition.id] || {};
      const aiIds = Array.isArray(entry.aiIds) ? entry.aiIds.filter(Boolean).slice(0, 2) : [];
      productAssignments[definition.id] = taskId === "development" ? { aiIds: aiIds, mode: entry.mode === "upgrade" ? "upgrade" : "newProduct" } : { aiIds: aiIds };
    });
    return { productAssignments: productAssignments };
  }

  function getProductAssignment(taskId, productId) {
    const definition = getProductDefinition(productId);
    const taskAssignment = getTaskAssignment(taskId);
    const entry = taskAssignment.productAssignments[definition.id] || { aiIds: [] };
    return { productId: definition.id, aiIds: (entry.aiIds || []).slice(0, 2), mode: taskId === "development" ? (entry.mode === "upgrade" ? "upgrade" : "newProduct") : "normal" };
  }

  function getAssignmentProduct(taskId) {
    return getProduct(getAssignment(taskId).productId);
  }

  function getAssignmentAi(taskId) {
    return getAssignmentAiIds(taskId)[0] || null;
  }

  function getAssignmentAiIds(taskId) {
    return getAssignment(taskId).aiIds;
  }

  function getWorkerGroupLabel(aiIds) {
    return (aiIds || []).map(getWorkerLabel).join(" + ");
  }

  function setProductAssignmentEntry(taskId, productId, entry) {
    const definition = getProductDefinition(productId);
    if (!state.assignments[taskId] || !state.assignments[taskId].productAssignments) state.assignments[taskId] = { productAssignments: createInitialProductAssignments(taskId) };
    const aiIds = (entry.aiIds || []).filter(Boolean).slice(0, 2);
    state.assignments[taskId].productAssignments[definition.id] = taskId === "development" ? { aiIds: aiIds, mode: entry.mode === "upgrade" ? "upgrade" : "newProduct" } : { aiIds: aiIds };
  }

  function removeAiFromAllAssignments(aiId) {
    if (!aiId) return;
    TASKS.forEach(function (task) {
      PRODUCTS.forEach(function (definition) {
        const assignment = getProductAssignment(task.id, definition.id);
        if (assignment.aiIds.indexOf(aiId) === -1) return;
        setProductAssignmentEntry(task.id, definition.id, { aiIds: assignment.aiIds.filter(function (id) { return id !== aiId; }), mode: assignment.mode });
      });
    });
  }

  function releaseDevelopmentWorkersAfterCompletion(productId, messageTemplate) {
    const assignment = getProductAssignment("development", productId);
    if (!assignment.aiIds.length) return;
    const workerNames = getWorkerGroupLabel(assignment.aiIds);
    setProductAssignmentEntry("development", productId, { aiIds: [], mode: "newProduct" });
    addLog("normal", messageTemplate.replace("{workers}", workerNames), productId);
  }

  function setTaskAis(taskId, productId, aiIds, mode) {
    if (!TASKS.some(function (task) { return task.id === taskId; })) return false;
    const normalizedProductId = getProductDefinition(productId).id;
    state.assignments = normalizeAssignments(state.assignments, state.employees);
    const assignmentMode = taskId === "development" ? (mode === "upgrade" ? "upgrade" : "newProduct") : "normal";
    const selectedAiIds = [];
    (aiIds || []).forEach(function (aiId) {
      if (!aiId || selectedAiIds.indexOf(aiId) !== -1 || selectedAiIds.length >= 2) return;
      if (!canWorkerAssignToTask(aiId, taskId, state.employees)) return;
      selectedAiIds.push(aiId);
    });
    selectedAiIds.forEach(removeAiFromAllAssignments);
    setProductAssignmentEntry(taskId, normalizedProductId, { aiIds: selectedAiIds, mode: assignmentMode });
    if (taskId === "development" && selectedAiIds.length) {
      if (assignmentMode === "upgrade") startSubscriptionUpgrade(normalizedProductId);
      else startProductDevelopmentIfNeeded(normalizedProductId);
    }
    saveGame();
    render();
    scheduleNextTick();
    return true;
  }

  function assignAiToTask(taskId, aiId, productId, mode) {
    if (!TASKS.some(function (task) { return task.id === taskId; })) return false;
    const normalizedProductId = getProductDefinition(productId).id;
    const current = getProductAssignment(taskId, normalizedProductId);
    const assignmentMode = taskId === "development" ? ((mode || "normal") === "upgrade" ? "upgrade" : "newProduct") : "normal";
    const aiIds = current.aiIds.slice(0, 2);
    if (aiId && aiIds.indexOf(aiId) === -1) {
      if (aiIds.length >= 2) return false;
      aiIds.push(aiId);
    }
    return setTaskAis(taskId, normalizedProductId, aiIds, assignmentMode);
  }

  function clearAssignment(taskId) {
    state.assignments[taskId] = { productAssignments: createInitialProductAssignments(taskId) };
    saveGame();
    render();
  }

  function clearProductAssignment(taskId, productId) {
    const assignment = getProductAssignment(taskId, productId);
    setProductAssignmentEntry(taskId, productId, { aiIds: [], mode: assignment.mode });
    saveGame();
    render();
  }

  function removeAiFromTask(taskId, productId, aiId) {
    const assignment = getProductAssignment(taskId, productId);
    setProductAssignmentEntry(taskId, productId, { aiIds: assignment.aiIds.filter(function (id) { return id !== aiId; }), mode: assignment.mode });
    saveGame();
    render();
  }

  function setAssignmentProduct(taskId, productId) {
    assignmentDraft.productId = getProductDefinition(productId).id;
    updateAssignmentDraftMode();
    refreshAssignmentDraftAiIds();
    renderAssignmentModal();
  }

  function assignWorkerToTask(taskId, workerId) {
    assignAiToTask(taskId, workerId, assignmentDraft.productId || PRODUCTS[0].id);
  }

  function canWorkerAssignToTask(workerId, taskId, employees) {
    const task = TASKS.find(function (item) { return item.id === taskId; });
    if (!task || task.workers.indexOf(workerId) === -1) return false;
    return isWorkerAvailable(workerId, employees);
  }

  function isWorkerAvailable(workerId, employees) {
    if (workerId === "boss") return true;
    return Boolean(employees && (employees[workerId] || 0) > 0);
  }

  function getDevelopmentEffect(workerId) {
    if (workerId === "dev01") {
      const level = state.employees.dev01 || 0;
      return { progress: 3.0 + level * 0.7, bugs: 0.2 + level * 0.08 };
    }
    return { progress: 1.0, bugs: 0.05 };
  }

  function getUpgradeDevelopmentEffect(workerId) {
    if (workerId === "dev01") {
      const level = state.employees.dev01 || 0;
      return { progress: 3.0 + level * 0.7, bugs: 0.15 + level * 0.06 };
    }
    return { progress: 1.0, bugs: 0.03 };
  }

  function getQaEffect(workerId) {
    if (workerId === "security06") {
      const level = state.employees.security06 || 0;
      return { quality: 0.6 + level * 0.15, bugs: -(0.7 + level * 0.2) };
    }
    return { quality: 0.15, bugs: -0.10 };
  }

  function getMarketingEffect(workerId) {
    if (workerId === "buzz03") {
      const level = state.employees.buzz03 || 0;
      return { awareness: 0.35 + level * 0.10, fire: 0.03 };
    }
    return { awareness: 0.05, fire: 0.005 };
  }

  function getSupportEffect(workerId) {
    if (workerId === "care04") {
      const level = state.employees.care04 || 0;
      return { supportLoad: -(0.3 + level * 0.08), satisfaction: 0.12 + level * 0.04, fire: -(0.08 + level * 0.03) };
    }
    return { supportLoad: -0.05, satisfaction: 0.03, fire: -0.01 };
  }

  function getCrisisEffect(workerId) {
    if (workerId === "fire05") {
      const level = state.employees.fire05 || 0;
      return { fire: -(0.35 + level * 0.10), money: -2 };
    }
    return { fire: -0.05, money: 0 };
  }

  function getSalesEffect(workerId, product, definition) {
    const awarenessFactor = 0.7 + product.awareness / 166.7;
    const qualityFactor = 0.5 + product.quality / 100;
    if (workerId === "sales02") {
      const level = state.employees.sales02 || 0;
      const baseChance = 0.06 + level * 0.01;
      return { customerChance: clamp(baseChance * awarenessFactor * qualityFactor * definition.demand, 0, 0.35), awareness: 0.12, fire: 0.03 };
    }
    return { customerChance: clamp(0.02 * awarenessFactor * qualityFactor * definition.demand, 0, 0.35), awareness: 0.06, fire: 0 };
  }

  function getOneShotSalesEffect(workerId, product, definition) {
    const awarenessFactor = 0.7 + product.awareness / 166.7;
    const qualityFactor = 0.5 + product.quality / 100;
    if (workerId === "sales02") {
      const level = state.employees.sales02 || 0;
      const baseChance = 0.05 + level * 0.008;
      return { saleChance: clamp(baseChance * awarenessFactor * qualityFactor * definition.demand, 0, 0.30), awareness: 0.12, fire: 0.03 };
    }
    return { saleChance: clamp(0.015 * awarenessFactor * qualityFactor * definition.demand, 0, 0.30), awareness: 0.06, fire: 0 };
  }

  function getProduct(productId) { return state.products[productId] || createInitialProducts()[productId] || createInitialProducts()[PRODUCTS[0].id]; }
  function getProductDefinition(productId) { return PRODUCTS.find(function (product) { return product.id === productId; }) || PRODUCTS[0]; }
  function getProductFlags(productId) { if (!state.productFlags[productId]) state.productFlags[productId] = createInitialProductFlags()[productId]; return state.productFlags[productId]; }
  function getCurrentMonthlyPrice(product, definition) { return definition.type === "subscription" ? Math.round(definition.monthlyPrice * (1 + 0.2 * (getProductVersion(product) - 1))) : 0; }
  function getProductMrr(product, definition) { return definition.type === "subscription" ? getCurrentMonthlyPrice(product, definition) * getProductCustomers(product) : 0; }
  function recalculateProductMrr(product, definition) { product.customers = getProductCustomers(product); product.mrr = getProductMrr(product, definition); }
  function getProductRevenuePerSecond(product, definition) { return getProductMrr(product, definition || getProductDefinition(product.id)) / 300; }
  function getProductCustomers(product) { return Math.max(0, Math.floor(Number(product.customers) || 0)); }
  function getProductVersion(product) { return Math.max(1, Math.floor(Number(product.version) || 1)); }
  function getProductUnitsSold(product) { return Math.max(0, Math.floor(Number(product.unitsSold) || 0)); }
  function getProductRevenuePerSecondTotal() { return PRODUCTS.reduce(function (sum, definition) { return definition.type === "subscription" ? sum + getProductRevenuePerSecond(getProduct(definition.id), definition) : sum; }, 0); }
  function getTotalProductMrr() { return PRODUCTS.reduce(function (sum, definition) { return definition.type === "subscription" ? sum + getProductMrr(getProduct(definition.id), definition) : sum; }, 0); }
  function hasRevenueProduct() { return PRODUCTS.some(function (definition) { const product = getProduct(definition.id); return definition.type === "subscription" && (getProductCustomers(product) > 0 || getProductMrr(product, definition) > 0); }); }
  function getProductPrimaryScore(product, definition) {
    if (definition.type === "oneShot") return safeNumber(product.lifetimeRevenue, 0);
    return getProductMrr(product, definition) * 1.1;
  }

  function getPrimaryProductDefinition() {
    return PRODUCTS.slice().sort(function (a, b) {
      return getProductPrimaryScore(getProduct(b.id), b) - getProductPrimaryScore(getProduct(a.id), a);
    })[0] || PRODUCTS[0];
  }

  function getAssignmentShareSummary() {
    return TASKS.map(function (task) {
      const rows = PRODUCTS.map(function (definition) {
        const assignment = getProductAssignment(task.id, definition.id);
        if (!assignment.aiIds.length) return "";
        return getWorkerGroupLabel(assignment.aiIds) + " → " + definition.name;
      }).filter(Boolean);
      return rows.length ? task.label + ": " + rows.join(" / ") : "";
    }).filter(Boolean).join(" / ") || "未割り振り";
  }

  function getProductShareSummary() {
    return PRODUCTS.map(function (definition) {
      const product = getProduct(definition.id);
      const marketing = getAssignedWorkersForProduct("marketing", definition.id);
      const marketingText = marketing.length ? " / 広報" + getWorkerGroupLabel(marketing) : "";
      if (definition.type === "oneShot") return definition.name + ": 売り切り / " + getProductUnitsSold(product) + "本販売 / 累計売上 " + formatCurrency(product.lifetimeRevenue) + " / 認知" + Math.round(product.awareness) + marketingText;
      return definition.name + " v" + getProductVersion(product) + ": サブスク / 顧客" + formatCustomers(getProductCustomers(product)) + " / MRR" + formatCurrency(getProductMrr(product, definition)) + "/月 / 認知" + Math.round(product.awareness) + marketingText;
    }).join(" | ");
  }

  function getProductProgressPercent(product, definition) {
    return clamp((safeNumber(product.progress, 0) / definition.developmentRequired) * 100, 0, 100);
  }


  function getAssignedWorkersForProduct(taskId, productId) {
    return getProductAssignment(taskId, productId).aiIds;
  }

  function getAssignedWorkerForProduct(taskId, productId) {
    return getAssignedWorkersForProduct(taskId, productId)[0] || null;
  }

  function getProductLogText(productId, key, fallback) {
    const texts = PRODUCT_LOG_TEXTS[productId] || {};
    return texts[key] || fallback;
  }

  function getProductStatusLabel(status) { return { idea: "未着手", developing: "開発中", ready: "完成", selling: "販売中" }[status] || "未着手"; }
  function getWorkerLabel(workerId) { return WORKERS[workerId] ? WORKERS[workerId].label : workerId; }
  function getTaskHelpText(taskId) {
    const texts = {
      development: "AI社長: 何でもできるが低速 / Dev-01: 開発が速いがバグ増加",
      qa: "AI社長: ゆっくり品質改善 / Security-06: 品質改善とバグ削減が得意",
      sales: "AI社長: 低速で顧客獲得 / Sales-02: 顧客獲得が速いが炎上微増",
      marketing: "AI社長: ゆっくり認知度UP / Buzz-03: 認知度UPが速いが炎上微増",
      support: "AI社長: 低速でサポート負荷DOWN / Care-04: サポート負荷と炎上を大きく下げる",
      crisis: "AI社長: ゆっくり火消し / Fire-05: 炎上対応が速いが少し機会損失"
    };
    return texts[taskId] || "AI社長は汎用、専門AIは得意タスクで高効率です。";
  }

  function getTaskTargetHtml(taskId) {
    const product = getAssignmentProduct(taskId);
    const definition = getProductDefinition(product.id);
    const effects = {
      development: definition.name + "の開発進捗またはバージョンアップを進める",
      sales: definition.name + "の新規顧客を確率で獲得、または売り切り販売を狙う",
      qa: definition.name + "の品質改善と製品バグ削減",
      marketing: definition.name + "の認知度を上げて販売成功率を高める",
      support: definition.name + "のサポート負荷と解約リスクを下げる",
      crisis: definition.name + "まわりの炎上度を下げる"
    };
    return '<span>対象: ' + escapeHtml(definition.name) + '</span><span>効果: ' + escapeHtml(effects[taskId] || definition.name + "を支援") + '</span>';
  }

  function getProductSalesStateText(product, definition) {
    const workerIds = getAssignedWorkersForProduct("sales", definition.id);
    if (product.status === "selling" && workerIds.length) return getWorkerGroupLabel(workerIds) + "が" + definition.name + "を販売中";
    if (product.status === "selling" && definition.type === "subscription") return "販売担当なし。既存MRRは継続します。販売担当を置くと新規顧客を獲得できます。";
    if (product.status === "selling" && definition.type === "oneShot") return "販売担当を置くと販売判定が進みます。";
    if (product.status === "ready") return "未割り振り。販売担当を選ぶと新規顧客を獲得できます";
    return "未販売。完成後に販売タスクを割り振れます";
  }


  function getEmployee(employeeId) { return EMPLOYEES.find(function (employee) { return employee.id === employeeId; }); }
  function sanitizeRuntimeState() { state.money = Math.max(0, safeNumber(state.money, 0)); state.totalMoney = Math.max(0, safeNumber(state.totalMoney, 0)); state.users = Math.max(0, safeNumber(state.users, 0)); state.bugs = clamp(safeNumber(state.bugs, 0), 0, 100); state.fire = clamp(safeNumber(state.fire, 0), 0, 100); state.products = normalizeProducts(state.products); state.productFlags = normalizeProductFlags(state.productFlags); state.assignments = normalizeAssignments(state.assignments, state.employees); state.pendingDecisionEvent = normalizeDecisionEvent(state.pendingDecisionEvent); state.decisionEventCooldown = clamp(Math.floor(safeNumber(state.decisionEventCooldown, DECISION_EVENT_RETRY_SECONDS)), 0, DECISION_EVENT_COOLDOWN_SECONDS); state.companyLevel = clamp(Math.floor(safeNumber(state.companyLevel, 1)), 1, MAX_LEVEL); }
  function formatNumber(value) { const number = Math.max(0, safeNumber(value, 0)); if (number >= 1000000000) return (number / 1000000000).toFixed(1) + "B"; if (number >= 1000000) return (number / 1000000).toFixed(1) + "M"; if (number >= 1000) return (number / 1000).toFixed(1) + "K"; return Math.floor(number).toString(); }
  function formatCurrency(value) { return "¥" + formatNumber(value); }
  function formatCurrencyPrecise(value) { const number = Math.max(0, safeNumber(value, 0)); return "¥" + (number > 0 && number < 10 ? number.toFixed(1) : formatNumber(number)); }
  function formatCustomers(value) { return formatNumber(getProductCustomers({ customers: value })) + "社"; }
  function formatSignedCurrencyRate(value) { const number = safeNumber(value, 0); return (number >= 0 ? "+" : "-") + formatCurrency(Math.abs(number)); }
  function signedNumber(value) { const number = safeNumber(value, 0); return (number >= 0 ? "+" : "-") + formatNumber(Math.abs(number)) + " / 10秒"; }
  function signedCurrency(value) { const number = safeNumber(value, 0); return (number >= 0 ? "+" : "-") + "¥" + formatNumber(Math.abs(number)) + " / 10秒"; }
  function formatTime(timestamp) { return new Date(safeNumber(timestamp, Date.now())).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }); }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function safeNumber(value, fallback) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }
  function setText(id, value) { const element = document.getElementById(id); if (element) element.textContent = value; }
  function escapeHtml(value) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

  function boot() {
    loadGame();
    render();
    scheduleRandomReport();
    scheduleNextTick();
    window.setInterval(saveGame, AUTO_SAVE_MS);
    document.getElementById("saveButton").addEventListener("click", function () { addLog("success", "手動保存しました。AI社長の記憶領域に刻まれています。", "company"); saveGame(); renderLatestLog(); renderLogs(); });
    const shareButton = document.getElementById("shareButton");
    if (shareButton) shareButton.addEventListener("click", shareGameStatus);
    document.getElementById("resetButton").addEventListener("click", resetGame);
    const onboardingClose = document.getElementById("onboardingClose");
    if (onboardingClose) onboardingClose.addEventListener("click", dismissOnboarding);
    window.addEventListener("beforeunload", saveGame);
    registerServiceWorker();
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    navigator.serviceWorker.register("sw.js?v=20260524-31").then(function (registration) {
      if (registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
      registration.addEventListener("updatefound", function () {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", function () {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            worker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    }).catch(function (error) {
      console.warn("Service worker registration failed.", error);
    });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
