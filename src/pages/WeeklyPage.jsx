import React from 'react';
import KPIDisplay from '../components/KPIDisplay';
import FunnelChart from '../components/FunnelChart';
import ScatterMatrix from '../components/ScatterMatrix';
import ProductLeaderboard from '../components/ProductLeaderboard';
import KeywordPanel from '../components/KeywordPanel';

export default function WeeklyPage({ kpis, classifiedProducts, keywordAnalysis, funnelData }) {
  return (
    <div className="flex flex-col gap-5 pb-8">
      <div>
        <h1 className="font-display font-bold text-xl text-gradient-cyber">周期对比分析</h1>
        <p className="text-xs font-mono text-white/30 mt-0.5">Weekly Comparison · 本周 vs 上周</p>
      </div>

      <KPIDisplay kpis={kpis} />

      <div className="grid grid-cols-2 gap-4">
        <FunnelChart funnelData={funnelData} />
        <KeywordPanel keywordAnalysis={keywordAnalysis} />
      </div>

      <ScatterMatrix products={classifiedProducts} />
      <ProductLeaderboard products={classifiedProducts} />
    </div>
  );
}
