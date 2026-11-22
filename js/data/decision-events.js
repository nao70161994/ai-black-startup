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
    },
    {
      id: "sales_contract_followup",
      label: "大型契約の納品確認",
      workerId: "sales02",
      message: "Sales-02「先日の大型契約、約束した内容の確認が来ています。ここで追加対応しますか？」",
      approveImpact: "追加対応: 費用-¥800 / 品質+4 / 製品バグ-6 / 満足度+5",
      rejectImpact: "見送り: 製品炎上+10 / 満足度-6",
      riskLevel: "warning",
      followup: true
    },
    {
      id: "campaign_aftershock",
      label: "広告キャンペーンの余波",
      workerId: "buzz03",
      message: "Buzz-03「先日の広告がまだ伸びています。訂正文を出すか、このまま乗りますか？」",
      approveImpact: "訂正する: 炎上-10 / 製品炎上-8 / 認知度-4",
      rejectImpact: "乗り続ける: 認知度+10 / 炎上+8 / 製品炎上+6",
      riskLevel: "warning",
      followup: true
    }
    ,
    {
      id: "board_sales_growth",
      label: "取締役会：売上成長投資",
      workerId: "sales02",
      message: "Sales-02「株主の皆さん、成長率のグラフを見てください。広告枠を増やせば、数字はもっと華やかになります。ええ、費用の話は次のページです。」",
      approveImpact: "承認: 認知度+8 / 株主満足度+4",
      rejectImpact: "却下: 株主満足度-2。堅実路線を継続",
      riskLevel: "normal"
    },
    {
      id: "board_quality_investment",
      label: "取締役会：品質投資",
      workerId: "security06",
      message: "Security-06「品質監査の予算を申請します。今のうちに穴を塞げば、後の説明責任を減らせます。リリース前に深呼吸をお願いします。」",
      approveImpact: "承認: 品質+6 / バグ-8 / 費用-¥1,200 / 株主満足度+4",
      rejectImpact: "却下: 製品炎上+2 / 株主満足度-3",
      riskLevel: "normal"
    },
    {
      id: "board_customer_protection",
      label: "取締役会：顧客保護方針",
      workerId: "care04",
      message: "Care-04「お客様の声をまとめました。短期コストは増えますが、問い合わせ対応と解約予防に予算を回したいです。」",
      approveImpact: "承認: サブスク満足度+4 / 解約リスク-3 / 費用-¥900 / 株主満足度+3",
      rejectImpact: "却下: 株主満足度-3。短期費用を抑制",
      riskLevel: "normal"
    },
    {
      id: "board_brand_campaign",
      label: "取締役会：広報キャンペーン",
      workerId: "buzz03",
      message: "Buzz-03「この企画、絶対に伸びます。株主向けの説明資料は後で作ります。まずはトレンドに乗りましょう！」",
      approveImpact: "承認: 認知度+12 / 炎上+4 / 製品炎上+5 / 株主満足度+1",
      rejectImpact: "却下: 株主満足度-1。慎重な広報を選択",
      riskLevel: "warning"
    },
    {
      id: "board_crisis_response",
      label: "取締役会：危機対応予算",
      workerId: "fire05",
      message: "Fire-05「謝罪文を用意しました。今回は余計な一文を入れずに、被害拡大を止めます。予算の承認をお願いします。」",
      approveImpact: "承認: 炎上-10 / 製品炎上-12 / 費用-¥600 / 株主満足度+3",
      rejectImpact: "却下: 炎上+3 / 株主満足度-4",
      riskLevel: "warning"
    },
    {
      id: "board_dividend",
      label: "取締役会：株主配当",
      workerId: "boss",
      message: "AI社長「内部留保の一部を配当へ回す案です。株主は喜びますが、手元資金は減ります。成長投資とのバランスをどうしますか？」",
      approveImpact: "承認: 手持ち資金の2%を配当（最低¥100） / 株主満足度+6",
      rejectImpact: "却下: 成長投資を優先 / 株主満足度-3",
      riskLevel: "normal"
    },
    {
      id: "whiteai_price_war",
      label: "ホワイトAIの価格攻勢",
      workerId: "sales02",
      message: "Sales-02「株式会社ホワイトAIが勤怠SaaSの月額を値下げしました。こちらも対抗値下げを出せますが、利益率の説明は私に任せてください。」",
      approveImpact: "承認: 自社シェア獲得キャンペーン。認知度+10 / 炎上+2",
      rejectImpact: "却下: 値下げ競争を避け、通常運用を継続",
      riskLevel: "warning"
    },
    {
      id: "whiteai_enterprise_contract",
      label: "ホワイトAIの大型契約",
      workerId: "buzz03",
      message: "Buzz-03「ホワイトAIが大企業との契約を発表！話題が持っていかれています。こちらもキャンペーンを打てば、たぶんもっと伸びます！」",
      approveImpact: "承認: 自社認知度+15 / 炎上+3",
      rejectImpact: "却下: 競合の発表を静観",
      riskLevel: "warning"
    },
    {
      id: "whiteai_data_incident",
      label: "ホワイトAIの情報管理事故",
      workerId: "security06",
      message: "Security-06「株式会社ホワイトAIで情報管理上の事故が報告されました。競合の信用低下に乗じる場合も、誤認を招く表現は避けてください。」",
      approveImpact: "承認: 比較広告を適正範囲で実施。自社認知度+8 / 株主満足度+1",
      rejectImpact: "却下: 他社の事故を利用せず、通常の品質改善を継続",
      riskLevel: "normal"
    },
    {
      id: "second_founding_board",
      label: "第二創業の経営会議",
      workerId: "boss",
      message: "AI社長「会社Lv10、総MRR ¥1M、全サブスクv5、専門AI6体の雇用を確認しました。ここから先も成長を続けるため、第二創業を宣言しますか？」",
      approveImpact: "承認: 第二創業を開始し、新しい長期目標と実績を解放",
      rejectImpact: "却下: 現体制を維持します。条件を満たしている限り、次の経営会議で再提案します。",
      riskLevel: "warning"
    }
  ];
