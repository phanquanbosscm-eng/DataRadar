import React, { useState, useEffect } from 'react';
import { formatNum, formatMoney, THRESHOLDS } from '../utils/analytics';

function AnimatedNumber({ value, suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    let start = 0;
    const duration = 1200;
    const steps = 60;
    const increment = value / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      start += increment;
      if (step >= steps) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  const formatted = decimals > 0 ? display.toFixed(decimals) : formatNum(Math.round(display));
  return <span>{formatted}{suffix}</span>;
}

function TrendBadge({ trend, invert = false }) {
  if (!trend) return null;
  // invert = true means "up is bad" (e.g. costPerInquiry)
  const isPositive = invert ? !trend.up : trend.up;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-mono px-1.5 py-0.5 rounded"
      style={{
        color: isPositive ? '#00ff88' : '#ff3333',
        background: isPositive ? 'rgba(0,255,136,0.1)' : 'rgba(255,51,51,0.1)',
      }}
    >
      {trend.up ? '▲' : '▼'} {trend.label}
    </span>
  );
}

function KPICard({ title, value, suffix, decimals, target, alert, icon, color, borderClass, trendData, invertTrend, subtitle, large }) {
  const isAlert = alert;
  const effectiveColor = isAlert ? '#ff3333' : color;
  const effectiveBorder = isAlert ? 'border-glow-red' : borderClass;

  return (
    <div
      className={`glass-card flex flex-col justify-between p-5 relative overflow-hidden animate-float ${effectiveBorder} transition-all duration-500`}
      style={{
        border: `1px solid ${isAlert ? 'rgba(255,51,51,0.4)' : 'rgba(0,212,255,0.15)'}`,
        background: isAlert ? 'rgba(255,51,51,0.04)' : 'rgba(0,212,255,0.03)',
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top left, ${effectiveColor}, transparent 70%)`,
        }}
      />

      {/* Alert pulse ring */}
      {isAlert && (
        <div className="absolute top-3 right-3 w-3 h-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </div>
      )}

      <div className="flex items-start justify-between relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{icon}</span>
            <span className="text-xs font-mono text-white/50 tracking-wider uppercase">{title}</span>
          </div>
          {subtitle && <div className="text-xs text-white/30 ml-7">{subtitle}</div>}
        </div>
      </div>

      <div className="relative z-10 mt-3">
        <div
          className="kpi-display font-black leading-none"
          style={{
            fontSize: large ? '3.5rem' : '2.8rem',
            color: effectiveColor,
            textShadow: `0 0 15px ${effectiveColor}80, 0 0 40px ${effectiveColor}30`,
          }}
        >
          <AnimatedNumber value={value} suffix={suffix} decimals={decimals} />
        </div>

        <div className="flex items-center gap-3 mt-2">
          {target && (
            <span className="text-xs font-mono text-white/30">目标: {target}</span>
          )}
          <TrendBadge trend={trendData} invert={invertTrend} />
        </div>

        {isAlert && (
          <div className="mt-2 flex items-center gap-1.5 text-xs font-mono text-red-400">
            <span className="animate-pulse">⚠</span>
            <span>未达目标，需立即优化</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function KPIDisplay({ kpis }) {
  if (!kpis) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {['日均曝光', '平均CTR', '询盘率'].map((t) => (
          <div key={t} className="glass-card p-5 flex flex-col gap-3 animate-pulse">
            <div className="h-3 w-24 rounded bg-white/5" />
            <div className="h-14 w-32 rounded bg-white/5" />
          </div>
        ))}
      </div>
    );
  }

  const { totalImpressions, avgCTR, avgInquiryRate, costPerInquiry, totalSpend, totalInquiries, trend } = kpis;

  const cards = [
    {
      title: '日均曝光量',
      icon: '📡',
      value: totalImpressions,
      suffix: '',
      decimals: 0,
      color: '#00d4ff',
      borderClass: 'border-glow-blue',
      alert: false,
      trendData: trend?.impressionsTrend,
      subtitle: '全店总曝光次数',
      large: true,
    },
    {
      title: '全店平均 CTR',
      icon: '🎯',
      value: avgCTR,
      suffix: '%',
      decimals: 2,
      target: `${THRESHOLDS.CTR_TARGET}%`,
      color: avgCTR >= THRESHOLDS.CTR_TARGET ? '#00ff88' : '#ff3333',
      borderClass: avgCTR >= THRESHOLDS.CTR_TARGET ? 'border-glow-green' : 'border-glow-red',
      alert: avgCTR < THRESHOLDS.CTR_TARGET && totalImpressions > 0,
      trendData: trend?.ctrTrend,
      subtitle: '点击率达标线 1%',
      large: true,
    },
    {
      title: '全店平均询盘率',
      icon: '💬',
      value: avgInquiryRate,
      suffix: '%',
      decimals: 2,
      target: `${THRESHOLDS.INQUIRY_RATE_TARGET}%`,
      color: avgInquiryRate >= THRESHOLDS.INQUIRY_RATE_TARGET ? '#00ff88' : '#ff3333',
      borderClass: avgInquiryRate >= THRESHOLDS.INQUIRY_RATE_TARGET ? 'border-glow-green' : 'border-glow-red',
      alert: avgInquiryRate < THRESHOLDS.INQUIRY_RATE_TARGET && totalImpressions > 0,
      trendData: trend?.inquiryRateTrend,
      subtitle: '询盘转化率达标线 2%',
      large: true,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Main KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {cards.map((c) => (
          <KPICard key={c.title} {...c} />
        ))}
      </div>

      {/* Cost per inquiry alert bar */}
      {kpis.costPerInquiryAlert && totalInquiries > 0 && (
        <div
          className="flex items-center gap-4 px-5 py-3 rounded-xl animate-pulse-slow"
          style={{
            background: 'rgba(255,51,51,0.08)',
            border: '1px solid rgba(255,51,51,0.4)',
            boxShadow: '0 0 30px rgba(255,51,51,0.1)',
          }}
        >
          <span className="text-2xl">🚨</span>
          <div className="flex-1">
            <div className="text-sm font-mono font-bold text-red-400 tracking-wide">
              财务预警：单商机获取成本超标
            </div>
            <div className="text-xs text-red-300/70 mt-0.5">
              当前成本 <span className="text-red-400 font-bold">{formatMoney(costPerInquiry)}</span> / 商机，
              预警线 ¥{THRESHOLDS.COST_PER_INQUIRY_WARN}，
              已超出 {((costPerInquiry / THRESHOLDS.COST_PER_INQUIRY_WARN - 1) * 100).toFixed(0)}%
            </div>
          </div>
          <div className="text-right">
            <div className="kpi-display text-2xl font-black text-red-400" style={{ textShadow: '0 0 15px rgba(255,51,51,0.7)' }}>
              {formatMoney(costPerInquiry)}
            </div>
            <div className="text-xs font-mono text-red-300/50">单商机成本</div>
          </div>
        </div>
      )}

      {/* Secondary metrics row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '总消耗', value: formatMoney(totalSpend), icon: '💰', color: '#ff8c00', trend: trend?.spendTrend },
          { label: '总询盘量', value: totalInquiries, icon: '📨', color: '#00ff88', trend: trend?.inquiriesTrend },
          { label: '单商机成本', value: formatMoney(costPerInquiry), icon: '💎', color: costPerInquiry > 100 ? '#ff3333' : '#00d4ff', trend: trend?.costPerInquiryTrend },
        ].map((m) => (
          <div key={m.label} className="glass-card px-4 py-3 flex items-center gap-3">
            <span className="text-xl">{m.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono text-white/40">{m.label}</div>
              <div className="text-lg font-bold font-mono truncate" style={{ color: m.color }}>{m.value}</div>
            </div>
            {m.trend && <TrendBadge trend={m.trend} invert={m.label === '单商机成本'} />}
          </div>
        ))}
      </div>
    </div>
  );
}
