"use strict";

window.AIBS_CREATE_COMPETITION_RUNTIME = function (options) {
  const settings = options && typeof options === "object" ? options : {};
  const clamp = typeof settings.clamp === "function" ? settings.clamp : function (v, min, max) { return Math.max(min, Math.min(max, v)); };
  const WHITE_AI_BASE_MRR = 250000;
  function normalize(saved) {
    const source = saved && typeof saved === "object" ? saved : {};
    const state = {
      competitorMrr: Math.max(0, Number.isFinite(Number(source.competitorMrr)) ? Number(source.competitorMrr) : WHITE_AI_BASE_MRR),
      reviewSeconds: clamp(Math.floor(Number(source.reviewSeconds) || 0), 0, 29),
      lastShare: clamp(Number.isFinite(Number(source.lastShare)) ? Number(source.lastShare) : 0, 0, 100),
      lastCompetitorMrr: Math.max(0, Number(source.lastCompetitorMrr) || 0),
      eventsSeen: Math.max(0, Math.floor(Number(source.eventsSeen) || 0))
    };
    return state;
  }
  function calculateDecisionCost(amount, financeLevel) {
    const reduction = Math.max(0.7, 1 - Math.max(0, Number(financeLevel) || 0) * 0.03);
    return Math.max(0, Math.ceil(Math.max(0, Number(amount) || 0) * reduction));
  }
  function getShare(state, companyMrr) {
    const own = Math.max(0, Number(companyMrr) || 0);
    const other = Math.max(0, Number(state && state.competitorMrr) || 0);
    const total = own + other;
    return total > 0 ? Math.round(own / total * 1000) / 10 : 0;
  }
  function tick(state, companyMrr, financeLevel) {
    const market = normalize(state);
    market.reviewSeconds += 1;
    if (market.reviewSeconds < 30) return { state: market, reviewed: false, share: getShare(market, companyMrr), delta: 0 };
    market.reviewSeconds = 0;
    const previousShare = market.lastShare;
    const previousCompetitorMrr = market.competitorMrr;
    const growth = Math.max(0.001, 0.004 - Math.max(0, Number(financeLevel) || 0) * 0.00015);
    market.competitorMrr = Math.round(market.competitorMrr * (1 + growth));
    const share = getShare(market, companyMrr);
    const delta = Math.round((share - previousShare) * 10) / 10;
    market.lastShare = share;
    market.lastCompetitorMrr = market.competitorMrr;
    return { state: market, reviewed: true, share: share, previousShare: previousShare, delta: delta, competitorGrowth: market.competitorMrr - previousCompetitorMrr };
  }
  function applyCompetitorEvent(state, eventId) {
    const market = normalize(state);
    if (eventId === "whiteai_price_war") market.competitorMrr = Math.round(market.competitorMrr * 0.92);
    if (eventId === "whiteai_enterprise_contract") market.competitorMrr = Math.round(market.competitorMrr * 1.12);
    if (eventId === "whiteai_data_incident") market.competitorMrr = Math.round(market.competitorMrr * 0.84);
    market.eventsSeen += 1;
    return market;
  }
  function getRating(share) {
    const value = Number(share) || 0;
    return value >= 60 ? "業界リード" : value >= 40 ? "競争中" : value >= 20 ? "追い上げ中" : "挑戦者";
  }
  return { normalize: normalize, getShare: getShare, tick: tick, applyCompetitorEvent: applyCompetitorEvent, getRating: getRating, calculateDecisionCost: calculateDecisionCost };
};
