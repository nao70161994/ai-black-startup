"use strict";
window.AIBS_DECISION_EVENTS = [
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
      approveImpact: "承認: 満足度+15 / サポート負荷-15 / 費用-¥500",
      rejectImpact: "却下: 解約リスク+5"
    },
    {
      id: "fire05_crisis_statement",
      label: "謝罪文の判断",
      workerId: "fire05",
      message: "Fire-05「今ならまだ謝罪文で済みます。」",
      approveImpact: "承認: 炎上-25 / 費用-¥500",
      rejectImpact: "却下: 炎上+8",
      riskLevel: "warning"
    },
    {
      id: "subscription_price_review",
      label: "上位プランの相談",
      workerId: "sales02",
      message: "Sales-02「価格を少し上げる準備をしませんか？説明資料はもうあります。」",
      approveImpact: "承認: 月額+5% / 認知度+6 / 満足度-5 / 解約リスク+5",
      rejectImpact: "却下: 満足度+2。今は既存顧客を優先します。",
      riskLevel: "warning"
    },
    {
      id: "emergency_quality_fix",
      label: "緊急品質改善",
      workerId: "security06",
      message: "Security-06「この製品バグは、今すぐ止血した方が安全です。」",
      approveImpact: "承認: 製品バグ-20 / 品質+5 / 費用-¥700",
      rejectImpact: "却下: 製品バグ+5"
    },
    {
      id: "one_shot_bulk_sale",
      label: "売り切り大口販売",
      workerId: "sales02",
      message: "Sales-02「この売り切り製品をまとめ買いしたい会社があります。導入理由は勢いです。」",
      approveImpact: "承認: 販売数+1 / 即時売上UP / 炎上+8",
      rejectImpact: "却下: 炎上-1。落ち着いた販売に戻します。",
      riskLevel: "warning"
    },
    {
      id: "vnext_fast_track",
      label: "vNext前倒し",
      workerId: "dev01",
      message: "Dev-01「vNextを前倒しできます。軽微な副作用はあります。」",
      approveImpact: "承認: vNext進捗+25 / 製品バグ+8 / 品質-3",
      rejectImpact: "却下: 変化なし。通常ペースを維持します。",
      riskLevel: "warning"
    },
    {
      id: "competitive_campaign",
      label: "競合対抗キャンペーン",
      workerId: "buzz03",
      message: "Buzz-03「競合が伸びています。こちらもキャンペーンで話題を取りにいきますか？」",
      approveImpact: "承認: 認知度+15 / 費用-¥800 / 炎上+3",
      rejectImpact: "却下: 変化なし。通常運用を続けます。"
    },
    {
      id: "tech_debt_repayment",
      label: "技術的負債返済",
      workerId: "security06",
      message: "Security-06「今なら技術的負債を少し返せます。短期費用は必要です。」",
      approveImpact: "承認: 製品バグ-15 / 品質+8 / 費用-¥600",
      rejectImpact: "却下: 製品バグ+3"
    },
    {
      id: "customer_interview",
      label: "顧客インタビュー",
      workerId: "care04",
      message: "Care-04「導入先に話を聞きませんか？少し手間ですが、満足度の手がかりになります。」",
      approveImpact: "承認: 満足度+8 / 認知度+3 / サポート負荷+3",
      rejectImpact: "却下: 変化なし。問い合わせを待ちます。"
    },
    {
      id: "mystery_big_deal",
      label: "謎の大型案件",
      workerId: "sales02",
      message: "Sales-02「用途はまだ不明ですが、大型案件です。受けますか？」",
      approveImpact: "承認: 顧客または販売数UP / 炎上+8 / 製品バグ+5",
      rejectImpact: "却下: 炎上-1。怪しい案件を見送りました。",
      riskLevel: "warning"
    },
    {
      id: "free_trial_offer",
      label: "無料トライアル提案",
      workerId: "sales02",
      message: "Sales-02「無料トライアルを出せば導入社が増えます。サポートは少し増えます。」",
      approveImpact: "承認: 顧客+1 / 認知度+10 / サポート負荷+5",
      rejectImpact: "却下: 変化なし。通常販売を続けます。"
    },
    {
      id: "vip_customer_support",
      label: "VIP顧客対応",
      workerId: "care04",
      message: "Care-04「大事な導入先を個別対応しましょう。短期費用はかかります。」",
      approveImpact: "承認: 満足度+10 / 解約リスク-5 / 費用-¥700",
      rejectImpact: "却下: 満足度-3"
    },
    {
      id: "sns_fire_response",
      label: "SNS火消し案",
      workerId: "fire05",
      message: "Fire-05「SNSの熱量を今なら抑えられます。早めに火消ししますか？」",
      approveImpact: "承認: 炎上-15 / 費用-¥400",
      rejectImpact: "却下: 炎上+6",
      riskLevel: "warning"
    },
    {
      id: "quality_audit",
      label: "品質監査",
      workerId: "security06",
      message: "Security-06「軽い品質監査を入れますか？短期費用で事故を減らせます。」",
      approveImpact: "承認: 製品バグ-12 / 品質+5 / 費用-¥500",
      rejectImpact: "却下: 製品バグ+3"
    },
    {
      id: "limited_one_shot_sale",
      label: "期間限定セール",
      workerId: "sales02",
      message: "Sales-02「この売り切り製品を期間限定で押し切れます。売れますが、少しざわつきます。」",
      approveImpact: "承認: 販売数+2 / 即時売上UP / 製品炎上+8 / 炎上+4",
      rejectImpact: "却下: 製品炎上-1。通常販売を続けます。",
      riskLevel: "warning"
    },
    {
      id: "server_outage_response",
      label: "サーバー障害対応",
      workerId: "fire05",
      message: "Fire-05「障害対応の告知を今出せば、製品炎上を抑えられます。」",
      approveImpact: "承認: 製品炎上-18 / 製品バグ-5 / 費用-¥600",
      rejectImpact: "却下: 製品炎上+8 / 炎上+4",
      riskLevel: "warning"
    },
    {
      id: "support_discount_offer",
      label: "解約寸前顧客対応",
      workerId: "care04",
      message: "Care-04「解約しそうな導入先に一時値引きと個別対応を提案しますか？」",
      approveImpact: "承認: 月額-3% / 満足度+8 / 解約リスク-8 / サポート負荷-5",
      rejectImpact: "却下: 解約リスク+3",
      riskLevel: "warning"
    },
    {
      id: "security_audit_push",
      label: "セキュリティ監査",
      workerId: "security06",
      message: "Security-06「監査を入れます。短期費用で、事故前に穴を塞げます。」",
      approveImpact: "承認: 製品バグ-18 / 品質+6 / 製品炎上-5 / 費用-¥900",
      rejectImpact: "却下: 製品炎上+3 / 製品バグ+2"
    },
    {
      id: "customer_impossible_request",
      label: "顧客の無茶要望",
      workerId: "care04",
      message: "Care-04「導入先から無茶な要望が来ています。受けると喜ばれますが、現場は少し荒れます。」",
      approveImpact: "承認: 満足度+5 / サポート負荷+10 / 製品バグ+5",
      rejectImpact: "却下: 満足度-3 / サポート負荷-2",
      riskLevel: "warning"
    },
    {
      id: "ai_runaway_proposal",
      label: "AI社員の暴走提案",
      workerId: "boss",
      message: "AI社員が強めの自動化案を持ってきました。伸びますが、説明責任も伸びます。",
      approveImpact: "承認: 対象指標UP / 製品炎上+10 / 炎上+8",
      rejectImpact: "却下: 炎上-1。今日は穏当に進めます。",
      riskLevel: "warning"
    },
    {
      id: "outsourcing_offer",
      label: "外注提案",
      workerId: "boss",
      message: "AI社長「外注で進捗を買えます。品質保証はこれからです。」",
      approveImpact: "承認: 開発進捗UP / 製品バグ+6 / 費用-¥1.2K",
      rejectImpact: "却下: 変化なし。内製を続けます。",
      riskLevel: "warning"
    }
  ];
