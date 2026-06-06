"use strict";
window.AIBS_PRODUCTS = [
    { id: "dailyReportAi", name: "AI日報メーカー", type: "subscription", monthlyPrice: 500, category: "productivity", developmentRequired: 100, demand: 0.8, risk: 0.6, initialQuality: 60 },
    { id: "meetingMinutesAi", name: "自動議事録AI", type: "subscription", monthlyPrice: 1200, category: "document", developmentRequired: 180, demand: 1.0, risk: 1.0, initialQuality: 55 },
    { id: "slideKitAi", name: "AIスライド生成キット", type: "oneShot", price: 9800, category: "oneShotTool", developmentRequired: 160, demand: 1.2, risk: 1.0, initialQuality: 55 },
    { id: "supportReplyAi", name: "AI問い合わせ返信", type: "subscription", monthlyPrice: 900, category: "support", developmentRequired: 140, demand: 1.0, risk: 0.8, initialQuality: 58 },
    { id: "apologyWriterAi", name: "AI謝罪文ジェネレーター", type: "oneShot", price: 7800, category: "crisis", developmentRequired: 120, demand: 0.9, risk: 1.3, initialQuality: 52 }
  ];

window.AIBS_PRODUCT_LOG_TEXTS = {
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
    },
    supportReplyAi: {
      started: "AI問い合わせ返信の開発を開始しました。問い合わせより先に返信案が待機しています。",
      developmentTargetChanged: "開発対象をAI問い合わせ返信に設定しました。",
      noDevelopmentWorker: "次に開発担当を割り振りましょう。返信テンプレートはまだ白紙です。",
      completed: "AI問い合わせ返信が完成しました。返事は速く、前提説明は少し長めです。",
      salesStarted: "AI問い合わせ返信の販売を開始しました。Care-04が導入後の静けさに期待しています。",
      customer10: "AI問い合わせ返信の顧客が10社に到達しました。サポート窓口が少し深呼吸しました。",
      customer50: "AI問い合わせ返信の顧客が50社に到達しました。返信速度が会社の売り文句になっています。",
      customer100: "AI問い合わせ返信の顧客が100社に到達しました。問い合わせが継続収益に変わっています。",
      mrr10k: "AI問い合わせ返信のMRRが¥10K/月を超えました。丁寧な返事が積み上がっています。",
      mrr100k: "AI問い合わせ返信のMRRが¥100K/月を超えました。サポートが経営の柱になり始めました。",
      upgradeStarted: "AI問い合わせ返信 v{version} の開発を開始しました。返答がさらに先回りします。",
      upgradeCompleted: "AI問い合わせ返信が v{version} にアップデートされました。顧客対応が少し落ち着きました。",
      marketingStarted: "Buzz-03がAI問い合わせ返信の広報を開始しました。問い合わせを減らす広告が増えています。",
      awareness50: "AI問い合わせ返信の認知度が50を超えました。サポート担当者が少し前を向きました。",
      awareness100: "AI問い合わせ返信の認知度が100に到達しました。問い合わせ前に名前が出ています。"
    },
    apologyWriterAi: {
      started: "AI謝罪文ジェネレーターの開発を開始しました。まだ何も起きていないのに謝罪文があります。",
      developmentTargetChanged: "開発対象をAI謝罪文ジェネレーターに設定しました。",
      noDevelopmentWorker: "次に開発担当を割り振りましょう。謝罪文はまだ下書きです。",
      completed: "AI謝罪文ジェネレーターが完成しました。Fire-05が静かにうなずいています。",
      salesStarted: "AI謝罪文ジェネレーターの販売を開始しました。需要があること自体が少し不安です。",
      firstSale: "AI謝罪文ジェネレーターが初めて売れました。即時売上 {price} を獲得しました。",
      sales10: "AI謝罪文ジェネレーターの販売数が10本を超えました。危機管理が商品になっています。",
      sales50: "AI謝罪文ジェネレーターの販売数が50本を超えました。謝罪文のテンプレートが増えています。",
      sales100: "AI謝罪文ジェネレーターの販売数が100本を超えました。謝罪がひとつの市場になりました。",
      marketingStarted: "Buzz-03がAI謝罪文ジェネレーターの広報を開始しました。宣伝文が少し謝っています。",
      awareness50: "AI謝罪文ジェネレーターの認知度が50を超えました。Fire-05が売れ行きを監視しています。",
      awareness100: "AI謝罪文ジェネレーターの認知度が100に到達しました。使わないことが一番の宣伝です。"
    }
  };
