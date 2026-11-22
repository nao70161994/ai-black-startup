"use strict";
window.AIBS_CREATE_SHAREHOLDER_RUNTIME = function (options) {
  const settings = options && typeof options === "object" ? options : {};
  const clamp = typeof settings.clamp === "function"
    ? settings.clamp
    : function (value, min, max) { return Math.min(max, Math.max(min, value)); };

  function normalize(board) {
    const source = board && typeof board === "object" ? board : {};
    return {
      satisfaction: clamp(Math.floor(Number(source.satisfaction) || 0), 0, 100),
      reviewSeconds: clamp(Math.floor(Number(source.reviewSeconds) || 0), 0, 29),
      lastMrr: Math.max(0, Number(source.lastMrr) || 0),
      dividendsPaid: Math.max(0, Number(source.dividendsPaid) || 0),
      qualityInvestments: Math.max(0, Math.floor(Number(source.qualityInvestments) || 0))
    };
  }

  function adjust(board, amount) {
    const target = board && typeof board === "object" ? board : {};
    const before = clamp(Math.floor(Number(target.satisfaction) || 0), 0, 100);
    target.satisfaction = clamp(before + Math.round(Number(amount) || 0), 0, 100);
    return { before: before, after: target.satisfaction, delta: target.satisfaction - before };
  }

  function review(board, metrics) {
    const target = board && typeof board === "object" ? board : {};
    const values = metrics && typeof metrics === "object" ? metrics : {};
    target.reviewSeconds = Math.max(0, Math.floor(Number(target.reviewSeconds) || 0)) + 1;
    if (target.reviewSeconds < 30) return { reviewed: false, delta: 0, satisfaction: clamp(Number(target.satisfaction) || 0, 0, 100) };
    target.reviewSeconds -= 30;
    const mrr = Math.max(0, Number(values.mrr) || 0);
    const fire = clamp(Number(values.fire) || 0, 0, 100);
    const quality = clamp(Number(values.averageQuality) || 0, 0, 100);
    const previousMrr = Math.max(0, Number(target.lastMrr) || 0);
    let delta = 0;
    if (mrr > previousMrr + 1000) delta += 1;
    else if (mrr + 1000 < previousMrr) delta -= 1;
    if (fire >= 70) delta -= 2;
    else if (fire >= 40) delta -= 1;
    else if (fire <= 10) delta += 1;
    if (quality >= 90) delta += 1;
    else if (quality < 55) delta -= 1;
    const before = clamp(Math.floor(Number(target.satisfaction) || 0), 0, 100);
    target.satisfaction = clamp(before + delta, 0, 100);
    target.lastMrr = mrr;
    return { reviewed: true, before: before, satisfaction: target.satisfaction, delta: target.satisfaction - before };
  }

  function recordDividend(board, amount) {
    const target = board && typeof board === "object" ? board : {};
    target.dividendsPaid = Math.max(0, Number(target.dividendsPaid) || 0) + Math.max(0, Number(amount) || 0);
  }

  function recordQualityInvestment(board) {
    const target = board && typeof board === "object" ? board : {};
    target.qualityInvestments = Math.max(0, Math.floor(Number(target.qualityInvestments) || 0)) + 1;
  }

  function getRating(value) {
    const score = clamp(Math.floor(Number(value) || 0), 0, 100);
    if (score >= 80) return "安定";
    if (score >= 60) return "概ね良好";
    if (score >= 40) return "慎重";
    if (score >= 20) return "不満";
    return "危機";
  }

  return {
    normalize: normalize,
    adjust: adjust,
    review: review,
    recordDividend: recordDividend,
    recordQualityInvestment: recordQualityInvestment,
    getRating: getRating
  };
};
