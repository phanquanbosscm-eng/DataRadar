import React, { useState } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Label,
} from 'recharts';
import { PRODUCT_TAGS } from '../utils/analytics';
import { formatMoney } from '../utils/analytics';

const TAG_COLORS = {
  [PRODUCT_TAGS.HOT]: '#00ff88',
  [PRODUCT_TAGS.DEAD]: '#ff3333',
  [PRODUCT_TAGS.VISUAL]: '#ffd700',
  [PRODUCT_TAGS.NORMAL]: '#00d4ff',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div
      className="p-3 rounded-xl text-sm"
      style={{
        background: 'rgba(15,23,42,0.97)',
        border: `1px solid ${TAG_COLORS[d.tag]}50`,
        boxShadow: `0 12px 28px rgba(2,6,23,.28)`,
        maxWidth: 220,
      }}
    >
      <div className="font-bold mb-2 leading-tight" style={{ color: TAG_COLORS[d.tag] }}>
        {d.tagMeta?.icon} {d.tagMeta?.label}
      </div>
      <div className="text-white/80 mb-2 leading-tight">{d.name}</div>
      <div className="flex flex-col gap-1 text-white/50">
        <div>花费: <span className="text-white/80">{formatMoney(d.spend)}</span></div>
        <div>询盘: <span className="text-white/80">{d.inquiries}</span></div>
        <div>CTR: <span className="text-white/80">{d.ctr?.toFixed(2)}%</span></div>
        <div>询盘率: <span className="text-white/80">{d.inquiryRate?.toFixed(2)}%</span></div>
      </div>
      <div
        className="mt-2 pt-2 text-white/60 leading-relaxed"
        style={{ borderTop: `1px solid ${TAG_COLORS[d.tag]}20` }}
      >
        💡 {d.tagMeta?.action}
      </div>
    </div>
  );
};

const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null;
  const color = TAG_COLORS[payload?.tag] || '#00d4ff';
  const isHot = payload?.tag === PRODUCT_TAGS.HOT;
  const isDead = payload?.tag === PRODUCT_TAGS.DEAD;
  const r = isHot ? 8 : isDead ? 7 : 6;

  return (
    <g>
      {isHot && (
        <circle cx={cx} cy={cy} r={r + 6} fill={color} opacity={0.1}>
          <animate attributeName="r" values={`${r + 4};${r + 10};${r + 4}`} dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.15;0.05;0.15" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
      {isDead && (
        <circle cx={cx} cy={cy} r={r + 4} fill={color} opacity={0.15}>
          <animate attributeName="opacity" values="0.15;0.05;0.15" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
      <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.85} filter={`drop-shadow(0 0 4px ${color})`} />
      <circle cx={cx} cy={cy} r={r * 0.4} fill="white" opacity={0.5} />
    </g>
  );
};

export default function ScatterMatrix({ products }) {
  const [filterTag, setFilterTag] = useState('all');

  if (!products || products.length === 0) {
    return (
      <div className="glass-card p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-green-200 tracking-[0.18em] uppercase">产品表现矩阵</h3>
        </div>
        <div className="flex flex-col items-center justify-center h-56 gap-3 text-white/20">
          <span className="text-4xl">⚡</span>
          <span className="text-sm font-mono">请上传产品分析报告</span>
        </div>
      </div>
    );
  }

  const filtered = filterTag === 'all' ? products : products.filter((p) => p.tag === filterTag);

  const tagCounts = {
    [PRODUCT_TAGS.HOT]: products.filter((p) => p.tag === PRODUCT_TAGS.HOT).length,
    [PRODUCT_TAGS.DEAD]: products.filter((p) => p.tag === PRODUCT_TAGS.DEAD).length,
    [PRODUCT_TAGS.VISUAL]: products.filter((p) => p.tag === PRODUCT_TAGS.VISUAL).length,
    [PRODUCT_TAGS.NORMAL]: products.filter((p) => p.tag === PRODUCT_TAGS.NORMAL).length,
  };

  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-green-200 tracking-[0.18em] uppercase">产品表现矩阵</h3>
          <span className="text-sm text-white/40">横轴: 花费 · 纵轴: 询盘量</span>
        </div>

        {/* Filter tags */}
        <div className="flex gap-1.5">
          <button
            onClick={() => setFilterTag('all')}
              className="text-sm px-2.5 py-1 rounded-lg transition-all"
            style={{
                background: filterTag === 'all' ? 'rgba(255,255,255,0.12)' : 'transparent',
                border: '1px solid rgba(148,163,184,0.2)',
                color: '#f8fafc',
            }}
          >
            全部 {products.length}
          </button>
          {Object.entries({ [PRODUCT_TAGS.HOT]: '🚀', [PRODUCT_TAGS.DEAD]: '💀', [PRODUCT_TAGS.VISUAL]: '👁', [PRODUCT_TAGS.NORMAL]: '📊' }).map(([tag, icon]) => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag === filterTag ? 'all' : tag)}
              className="text-sm px-2.5 py-1 rounded-lg transition-all"
              style={{
                background: filterTag === tag ? `${TAG_COLORS[tag]}20` : 'transparent',
                border: `1px solid ${filterTag === tag ? TAG_COLORS[tag] + '60' : 'rgba(148,163,184,0.18)'}`,
                color: TAG_COLORS[tag],
              }}
            >
              {icon} {tagCounts[tag]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
            <XAxis
              type="number"
              dataKey="spend"
              name="花费"
              tick={{ fill: 'rgba(226,232,240,0.82)', fontSize: 11, fontFamily: 'PingFang SC, Inter, system-ui, sans-serif' }}
              tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
              stroke="rgba(148,163,184,0.2)"
            >
              <Label value="P4P花费 (¥)" position="insideBottom" offset={-15} fill="rgba(226,232,240,0.72)" fontSize={11} fontFamily="PingFang SC, Inter, system-ui, sans-serif" />
            </XAxis>
            <YAxis
              type="number"
              dataKey="inquiries"
              name="询盘量"
              tick={{ fill: 'rgba(226,232,240,0.82)', fontSize: 11, fontFamily: 'PingFang SC, Inter, system-ui, sans-serif' }}
              stroke="rgba(148,163,184,0.2)"
            >
              <Label value="询盘量" angle={-90} position="insideLeft" fill="rgba(226,232,240,0.72)" fontSize={11} fontFamily="PingFang SC, Inter, system-ui, sans-serif" />
            </YAxis>
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,212,255,0.05)' }} />

            {/* Reference lines for quadrant */}
            <ReferenceLine y={1} stroke="rgba(255,215,0,0.15)" strokeDasharray="4 4" />

            <Scatter
              data={filtered}
              shape={<CustomDot />}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap justify-center">
        {[
          { tag: PRODUCT_TAGS.HOT, label: '爆品/潜力', icon: '🚀' },
          { tag: PRODUCT_TAGS.DEAD, label: '烧钱/索命', icon: '💀' },
          { tag: PRODUCT_TAGS.VISUAL, label: '视觉品', icon: '👁' },
          { tag: PRODUCT_TAGS.NORMAL, label: '待优化', icon: '📊' },
        ].map(({ tag, label, icon }) => (
          <div key={tag} className="flex items-center gap-1.5 text-sm">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: TAG_COLORS[tag], boxShadow: `0 0 6px ${TAG_COLORS[tag]}` }} />
            <span className="text-white/50">{icon} {label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
