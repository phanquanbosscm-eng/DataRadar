/**
 * 黄金三角核心算法 - 2026 LED贸易决策模型
 * 基于阿里巴巴国际站实际字段
 */

export const THRESHOLDS = {
  CTR_TARGET:              1.0,   // 点击率目标 1%
  OPP_RATE_TARGET:         2.0,   // 商机转化率目标 2%
  COST_PER_OPP_WARN:       100,   // 单商机成本预警 ¥100
  HOT_CTR:                 1.0,
  HOT_OPP_RATE:            2.0,
  VISUAL_CTR:              3.0,
  TOP_SPEND_COUNT:         3,
};

// ── KPI 计算（基于 plan 报告） ────────────────
export function computeKPIs(planData, productData, prevPlanData, prevProductData) {
  const current  = computeRawKPIs(planData, productData);
  const previous = (prevPlanData && prevProductData)
    ? computeRawKPIs(prevPlanData, prevProductData)
    : null;

  const trend = previous ? {
    impressionsTrend:  calcTrend(current.totalImpressions, previous.totalImpressions),
    ctrTrend:          calcTrend(current.avgCTR, previous.avgCTR),
    oppRateTrend:      calcTrend(current.avgOppRate, previous.avgOppRate),
    spendTrend:        calcTrend(current.totalSpend, previous.totalSpend),
    opportunitiesTrend:calcTrend(current.totalOpportunities, previous.totalOpportunities),
    costPerOppTrend:   calcTrend(current.costPerOpp, previous.costPerOpp),
  } : null;

  return { ...current, trend, previous };
}

function computeRawKPIs(planData, productData) {
  const pd = planData || [];
  const pr = productData || [];

  const totalImpressions   = sum(pd, 'impressions');
  const totalClicks        = sum(pd, 'clicks');
  const totalSpend         = sum(pd, 'spend');
  const totalOpportunities = sum(pd, 'opportunities');
  const totalInquiries     = sum(pd, 'inquiries');
  const totalTmChats       = sum(pd, 'tmChats');
  const totalOrders        = sum(pd, 'orders');

  const avgCTR     = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgOppRate = totalClicks > 0 ? (totalOpportunities / totalClicks) * 100 : 0;
  const costPerOpp = totalOpportunities > 0 ? totalSpend / totalOpportunities : 0;

  return {
    totalImpressions,
    totalClicks,
    totalSpend,
    totalOpportunities,
    totalInquiries,
    totalTmChats,
    totalOrders,
    avgCTR,
    avgOppRate,
    avgInquiryRate: avgOppRate, // 向后兼容
    costPerOpp,
    costPerInquiry: costPerOpp, // 向后兼容
    ctrAlert:    totalImpressions > 0 && avgCTR < THRESHOLDS.CTR_TARGET,
    oppRateAlert: totalClicks > 0 && avgOppRate < THRESHOLDS.OPP_RATE_TARGET,
    costPerOppAlert: costPerOpp > THRESHOLDS.COST_PER_OPP_WARN,
    // 向后兼容
    inquiryRateAlert: totalClicks > 0 && avgOppRate < THRESHOLDS.OPP_RATE_TARGET,
    costPerInquiryAlert: costPerOpp > THRESHOLDS.COST_PER_OPP_WARN,
    totalInquiries: totalOpportunities,
  };
}

// ── 产品分类（生死榜） ─────────────────────────
export const PRODUCT_TAGS = {
  HOT:    'hot',
  DEAD:   'dead',
  VISUAL: 'visual',
  NORMAL: 'normal',
};

export const PRODUCT_TAG_META = {
  hot:    { label: '爆品/潜力', color: '#00ff88', bg: 'rgba(0,255,136,0.1)',  border: 'rgba(0,255,136,0.3)',  icon: '🚀', action: '加大P4P投入，扩大曝光' },
  dead:   { label: '烧钱/索命', color: '#ff3333', bg: 'rgba(255,51,51,0.1)',  border: 'rgba(255,51,51,0.3)',  icon: '💀', action: '立即止血！暂停P4P或关停计划' },
  visual: { label: '视觉品',   color: '#ffd700', bg: 'rgba(255,215,0,0.1)',  border: 'rgba(255,215,0,0.3)',  icon: '👁', action: '重构详情页10屏结构，增强询盘引导' },
  normal: { label: '待优化',   color: '#00d4ff', bg: 'rgba(0,212,255,0.08)', border: 'rgba(0,212,255,0.2)',  icon: '📊', action: '优化主图与标题，提升点击率' },
};

export function classifyProducts(productData) {
  if (!productData?.length) return [];
  const sortedBySpend = [...productData].sort((a, b) => b.spend - a.spend);
  const topSpendIds   = new Set(sortedBySpend.slice(0, THRESHOLDS.TOP_SPEND_COUNT).map(p => p.productId || p.name));

  return productData.map(p => {
    const id         = p.productId || p.name;
    const ctr        = p.ctr;
    const oppRate    = p.oppRate ?? p.inquiryRate ?? 0;
    const opps       = p.opportunities ?? p.inquiries ?? 0;
    let tag;

    if (ctr >= THRESHOLDS.HOT_CTR && oppRate >= THRESHOLDS.HOT_OPP_RATE) {
      tag = PRODUCT_TAGS.HOT;
    } else if (topSpendIds.has(id) && opps === 0) {
      tag = PRODUCT_TAGS.DEAD;
    } else if (ctr >= THRESHOLDS.VISUAL_CTR && opps === 0) {
      tag = PRODUCT_TAGS.VISUAL;
    } else {
      tag = PRODUCT_TAGS.NORMAL;
    }

    return {
      ...p,
      inquiries:    opps,
      inquiryRate:  oppRate,
      tag,
      tagMeta: PRODUCT_TAG_META[tag],
    };
  });
}

// ── 搜索词分析（基于实际字段） ────────────────
// keyword 报告只有：买家搜索词 | 状态 | 点击占比 | 曝光占比
export function analyzeKeywords(keywordData) {
  if (!keywordData?.length) return { demoted: [], top: [], all: [] };

  const all = [...keywordData].sort((a, b) => b.clickShare - a.clickShare);

  // 降权词
  const demoted  = all.filter(k => k.isDemoted);
  // 高点击占比词（前20）
  const top      = all.filter(k => !k.isDemoted).slice(0, 20);

  return { demoted, top, all };
}

// ── 漏斗数据 ──────────────────────────────────
export function buildFunnelData(planData, productData) {
  const pd = planData || [];
  const impressions   = sum(pd, 'impressions');
  const clicks        = sum(pd, 'clicks');
  const opportunities = sum(pd, 'opportunities');
  const orders        = sum(pd, 'orders');

  return [
    { stage: '曝光',   value: impressions,   color: '#00d4ff', pct: 100 },
    { stage: '点击',   value: clicks,        color: '#00ff88', pct: impressions  > 0 ? (clicks / impressions) * 100 : 0 },
    { stage: '商机',   value: opportunities, color: '#ffd700', pct: clicks       > 0 ? (opportunities / clicks) * 100 : 0 },
    { stage: '订单',   value: orders,        color: '#ff8c00', pct: opportunities > 0 ? (orders / opportunities) * 100 : 0 },
  ];
}

// ── 工具函数 ──────────────────────────────────
function sum(arr, field) {
  return (arr || []).reduce((acc, r) => acc + (r[field] || 0), 0);
}

function calcTrend(current, previous) {
  if (!previous || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  return { value: pct, up: pct > 0, label: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%` };
}

export function formatNum(n) {
  if (n === null || n === undefined) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(Math.round(n));
}

export function formatMoney(n) {
  if (!n) return '¥0';
  return '¥' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ── AI 诊断 Prompt ────────────────────────────
export function buildDiagnosisPrompt(kpis, classifiedProducts, keywordAnalysis) {
  const deadProducts = (classifiedProducts || []).filter(p => p.tag === PRODUCT_TAGS.DEAD).slice(0, 3);
  const lowProducts  = (classifiedProducts || []).filter(p => p.tag !== PRODUCT_TAGS.HOT).sort((a, b) => b.spend - a.spend).slice(0, 3);
  const hotProducts  = (classifiedProducts || []).filter(p => p.tag === PRODUCT_TAGS.HOT);
  const demotedKws   = (keywordAnalysis?.demoted || []).slice(0, 5);
  const topKws       = (keywordAnalysis?.top || []).slice(0, 3);

  const prodLines = (deadProducts.length ? deadProducts : lowProducts).map((p, i) =>
    `  ${i + 1}. 【${p.tagMeta?.label}】ID:${p.productId} ${p.name?.slice(0, 40)}\n     CTR ${p.ctr?.toFixed(2)}% | 商机转化率 ${p.inquiryRate?.toFixed(2)}% | 花费 ¥${p.spend?.toFixed(0)} | 商机 ${p.inquiries}`
  ).join('\n');

  const kwLines = demotedKws.map((k, i) =>
    `  ${i + 1}. "${k.word}" — 状态:${k.status} 点击占比:${k.clickShare}% 曝光占比:${k.impShare}%`
  ).join('\n');

  return `你是一位阿里巴巴国际站LED外贸运营专家。请根据以下数据给出精准调优建议：

## 全局 KPI
- 总曝光：${formatNum(kpis.totalImpressions)}
- 平均CTR：${kpis.avgCTR.toFixed(2)}%（目标1%，${kpis.avgCTR >= 1 ? '✅达标' : '❌未达标'}）
- 商机转化率：${kpis.avgOppRate?.toFixed(2)}%（目标2%，${kpis.avgOppRate >= 2 ? '✅达标' : '❌未达标'}）
- 单商机成本：¥${kpis.costPerOpp?.toFixed(0)}${kpis.costPerOpp > 100 ? '（⚠️超标）' : ''}
- 爆品数：${hotProducts.length}

## 前三差产品
${prodLines || '  暂无数据'}

## 降权/低效搜索词
${kwLines || '  无降权词'}

## 高效词（点击占比最高）
${topKws.map((k, i) => `  ${i + 1}. "${k.word}" 点击${k.clickShare}% 曝光${k.impShare}%`).join('\n') || '  暂无'}

请给出：
1. 差产品的具体优化方案（主图/标题/详情页）
2. 降权词的处理策略
3. 预算分配优化建议
4. 本周优先做的3件事（按ROI排序）`;
}
