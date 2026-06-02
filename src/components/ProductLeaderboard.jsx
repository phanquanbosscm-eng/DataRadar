import React, { useState } from 'react';
import { PRODUCT_TAGS, PRODUCT_TAG_META, formatMoney } from '../utils/analytics';

const SORT_OPTIONS = [
  { key: 'spend', label: '花费↓' },
  { key: 'inquiries', label: '询盘↓' },
  { key: 'ctr', label: 'CTR↓' },
  { key: 'inquiryRate', label: '询盘率↓' },
];

export default function ProductLeaderboard({ products }) {
  const [sort, setSort] = useState('spend');
  const [filterTag, setFilterTag] = useState('all');
  const [expanded, setExpanded] = useState(null);

  if (!products || products.length === 0) {
    return (
      <div className="glass-card p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <h3 className="font-mono text-sm font-semibold text-red-300 tracking-widest uppercase">产品生死榜</h3>
        </div>
        <div className="flex flex-col items-center justify-center h-32 gap-3 text-white/20">
          <span className="text-3xl">📋</span>
          <span className="text-sm font-mono">暂无产品数据</span>
        </div>
      </div>
    );
  }

  const sorted = [...products]
    .filter((p) => filterTag === 'all' || p.tag === filterTag)
    .sort((a, b) => (b[sort] || 0) - (a[sort] || 0));

  const tagCounts = Object.values(PRODUCT_TAGS).reduce((acc, t) => {
    acc[t] = products.filter((p) => p.tag === t).length;
    return acc;
  }, {});

  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <h3 className="font-mono text-sm font-semibold text-red-300 tracking-widest uppercase">产品生死榜</h3>
          <span className="text-xs font-mono text-white/30">共 {products.length} 款</span>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-white/30">排序:</span>
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => setSort(o.key)}
              className="text-xs font-mono px-2 py-0.5 rounded transition-all"
              style={{
                background: sort === o.key ? 'rgba(0,212,255,0.15)' : 'transparent',
                border: `1px solid ${sort === o.key ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: sort === o.key ? '#00d4ff' : 'rgba(255,255,255,0.4)',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tag filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterTag('all')}
          className="text-xs font-mono px-3 py-1 rounded-full transition-all"
          style={{
            background: filterTag === 'all' ? 'rgba(255,255,255,0.08)' : 'transparent',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
          }}
        >
          全部 ({products.length})
        </button>
        {Object.entries(PRODUCT_TAG_META).map(([tag, meta]) => (
          <button
            key={tag}
            onClick={() => setFilterTag(filterTag === tag ? 'all' : tag)}
            className="text-xs font-mono px-3 py-1 rounded-full transition-all"
            style={{
              background: filterTag === tag ? meta.bg : 'transparent',
              border: `1px solid ${filterTag === tag ? meta.border : 'rgba(255,255,255,0.08)'}`,
              color: meta.color,
            }}
          >
            {meta.icon} {meta.label} ({tagCounts[tag] || 0})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-white/5">
              {['产品', '类别', '花费', '曝光', 'CTR', '询盘', '询盘率', '操作建议'].map((h) => (
                <th key={h} className="text-left py-2 px-2 text-white/30 font-normal whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => {
              const meta = p.tagMeta || PRODUCT_TAG_META[p.tag];
              const isExpanded = expanded === i;
              return (
                <React.Fragment key={i}>
                  <tr
                    className="border-b border-white/[0.03] cursor-pointer transition-colors"
                    style={{ background: isExpanded ? `${meta.bg}` : 'transparent' }}
                    onClick={() => setExpanded(isExpanded ? null : i)}
                  >
                    <td className="py-2.5 px-2 max-w-[140px]">
                      <span className="block truncate text-white/80" title={p.name}>{p.name}</span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }}
                      >
                        {meta.icon} {meta.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span style={{ color: p.tag === PRODUCT_TAGS.DEAD ? '#ff3333' : 'rgba(255,255,255,0.7)' }}>
                        {formatMoney(p.spend)}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-white/50">{p.impressions >= 1000 ? `${(p.impressions/1000).toFixed(1)}K` : p.impressions}</td>
                    <td className="py-2.5 px-2">
                      <span style={{ color: p.ctr >= 1 ? '#00ff88' : p.ctr >= 0.5 ? '#ffd700' : '#ff3333' }}>
                        {p.ctr?.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span style={{ color: p.inquiries > 0 ? '#00ff88' : '#ff3333' }}>
                        {p.inquiries}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span style={{ color: p.inquiryRate >= 2 ? '#00ff88' : p.inquiryRate >= 1 ? '#ffd700' : '#ff3333' }}>
                        {p.inquiryRate?.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-2 max-w-[180px]">
                      <span className="block truncate text-white/40" title={meta.action}>{meta.action}</span>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={8} className="px-3 py-3">
                        <div
                          className="rounded-lg p-3 text-xs leading-relaxed"
                          style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
                        >
                          <span className="font-bold" style={{ color: meta.color }}>{meta.icon} 操作建议：</span>
                          <span className="ml-2 text-white/70">{meta.action}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <div className="text-center text-white/30 font-mono text-sm py-6">该分类暂无产品</div>
      )}
    </div>
  );
}
