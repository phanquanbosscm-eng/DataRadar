import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchPlans, createPlan, deletePlan, fetchPlanScan, ensureToday, fetchDataRoot } from '../utils/api.js';
import { loadWeeklyData, loadDailyData } from '../utils/dataLoader.js';
import { computeKPIs, classifyProducts, analyzeKeywords, buildFunnelData, formatMoney, formatNum, PRODUCT_TAG_META } from '../utils/analytics.js';
import KPIDisplay from '../components/KPIDisplay.jsx';
import FunnelChart from '../components/FunnelChart.jsx';

// ── 常量 ──────────────────────────────────────
const ICONS   = ['🚀','⚡','💎','📦','🌟','🔥','🎯','🏆','💡','🌐','📈','⚙️'];
const COLORS  = ['#00ff88','#00d4ff','#ffd700','#ff8c00','#ff3333','#a78bfa','#fb7185','#34d399'];

// ── 新建计划弹窗 ───────────────────────────────
function NewPlanModal({ onClose, onCreate }) {
  const [name, setName]   = useState('');
  const [desc, setDesc]   = useState('');
  const [icon, setIcon]   = useState('📊');
  const [color, setColor] = useState('#00d4ff');
  const [loading, setLoading] = useState(false);
  const [err, setErr]     = useState('');

  const handleCreate = async () => {
    if (!name.trim()) { setErr('请输入计划名称'); return; }
    setLoading(true);
    try { const p = await createPlan({ name: name.trim(), icon, color, description: desc }); onCreate(p); }
    catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(8px)' }}>
      <div className="glass-card w-[440px] p-6 flex flex-col gap-5" style={{ border: '1px solid rgba(0,212,255,.3)' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-base text-gradient-cyber">新建计划</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 text-xl leading-none">✕</button>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-xs font-mono text-white/40">图标</label>
            <div className="grid grid-cols-6 gap-1.5">
              {ICONS.map(i => (
                <button key={i} onClick={() => setIcon(i)} className="w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all"
                  style={{ background: icon===i?'rgba(0,212,255,.2)':'rgba(255,255,255,.04)', border:`1px solid ${icon===i?'rgba(0,212,255,.5)':'rgba(255,255,255,.08)'}` }}>{i}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono text-white/40">颜色</label>
            <div className="grid grid-cols-2 gap-1.5">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} className="w-9 h-9 rounded-lg transition-all"
                  style={{ background:c, opacity:color===c?1:.35, boxShadow:color===c?`0 0 12px ${c}`:'none', border:color===c?'2px solid white':'2px solid transparent' }} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background:`${color}10`, border:`1px solid ${color}30` }}>
          <span className="text-2xl">{icon}</span>
          <div><div className="font-mono font-bold text-sm" style={{color}}>{name||'计划名称'}</div><div className="text-xs text-white/30">{desc||'描述'}</div></div>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-mono text-white/40 block mb-1">计划名称 *</label>
            <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="例：新品加速" className="w-full px-3 py-2 text-sm" maxLength={20} />
          </div>
          <div>
            <label className="text-xs font-mono text-white/40 block mb-1">描述（可选）</label>
            <input type="text" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="例：新品冷启动P4P加速" className="w-full px-3 py-2 text-sm" />
          </div>
        </div>
        {err && <div className="text-xs font-mono text-red-400 px-3 py-2 rounded-lg" style={{background:'rgba(255,51,51,.08)',border:'1px solid rgba(255,51,51,.2)'}}>⚠ {err}</div>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-mono text-white/40 transition-all" style={{border:'1px solid rgba(255,255,255,.08)'}}>取消</button>
          <button onClick={handleCreate} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-mono font-bold transition-all" style={{background:`${color}20`,border:`1px solid ${color}50`,color}}>
            {loading?'创建中...':'✓ 创建计划'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 产品表（按 ID 显示） ───────────────────────
function ProductTable({ products }) {
  const [sortKey, setSortKey] = useState('ctr');
  const [sortDesc, setSortDesc] = useState(true);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('all');

  const tagOptions = useMemo(() => {
    if (!products?.length) return [];
    const tags = new Set(products.map(p => p.tag || 'normal'));
    return ['all', ...Array.from(tags)];
  }, [products]);

  const filtered = useMemo(() => {
    if (!products?.length) return [];
    let list = products;
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.productId || '').toLowerCase().includes(q)
      );
    }
    if (tagFilter !== 'all') {
      list = list.filter(p => (p.tag || 'normal') === tagFilter);
    }
    return list;
  }, [products, search, tagFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a,b) => sortDesc ? (b[sortKey]||0)-(a[sortKey]||0) : (a[sortKey]||0)-(b[sortKey]||0));
  }, [filtered, sortKey, sortDesc]);

  const handleSort = k => { if(k===sortKey) setSortDesc(!sortDesc); else { setSortKey(k); setSortDesc(true); } };

  if (!products?.length) return <div className="text-white/25 font-mono text-xs py-4 text-center">暂无产品数据</div>;

  const SortTh = ({ k, label }) => (
    <th className="text-left py-2.5 px-3 font-normal text-white/35 cursor-pointer hover:text-white/60 transition-colors whitespace-nowrap text-xs"
      onClick={() => handleSort(k)}>
      {label}{sortKey===k&&<span className="ml-1 text-cyan-400">{sortDesc?'↓':'↑'}</span>}
    </th>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* 筛选栏 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-[300px]">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜索产品名称或 ID..."
            className="w-full pl-8 pr-3 py-1.5 text-xs font-mono"
            style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:8}}
          />
        </div>
        {tagOptions.length > 1 && (
          <select
            value={tagFilter} onChange={e => setTagFilter(e.target.value)}
            className="text-xs font-mono px-3 py-1.5 cursor-pointer"
            style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,color:'rgba(255,255,255,.7)'}}
          >
            {tagOptions.map(t => {
              const meta = PRODUCT_TAG_META[t] || PRODUCT_TAG_META.normal;
              return <option key={t} value={t}>{t === 'all' ? '全部类别' : meta.icon + ' ' + meta.label}</option>;
            })}
          </select>
        )}
        <span className="text-[10px] font-mono text-white/25">{filtered.length} / {products.length} 款</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
        <thead>
          <tr style={{borderBottom:'1px solid rgba(0,212,255,.08)',background:'rgba(0,212,255,.03)'}}>
            <th className="text-left py-2.5 px-3 font-normal text-white/35">产品 ID</th>
            <th className="text-left py-2.5 px-3 font-normal text-white/35 max-w-[200px]">商品信息</th>
            <th className="text-left py-2.5 px-3 font-normal text-white/35">类别</th>
            <SortTh k="impressions" label="曝光" />
            <SortTh k="clicks"      label="点击" />
            <SortTh k="ctr"         label="CTR" />
            <SortTh k="opportunities" label="商机" />
            <SortTh k="inquiryRate" label="商机率" />
            <SortTh k="orders"      label="订单" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => {
            const meta = p.tagMeta || PRODUCT_TAG_META[p.tag] || PRODUCT_TAG_META.normal;
            return (
              <tr key={p.productId || i} style={{borderBottom:'1px solid rgba(255,255,255,.03)'}}>
                <td className="py-2.5 px-3 font-mono text-white/50">{p.productId || '—'}</td>
                <td className="py-2.5 px-3 max-w-[200px]">
                  <span className="block truncate text-white/75" title={p.name}>{p.name || '—'}</span>
                </td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap"
                    style={{background:meta.bg,border:`1px solid ${meta.border}`,color:meta.color}}>
                    {meta.icon} {meta.label}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-white/45">{formatNum(p.impressions)}</td>
                <td className="py-2.5 px-3 text-white/60">{p.clicks}</td>
                <td className="py-2.5 px-3">
                  <span style={{color:p.ctr>=1?'#00ff88':p.ctr>=0.5?'#ffd700':'#ff3333'}}>{p.ctr?.toFixed(2)}%</span>
                </td>
                <td className="py-2.5 px-3">
                  <span style={{color:(p.opportunities||p.inquiries)>0?'#00ff88':'#ff3333'}}>{p.opportunities??p.inquiries??0}</span>
                </td>
                <td className="py-2.5 px-3">
                  <span style={{color:p.inquiryRate>=2?'#00ff88':p.inquiryRate>=1?'#ffd700':'#ff3333'}}>{p.inquiryRate?.toFixed(2)}%</span>
                </td>
                <td className="py-2.5 px-3 text-white/50">{p.orders??0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── 搜索词表（基于实际字段） ───────────────────
function KeywordTable({ keywords }) {
  if (!keywords?.all?.length) return <div className="text-white/25 font-mono text-xs py-4 text-center">暂无搜索词数据</div>;

  const { demoted, top, all } = keywords;
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const baseList = tab==='demoted' ? demoted : tab==='top' ? top : all;

  const list = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return baseList;
    return baseList.filter(k => (k.word || '').toLowerCase().includes(q));
  }, [baseList, search]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        {[
          {k:'all',     label:`全部 (${all.length})`,      color:'#00d4ff'},
          {k:'top',     label:`高点击 (${top.length})`,     color:'#00ff88'},
          {k:'demoted', label:`降权词 (${demoted.length})`, color:'#ff3333'},
        ].map(t => (
          <button key={t.k} onClick={()=>setTab(t.k)}
            className="text-xs font-mono px-3 py-1 rounded-lg transition-all"
            style={{background:tab===t.k?`${t.color}15`:'transparent',border:`1px solid ${tab===t.k?t.color+'50':'rgba(255,255,255,.07)'}`,color:tab===t.k?t.color:'rgba(255,255,255,.35)'}}>
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜索关键词..."
            className="pl-8 pr-3 py-1 text-xs font-mono"
            style={{width:180,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:8}}
          />
        </div>
        <span className="text-[10px] font-mono text-white/25">{list.length} 词</span>
      </div>
      <div className="overflow-x-auto max-h-48 overflow-y-auto">
        <table className="w-full text-xs font-mono">
          <thead className="sticky top-0" style={{background:'rgba(5,12,31,.97)'}}>
            <tr style={{borderBottom:'1px solid rgba(255,215,0,.1)',background:'rgba(255,215,0,.03)'}}>
              <th className="text-left py-2 px-3 font-normal text-white/35">搜索词</th>
              <th className="text-left py-2 px-3 font-normal text-white/35">状态</th>
              <th className="text-left py-2 px-3 font-normal text-white/35">点击占比</th>
              <th className="text-left py-2 px-3 font-normal text-white/35">曝光占比</th>
            </tr>
          </thead>
          <tbody>
            {list.map((k,i) => (
              <tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,.03)'}}>
                <td className="py-2 px-3" style={{color:k.isDemoted?'#ff8888':'rgba(255,255,255,.75)'}}>{k.word}</td>
                <td className="py-2 px-3">
                  <span className="px-1.5 py-0.5 rounded text-[10px]"
                    style={{background:k.isDemoted?'rgba(255,51,51,.1)':'rgba(0,255,136,.08)',border:`1px solid ${k.isDemoted?'rgba(255,51,51,.3)':'rgba(0,255,136,.2)'}`,color:k.isDemoted?'#ff6666':'#00ff88'}}>
                    {k.status||'正常'}
                  </span>
                </td>
                <td className="py-2 px-3" style={{color:k.clickShare>5?'#ffd700':'rgba(255,255,255,.55)'}}>{k.clickShare?.toFixed(2)}%</td>
                <td className="py-2 px-3 text-white/40">{k.impShare?.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 文件引导框 ─────────────────────────────────
function FileGuide({ plan, folder, type, dataRoot }) {
  const isWeekly = /^\d{4}-W\d{2}$/.test(folder);
  const files = isWeekly
    ? [{name:'plan.xlsx', label:'计划报告', color:'#00d4ff'}, {name:'product.xlsx', label:'产品报告', color:'#00ff88'}]
    : [{name:'keyword.xlsx', label:'搜索词报告', color:'#ffd700'}];

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl" style={{background:'rgba(255,215,0,.04)',border:'1px solid rgba(255,215,0,.15)'}}>
      <div className="flex items-center gap-2">
        <span>📂</span>
        <span className="text-xs font-mono text-yellow-300/80">将文件放入以下文件夹，页面自动读取</span>
      </div>
      <div className="font-mono text-xs break-all px-3 py-2 rounded-lg" style={{background:'rgba(255,215,0,.05)',border:'1px solid rgba(255,215,0,.12)',color:'#ffd700'}}>
        {dataRoot}/{plan.name}/{folder}/
      </div>
      <div className="flex gap-2 flex-wrap">
        {files.map(f => (
          <div key={f.name} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono" style={{background:`${f.color}08`,border:`1px solid ${f.color}20`}}>
            <span style={{color:f.color}}>📄 {f.name}</span>
            <span className="text-white/35">{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 计划详情 ───────────────────────────────────
function PlanDetail({ plan, dataRoot }) {
  const [scan, setScan]               = useState({ dailyDirs:[], weeklyDirs:[] });
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [selectedDay, setSelectedDay]   = useState(null);
  const [weekData, setWeekData]         = useState(null);
  const [dayData, setDayData]           = useState(null);
  const [loadingWeek, setLoadingWeek]   = useState(false);
  const [loadingDay, setLoadingDay]     = useState(false);

  const refresh = useCallback(async () => {
    try {
      const s = await fetchPlanScan(plan.id);
      setScan(s);
    } catch {}
  }, [plan.id]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  // 自动选最新周
  useEffect(() => {
    if (scan.weeklyDirs.length > 0 && !selectedWeek) setSelectedWeek(scan.weeklyDirs[0].date);
  }, [scan.weeklyDirs]);

  // 自动选最新日
  useEffect(() => {
    if (scan.dailyDirs.length > 0 && !selectedDay) setSelectedDay(scan.dailyDirs[0].date);
  }, [scan.dailyDirs]);

  // 加载周数据
  useEffect(() => {
    if (!selectedWeek) return;
    const info = scan.weeklyDirs.find(d=>d.date===selectedWeek);
    if (!info?.complete) { setWeekData(null); return; }
    setLoadingWeek(true);
    loadWeeklyData(plan.id, selectedWeek)
      .then(d => {
        const kpis      = computeKPIs(d.plan, d.product, null, null);
        const products  = classifyProducts(d.product);
        const funnel    = buildFunnelData(d.plan, d.product);
        setWeekData({ kpis, products, funnel, raw: d });
      })
      .finally(() => setLoadingWeek(false));
  }, [selectedWeek, scan.weeklyDirs.map(d=>d.complete).join(',')]);

  // 加载日数据
  useEffect(() => {
    if (!selectedDay) return;
    const info = scan.dailyDirs.find(d=>d.date===selectedDay);
    if (!info?.hasKeyword) { setDayData(null); return; }
    setLoadingDay(true);
    loadDailyData(plan.id, selectedDay)
      .then(d => {
        const kwAnalysis = analyzeKeywords(d.keyword);
        setDayData({ kwAnalysis, raw: d });
      })
      .finally(() => setLoadingDay(false));
  }, [selectedDay, scan.dailyDirs.map(d=>d.hasKeyword).join(',')]);

  const handleEnsureToday = async () => {
    await ensureToday(plan.id);
    refresh();
  };

  const weekInfo  = scan.weeklyDirs.find(d=>d.date===selectedWeek);
  const dayInfo   = scan.dailyDirs.find(d=>d.date===selectedDay);
  const today     = new Date().toISOString().slice(0,10);

  return (
    <div className="flex gap-4 h-full overflow-hidden">
      {/* 左侧：日期导航 */}
      <div className="flex-shrink-0 w-44 flex flex-col gap-3 overflow-y-auto">
        {/* 计划卡 */}
        <div className="glass-card px-3 py-3 flex-shrink-0" style={{border:`1px solid ${plan.color}25`}}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{plan.icon}</span>
            <div className="font-mono font-bold text-sm truncate" style={{color:plan.color}}>{plan.name}</div>
          </div>
          <div className="text-[10px] font-mono text-white/25">{plan.description}</div>
          <div className="flex gap-2 mt-2 text-[10px] font-mono text-white/30">
            <span>{scan.weeklyDirs.length} 周</span>
            <span>·</span>
            <span>{scan.dailyDirs.length} 日</span>
          </div>
        </div>

        {/* 创建今日文件夹按钮 */}
        <button onClick={handleEnsureToday}
          className="w-full py-2 text-xs font-mono rounded-xl transition-all"
          style={{background:'rgba(0,255,136,.08)',border:'1px solid rgba(0,255,136,.25)',color:'#00ff88'}}>
          📂 创建今日文件夹
        </button>

        {/* 周列表 */}
        {scan.weeklyDirs.length > 0 && (
          <div>
            <div className="text-[9px] font-mono text-white/25 mb-1.5 tracking-widest uppercase px-1">周报告（计划+产品）</div>
            <div className="flex flex-col gap-1">
              {scan.weeklyDirs.map(d => (
                <button key={d.date} onClick={()=>setSelectedWeek(d.date)}
                  className="w-full flex flex-col gap-1 px-3 py-2.5 rounded-xl text-left transition-all"
                  style={{background:selectedWeek===d.date?`${plan.color}12`:'rgba(255,255,255,.03)',border:`1px solid ${selectedWeek===d.date?plan.color+'40':'rgba(255,255,255,.05)'}` }}>
                  <span className="text-xs font-mono font-semibold" style={{color:selectedWeek===d.date?plan.color:'rgba(255,255,255,.65)'}}>{d.date}</span>
                  <div className="flex gap-1">
                    {[{k:'hasPlan',l:'计'},{k:'hasProduct',l:'品'}].map(({k,l})=>(
                      <span key={k} className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                        style={{background:d[k]?'rgba(0,255,136,.1)':'rgba(255,255,255,.04)',border:`1px solid ${d[k]?'rgba(0,255,136,.3)':'rgba(255,255,255,.07)'}`,color:d[k]?'#00ff88':'rgba(255,255,255,.2)'}}>
                        {l}
                      </span>
                    ))}
                    {d.complete&&<span className="text-[9px] text-green-400">✓</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 日列表 */}
        {scan.dailyDirs.length > 0 && (
          <div>
            <div className="text-[9px] font-mono text-white/25 mb-1.5 tracking-widest uppercase px-1">日报告（搜索词）</div>
            <div className="flex flex-col gap-1">
              {scan.dailyDirs.map(d => (
                <button key={d.date} onClick={()=>setSelectedDay(d.date)}
                  className="w-full flex flex-col gap-1 px-3 py-2.5 rounded-xl text-left transition-all"
                  style={{background:selectedDay===d.date?'rgba(255,215,0,.1)':'rgba(255,255,255,.03)',border:`1px solid ${selectedDay===d.date?'rgba(255,215,0,.4)':'rgba(255,255,255,.05)'}`}}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono" style={{color:selectedDay===d.date?'#ffd700':'rgba(255,255,255,.6)'}}>{d.date}</span>
                    {d.date===today&&<span className="text-[9px] px-1 rounded" style={{background:'rgba(255,215,0,.15)',color:'#ffd700'}}>今日</span>}
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-mono w-fit"
                    style={{background:d.hasKeyword?'rgba(255,215,0,.1)':'rgba(255,255,255,.04)',border:`1px solid ${d.hasKeyword?'rgba(255,215,0,.3)':'rgba(255,255,255,.07)'}`,color:d.hasKeyword?'#ffd700':'rgba(255,255,255,.2)'}}>
                    词
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {scan.weeklyDirs.length===0&&scan.dailyDirs.length===0&&(
          <div className="text-xs font-mono text-white/20 text-center py-4">点击上方按钮<br/>创建今日文件夹</div>
        )}
      </div>

      {/* 右侧：数据展示 */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-5">

        {/* 周数据区 */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full" style={{background:plan.color}} />
            <span className="font-mono text-sm font-semibold text-white/70">
              {selectedWeek ? `${selectedWeek} · 周数据（计划报告 + 产品报告）` : '周数据'}
            </span>
            <span className="text-[10px] font-mono text-white/25">每周更新</span>
          </div>

          {!selectedWeek && (
            <div className="text-xs font-mono text-white/25 py-4 text-center">请选择左侧周文件夹</div>
          )}

          {selectedWeek && weekInfo && !weekInfo.complete && (
            <FileGuide plan={plan} folder={selectedWeek} type="weekly" dataRoot={dataRoot} />
          )}

          {loadingWeek && (
            <div className="flex items-center gap-2 text-white/30 font-mono text-xs py-3">
              <div className="w-4 h-4 border border-t-transparent rounded-full animate-spin" style={{borderColor:plan.color,borderTopColor:'transparent'}} />
              加载中...
            </div>
          )}

          {weekData && (
            <>
              <KPIDisplay kpis={weekData.kpis} />
              <FunnelChart funnelData={weekData.funnel} />
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="font-mono text-sm font-semibold text-green-300 tracking-widest uppercase">产品列表</span>
                  <span className="text-xs font-mono text-white/25">{weekData.products.length} 款</span>
                </div>
                <ProductTable products={weekData.products} />
              </div>
            </>
          )}
        </div>

        <div className="border-t border-white/5" />

        {/* 日数据区 */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-yellow-400" />
            <span className="font-mono text-sm font-semibold text-white/70">
              {selectedDay ? `${selectedDay} · 日数据（搜索词报告）` : '日数据'}
            </span>
            <span className="text-[10px] font-mono text-white/25">每日更新</span>
          </div>

          {!selectedDay && (
            <div className="text-xs font-mono text-white/25 py-4 text-center">请选择左侧日期</div>
          )}

          {selectedDay && dayInfo && !dayInfo.hasKeyword && (
            <FileGuide plan={plan} folder={selectedDay} type="daily" dataRoot={dataRoot} />
          )}

          {loadingDay && (
            <div className="flex items-center gap-2 text-white/30 font-mono text-xs py-3">
              <div className="w-4 h-4 border border-t-transparent rounded-full animate-spin" style={{borderColor:'#ffd700',borderTopColor:'transparent'}} />
              加载中...
            </div>
          )}

          {dayData && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <span className="font-mono text-sm font-semibold text-yellow-300 tracking-widest uppercase">搜索词分析</span>
                <span className="text-xs font-mono text-white/25">{dayData.kwAnalysis?.all?.length} 个词</span>
              </div>
              <KeywordTable keywords={dayData.kwAnalysis} />
            </div>
          )}
        </div>

        <div className="pb-4" />
      </div>
    </div>
  );
}

// ── 主页面 ─────────────────────────────────────
export default function PlansPage() {
  const [plans, setPlans]           = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [showNew, setShowNew]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [dataRoot, setDataRoot]     = useState('');
  const [deleting, setDeleting]     = useState(null);

  const loadAll = async () => {
    setLoading(true); setError('');
    try {
      const [ps, dr] = await Promise.all([fetchPlans(), fetchDataRoot()]);
      setPlans(ps);
      setDataRoot(dr.path);
      if (ps.length > 0 && !activePlan) setActivePlan(ps[0].id);
    } catch(e) { setError('无法连接文件服务 · 请重新启动飞屏雷达'); }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const handleCreate = (p) => {
    setPlans(prev => [...prev, {...p, dailyDirs:[], weeklyDirs:[]}]);
    setActivePlan(p.id);
    setShowNew(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('确认删除该计划？（不会删除文件夹）')) return;
    setDeleting(id);
    try {
      await deletePlan(id);
      setPlans(prev => prev.filter(p => p.id !== id));
      if (activePlan === id) setActivePlan(plans.find(p=>p.id!==id)?.id || null);
    } catch(e) { alert(e.message); }
    setDeleting(null);
  };

  const currentPlan = plans.find(p => p.id === activePlan);

  if (loading) return (
    <div className="flex items-center justify-center h-full gap-3 text-white/30">
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#00d4ff',borderTopColor:'transparent'}} />
      <span className="font-mono">连接文件服务...</span>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <span className="text-4xl">⚠️</span>
      <div className="text-sm font-mono text-red-400 text-center">{error}</div>
      <button onClick={loadAll} className="btn-primary px-6">重试</button>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden -mx-6 -mt-5">
      {/* 计划列表 */}
      <div className="flex-shrink-0 w-52 flex flex-col overflow-hidden" style={{borderRight:'1px solid rgba(255,255,255,.05)',background:'rgba(4,10,28,.6)'}}>
        <div className="px-4 py-4 flex-shrink-0" style={{borderBottom:'1px solid rgba(255,255,255,.05)'}}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono font-bold text-sm text-white/70">计划管理</div>
              <div className="text-[10px] font-mono text-white/25">{plans.length} 个计划</div>
            </div>
            <button onClick={() => setShowNew(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-base transition-all"
              style={{background:'rgba(0,212,255,.1)',border:'1px solid rgba(0,212,255,.25)',color:'#00d4ff'}}>+</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2">
          {plans.map(p => {
            const active = activePlan === p.id;
            return (
              <div key={p.id} className="group relative mb-1">
                <button onClick={() => setActivePlan(p.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-3 rounded-xl text-left transition-all"
                  style={{background:active?`${p.color}12`:'transparent',border:`1px solid ${active?p.color+'30':'transparent'}`}}>
                  <span className="text-xl flex-shrink-0">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-semibold text-sm truncate" style={{color:active?p.color:'rgba(255,255,255,.6)'}}>{p.name}</div>
                    <div className="text-[10px] font-mono text-white/25">
                      {(p.weeklyDirs?.length||0)} 周 · {(p.dailyDirs?.length||0)} 日
                    </div>
                  </div>
                  {active && <div className="w-1 h-4 rounded-full flex-shrink-0" style={{background:p.color,boxShadow:`0 0 8px ${p.color}`}} />}
                </button>
                <button onClick={()=>handleDelete(p.id)} disabled={deleting===p.id}
                  className="absolute right-2 top-2 w-5 h-5 rounded flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{background:'rgba(255,51,51,.15)',color:'#ff6666'}}>
                  {deleting===p.id?'…':'×'}
                </button>
              </div>
            );
          })}
          {plans.length===0&&<div className="text-center text-white/20 font-mono text-xs py-8">还没有计划<br/>点击 + 新建</div>}
        </div>

        <div className="flex-shrink-0 px-3 py-3" style={{borderTop:'1px solid rgba(255,255,255,.04)'}}>
          <div className="text-[9px] font-mono text-white/20 leading-relaxed">
            <div className="text-white/30 mb-1">📂 数据根目录</div>
            <div className="break-all">{dataRoot}</div>
          </div>
        </div>
      </div>

      {/* 详情区 */}
      <div className="flex-1 overflow-hidden p-5">
        {currentPlan
          ? <PlanDetail plan={currentPlan} dataRoot={dataRoot} />
          : <div className="flex flex-col items-center justify-center h-full gap-4 text-white/25"><span className="text-5xl">📋</span><span className="font-mono text-sm">选择或新建一个计划</span></div>
        }
      </div>

      {showNew && <NewPlanModal onClose={()=>setShowNew(false)} onCreate={handleCreate} />}
    </div>
  );
}
