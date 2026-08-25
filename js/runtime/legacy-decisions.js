"use strict";

window.AIBS_CREATE_LEGACY_DECISION_RUNTIME = function (options) {
  const settings = options && typeof options === "object" ? options : {};
  const getState = settings.getState;
  const safeNumber = settings.safeNumber;
  const clamp = settings.clamp;
  const getProductUnitsSold = settings.getProductUnitsSold;
  const getProductCustomers = settings.getProductCustomers;
  const addLog = settings.addLog;
  const formatCurrency = settings.formatCurrency;
  const adjustProductFire = settings.adjustProductFire;
  const clearProductAssignmentWithoutRender = settings.clearProductAssignmentWithoutRender;
  const decisionAddChurnRisk = settings.decisionAddChurnRisk;
  const completeSubscriptionUpgrade = settings.completeSubscriptionUpgrade;
  const completeNewProductDevelopment = settings.completeNewProductDevelopment;
  const getProductFlags = settings.getProductFlags;

  function applyApproval(eventId, product, definition) {
    const state = getState();
    if (eventId === "sales_big_contract") {
      if (definition.type === "oneShot") {
        const units = 1;
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
      adjustProductFire(product, 4);
      return;
    }
    if (eventId === "buzz_bold_ad") {
      product.awareness = clamp(product.awareness + 20, 0, 100);
      state.fire = clamp(state.fire + 12, 0, 100);
      adjustProductFire(product, 10);
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
      adjustProductFire(product, -20);
      state.money = Math.max(0, state.money - 500);
      addLog("crisis", "Fire-05の謝罪文を承認しました。炎上度が大きく下がりました。", "fire05");
      return;
    }
    if (eventId === "subscription_price_review") {
      product.priceAdjustment = clamp(safeNumber(product.priceAdjustment, 0) + 0.05, -0.2, 0.6);
      product.awareness = clamp(product.awareness + 6, 0, 100);
      product.satisfaction = clamp(product.satisfaction - 5, 0, 100);
      decisionAddChurnRisk(product, 5);
      addLog("normal", definition.name + "の上位プラン準備を承認しました。月額単価は少し伸びますが、既存顧客の視線は厳しめです。", "sales02");
      return;
    }
    if (eventId === "emergency_quality_fix") {
      product.bugs = clamp(product.bugs - 20, 0, 100);
      product.quality = clamp(product.quality + 5, 0, 100);
      state.money = Math.max(0, state.money - 700);
      addLog("support", definition.name + "の緊急品質改善を承認しました。短期費用で製品バグを抑え込みました。", "security06");
      return;
    }
    if (eventId === "one_shot_bulk_sale") {
      const units = 1;
      const revenue = safeNumber(definition.price, 0) * units;
      product.unitsSold = getProductUnitsSold(product) + units;
      product.lifetimeRevenue = Math.max(0, safeNumber(product.lifetimeRevenue, 0) + revenue);
      state.money = Math.max(0, state.money + revenue);
      state.totalMoney = Math.max(0, state.totalMoney + revenue);
      state.fire = clamp(state.fire + 8, 0, 100);
      adjustProductFire(product, 6);
      addLog("success", definition.name + "のまとめ買いを承認しました。" + units + "本分の即時売上 " + formatCurrency(revenue) + " を獲得しました。", "sales02");
      return;
    }
    if (eventId === "vnext_fast_track") {
      product.upgradeProgress = clamp(product.upgradeProgress + 25, 0, 100);
      product.bugs = clamp(product.bugs + 8, 0, 100);
      product.quality = clamp(product.quality - 3, 0, 100);
      addLog("bug", definition.name + "のvNext前倒しを承認しました。進捗は伸びましたが、軽微な副作用も増えました。", "dev01");
      if (product.upgradeProgress >= 100) completeSubscriptionUpgrade(product, definition);
      return;
    }
    if (eventId === "competitive_campaign") {
      product.awareness = clamp(product.awareness + 15, 0, 100);
      state.money = Math.max(0, state.money - 800);
      state.fire = clamp(state.fire + 3, 0, 100);
      adjustProductFire(product, 3);
      addLog("fire", definition.name + "の競合対抗キャンペーンを承認しました。認知度は伸びましたが、通知欄も少し温まりました。", "buzz03");
      return;
    }
    if (eventId === "tech_debt_repayment") {
      product.bugs = clamp(product.bugs - 15, 0, 100);
      product.quality = clamp(product.quality + 8, 0, 100);
      state.money = Math.max(0, state.money - 600);
      addLog("support", definition.name + "の技術的負債返済を承認しました。短期費用で製品が少し落ち着きました。", "security06");
      return;
    }
    if (eventId === "customer_interview") {
      product.satisfaction = clamp(product.satisfaction + 8, 0, 100);
      product.awareness = clamp(product.awareness + 3, 0, 100);
      product.supportLoad = clamp(product.supportLoad + 3, 0, 100);
      addLog("support", definition.name + "の顧客インタビューを承認しました。手間は増えましたが、導入先の声が見えてきました。", "care04");
      return;
    }
    if (eventId === "mystery_big_deal") {
      if (definition.type === "oneShot") {
        const units = 2;
        const revenue = safeNumber(definition.price, 0) * units;
        product.unitsSold = getProductUnitsSold(product) + units;
        product.lifetimeRevenue = Math.max(0, safeNumber(product.lifetimeRevenue, 0) + revenue);
        state.money = Math.max(0, state.money + revenue);
        state.totalMoney = Math.max(0, state.totalMoney + revenue);
        addLog("success", definition.name + "の謎の大型案件を受けました。" + units + "本分の即時売上 " + formatCurrency(revenue) + " を獲得しました。", "sales02");
      } else {
        product.customers = getProductCustomers(product) + 1;
        addLog("success", definition.name + "の謎の大型案件を受けました。顧客が1社増えました。", "sales02");
      }
      product.bugs = clamp(product.bugs + 5, 0, 100);
      state.fire = clamp(state.fire + 8, 0, 100);
      adjustProductFire(product, 6);
      return;
    }
    if (eventId === "free_trial_offer") {
      product.status = "selling";
      product.customers = getProductCustomers(product) + 1;
      product.awareness = clamp(product.awareness + 10, 0, 100);
      product.supportLoad = clamp(product.supportLoad + 5, 0, 100);
      addLog("success", definition.name + "の無料トライアルを承認しました。導入社は増えましたが、サポート窓口も少し忙しくなりました。", "sales02");
      return;
    }
    if (eventId === "vip_customer_support") {
      product.satisfaction = clamp(product.satisfaction + 10, 0, 100);
      decisionAddChurnRisk(product, -5);
      state.money = Math.max(0, state.money - 700);
      addLog("support", definition.name + "のVIP顧客対応を承認しました。費用はかかりましたが、解約リスクを少し抑えました。", "care04");
      return;
    }
    if (eventId === "sns_fire_response") {
      state.fire = clamp(state.fire - 15, 0, 100);
      adjustProductFire(product, -12);
      state.money = Math.max(0, state.money - 400);
      addLog("crisis", "Fire-05のSNS火消し案を承認しました。通知欄の温度が少し下がりました。", "fire05");
      return;
    }
    if (eventId === "quality_audit") {
      product.bugs = clamp(product.bugs - 12, 0, 100);
      product.quality = clamp(product.quality + 5, 0, 100);
      state.money = Math.max(0, state.money - 500);
      addLog("support", definition.name + "の品質監査を承認しました。製品バグが少し整理されました。", "security06");
      return;
    }
    if (eventId === "limited_one_shot_sale") {
      const units = 2;
      const revenue = safeNumber(definition.price, 0) * units;
      product.status = "selling";
      product.unitsSold = getProductUnitsSold(product) + units;
      product.lifetimeRevenue = Math.max(0, safeNumber(product.lifetimeRevenue, 0) + revenue);
      product.awareness = clamp(product.awareness + 4, 0, 100);
      state.money = Math.max(0, state.money + revenue);
      state.totalMoney = Math.max(0, state.totalMoney + revenue);
      state.fire = clamp(state.fire + 4, 0, 100);
      adjustProductFire(product, 8);
      addLog("success", definition.name + "の期間限定セールを承認しました。" + units + "本分の即時売上 " + formatCurrency(revenue) + " を獲得しました。", "sales02");
      return;
    }
    if (eventId === "server_outage_response") {
      product.bugs = clamp(product.bugs - 5, 0, 100);
      adjustProductFire(product, -18);
      state.money = Math.max(0, state.money - 600);
      addLog("crisis", definition.name + "の障害告知を承認しました。費用はかかりましたが、製品炎上が下がりました。", "fire05");
      return;
    }
    if (eventId === "support_discount_offer") {
      product.priceAdjustment = clamp(safeNumber(product.priceAdjustment, 0) - 0.03, -0.2, 0.6);
      product.satisfaction = clamp(product.satisfaction + 8, 0, 100);
      decisionAddChurnRisk(product, -8);
      product.supportLoad = clamp(product.supportLoad - 5, 0, 100);
      addLog("support", definition.name + "の解約寸前顧客に一時値引きと個別対応を行いました。MRR単価は少し下がりましたが、継続率を守りました。", "care04");
      return;
    }
    if (eventId === "security_audit_push") {
      product.bugs = clamp(product.bugs - 18, 0, 100);
      product.quality = clamp(product.quality + 6, 0, 100);
      adjustProductFire(product, -5);
      state.money = Math.max(0, state.money - 900);
      addLog("support", definition.name + "のセキュリティ監査を承認しました。短期費用で事故の種を減らしました。", "security06");
      return;
    }
    if (eventId === "customer_impossible_request") {
      getProductFlags(product.id).impossibleRequestHandled = true;
      product.satisfaction = clamp(product.satisfaction + 5, 0, 100);
      product.supportLoad = clamp(product.supportLoad + 10, 0, 100);
      product.bugs = clamp(product.bugs + 5, 0, 100);
      addLog("support", definition.name + "の無茶な顧客要望を受けました。満足度は上がりましたが、現場負荷と製品バグも増えました。", "care04");
      return;
    }
    if (eventId === "ai_runaway_proposal") {
      getProductFlags(product.id).aiRunawayHandled = true;
      product.awareness = clamp(product.awareness + 8, 0, 100);
      if (definition.type === "subscription" && product.status === "selling") product.customers = getProductCustomers(product) + 1;
      if (definition.type === "oneShot" && product.status === "selling") {
        product.unitsSold = getProductUnitsSold(product) + 1;
        product.lifetimeRevenue = Math.max(0, safeNumber(product.lifetimeRevenue, 0) + safeNumber(definition.price, 0));
        state.money = Math.max(0, state.money + safeNumber(definition.price, 0));
        state.totalMoney = Math.max(0, state.totalMoney + safeNumber(definition.price, 0));
      }
      state.fire = clamp(state.fire + 8, 0, 100);
      adjustProductFire(product, 10);
      addLog("fire", definition.name + "の強めの自動化案を承認しました。短期成果と説明責任が同時に増えました。", "boss");
      return;
    }
    if (eventId === "outsourcing_offer") {
      state.money = Math.max(0, state.money - 1200);
      product.bugs = clamp(product.bugs + 6, 0, 100);
      if (product.upgradeStatus === "upgrading") {
        product.upgradeProgress = clamp(product.upgradeProgress + 18, 0, 100);
        if (product.upgradeProgress >= 100) completeSubscriptionUpgrade(product, definition);
      } else {
        product.status = product.status === "idea" ? "developing" : product.status;
        product.progress = clamp(product.progress + 25, 0, definition.developmentRequired);
        if (product.progress >= definition.developmentRequired) completeNewProductDevelopment(product, definition);
      }
      addLog("bug", definition.name + "の外注提案を承認しました。進捗は買えましたが、製品バグも少し増えました。", "boss");
    }
  }

  function applyRejection(eventId, product, definition) {
    const state = getState();
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
      decisionAddChurnRisk(product, 5);
      addLog("support", definition.name + "の顧客対応優先を見送りました。解約リスクが少し上がりました。", "care04");
      return;
    }
    if (eventId === "fire05_crisis_statement") {
      state.fire = clamp(state.fire + 8, 0, 100);
      addLog("fire", "Fire-05の謝罪文を保留しました。通知欄の熱量が上がっています。", "fire05");
      return;
    }
    if (eventId === "subscription_price_review") {
      product.satisfaction = clamp(product.satisfaction + 2, 0, 100);
      addLog("support", definition.name + "の値上げ準備を見送りました。既存顧客の安心感を優先しました。", "sales02");
      return;
    }
    if (eventId === "emergency_quality_fix") {
      product.bugs = clamp(product.bugs + 5, 0, 100);
      addLog("bug", definition.name + "の緊急品質改善を見送りました。製品バグが少し増えました。", "security06");
      return;
    }
    if (eventId === "one_shot_bulk_sale") {
      state.fire = clamp(state.fire - 1, 0, 100);
      addLog("normal", definition.name + "のまとめ買い提案を見送りました。売り方は少し落ち着きました。", "sales02");
      return;
    }
    if (eventId === "vnext_fast_track") {
      addLog("normal", definition.name + "のvNext前倒しを見送りました。通常ペースで開発を続けます。", "dev01");
      return;
    }
    if (eventId === "competitive_campaign") {
      addLog("normal", definition.name + "の競合対抗キャンペーンを見送りました。通常運用を続けます。", "buzz03");
      return;
    }
    if (eventId === "tech_debt_repayment") {
      product.bugs = clamp(product.bugs + 3, 0, 100);
      addLog("bug", definition.name + "の技術的負債返済を見送りました。製品バグが少し積み上がりました。", "security06");
      return;
    }
    if (eventId === "customer_interview") {
      addLog("normal", definition.name + "の顧客インタビューを見送りました。問い合わせを待つ方針です。", "care04");
      return;
    }
    if (eventId === "mystery_big_deal") {
      state.fire = clamp(state.fire - 1, 0, 100);
      addLog("normal", definition.name + "の謎の大型案件を見送りました。怪しい急成長を避けました。", "sales02");
      return;
    }
    if (eventId === "free_trial_offer") {
      addLog("normal", definition.name + "の無料トライアルを見送りました。通常販売を続けます。", "sales02");
      return;
    }
    if (eventId === "vip_customer_support") {
      product.satisfaction = clamp(product.satisfaction - 3, 0, 100);
      addLog("support", definition.name + "のVIP顧客対応を見送りました。満足度が少し下がりました。", "care04");
      return;
    }
    if (eventId === "sns_fire_response") {
      state.fire = clamp(state.fire + 6, 0, 100);
      adjustProductFire(product, 4);
      addLog("fire", "Fire-05のSNS火消し案を保留しました。通知欄が少し熱くなりました。", "fire05");
      return;
    }
    if (eventId === "quality_audit") {
      product.bugs = clamp(product.bugs + 3, 0, 100);
      addLog("bug", definition.name + "の品質監査を見送りました。製品バグが少し積み上がりました。", "security06");
      return;
    }
    if (eventId === "limited_one_shot_sale") {
      adjustProductFire(product, -1);
      addLog("normal", definition.name + "の期間限定セールを見送りました。売り急ぎを避けました。", "sales02");
      return;
    }
    if (eventId === "server_outage_response") {
      state.fire = clamp(state.fire + 4, 0, 100);
      adjustProductFire(product, 8);
      addLog("fire", definition.name + "の障害告知を保留しました。製品炎上が上がりました。", "fire05");
      return;
    }
    if (eventId === "support_discount_offer") {
      decisionAddChurnRisk(product, 3);
      addLog("support", definition.name + "の解約寸前顧客対応を見送りました。解約リスクが少し上がりました。", "care04");
      return;
    }
    if (eventId === "security_audit_push") {
      product.bugs = clamp(product.bugs + 2, 0, 100);
      adjustProductFire(product, 3);
      addLog("bug", definition.name + "のセキュリティ監査を見送りました。小さな不安が残りました。", "security06");
      return;
    }
    if (eventId === "customer_impossible_request") {
      getProductFlags(product.id).impossibleRequestHandled = true;
      product.satisfaction = clamp(product.satisfaction - 3, 0, 100);
      product.supportLoad = clamp(product.supportLoad - 2, 0, 100);
      addLog("support", definition.name + "の無茶な顧客要望を見送りました。運用負荷を優先しました。", "care04");
      return;
    }
    if (eventId === "ai_runaway_proposal") {
      getProductFlags(product.id).aiRunawayHandled = true;
      state.fire = clamp(state.fire - 1, 0, 100);
      addLog("normal", definition.name + "の強めの自動化案を見送りました。今日は説明可能な範囲で進めます。", "boss");
      return;
    }
    if (eventId === "outsourcing_offer") {
      addLog("normal", definition.name + "の外注提案を見送りました。内製で進めます。", "boss");
    }
  }

  return { applyApproval: applyApproval, applyRejection: applyRejection };
};
