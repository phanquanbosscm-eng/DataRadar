import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import UploadPanel from './components/UploadPanel';
import DashboardPage from './pages/DashboardPage';
import WeeklyPage from './pages/WeeklyPage';
import ProductsPage from './pages/ProductsPage';
import KeywordsPage from './pages/KeywordsPage';
import PlansPage from './pages/PlansPage';
import {
  computeKPIs,
  classifyProducts,
  analyzeKeywords,
  buildFunnelData,
} from './utils/analytics';

const PAGE_TITLES = {
  plans:     { title: '计划管理', sub: 'Plan Management' },
  dashboard: { title: '全局战略大屏', sub: 'Global Dashboard' },
  weekly:    { title: '周期对比分析', sub: 'Weekly Comparison' },
  products:  { title: '分页产品管理', sub: 'Product Management' },
  keywords:  { title: '搜索词透视',  sub: 'Keyword Analysis' },
};

function TopBar({ page, hasData }) {
  const info = PAGE_TITLES[page] || PAGE_TITLES.dashboard;
  return (
    <header
      className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 z-10"
      style={{ background: 'rgba(4,10,28,.9)', borderBottom: '1px solid rgba(0,212,255,.07)', backdropFilter: 'blur(16px)' }}
    >
      <div>
        <span className="text-sm font-mono font-semibold text-white/70">{info.title}</span>
        <span className="ml-2 text-xs font-mono text-white/25">{info.sub}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1.5 text-xs font-mono ${hasData ? 'text-green-400' : 'text-white/25'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${hasData ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
          {hasData ? '数据已加载' : '等待数据'}
        </div>
        <div className="h-3.5 w-px bg-white/10" />
        <div className="text-[10px] font-mono text-white/20">
          {new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
        </div>
      </div>
    </header>
  );
}

export default function App() {
  // 默认打开计划管理页
  const [page, setPage]             = useState('plans');
  const [fileData, setFileData]     = useState({});
  const [uploadOpen, setUploadOpen] = useState(false);

  const handleDataChange = (typeId, period, rows, filename) => {
    setFileData(prev => ({
      ...prev,
      [typeId]: { ...prev[typeId], [period]: { rows, filename } },
    }));
  };

  // 全局分析（用于 dashboard / weekly / products / keywords 等旧页面）
  const analytics = useMemo(() => {
    const planCurrent    = fileData?.plan?.current?.rows    || [];
    const planPrev       = fileData?.plan?.prev?.rows       || [];
    const productCurrent = fileData?.product?.current?.rows || [];
    const productPrev    = fileData?.product?.prev?.rows    || [];
    const keywordCurrent = fileData?.keyword?.current?.rows || [];
    if (planCurrent.length === 0 && productCurrent.length === 0) return null;
    const kpis               = computeKPIs(planCurrent, productCurrent, planPrev.length > 0 ? planPrev : null, productPrev.length > 0 ? productPrev : null);
    const classifiedProducts = classifyProducts(productCurrent);
    const keywordAnalysis    = keywordCurrent.length > 0 ? analyzeKeywords(keywordCurrent) : null;
    const funnelData         = buildFunnelData(planCurrent, productCurrent);
    return { kpis, classifiedProducts, keywordAnalysis, funnelData };
  }, [fileData]);

  const hasData = page === 'plans' ? true : !!analytics;

  // 计划管理页：全高，不需要 padding / scroll 包裹
  const isPlansPage = page === 'plans';

  const renderPage = () => {
    const { kpis, classifiedProducts, keywordAnalysis, funnelData } = analytics || {};
    switch (page) {
      case 'plans':
        return <PlansPage />;
      case 'dashboard':
        return <DashboardPage kpis={kpis} classifiedProducts={classifiedProducts} keywordAnalysis={keywordAnalysis} />;
      case 'weekly':
        return <WeeklyPage kpis={kpis} classifiedProducts={classifiedProducts} keywordAnalysis={keywordAnalysis} funnelData={funnelData} />;
      case 'products':
        return <ProductsPage products={classifiedProducts} />;
      case 'keywords':
        return <KeywordsPage keywordAnalysis={keywordAnalysis} />;
      default:
        return <PlansPage />;
    }
  };

  return (
    <div className="h-screen flex overflow-hidden grid-bg" style={{ background: '#050c1f' }}>
      <div className="scan-line" />

      <Sidebar page={page} setPage={setPage} fileData={fileData} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar page={page} hasData={hasData} />

        <div className="flex-1 flex overflow-hidden">
          {isPlansPage ? (
            // 计划管理：全高 flex，内部自己处理 overflow
            <div className="flex-1 overflow-hidden">
              {renderPage()}
            </div>
          ) : (
            // 其他页：带 padding 的滚动区
            <>
              <div className="flex-1 overflow-y-auto px-6 pt-5">
                {renderPage()}
              </div>

              {/* 上传抽屉（旧页面使用） */}
              <div
                className="flex-shrink-0 flex flex-col overflow-y-auto transition-all duration-300"
                style={{
                  width: uploadOpen ? 272 : 0,
                  borderLeft: uploadOpen ? '1px solid rgba(0,212,255,.08)' : 'none',
                  background: 'rgba(4,10,28,.95)',
                  overflow: uploadOpen ? 'auto' : 'hidden',
                }}
              >
                {uploadOpen && (
                  <div className="p-3">
                    <UploadPanel data={fileData} onDataChange={handleDataChange} />
                  </div>
                )}
              </div>

              <button
                onClick={() => setUploadOpen(!uploadOpen)}
                className="flex-shrink-0 flex items-center justify-center text-[10px] font-mono transition-all"
                style={{
                  width: 20,
                  background: 'rgba(0,212,255,.04)',
                  borderLeft: '1px solid rgba(0,212,255,.08)',
                  color: uploadOpen ? 'rgba(0,212,255,.7)' : 'rgba(0,212,255,.35)',
                  writingMode: 'vertical-rl',
                  letterSpacing: '0.12em',
                }}
              >
                {uploadOpen ? '◀ 数据' : '数据 ▶'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
