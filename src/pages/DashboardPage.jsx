import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import { formatNum, formatMoney, THRESHOLDS, PRODUCT_TAGS } from '../utils/analytics';
import { buildMarkdownPackage, copyToClipboard, exportExcel, exportPDF } from '../utils/exportReport';

// ── Demo trend data (used when no multi-period data uploaded) ─────────────
function buildTrendData(kpis) {
  if (!kpis) return [];
  const months = ['9月', '10月', '11月', '12月', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月'];
  // Simulate 12-month curve anchored to current values
  const base = kpis.totalImpressions || 50000;
  const seasonality = [0.6, 0.65, 0.8, 0.7, 0.55, 0.5, 1.0, 0.85, 0.75, 0.9, 0.8, 0.7];
  return months.map((m, i) => ({
    month: m,
    impressions: Math.round(base * seasonality[i] * (0.9 + Math.random() * 0.2)),
    clicks: Math.round((base * seasonality[i] * (kpis.avgCTR / 100)) * (0.9 + Math.random() * 0.2)),
    inquiries: Math.round((base * seasonality[i] * (kpis.avgCTR / 100) * (kpis.avgInquiryRate / 100)) * (0.85 + Math.random() * 0.3)),
  }));
}

// ── Radar / Compass data ─────────────────────────────────────────────────
function buildRadarData(kpis) {
  if (!kpis) return [];
  const ctrScore      = Math.min(100, (kpis.avgCTR / THRESHOLDS.CTR_TARGET) * 100);
  const inqScore      = Math.min(100, (kpis.avgInquiryRate / THRESHOLDS.INQUIRY_RATE_TARGET) * 100);
  const costScore     = kpis.costPerInquiry <= 0 ? 0 : Math.min(100, (THRESHOLDS.COST_PER_INQUIRY_WARN / kpis.costPerInquiry) * 100);
  const impScore      = Math.min(100, (kpis.totalImpressions / 100000) * 100);
  const roiScore      = Math.min(100, (kpis.totalInquiries / Math.max(1, kpis.totalSpend / 100)) * 25);
  return [
    { metric: 'CTR', value: Math.round(ctrScore), fullMark: 100 },
    { metric: '询盘率', value: Math.round(inqScore), fullMark: 100 },
    { metric: '成本控制', value: Math.round(costScore), fullMark: 100 },
    { metric: '曝光量', value: Math.round(impScore), fullMark: 100 },
    { metric: '商机ROI', value: Math.round(roiScore), fullMark: 100 },
  ];
}

const CustomAreaTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(15,23,42,.97)', border: '1px solid rgba(96,165,250,.32)', boxShadow: '0 12px 28px rgba(2,6,23,.28)' }}>
      <div className="text-cyan-200 font-bold mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }}>{p.name}: {formatNum(p.value)}</div>
      ))}
    </div>
  );
};

function StatCard({ icon, label, value, sub, color, alert }) {
  return (
    <div
      className="glass-card px-5 py-4 flex flex-col gap-2 relative overflow-hidden transition-all duration-300"
      style={{ border: `1px solid ${alert ? 'rgba(255,51,51,.35)' : 'rgba(255,255,255,.07)'}` }}
    >
      {alert && <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />}
      <div className="flex items-center gap-2 text-white/50 text-xs">
        <span>{icon}</span><span>{label}</span>
      </div>
      <div className="kpi-display font-black text-2xl leading-none" style={{ color, textShadow: `0 0 12px ${color}80` }}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-white/40">{sub}</div>}
    </div>
  );
}

export default function DashboardPage({ kpis, classifiedProducts, keywordAnalysis }) {
  const [copying, setCopying] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [exporting, setExporting] = useState('');

  const trendData  = useMemo(() => buildTrendData(kpis), [kpis]);
  const radarData  = useMemo(() => buildRadarData(kpis), [kpis]);

  const hotCount  = (classifiedProducts || []).filter(p => p.tag === PRODUCT_TAGS.HOT).length;
  const deadCount = (classifiedProducts || []).filter(p => p.tag === PRODUCT_TAGS.DEAD).length;
  const roi = kpis ? ((kpis.totalInquiries * 100) / Math.max(1, kpis.totalSpend)).toFixed(1) : '0';

  const handleCopyDiagnosis = async () => {
    if (!kpis) return;
    setCopying(true);
    const md = buildMarkdownPackage(kpis, classifiedProducts, keywordAnalysis);
    await copyToClipboard(md);
    setCopying(false);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleExportExcel = async () => {
    if (!kpis) return;
    setExporting('excel');
    try { await exportExcel(kpis, classifiedProducts, keywordAnalysis); }
    catch (e) { alert('Excel导出失败: ' + e.message); }
    setExporting('');
  };

  const handleExportPDF = async () => {
    if (!kpis) return;
    setExporting('pdf');
    try { await exportPDF(kpis, classifiedProducts, keywordAnalysis); }
    catch (e) { alert('PDF导出失败: ' + e.message); }
    setExporting('');
  };

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-xl text-gradient-cyber">全局战略大屏</h1>
          <p className="text-sm text-white/40 mt-1">Global Dashboard · 年度累计概览</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* ★ 一键AI诊断包 */}
          <button
            onClick={handleCopyDiagnosis}
            disabled={!kpis || copying}
            className="relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 overflow-hidden"
            style={{
              background: kpis
                ? 'linear-gradient(135deg, rgba(0,255,136,.18), rgba(0,212,255,.12))'
                : 'rgba(255,255,255,.04)',
              border: `1px solid ${kpis ? (copied ? '#00ff88' : 'rgba(0,255,136,.5)') : 'rgba(255,255,255,.08)'}`,
              color: kpis ? (copied ? '#00ff88' : '#00d4ff') : 'rgba(255,255,255,.2)',
              boxShadow: kpis ? '0 0 25px rgba(0,255,136,.15)' : 'none',
              cursor: kpis ? 'pointer' : 'not-allowed',
            }}
          >
            {/* Animated glow ring */}
            {kpis && !copied && (
              <span className="absolute inset-0 rounded-xl animate-ping opacity-20" style={{ background: 'rgba(0,255,136,.3)' }} />
            )}
            <span className="relative">{copied ? '✅' : copying ? '⏳' : '🧬'}</span>
            <span className="relative">{copied ? '已复制到剪贴板！' : copying ? '生成中...' : '一键生成 AI 诊断包'}</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={!kpis || !!exporting}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm transition-all"
            style={{
              background: 'rgba(0,212,255,.07)', border: '1px solid rgba(0,212,255,.25)',
              color: kpis ? '#00d4ff' : 'rgba(255,255,255,.2)', cursor: kpis ? 'pointer' : 'not-allowed',
            }}
          >
            {exporting === 'excel' ? '⏳' : '📊'} Excel 周报
          </button>

          <button
            onClick={handleExportPDF}
            disabled={!kpis || !!exporting}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm transition-all"
            style={{
              background: 'rgba(255,51,51,.07)', border: '1px solid rgba(255,51,51,.25)',
              color: kpis ? '#ff6666' : 'rgba(255,255,255,.2)', cursor: kpis ? 'pointer' : 'not-allowed',
            }}
          >
            {exporting === 'pdf' ? '⏳' : '📄'} PDF 周报
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="📡" label="总曝光量" value={kpis ? formatNum(kpis.totalImpressions) : '—'} sub="累计展现次数" color="#00d4ff" />
        <StatCard icon="🎯" label="全店 CTR" value={kpis ? `${kpis.avgCTR.toFixed(2)}%` : '—'} sub={`目标 ≥${THRESHOLDS.CTR_TARGET}%`} color={kpis && kpis.avgCTR >= THRESHOLDS.CTR_TARGET ? '#00ff88' : '#ff3333'} alert={kpis && kpis.avgCTR < THRESHOLDS.CTR_TARGET} />
        <StatCard icon="💬" label="询盘转化率" value={kpis ? `${kpis.avgInquiryRate.toFixed(2)}%` : '—'} sub={`目标 ≥${THRESHOLDS.INQUIRY_RATE_TARGET}%`} color={kpis && kpis.avgInquiryRate >= THRESHOLDS.INQUIRY_RATE_TARGET ? '#00ff88' : '#ff3333'} alert={kpis && kpis.avgInquiryRate < THRESHOLDS.INQUIRY_RATE_TARGET} />
        <StatCard icon="💎" label="单商机成本" value={kpis ? formatMoney(kpis.costPerInquiry) : '—'} sub="预警线 ¥100" color={kpis && kpis.costPerInquiry > 100 ? '#ff3333' : '#00d4ff'} alert={kpis && kpis.costPerInquiry > 100} />
      </div>

      {/* Secondary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="💰" label="总消耗" value={kpis ? formatMoney(kpis.totalSpend) : '—'} color="#ff8c00" />
        <StatCard icon="📨" label="总询盘" value={kpis ? String(kpis.totalInquiries) : '—'} color="#00ff88" />
        <StatCard icon="🚀" label="爆品数量" value={String(hotCount)} sub="CTR>1% & 询盘率>2%" color="#00ff88" />
        <StatCard icon="💀" label="烧钱品" value={String(deadCount)} sub="消耗前3 & 询盘=0" color="#ff3333" alert={deadCount > 0} />
      </div>

      {/* Trend + Radar row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Trend area chart (2/3 width) */}
        <div className="col-span-2 glass-card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="text-sm font-semibold text-cyan-200 tracking-[0.18em] uppercase">流量趋势 · 近12个月</h3>
            </div>
            {!kpis && <span className="text-[10px] text-white/35">上传数据后展示真实曲线</span>}
            {kpis && <span className="text-[10px] text-amber-200">⚠ 当前为模拟曲线，上传多周期数据后自动更新</span>}
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gImp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gClk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gInq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffd700" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ffd700" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.12)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(226,232,240,.82)', fontSize: 11, fontFamily: 'PingFang SC, Inter, system-ui, sans-serif' }} stroke="rgba(148,163,184,.18)" />
                <YAxis tick={{ fill: 'rgba(226,232,240,.72)', fontSize: 11, fontFamily: 'PingFang SC, Inter, system-ui, sans-serif' }} stroke="rgba(148,163,184,.18)" tickFormatter={formatNum} />
                <Tooltip content={<CustomAreaTooltip />} />
                <Area type="monotone" dataKey="impressions" name="曝光" stroke="#00d4ff" strokeWidth={1.5} fill="url(#gImp)" dot={false} />
                <Area type="monotone" dataKey="clicks" name="点击" stroke="#00ff88" strokeWidth={1.5} fill="url(#gClk)" dot={false} />
                <Area type="monotone" dataKey="inquiries" name="询盘" stroke="#ffd700" strokeWidth={2} fill="url(#gInq)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 text-sm justify-center">
            {[['曝光', '#00d4ff'], ['点击', '#00ff88'], ['询盘', '#ffd700']].map(([l, c]) => (
              <div key={l} className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded" style={{ background: c }} /><span style={{ color: c }}>{l}</span></div>
            ))}
            <span className="text-white/35 ml-2">3月 LED旺季 🔆</span>
          </div>
        </div>

        {/* Financial Radar */}
        <div className="glass-card p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <h3 className="text-sm font-semibold text-green-200 tracking-[0.18em] uppercase">财务罗盘</h3>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <PolarGrid stroke="rgba(148,163,184,.16)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: 'rgba(226,232,240,.82)', fontSize: 11, fontFamily: 'PingFang SC, Inter, system-ui, sans-serif' }} />
                <Radar name="当前" dataKey="value" stroke="#00ff88" fill="#00ff88" fillOpacity={0.15} strokeWidth={1.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between text-white/50"><span>商机 ROI 估算</span><span className="text-green-200 font-bold">{roi}x</span></div>
            <div className="flex justify-between text-white/50"><span>总消耗</span><span className="text-white/70">{kpis ? formatMoney(kpis.totalSpend) : '—'}</span></div>
            <div className="flex justify-between text-white/50"><span>总询盘</span><span className="text-white/70">{kpis?.totalInquiries ?? '—'}</span></div>
          </div>
        </div>
      </div>

      {!kpis && (
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-2xl py-16 text-center"
          style={{ border: '2px dashed rgba(0,212,255,.12)', background: 'rgba(0,212,255,.02)' }}
        >
          <div className="text-5xl animate-float">📡</div>
          <div className="text-white/55 text-sm">请在左侧上传阿里巴巴国际站报告</div>
          <div className="text-sm text-white/35">支持 CSV / XLSX / XLS，数据 100% 本地处理</div>
        </div>
      )}
    </div>
  );
}
