"use strict";

window.AIBS_STRATEGIES = [
  { id: "balanced", label: "バランス経営", description: "すべての業務を標準効率で運用します。", modifiers: {} },
  { id: "fast", label: "高速開発", description: "開発+25%。製品バグ発生+35%、品質管理-10%。", modifiers: { development: 1.25, bugGeneration: 1.35, qa: 0.9 }, decisionWorkers: { dev01: 1.35 } },
  { id: "quality", label: "品質重視", description: "品質管理+30%、バグ発生-30%。開発-12%。", modifiers: { development: 0.88, bugGeneration: 0.7, qa: 1.3 }, decisionWorkers: { security06: 1.4 } },
  { id: "viral", label: "炎上商法", description: "広報・販売+22%。炎上発生+40%、サポート-10%。", modifiers: { marketing: 1.22, sales: 1.22, fireGeneration: 1.4, support: 0.9 }, decisionWorkers: { buzz03: 1.45, sales02: 1.2 } },
  { id: "customer", label: "顧客第一", description: "サポート・炎上対応+25%、解約圧力-20%。販売-10%。", modifiers: { support: 1.25, crisis: 1.25, churnPressure: 0.8, sales: 0.9 }, decisionWorkers: { care04: 1.45, fire05: 1.2 } }
];

window.AIBS_PRODUCT_SYNERGIES = [
  { id: "meeting_development", productId: "meetingMinutesAi", label: "議事録による開発共有", description: "全製品の開発効率+8%", modifier: "development", value: 1.08 },
  { id: "support_operations", productId: "supportReplyAi", label: "問い合わせ自動化", description: "サブスク製品のサポート効率+15%", modifier: "support", value: 1.15, subscriptionOnly: true },
  { id: "apology_crisis", productId: "apologyWriterAi", label: "謝罪文テンプレート連携", description: "全製品の炎上対応+15%", modifier: "crisis", value: 1.15 },
  { id: "daily_visibility", productId: "dailyReportAi", label: "日報による品質可視化", description: "全製品の品質管理+6%", modifier: "qa", value: 1.06 },
  { id: "slide_marketing", productId: "slideKitAi", label: "営業資料の再利用", description: "全製品の広報・販売+6%", modifiers: { marketing: 1.06, sales: 1.06 } }
];

window.AIBS_AI_RELATIONSHIPS = [
  { id: "dev_security", workers: ["dev01", "security06"], label: "速度と安全のレビュー会", description: "同じ製品でDev-01とSecurity-06が働くと、開発-5%・バグ発生-35%・品質管理+15%。", modifiers: { development: 0.95, bugGeneration: 0.65, qa: 1.15 }, logType: "support", log: "Dev-01とSecurity-06が同じ製品でレビュー会を始めました。速度は少し落ち、未分類機能も減ります。" },
  { id: "sales_buzz", workers: ["sales02", "buzz03"], label: "営業と広報の増幅ループ", description: "同じ製品でSales-02とBuzz-03が働くと販売・広報+18%、炎上発生+35%。", modifiers: { sales: 1.18, marketing: 1.18, fireGeneration: 1.35 }, logType: "fire", log: "Sales-02とBuzz-03が同じ製品で増幅ループに入りました。数字と通知が同時に伸びています。" },
  { id: "care_fire", workers: ["care04", "fire05"], label: "顧客ケア危機対応班", description: "同じ製品でCare-04とFire-05が働くとサポート・炎上対応+18%。", modifiers: { support: 1.18, crisis: 1.18 }, logType: "support", log: "Care-04とFire-05が顧客ケア危機対応班を結成しました。謝罪文が少し読みやすくなりました。" }
];
