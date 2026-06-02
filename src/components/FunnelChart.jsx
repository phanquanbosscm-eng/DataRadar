import React from 'react';
import { formatNum } from '../utils/analytics';

function FunnelBar({ stage, value, pct, color, maxValue, index, total }) {
  const barWidth = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div className="flex flex-col gap-1.5">
      {/* Stage label */}
      <div className="flex items-center justify-between text-xs font-mono">
        <span style={{ color }} className="font-semibold tracking-wide">{stage}</span>
        <div className="flex items-center gap-3">
          <span className="text-white/40">{pct.toFixed(2)}%</span>
          <span className="font-bold" style={{ color }}>{formatNum(value)}</span>
        </div>
      </div>

      {/* Bar */}
      <div className="relative h-9 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div
          className="absolute inset-y-0 left-0 rounded-lg transition-all duration-1000 ease-out flex items-center"
          style={{
            width: `${barWidth}%`,
            background: `linear-gradient(90deg, ${color}cc, ${color}55)`,
            boxShadow: `0 0 12px ${color}40`,
            minWidth: value > 0 ? '4px' : '0',
          }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-lg opacity-30"
          style={{
            width: `${barWidth}%`,
            background: `linear-gradient(90deg, ${color}, transparent)`,
          }}
        />
      </div>

      {/* Conversion arrow (except last) */}
      {index < total - 1 && (
        <div className="flex items-center gap-2 py-0.5">
          <div className="flex-1 border-t border-dashed border-white/10" />
          <span className="text-xs text-white/20 font-mono">▼ 转化</span>
          <div className="flex-1 border-t border-dashed border-white/10" />
        </div>
      )}
    </div>
  );
}

export default function FunnelChart({ funnelData }) {
  if (!funnelData || funnelData.length === 0) {
    return (
      <div className="glass-card p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="font-mono text-sm font-semibold text-cyan-300 tracking-widest uppercase">流量转化漏斗</h3>
        </div>
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-white/20">
          <span className="text-4xl">🔻</span>
          <span className="text-sm font-mono">请上传数据以生成漏斗</span>
        </div>
      </div>
    );
  }

  const maxValue = funnelData[0]?.value || 1;

  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="font-mono text-sm font-semibold text-cyan-300 tracking-widest uppercase">流量转化漏斗</h3>
        </div>
        <span className="text-xs font-mono text-white/25">从曝光到成交</span>
      </div>

      <div className="flex flex-col gap-2">
        {funnelData.map((item, i) => (
          <FunnelBar
            key={item.stage}
            {...item}
            maxValue={maxValue}
            index={i}
            total={funnelData.length}
          />
        ))}
      </div>

      {/* Overall conversion summary */}
      <div
        className="mt-1 p-3 rounded-lg flex items-center justify-between"
        style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.1)' }}
      >
        <div className="text-xs font-mono text-white/40">全链路转化率</div>
        <div className="text-sm font-mono font-bold text-cyan-300">
          {funnelData[0]?.value > 0
            ? `${((funnelData[funnelData.length - 1]?.value / funnelData[0].value) * 100).toFixed(4)}%`
            : '—'}
        </div>
      </div>
    </div>
  );
}
