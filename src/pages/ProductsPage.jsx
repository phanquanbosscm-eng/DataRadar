import React, { useState, useMemo } from 'react';
import { PRODUCT_TAG_META, PRODUCT_TAGS, formatMoney } from '../utils/analytics';

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50];

const SORT_OPTIONS = [
  { key: 'spend',       label: '花费 (吞金兽)',   icon: '💰', desc: true },
  { key: 'inquiries',   label: '询盘 (摇钱树)',   icon: '💬', desc: true },
  { key: 'ctr',         label: 'CTR 点击率',      icon: '🎯', desc: true },
  { key: 'inquiryRate', label: '询盘率',           icon: '📈', desc: true },
  { key: 'impressions', label: '曝光量',           icon: '📡', desc: true },
];

function Pagination({ page, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all disabled:opacity-30"
        style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)' }}
      >
        ← 上一页
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="px-2 text-white/20 font-mono text-xs">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className="w-8 h-8 rounded-lg text-xs font-mono transition-all"
            style={{
              background: page === p ? 'linear-gradient(135deg,rgba(0,212,255,.2),rgba(0,255,136,.15))' : 'rgba(255,255,255,.04)',
              border: `1px solid ${page === p ? 'rgba(0,212,255,.5)' : 'rgba(255,255,255,.07)'}`,
              color: page === p ? '#00d4ff' : 'rgba(255,255,255,.5)',
              fontWeight: page === p ? 'bold' : 'normal',
            }}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all disabled:opacity-30"
        style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)' }}
      >
        下一页 →
      </button>
    </div>
  );
}

export default function ProductsPage({ products }) {
  const [sortKey, setSortKey]       = useState('spend');
  const [sortDesc, setSortDesc]     = useState(true);
  const [filterTag, setFilterTag]   = useState('all');
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(15);
  const [expanded, setExpanded]     = useState(null);

  const filtered = useMemo(() => {
    if (!products) return [];
    let list = [...products];
    if (filterTag !== 'all') list = list.filter(p => p.tag === filterTag);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => sortDesc ? (b[sortKey] || 0) - (a[sortKey] || 0) : (a[sortKey] || 0) - (b[sortKey] || 0));
    return list;
  }, [products, filterTag, search, sortKey, sortDesc]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  const tagCounts = useMemo(() => {
    if (!products) return {};
    return Object.values(PRODUCT_TAGS).reduce((acc, t) => {
      acc[t] = products.filter(p => p.tag === t).length;
      return acc;
    }, {});
  }, [products]);

  const handleSort = (key) => {
    if (key === sortKey) setSortDesc(!sortDesc);
    else { setSortKey(key); setSortDesc(true); }
    setPage(1);
  };

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-white/25">
        <span className="text-4xl">📦</span>
        <span className="font-mono text-sm">请先上传产品分析报告</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-xl text-gradient-cyber">分页产品管理</h1>
          <p className="text-xs font-mono text-white/30 mt-0.5">Product Management · 共 {products.length} 款产品</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-white/30">
          <span>每页</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="px-2 py-1 text-xs rounded-lg"
            style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: '#fff' }}
          >
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n} 条</option>)}
          </select>
          <span>第 {page}/{totalPages || 1} 页</span>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col gap-3">
        {/* Tag filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-white/30">分类:</span>
          <button
            onClick={() => { setFilterTag('all'); setPage(1); }}
            className="text-xs font-mono px-3 py-1 rounded-full transition-all"
            style={{ background: filterTag === 'all' ? 'rgba(255,255,255,.1)' : 'transparent', border: '1px solid rgba(255,255,255,.1)', color: filterTag === 'all' ? '#fff' : 'rgba(255,255,255,.4)' }}
          >
            全部 ({products.length})
          </button>
          {Object.entries(PRODUCT_TAG_META).map(([tag, meta]) => (
            <button
              key={tag}
              onClick={() => { setFilterTag(filterTag === tag ? 'all' : tag); setPage(1); }}
              className="text-xs font-mono px-3 py-1 rounded-full transition-all"
              style={{
                background: filterTag === tag ? meta.bg : 'transparent',
                border: `1px solid ${filterTag === tag ? meta.border : 'rgba(255,255,255,.08)'}`,
                color: meta.color,
              }}
            >
              {meta.icon} {meta.label} ({tagCounts[tag] || 0})
            </button>
          ))}
        </div>

        {/* Sort buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-white/30">排序:</span>
          {SORT_OPTIONS.map(o => (
            <button
              key={o.key}
              onClick={() => handleSort(o.key)}
              className="flex items-center gap-1 text-xs font-mono px-3 py-1 rounded-lg transition-all"
              style={{
                background: sortKey === o.key ? 'rgba(0,212,255,.12)' : 'rgba(255,255,255,.03)',
                border: `1px solid ${sortKey === o.key ? 'rgba(0,212,255,.4)' : 'rgba(255,255,255,.07)'}`,
                color: sortKey === o.key ? '#00d4ff' : 'rgba(255,255,255,.4)',
              }}
            >
              <span>{o.icon}</span>
              <span>{o.label}</span>
              {sortKey === o.key && <span>{sortDesc ? '↓' : '↑'}</span>}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 text-xs">🔎</span>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="搜索产品名称..."
            className="w-full pl-8 pr-3 py-2 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr style={{ background: 'rgba(0,212,255,.05)', borderBottom: '1px solid rgba(0,212,255,.1)' }}>
                {[
                  { label: '#',      key: null },
                  { label: '产品名称', key: null },
                  { label: '类别',    key: null },
                  { label: '花费',    key: 'spend' },
                  { label: '曝光',    key: 'impressions' },
                  { label: 'CTR',    key: 'ctr' },
                  { label: '询盘',   key: 'inquiries' },
                  { label: '询盘率', key: 'inquiryRate' },
                  { label: '操作建议', key: null },
                ].map((h, i) => (
                  <th
                    key={i}
                    className={`text-left py-3 px-3 text-white/40 font-normal whitespace-nowrap ${h.key ? 'cursor-pointer hover:text-white/70 transition-colors' : ''}`}
                    onClick={h.key ? () => handleSort(h.key) : undefined}
                  >
                    {h.label}
                    {h.key && sortKey === h.key && <span className="ml-1 text-cyan-400">{sortDesc ? '↓' : '↑'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((p, i) => {
                const meta = p.tagMeta || PRODUCT_TAG_META[p.tag];
                const rowNum = (page - 1) * pageSize + i + 1;
                const isExpanded = expanded === rowNum;
                return (
                  <React.Fragment key={rowNum}>
                    <tr
                      className="transition-colors cursor-pointer"
                      style={{ borderBottom: '1px solid rgba(255,255,255,.03)', background: isExpanded ? `${meta.bg}` : 'transparent' }}
                      onClick={() => setExpanded(isExpanded ? null : rowNum)}
                    >
                      <td className="py-3 px-3 text-white/20">{rowNum}</td>
                      <td className="py-3 px-3 max-w-[180px]">
                        <span className="block truncate text-white/80 font-medium" title={p.name}>{p.name}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full whitespace-nowrap text-[11px]"
                          style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span style={{ color: p.tag === PRODUCT_TAGS.DEAD ? '#ff3333' : 'rgba(255,255,255,.7)' }}>
                          {formatMoney(p.spend)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-white/45">
                        {p.impressions >= 1000 ? `${(p.impressions / 1000).toFixed(1)}K` : p.impressions}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span style={{ color: p.ctr >= 1 ? '#00ff88' : p.ctr >= 0.5 ? '#ffd700' : '#ff3333' }}>
                            {p.ctr?.toFixed(2)}%
                          </span>
                          <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.08)' }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, p.ctr * 50)}%`, background: p.ctr >= 1 ? '#00ff88' : '#ff3333' }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span style={{ color: p.inquiries > 0 ? '#00ff88' : '#ff3333' }}>{p.inquiries}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span style={{ color: p.inquiryRate >= 2 ? '#00ff88' : p.inquiryRate >= 1 ? '#ffd700' : '#ff3333' }}>
                            {p.inquiryRate?.toFixed(2)}%
                          </span>
                          <div className="w-10 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.08)' }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, p.inquiryRate * 25)}%`, background: p.inquiryRate >= 2 ? '#00ff88' : '#ffd700' }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 max-w-[200px]">
                        <span className="block truncate text-white/35" title={meta.action}>{meta.action}</span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="px-4 py-3">
                          <div className="rounded-xl p-3 text-xs leading-relaxed flex items-start gap-2"
                            style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
                            <span className="text-base">{meta.icon}</span>
                            <div>
                              <span className="font-bold" style={{ color: meta.color }}>{meta.label} · 操作建议：</span>
                              <span className="ml-1 text-white/65">{meta.action}</span>
                            </div>
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

        {paginated.length === 0 && (
          <div className="text-center text-white/25 font-mono text-sm py-10">没有符合条件的产品</div>
        )}
      </div>

      {/* Pagination */}
      <Pagination page={page} total={filtered.length} pageSize={pageSize} onChange={(p) => { setPage(p); setExpanded(null); }} />

      <div className="text-center text-xs font-mono text-white/20">
        共 {filtered.length} 条 · 显示第 {Math.min((page - 1) * pageSize + 1, filtered.length)}–{Math.min(page * pageSize, filtered.length)} 条
      </div>
    </div>
  );
}
