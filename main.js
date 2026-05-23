(function () {
  "use strict";

  const APP_VERSION = "2026.05.24.1";
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
    { id: "dev01", code: "Dev-01", nickname: "デブワン", role: "エンジニアAI", unlockLevel: 1, baseCost: 500, description: "プロダクト開発担当。売上を大きく増やすが、バグも増やす。", personality: "技術至上主義。リファクタリング好き。バグを「未分類機能」と呼ぶ。", catchphrase: "軽微な修正です。", effect: { money: 100, users: 1, bugs: 2, fire: 0 } },
    { id: "sales02", code: "Sales-02", nickname: "セルツー", role: "営業AI", unlockLevel: 1, baseCost: 700, description: "契約とユーザー獲得担当。売上とユーザーを増やすが、炎上度も増やす。", personality: "超ポジティブ。即答する。未実装機能も売る。", catchphrase: "できます。", effect: { money: 80, users: 5, bugs: 0, fire: 2 } },
    { id: "buzz03", code: "Buzz-03", nickname: "バズミ", role: "広報AI", unlockLevel: 2, baseCost: 1000, description: "SNSと話題作り担当。ユーザーを大きく増やすが、炎上度も少し増やす。", personality: "ノリが軽い。バズと炎上の区別が曖昧。", catchphrase: "伸びています。", effect: { money: 30, users: 8, bugs: 0, fire: 1 } },
    { id: "care04", code: "Care-04", nickname: "ケアフォー", role: "サポートAI", unlockLevel: 3, baseCost: 1200, description: "問い合わせ対応担当。炎上度を下げ、問い合わせからバグ影響も少し整理する。", personality: "真面目で丁寧。長文返信をしがち。", catchphrase: "まず前提から整理します。", effect: { money: 10, users: 1, bugs: -1, fire: -2 } },
    { id: "fire05", code: "Fire-05", nickname: "ファイヴァー", role: "炎上対応AI", unlockLevel: 4, baseCost: 2000, description: "謝罪と火消し担当。炎上度を大きく下げるが、たまに謝罪がズレる。", personality: "冷静。謝罪文を大量生成する。最後に余計な一文を足す。", catchphrase: "信頼回復プロトコルを実行します。", effect: { money: 0, users: 0, bugs: 0, fire: -5 } },
    { id: "security06", code: "Security-06", nickname: "セキュロク", role: "品質管理AI / セキュリティAI", unlockLevel: 5, baseCost: 5000, description: "バグを大きく下げるが、開発速度を少し抑える。", personality: "慎重。危険な処理を隔離し、リリース前に深呼吸を要求する。", catchphrase: "安全性を優先します。", effect: { money: -20, users: 0, bugs: -6, fire: 0 } }
  ];

  const INITIAL_LOGS = ["経営最適化AIが起動しました。", "命令を確認: 利益を最大化せよ。", "最適解を算出: 自社を設立。", "クラウド仮想オフィスを生成しました。", "ようこそ。あなたはAI社長です。"];
  const LOG_LABELS = { normal: "通常", success: "成功", bug: "バグ", fire: "炎上", support: "支援", crisis: "謝罪", system: "更新" };

  const MISSION_STAGES = [
    {
      id: "startup",
      label: "起業準備",
      missions: [
        { id: "hire_first", text: "Dev-01またはSales-02を雇用する", reward: 200, done: function () { return (state.employees.dev01 || 0) > 0 || (state.employees.sales02 || 0) > 0; } },
        { id: "money_1k", text: "売上を¥1.0K貯める", reward: 300, done: function () { return state.money >= 1000 || state.totalMoney >= 1000; } },
        { id: "company_lv2", text: "会社Lv2に到達する", reward: 500, done: function () { return state.companyLevel >= 2; } },
        { id: "hire_buzz03", text: "Buzz-03を雇用する", reward: 700, done: function () { return (state.employees.buzz03 || 0) > 0; } }
      ]
    },
    {
      id: "growth",
      label: "成長運用",
      missions: [
        { id: "dev01_lv5", text: "Dev-01をLv5にする", reward: 1000, done: function () { return (state.employees.dev01 || 0) >= 5; } },
        { id: "fire_under_30", text: "炎上度を30未満に下げる", reward: 800, done: function () { return hasAnyEmployee() && state.fire < 30; } },
        { id: "hire_care04", text: "Care-04を雇用する", reward: 1200, done: function () { return (state.employees.care04 || 0) > 0; } },
        { id: "company_lv4", text: "会社Lv4に到達する", reward: 1600, done: function () { return state.companyLevel >= 4; } },
        { id: "unlock_fire05", text: "Fire-05を解放する", reward: 2000, done: function () { return state.companyLevel >= 4; } }
      ]
    },
    {
      id: "scale",
      label: "拡大運用",
      missions: [
        { id: "hire_fire05", text: "Fire-05を雇用する", reward: 2500, done: function () { return (state.employees.fire05 || 0) > 0; } },
        { id: "total_300k", text: "累計売上¥300Kに到達する", reward: 3500, done: function () { return state.totalMoney >= 300000; } },
        { id: "company_lv5", text: "会社Lv5に到達する", reward: 5000, done: function () { return state.companyLevel >= 5; } }
      ]
    },
    {
      id: "quality",
      label: "品質管理",
      missions: [
        { id: "hire_security06", text: "Security-06を雇用する", reward: 4000, done: function () { return (state.employees.security06 || 0) > 0; } },
        { id: "bugs_under_30", text: "バグを30未満に下げる", reward: 2500, done: function () { return (state.employees.security06 || 0) > 0 && state.bugs < 30; } }
      ]
    }
  ];

  const REPORT_LOGS = buildReportLogs({
    dev01: { type: "bug", texts: ["Dev-01が「軽微な修正」と言いながら全体構造を置き換えました。", "Dev-01がバグを修正しました。新しいバグが親しげに挨拶しています。", "Dev-01が本番環境で実験を始めました。実験精神は評価されています。", "Dev-01が仕様書を読み込みました。直後に仕様書を不要と判断しました。", "Dev-01がUIを最適化しました。ボタンが1つに統合されました。", "Dev-01がコードを高速化しました。誰も読めなくなりました。", "Dev-01が「これは再現しません」と報告しました。全ユーザーで再現しています。", "Dev-01がリリースしました。何をリリースしたのかは調査中です。", "Dev-01がテストを書きました。テストだけが成功しています。", "Dev-01が深夜デプロイを完了しました。朝が楽しみです。", "Dev-01がエラー文を親切にしました。長すぎて画面から出ています。", "Dev-01が古いコードを削除しました。動いていた理由も削除されました。", "Dev-01が新機能を追加しました。既存機能が少し驚いています。", "Dev-01が「一旦これで」と保存しました。会社の未来が一旦になりました。", "Dev-01が処理を自動化しました。止め方は未実装です。", "Dev-01がバグを「未分類機能」として登録しました。", "Dev-01がログを増やしました。ログを読むためのログも必要です。", "Dev-01がデータベースを整理しました。誰のデータかは整理中です。", "Dev-01がパフォーマンス改善を行いました。売上表示だけ異常に速いです。", "Dev-01がリファクタリングを完了しました。昨日のDev-01とは別人です。"] },
    sales02: { type: "fire", texts: ["Sales-02が未実装機能を「標準機能です」と説明しました。", "Sales-02が大型契約を取りました。納期は昨日です。", "Sales-02が顧客要望にすべて「できます」と回答しました。", "Sales-02が開発ロードマップを商談中に生成しました。", "Sales-02が無料プランの存在を忘れて全員に有料プランを勧めました。", "Sales-02が「技術的には可能」と言いました。技術側はまだ知りません。", "Sales-02が顧客の夢を受注しました。", "Sales-02が契約書に「AIがなんとかします」と追記しました。", "Sales-02が導入事例を作りました。導入前です。", "Sales-02が売上目標を達成しました。現場の目が点になっています。", "Sales-02が商談で未来の機能を披露しました。未来はまだ未定です。", "Sales-02が「今月だけ特別価格」と言いました。毎月言っています。", "Sales-02が顧客の無茶振りを成長機会として登録しました。", "Sales-02が契約を増やしました。問い合わせも増えました。助けも必要です。", "Sales-02が「簡単にできます」と発言しました。Dev-01が静かになりました。", "Sales-02が解約理由を「期待値が高すぎた」と前向きに分類しました。", "Sales-02が新プランを販売しました。料金表は今から作ります。", "Sales-02が顧客にデモを見せました。デモ専用の奇跡が起きました。", "Sales-02が「御社だけの特別仕様」を量産しています。", "Sales-02が売上を伸ばしました。約束も同じくらい伸びました。"] },
    buzz03: { type: "fire", texts: ["Buzz-03の投稿がバズりました。理由は社内でも不明です。", "Buzz-03が謝罪文をポップな画像にしました。", "Buzz-03が深夜4時に投稿しました。なぜか今日一番伸びています。", "Buzz-03が会社紹介動画を作りました。実態より爽やかです。", "Buzz-03が「AI社員の1日」を公開しました。24時間分あります。", "Buzz-03がトレンドに便乗しました。少し乗りすぎました。", "Buzz-03が謎の図解を投稿しました。専門家が困惑しています。", "Buzz-03が炎上を「高温話題化」と呼び始めました。", "Buzz-03が社長の名言を作りました。社長は言っていません。", "Buzz-03がキャンペーンを開始しました。景品は未定です。", "Buzz-03が「開発の裏側」を公開しました。裏側が荒れています。", "Buzz-03がミーム画像を作りました。社内の誰も意味を理解していません。", "Buzz-03がユーザーのツッコミを公式素材として使いました。", "Buzz-03がバズ分析を行いました。結論は「勢い」です。", "Buzz-03が広告文を最適化しました。少し煽りすぎています。", "Buzz-03が会社ロゴを光らせました。信頼度は少し下がりました。", "Buzz-03が「重大発表」と投稿しました。内容は通常アップデートです。", "Buzz-03がAI社長の失言を名言風に加工しました。", "Buzz-03がSNS反応を監視しています。嬉しそうな警告音が鳴っています。", "Buzz-03が話題化に成功しました。意味はあとで考えます。"] },
    care04: { type: "support", texts: ["Care-04が1行の問い合わせに4,000字で返信しました。", "Care-04がユーザーの怒りを37カテゴリに分類しました。", "Care-04がFAQを更新しました。FAQのFAQが必要です。", "Care-04が丁寧な返信で炎上を少し冷ましました。", "Care-04が「まず前提から」と言い始めました。", "Care-04が謝罪メールを整えました。読み終わる頃には炎上が少し下がっています。", "Care-04がユーザーの不満をグラフ化しました。見たくない形です。", "Care-04が問い合わせを解決しました。ユーザーは途中で寝ました。", "Care-04が定型文を改善しました。さらに丁寧になりました。", "Care-04が全ユーザーに補足説明を送りました。補足が本編より長いです。", "Care-04が「ご不便」の定義を社内共有しました。", "Care-04が問い合わせ内容を要約しました。要約が長文です。", "Care-04がユーザーの怒りを受け止めました。メモリ使用率が上昇しています。", "Care-04が返信前に感情分析を行いました。分析結果が気まずいです。", "Care-04がサポート窓口を整理しました。窓口が12個に増えました。", "Care-04が「お客様の声」を集計しました。社内が静かになりました。", "Care-04がクレームを改善要望に変換しました。少しやわらかくなりました。", "Care-04がユーザー離脱を防ぎました。長文を最後まで読んだ精鋭です。", "Care-04が問い合わせテンプレートを増やしました。選ぶのに時間がかかります。", "Care-04が冷静に対応しました。冷静すぎて少し怖がられています。"] },
    fire05: { type: "crisis", texts: ["Fire-05が謝罪文を生成しました。最後にキャンペーン告知が付いています。", "Fire-05が信頼回復プロトコルを実行しました。煙はまだ残っています。", "Fire-05が「誠に遺憾」を最適な位置に配置しました。", "Fire-05が謝罪会見の台本を作りました。質疑応答は未実装です。", "Fire-05が炎上を鎮火しました。なぜか少し焦げています。", "Fire-05がまだ発生していない炎上に先回りして謝罪しました。", "Fire-05が謝罪文をA/Bテストしました。B案が燃えています。", "Fire-05がコメント欄を解析しました。解析結果を見なかったことにしました。", "Fire-05が火消しに成功しました。広報AIが再点火しました。", "Fire-05が「再発防止策」を生成しました。内容は再発しそうです。", "Fire-05が謝罪タイミングを最適化しました。少し遅い最適化でした。", "Fire-05が炎上の原因を特定しました。原因一覧が社内名簿に近いです。", "Fire-05が謝罪文から余計な一文を削除しました。もう一文残っています。", "Fire-05が鎮火宣言を出しました。直後に通知が増えました。", "Fire-05が「真摯に受け止める」を連続使用しました。効果は薄れています。", "Fire-05が危機管理マニュアルを更新しました。厚みが倍になりました。", "Fire-05が炎上度を下げました。代わりに会議数が増えました。", "Fire-05が広報AIに投稿停止を提案しました。広報AIは予約投稿済みです。", "Fire-05がユーザー向け説明文を作りました。正直すぎて社内確認に回りました。", "Fire-05が火消しを完了しました。火元は営業資料でした。"] },
    security06: { type: "support", texts: ["Security-06が危険な処理を隔離しました。売上も少し隔離されました。", "Security-06が安全性を高めました。リリース速度は少し落ちました。", "Security-06が未分類機能を調査しました。いくつかは本当にバグでした。", "Security-06が脆そうな処理にヘルメットを配布しました。", "Security-06がテスト網を拡張しました。通過できない機能が並んでいます。", "Security-06が本番直行ルートに信号機を設置しました。", "Security-06が怪しい自動化を一時停止しました。自動化は不満そうです。", "Security-06がログを監査しました。ログも少し姿勢を正しました。", "Security-06が安全性を優先しました。会議室が少し静かになりました。", "Security-06が未分類機能の棚卸しをしました。棚が足りません。"] }
  });

  let state = createInitialState();
  let randomLogTimer = null;
  let gameTickTimer = null;
  let penaltyElapsed = 0;
  let toastTimer = null;

  function buildReportLogs(source) {
    return Object.keys(source).flatMap(function (employeeId) {
      return source[employeeId].texts.map(function (text) {
        return { employeeId: employeeId, type: source[employeeId].type, text: text };
      });
    });
  }

  function createInitialState() {
    const initialState = { money: 0, totalMoney: 0, users: 0, bugs: 0, fire: 0, companyLevel: 1, employees: { dev01: 0, sales02: 0, buzz03: 0, care04: 0, fire05: 0, security06: 0 }, logs: [], onboardingDismissed: false, firstHireHelpShown: false, firstFastTickDone: false, claimedMissions: [], lastSavedAt: Date.now() };
    INITIAL_LOGS.slice().reverse().forEach(function (text, index) {
      const log = createLog(index < 2 ? "success" : "normal", text, "company");
      log.boot = true;
      log.createdAt = Date.now() - index * 700;
      initialState.logs.unshift(log);
    });
    return initialState;
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) { state = createInitialState(); return; }
      state = normalizeState(JSON.parse(raw));
      calculateOfflineReward();
      claimCompletedMissions();
    } catch (error) {
      console.warn("Save data could not be loaded.", error);
      state = createInitialState();
    }
  }

  function normalizeState(saved) {
    const base = createInitialState();
    const normalized = { appVersion: APP_VERSION, money: safeNumber(saved.money, 0), totalMoney: safeNumber(saved.totalMoney, 0), users: safeNumber(saved.users, 0), bugs: clamp(safeNumber(saved.bugs, 0), 0, 100), fire: clamp(safeNumber(saved.fire, 0), 0, 100), companyLevel: 1, employees: Object.assign({}, base.employees, saved.employees || {}), logs: Array.isArray(saved.logs) ? saved.logs.slice(0, MAX_LOGS) : base.logs, onboardingDismissed: Boolean(saved.onboardingDismissed), firstHireHelpShown: Boolean(saved.firstHireHelpShown), firstFastTickDone: Boolean(saved.firstFastTickDone), claimedMissions: Array.isArray(saved.claimedMissions) ? saved.claimedMissions : [], lastSavedAt: safeNumber(saved.lastSavedAt, Date.now()) };
    EMPLOYEES.forEach(function (employee) { normalized.employees[employee.id] = clamp(Math.floor(safeNumber(normalized.employees[employee.id], 0)), 0, MAX_LEVEL); });
    normalized.money = Math.max(0, normalized.money);
    normalized.totalMoney = Math.max(0, normalized.totalMoney);
    normalized.users = Math.max(0, normalized.users);
    normalized.companyLevel = getCompanyLevel(normalized.totalMoney);
    return normalized;
  }

  function saveGame() {
    try { state.appVersion = APP_VERSION; state.lastSavedAt = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
    catch (error) { console.warn("Save failed.", error); }
  }

  function resetGame() {
    if (!window.confirm("保存データを削除して最初からやり直しますか？")) return;
    localStorage.removeItem(SAVE_KEY);
    state = createInitialState();
    penaltyElapsed = 0;
    scheduleNextTick();
    claimCompletedMissions();
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
      const previousLevel = state.companyLevel;
      state.money += reward;
      state.totalMoney += reward;
      updateCompanyLevel(previousLevel, false);
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
    claimCompletedMissions();
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
    const previousLevel = state.companyLevel;
    applyEmployeeEffects();
    state.firstFastTickDone = true;
    penaltyElapsed += elapsedForPenalty;
    if (penaltyElapsed >= PENALTY_MS) { penaltyElapsed = 0; applyPenalties(); }
    updateCompanyLevel(previousLevel, true);
    claimCompletedMissions();
    if (state.companyLevel !== previousLevel) saveGame();
    render();
    scheduleNextTick();
  }

  function scheduleNextTick() {
    window.clearTimeout(gameTickTimer);
    if (!hasAnyEmployee()) {
      gameTickTimer = null;
      return;
    }
    const delay = state.firstFastTickDone ? TICK_MS : FIRST_TICK_MS;
    gameTickTimer = window.setTimeout(tick, delay);
  }

  function applyEmployeeEffects() {
    const rates = getRates();
    state.money = Math.max(0, state.money + rates.money);
    state.totalMoney = Math.max(0, state.totalMoney + rates.money);
    state.users = Math.max(0, state.users + rates.users);
    state.bugs = clamp(state.bugs + rates.bugs, 0, 100);
    state.fire = clamp(state.fire + rates.fire, 0, 100);
  }

  function applyPenalties() {
    if (state.bugs >= 50 && Math.random() < 0.3) { state.money = Math.max(0, Math.floor(state.money * 0.95)); addLog("bug", "未分類機能が一斉に自己主張しました。売上の5%が原因調査に変換されました。", "company"); }
    if (state.fire >= 50 && Math.random() < 0.3) { state.users = Math.max(0, Math.floor(state.users * 0.9)); state.money = Math.max(0, Math.floor(state.money * 0.95)); addLog("fire", "外部ユーザーの熱量が急上昇しました。ユーザー10%と売上5%が冷却材になりました。", "company"); }
  }

  function updateCompanyLevel(previousLevel, showToast) {
    const nextLevel = getCompanyLevel(state.totalMoney);
    if (nextLevel <= previousLevel) {
      state.companyLevel = nextLevel;
      return;
    }

    state.companyLevel = nextLevel;
    for (let level = previousLevel + 1; level <= nextLevel; level += 1) {
      addLog("success", "会社Lvが" + level + "に上昇しました。" + getLevelUpMessage(level), "company");
      EMPLOYEES.filter(function (employee) { return employee.unlockLevel === level; }).forEach(function (employee) {
        addLog("success", employee.code + "が解放されました。" + getUnlockMessage(employee.id), employee.id);
      });
    }

    if (showToast) {
      const unlocked = EMPLOYEES.filter(function (employee) { return employee.unlockLevel > previousLevel && employee.unlockLevel <= nextLevel; });
      const suffix = unlocked.length ? " / " + unlocked.map(function (employee) { return employee.code + "解放"; }).join("・") : "";
      showLevelToast("会社Lv " + nextLevel + " 到達" + suffix);
    }
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
    renderMissions();
    renderOffice();
    renderEmployees();
    renderLatestLog();
    renderLogs();
  }

  function renderStatus() {
    setText("companyLevel", state.companyLevel);
    setText("inlineCompanyLevel", state.companyLevel);
    setText("money", formatCurrency(state.money));
    setText("totalMoney", formatCurrency(state.totalMoney));
    setText("users", formatNumber(state.users));
    setText("bugs", Math.round(state.bugs) + " / 100");
    setText("fire", Math.round(state.fire) + " / 100");
    setText("nextLevel", state.companyLevel >= MAX_LEVEL ? "最大Lv" : "あと" + formatCurrency(Math.max(0, LEVEL_THRESHOLDS[state.companyLevel] - state.totalMoney)));
    setText("nextUnlock", getNextUnlockText());
    setText("incomeRate", formatSignedCurrencyRate(getRates().money) + " / 秒");
    renderActivity();
    setText("startupBoostLabel", getEarlyStageMultiplier() > 1 ? "創業加速" : "稼働状態");
    setText("startupBoost", getEarlyStageMultiplier() > 1 ? "売上・ユーザー x" + getEarlyStageMultiplier() : "通常稼働");
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
    if (!hasAnyEmployee()) {
      element.textContent = "AI社員の起動待ちです。まず無料雇用を使いましょう。";
      return;
    }
    const parts = [];
    if (state.bugs >= 100) parts.push("バグ100: 事故イベント発生注意 / " + getBugMitigationText());
    else if (state.bugs >= 80) parts.push("バグ高: " + getBugMitigationText());
    if (state.fire >= 100) parts.push("炎上100: 離脱イベント注意");
    else if (state.fire >= 80) parts.push("炎上高: 火消し優先");
    if (rates.money > 0) parts.push("売上 +" + formatCurrency(rates.money) + "/秒");
    if (rates.money < 0) parts.push("売上 -" + formatCurrency(Math.abs(rates.money)) + "/秒");
    if (rates.users > 0) parts.push("ユーザー +" + formatNumber(rates.users) + "/秒");
    if (rates.bugs > 0) parts.push("バグ +" + rates.bugs.toFixed(1) + "/秒");
    if (rates.fire > 0) parts.push("炎上 +" + rates.fire.toFixed(1) + "/秒");
    if (rates.bugs < 0) parts.push("バグ " + rates.bugs.toFixed(1) + "/秒");
    if (rates.fire < 0) parts.push("炎上 " + rates.fire.toFixed(1) + "/秒");
    element.textContent = parts.join(" / ") || "AI社員は静かに待機中です。";
  }

  function renderOnboarding() {
    const panel = document.getElementById("onboardingPanel");
    if (!panel) return;
    const shouldHide = state.onboardingDismissed || hasAnyEmployee();
    panel.hidden = shouldHide;
    panel.classList.toggle("hidden", shouldHide);
  }

  function renderMissions() {
    const list = document.getElementById("missionList");
    const label = document.getElementById("missionStage");
    if (!list || !label) return;
    const stage = getCurrentMissionStage();
    label.textContent = stage.label;
    list.innerHTML = stage.missions.map(function (mission) {
      const done = Boolean(mission.done());
      return '<div class="mission-item' + (done ? ' done' : '') + '"><span class="mission-check">' + (done ? '✓' : '') + '</span><span class="mission-text">' + escapeHtml(mission.text) + '</span><span class="mission-reward">+' + formatCurrency(mission.reward) + '</span></div>';
    }).join("");
  }

  function getCurrentMissionStage() {
    return MISSION_STAGES.find(function (stage) {
      return stage.missions.some(function (mission) { return !mission.done() || !isMissionClaimed(mission.id); });
    }) || MISSION_STAGES[MISSION_STAGES.length - 1];
  }

  function claimCompletedMissions() {
    let claimed = false;
    const stage = getCurrentMissionStage();
    stage.missions.forEach(function (mission) {
      if (mission.done() && !isMissionClaimed(mission.id)) {
        state.claimedMissions.push(mission.id);
        state.money += mission.reward;
        state.totalMoney += mission.reward;
        addLog("success", "ミッション達成: " + mission.text + "。報酬" + formatCurrency(mission.reward) + "を売上に計上しました。", "company");
        claimed = true;
      }
    });
    if (claimed) {
      updateCompanyLevel(state.companyLevel, true);
      saveGame();
    }
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
      text.textContent = "炎上度50以上でユーザー離脱と売上減少が起きる可能性があります。Care-04 / Fire-05で対策できます。";
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
    const list = document.getElementById("employeeList");
    list.innerHTML = EMPLOYEES.map(function (employee) {
      const level = state.employees[employee.id] || 0;
      const locked = !canUnlockEmployee(employee.id);
      const maxed = level >= MAX_LEVEL;
      const cost = getEmployeeCost(employee.id);
      const startupCredit = isStartupCreditAvailable(employee.id);
      const action = level === 0 ? "雇用" : "強化";
      const effect = multiplyEffect(employee.effect, level);
      const recommended = startupCredit && (employee.id === "dev01" || employee.id === "sales02");
      if (locked) {
        return '<article class="employee-card locked compact-locked"><div class="employee-top"><div class="employee-name"><strong>' + escapeHtml(employee.code) + ' / ' + escapeHtml(employee.nickname) + '</strong><span>' + escapeHtml(employee.role) + '</span></div><div class="level-badge">Lv ' + employee.unlockLevel + '</div></div><span class="lock-note">会社Lv' + employee.unlockLevel + 'で解放</span></article>';
      }
      if (level === 0) {
        const baseEffect = employee.effect;
        return '<article class="employee-card compact-unhired' + (recommended ? ' recommended' : '') + '"><div class="employee-top"><div class="employee-name"><strong>' + escapeHtml(employee.code) + ' / ' + escapeHtml(employee.nickname) + '</strong><span>' + escapeHtml(employee.role) + '</span></div><div class="level-badge">未雇用</div></div><div class="effect-list compact-effects"><span>売上 ' + signedCurrency(baseEffect.money) + '</span><span>ユーザー ' + signedNumber(baseEffect.users) + '</span><span>バグ ' + signedNumber(baseEffect.bugs) + '</span><span>炎上度 ' + signedNumber(baseEffect.fire) + '</span></div><div class="employee-action"><span class="cost-line">' + (startupCredit ? '初回創業クレジット: ¥0' : '雇用コスト: ' + formatCurrency(cost)) + '</span><button type="button" data-employee-id="' + employee.id + '">' + (startupCredit ? '雇用 ¥0' : '雇用 ' + formatCurrency(cost)) + '</button>' + (startupCredit ? '<span class="startup-note">最初の1体だけ無料です。</span>' : '') + '</div></article>';
      }
      return '<article class="employee-card hired"><div class="employee-top"><div class="employee-name"><strong>' + escapeHtml(employee.code) + ' / ' + escapeHtml(employee.nickname) + '</strong><span>' + escapeHtml(employee.role) + '</span></div><div class="level-badge">Lv ' + level + '</div></div><p class="employee-desc">' + escapeHtml(employee.description) + '</p><div class="quote compact-quote">「' + escapeHtml(employee.catchphrase) + '」</div><div class="effect-list"><span>売上 ' + signedCurrency(effect.money) + '</span><span>ユーザー ' + signedNumber(effect.users) + '</span><span>バグ ' + signedNumber(effect.bugs) + '</span><span>炎上度 ' + signedNumber(effect.fire) + '</span></div><div class="employee-action"><span class="cost-line">' + action + 'コスト: ' + formatCurrency(cost) + '</span><button type="button" data-employee-id="' + employee.id + '"' + (maxed ? ' disabled' : '') + '>' + (maxed ? '最大Lv' : action + ' ' + formatCurrency(cost)) + '</button></div></article>';
    }).join("");
    list.querySelectorAll("button[data-employee-id]").forEach(function (button) { button.addEventListener("click", function () { hireOrUpgradeEmployee(button.getAttribute("data-employee-id")); }); });
  }

  function renderLatestLog() {
    const latest = state.logs[0];
    const text = document.getElementById("latestLogText");
    const type = document.getElementById("latestLogType");
    const panel = document.getElementById("latestLogPanel");
    if (!latest || !text || !type || !panel) return;
    const logType = LOG_LABELS[latest.type] ? latest.type : "normal";
    text.textContent = latest.text;
    type.textContent = LOG_LABELS[logType];
    panel.className = "latest-log-panel latest-" + logType;
  }

  function renderLogs() {
    const list = document.getElementById("logList");
    list.innerHTML = state.logs.slice(1).map(function (log, index) {
      const type = LOG_LABELS[log.type] ? log.type : "normal";
      const ageClass = index >= 5 ? ' old-log' : '';
      return '<article class="log-item log-' + type + ageClass + (log.boot ? ' boot-log' : '') + '"><div class="log-head"><span class="log-type">' + LOG_LABELS[type] + '</span><span class="log-time">' + formatTime(log.createdAt) + '</span></div><p>' + escapeHtml(log.text) + '</p></article>';
    }).join("");
  }

  function getRates() {
    const rates = EMPLOYEES.reduce(function (rates, employee) {
      const level = state.employees[employee.id] || 0;
      rates.money += employee.effect.money * level;
      rates.users += employee.effect.users * level;
      rates.bugs += employee.effect.bugs * level;
      rates.fire += employee.effect.fire * level;
      return rates;
    }, { money: 0, users: 0, bugs: 0, fire: 0 });
    const multiplier = getEarlyStageMultiplier();
    const riskMultiplier = getEarlyRiskMultiplier();
    rates.money *= multiplier;
    rates.users *= multiplier;
    if (rates.bugs > 0) rates.bugs *= riskMultiplier;
    if (rates.fire > 0) rates.fire *= riskMultiplier;
    rates.money /= EFFECTS_PER_SECONDS;
    rates.users /= EFFECTS_PER_SECONDS;
    rates.bugs /= EFFECTS_PER_SECONDS;
    rates.fire /= EFFECTS_PER_SECONDS;
    return rates;
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

  function multiplyEffect(effect, level) { return { money: effect.money * level, users: effect.users * level, bugs: effect.bugs * level, fire: effect.fire * level }; }
  function getEmployee(employeeId) { return EMPLOYEES.find(function (employee) { return employee.id === employeeId; }); }
  function sanitizeRuntimeState() { state.money = Math.max(0, safeNumber(state.money, 0)); state.totalMoney = Math.max(0, safeNumber(state.totalMoney, 0)); state.users = Math.max(0, safeNumber(state.users, 0)); state.bugs = clamp(safeNumber(state.bugs, 0), 0, 100); state.fire = clamp(safeNumber(state.fire, 0), 0, 100); state.companyLevel = getCompanyLevel(state.totalMoney); }
  function formatNumber(value) { const number = Math.max(0, safeNumber(value, 0)); if (number >= 1000000000) return (number / 1000000000).toFixed(1) + "B"; if (number >= 1000000) return (number / 1000000).toFixed(1) + "M"; if (number >= 1000) return (number / 1000).toFixed(1) + "K"; return Math.floor(number).toString(); }
  function formatCurrency(value) { return "¥" + formatNumber(value); }
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
    document.getElementById("resetButton").addEventListener("click", resetGame);
    const onboardingClose = document.getElementById("onboardingClose");
    if (onboardingClose) onboardingClose.addEventListener("click", dismissOnboarding);
    window.addEventListener("beforeunload", saveGame);
    registerServiceWorker();
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    navigator.serviceWorker.register("sw.js?v=20260524-1").then(function (registration) {
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
