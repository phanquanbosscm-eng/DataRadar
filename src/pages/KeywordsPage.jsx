import React, { useState, useMemo } from 'react';
import { formatMoney } from '../utils/analytics';

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { key: 'clicks',     label: '点击量',  desc: true },
  { key: 'spend',      label: '消耗',    desc: true },
  { key: 'impressions',label: '曝光量',  desc: true },
  { key: 'inquiries',  label: '询盘量',  desc: true },
  { key: 'ctr',        label: 'CTR',     desc: true },
];

function Pagination({ page, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1.5">
      <button onClick={() => onChange(page - 1)} disabled={page === 1}
        className="px-3 py-1.5 rounded-lg text-xs font-mono disabled:opacity-30"
        style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)' }}>
        ← 上一页
      </button>
      <span className="text-xs font-mono text-white/40 px-2">{page} / {totalPages}</span>
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
        className="px-3 py-1.5 rounded-lg text-xs font-mono disabled:opacity-30"
        style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)' }}>
        下一页 →
      </button>
    </div>
  );
}

export default function KeywordsPage({ keywordAnalysis }) {
  const [sortKey, setSortKey]   = useState('clicks');
  const [sortDesc, setSortDesc] = useState(true);
  const [tab, setTab]           = useState('all');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);

  const allKws = keywordAnalysis?.all || [];
  const wasteKws = keywordAnalysis?.waste || [];
  const valuableKws = keywordAnalysis?.valuable || [];

  // Top 50 by clicks
  const top50 = useMemo(() => [...allKws].sort((a, b) => b.clicks - a.clicks).slice(0, 50), [allKws]);

  const source = tab === 'top50' ? top50 : tab === 'waste' ? wasteKws : tab === 'valuable' ? valuableKws : allKws;

  const filtered = useMemo(() => {
    let list = [...source];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(k => k.word.toLowerCase().includes(q));
    }
    list.sort((a, b) => sortDesc ? (b[sortKey] || 0) - (a[sortKey] || 0) : (a[sortKey] || 0) - (b[sortKey] || 0));
    return list;
  }, [source, search, sortKey, sortDesc]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalWasteSpend = wasteKws.reduce((s, k) => s + k.spend, 0);

  const handleSort = (key) => {
    if (key === sortKey) setSortDesc(!sortDesc);
    else { setSortKey(key); setSortDesc(true); }
    setPage(1);
  };

  if (!keywordAnalysis) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-white/25">
        <span className="text-4xl">🔍</span>
        <span className="font-mono text-sm">请先上传搜索词报告</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-xl text-gradient-cyber">搜索词透视</h1>
          <p className="text-xs font-mono text-white/30 mt-0.5">Keyword Analysis · 多维度搜索词分析</p>
        </div>
        {wasteKws.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono"
            style={{ background: 'rgba(255,51,51,.08)', border: '1px solid rgba(255,51,51,.3)' }}>
            <span className="animate-pulse">🔥</span>
            <span className="text-red-400 font-bold">废词总烧钱：{formatMoney(totalWasteSpend)}</span>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '全部搜索词', value: allKws.length, icon: '🔍', color: '#00d4ff' },
          { label: '点击前50', value: Math.min(50, allKws.length), icon: '🏆', color: '#ffd700' },
          { label: '废词 (高消耗0转化)', value: wasteKws.length, icon: '🗑', color: '#ff3333' },
          { label: '优质词 (有询盘)', value: valuableKws.length, icon: '💎', color: '#00ff88' },
        ].map(c => (
          <div key={c.label} className="glass-card px-4 py-3 flex items-center gap-3">
            <span className="text-xl">{c.icon}</span>
            <div>
              <div className="text-xs font-mono text-white/35">{c.label}</div>
              <div className="text-xl font-bold font-mono" style={{ color: c.color }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + Filter */}
      <div className="glass-card p-4 flex flex-col gap-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all',      label: `全部 (${allKws.length})`,      color: '#00d4ff' },
            { key: 'top50',    label: `点击前50 (${Math.min(50, allKws.length)})`, color: '#ffd700' },
            { key: 'waste',    label: `废词 (${wasteKws.length})`,     color: '#ff3333' },
            { key: 'valuable', label: `优质词 (${valuableKws.length})`, color: '#00ff88' },
          ].map(t => (
            <button key={t.key}
              onClick={() => { setTab(t.key); setPage(1); }}
              className="flex-1 min-w-[100px] py-2 text-xs font-mono rounded-xl transition-all"
              style={{
                background: tab === t.key ? `${t.color}15` : 'transparent',
                border: `1px solid ${tab === t.key ? t.color + '50' : 'rgba(255,255,255,.07)'}`,
                color: tab === t.key ? t.color : 'rgba(255,255,255,.35)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3 flex-wrap">
          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-white/30">排序:</span>
            {SORT_OPTIONS.map(o => (
              <button key={o.key} onClick={() => handleSort(o.key)}
                className="text-xs font-mono px-2.5 py-1 rounded-lg transition-all"
                style={{
                  background: sortKey === o.key ? 'rgba(0,212,255,.12)' : 'rgba(255,255,255,.03)',
                  border: `1px solid ${sortKey === o.key ? 'rgba(0,212,255,.4)' : 'rgba(255,255,255,.07)'}`,
                  color: sortKey === o.key ? '#00d4ff' : 'rgba(255,255,255,.4)',
                }}>
                {o.label} {sortKey === o.key && (sortDesc ? '↓' : '↑')}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 relative min-w-[160px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 text-xs">🔎</span>
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="搜索关键词..."
              className="w-full pl-8 pr-3 py-1.5 text-xs" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr style={{ background: 'rgba(255,215,0,.04)', borderBottom: '1px solid rgba(255,215,0,.1)' }}>
                {[
                  { label: '#',      key: null },
                  { label: '搜索词',  key: null },
                  { label: '曝光',   key: 'impressions' },
                  { label: '点击',   key: 'clicks' },
                  { label: 'CTR',   key: 'ctr' },
                  { label: '消耗',   key: 'spend' },
                  { label: '询盘',   key: 'inquiries' },
                  { label: '询盘率', key: 'inquiryRate' },
                  { label: '状态',   key: null },
                  { label: '建议操作', key: null },
                ].map((h, i) => (
                  <th key={i}
                    className={`text-left py-3 px-3 text-white/40 font-normal whitespace-nowrap ${h.key ? 'cursor-pointer hover:text-white/70 transition-colors' : ''}`}
                    onClick={h.key ? () => handleSort(h.key) : undefined}>
                    {h.label}
                    {h.key && sortKey === h.key && <span className="ml-1 text-yellow-400">{sortDesc ? '↓' : '↑'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((k, i) => {
                const rowNum = (page - 1) * PAGE_SIZE + i + 1;
                const isWaste = k.isWaste;
                const isGood  = k.inquiries > 0;
                return (
                  <tr key={rowNum} className="transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,.03)', background: isWaste ? 'rgba(255,51,51,.03)' : 'transparent' }}>
                    <td className="py-2.5 px-3 text-white/20">{rowNum}</td>
                    <td className="py-2.5 px-3 max-w-[160px]">
                      <span className="block truncate font-medium" style={{ color: isWaste ? '#ff8888' : 'rgba(255,255,255,.8)' }} title={k.word}>{k.word}</span>
                    </td>
                    <td className="py-2.5 px-3 text-white/40">
                      {k.impressions >= 1000 ? `${(k.impressions / 1000).toFixed(1)}K` : k.impressions}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold" style={{ color: k.clicks > 100 ? '#ffd700' : 'rgba(255,255,255,.6)' }}>{k.clicks}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span style={{ color: k.ctr >= 1 ? '#00ff88' : k.ctr >= 0.3 ? '#ffd700' : '#ff6666' }}>{k.ctr?.toFixed(2)}%</span>
                    </td>
                    <td className="py-2.5 px-3" style={{ color: isWaste ? '#ff6666' : 'rgba(255,255,255,.65)' }}>
                      {formatMoney(k.spend)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span style={{ color: k.inquiries > 0 ? '#00ff88' : '#ff3333' }}>{k.inquiries}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span style={{ color: k.inquiryRate >= 2 ? '#00ff88' : k.inquiryRate > 0 ? '#ffd700' : '#ff3333' }}>
                        {k.inquiryRate?.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {isWaste ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'rgba(255,51,51,.12)', border: '1px solid rgba(255,51,51,.3)', color: '#ff6666' }}>废词</span>
                      ) : isGood ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'rgba(0,255,136,.1)', border: '1px solid rgba(0,255,136,.3)', color: '#00ff88' }}>优质</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'rgba(0,212,255,.08)', border: '1px solid rgba(0,212,255,.2)', color: '#00d4ff' }}>观察</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-white/30 whitespace-nowrap">
                      {isWaste ? '设为否词 / 暂停' : isGood ? '加大出价' : '降低出价观察'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {paginated.length === 0 && (
          <div className="text-center text-white/25 font-mono text-sm py-10">没有符合条件的搜索词</div>
        )}
      </div>

      <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={(p) => setPage(p)} />
      <div className="text-center text-xs font-mono text-white/20">
        共 {filtered.length} 条 · 显示第 {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} 条
      </div>
    </div>
  );
}
