import React from 'react';

const NAV_ITEMS = [
  { id: 'plans',     icon: '📋', label: '计划管理',     sub: 'Plan Management',   highlight: true },
  { id: 'dashboard', icon: '🌐', label: '全局战略大屏', sub: 'Global Dashboard' },
  { id: 'weekly',    icon: '⚡', label: '周期对比分析', sub: 'Weekly Comparison' },
  { id: 'products',  icon: '📦', label: '产品管理',     sub: 'Product Management' },
  { id: 'keywords',  icon: '🔍', label: '搜索词透视',   sub: 'Keyword Analysis' },
];

const UPLOAD_INDICATOR = [
  { id: 'plan',    label: '计划报告',   color: '#00d4ff' },
  { id: 'product', label: '产品报告',   color: '#00ff88' },
  { id: 'keyword', label: '搜索词报告', color: '#ffd700' },
];

export default function Sidebar({ page, setPage, fileData }) {
  return (
    <aside
      className="flex flex-col flex-shrink-0 h-full select-none"
      style={{
        width: 216,
        background: 'rgba(15,23,42,0.86)',
        borderRight: '1px solid rgba(148,163,184,0.16)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-4 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(148,163,184,0.14)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
          style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,.28), rgba(34,197,94,.18))',
              border: '1px solid rgba(96,165,250,.4)',
              boxShadow: '0 10px 24px rgba(59,130,246,.16)',
          }}
        >
          📡
        </div>
        <div>
            <div className="font-display font-bold text-base text-gradient-cyber leading-tight">飞屏雷达</div>
            <div className="text-[10px] text-white/35 leading-tight">LED · BI · 2026</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-1 overflow-y-auto">
        <div className="text-[10px] text-white/35 px-2 mb-1 tracking-[0.22em] uppercase">导航</div>
        {NAV_ITEMS.map((item) => {
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200"
              style={{
                background: active
                  ? (item.highlight ? 'linear-gradient(135deg,rgba(0,255,136,.15),rgba(0,212,255,.08))' : 'linear-gradient(135deg,rgba(0,212,255,.15),rgba(0,255,136,.07))')
                  : item.highlight ? 'rgba(0,255,136,0.04)' : 'rgba(255,255,255,.02)',
                border: `1px solid ${active ? (item.highlight ? 'rgba(0,255,136,.4)' : 'rgba(0,212,255,.3)') : item.highlight ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,.06)'}`,
                boxShadow: active ? '0 0 16px rgba(0,212,255,.1)' : 'none',
              }}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <div className="min-w-0">
                <div
                  className="text-sm font-semibold leading-tight truncate"
                  style={{ color: active ? '#e0f2fe' : 'rgba(226,232,240,.9)' }}
                >
                  {item.label}
                </div>
                <div className="text-[10px] text-white/35 leading-tight truncate">{item.sub}</div>
              </div>
              {active && (
                <div
                  className="ml-auto w-1 h-4 rounded-full flex-shrink-0"
                  style={{ background: 'linear-gradient(#60a5fa,#34d399)', boxShadow: '0 0 8px rgba(96,165,250,.65)' }}
                />
              )}
            </button>
          );
        })}

        {/* Data status */}
        <div className="mt-4">
          <div className="text-[10px] text-white/35 px-2 mb-2 tracking-[0.22em] uppercase">数据状态</div>
          <div className="flex flex-col gap-1.5 px-1">
            {UPLOAD_INDICATOR.map((u) => {
              const hasCurrent = !!fileData?.[u.id]?.current;
              const hasPrev    = !!fileData?.[u.id]?.prev;
              return (
                <div key={u.id} className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      background: hasCurrent ? u.color : 'rgba(255,255,255,0.12)',
                      boxShadow: hasCurrent ? `0 0 6px ${u.color}` : 'none',
                    }}
                  />
                  <span className="text-[11px] text-white/50 flex-1 truncate">{u.label}</span>
                  {hasPrev && (
                    <span className="text-[10px] px-1.5 rounded" style={{ background: 'rgba(255,215,0,.14)', color: '#fde68a' }}>对比</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Bottom info */}
      <div
        className="flex-shrink-0 px-4 py-3 text-[10px] text-white/30 leading-relaxed"
        style={{ borderTop: '1px solid rgba(148,163,184,.12)' }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/45">本地隐私保护</span>
        </div>
        v2.0 · 2026 黄金三角
      </div>
    </aside>
  );
}
