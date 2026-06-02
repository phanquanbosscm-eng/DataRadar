import React, { useState } from 'react';
import { formatMoney } from '../utils/analytics';

export default function KeywordPanel({ keywordAnalysis }) {
  const [tab, setTab] = useState('waste');

  if (!keywordAnalysis) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <h3 className="font-mono text-sm font-semibold text-yellow-300 tracking-widest uppercase">搜索词分析</h3>
        </div>
        <div className="flex flex-col items-center justify-center h-32 gap-2 text-white/20">
          <span className="text-3xl">🔍</span>
          <span className="text-sm font-mono">请上传搜索词报告</span>
        </div>
      </div>
    );
  }

  const { waste, valuable, all } = keywordAnalysis;
  const totalWasteSpend = waste.reduce((s, k) => s + k.spend, 0);

  const list = tab === 'waste' ? waste : tab === 'valuable' ? valuable : all;

  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <h3 className="font-mono text-sm font-semibold text-yellow-300 tracking-widest uppercase">搜索词分析</h3>
        </div>
        {waste.length > 0 && (
          <div
            className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg"
            style={{ background: 'rgba(255,51,51,0.1)', border: '1px solid rgba(255,51,51,0.3)', color: '#ff3333' }}
          >
            <span className="animate-pulse">🔥</span>
            废词烧钱: {formatMoney(totalWasteSpend)}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {[
          { key: 'waste', label: `废词 (${waste.length})`, color: '#ff3333' },
          { key: 'valuable', label: `优质词 (${valuable.length})`, color: '#00ff88' },
          { key: 'all', label: `全部 (${all.length})`, color: '#00d4ff' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 py-1.5 text-xs font-mono rounded-lg transition-all"
            style={{
              background: tab === t.key ? `${t.color}15` : 'transparent',
              border: `1px solid ${tab === t.key ? t.color + '50' : 'rgba(255,255,255,0.08)'}`,
              color: tab === t.key ? t.color : 'rgba(255,255,255,0.35)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
        <table className="w-full text-xs font-mono">
          <thead className="sticky top-0" style={{ background: 'rgba(5,12,31,0.95)' }}>
            <tr className="border-b border-white/5">
              {['搜索词', '曝光', '点击', 'CTR', '花费', '询盘', '状态'].map((h) => (
                <th key={h} className="text-left py-2 px-2 text-white/30 font-normal whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((k, i) => (
              <tr key={i} className="border-b border-white/[0.03]">
                <td className="py-2 px-2 max-w-[120px]">
                  <span className="block truncate text-white/75" title={k.word}>{k.word}</span>
                </td>
                <td className="py-2 px-2 text-white/40">
                  {k.impressions >= 1000 ? `${(k.impressions / 1000).toFixed(1)}K` : k.impressions}
                </td>
                <td className="py-2 px-2 text-white/50">{k.clicks}</td>
                <td className="py-2 px-2">
                  <span style={{ color: k.ctr >= 1 ? '#00ff88' : '#ff8c00' }}>{k.ctr?.toFixed(2)}%</span>
                </td>
                <td className="py-2 px-2" style={{ color: k.isWaste ? '#ff3333' : 'rgba(255,255,255,0.6)' }}>
                  {formatMoney(k.spend)}
                </td>
                <td className="py-2 px-2">
                  <span style={{ color: k.inquiries > 0 ? '#00ff88' : '#ff3333' }}>{k.inquiries}</span>
                </td>
                <td className="py-2 px-2">
                  {k.isWaste ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'rgba(255,51,51,0.1)', border: '1px solid rgba(255,51,51,0.3)', color: '#ff3333' }}>废词</span>
                  ) : k.inquiries > 0 ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88' }}>优质</span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}>观察</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {list.length === 0 && (
          <div className="text-center text-white/25 font-mono text-sm py-6">暂无数据</div>
        )}
      </div>
    </div>
  );
}
