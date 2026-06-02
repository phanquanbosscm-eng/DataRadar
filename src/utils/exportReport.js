/**
 * Export utilities: PDF weekly report + Excel + Markdown clipboard package
 */
import { formatMoney, formatNum, THRESHOLDS, PRODUCT_TAGS } from './analytics.js';

// ─────────────────────────────────────────────
// Markdown AI诊断包 → 剪贴板
// ─────────────────────────────────────────────
export function buildMarkdownPackage(kpis, classifiedProducts, keywordAnalysis) {
  if (!kpis) return '暂无数据，请先上传报告。';

  const now = new Date().toLocaleDateString('zh-CN');

  // CTR < 1% 前三
  const lowCTR = [...(classifiedProducts || [])]
    .filter(p => p.ctr < THRESHOLDS.CTR_TARGET)
    .sort((a, b) => a.ctr - b.ctr)
    .slice(0, 3);

  // 询盘率 > 2% 前三
  const highInquiry = [...(classifiedProducts || [])]
    .filter(p => p.inquiryRate > THRESHOLDS.INQUIRY_RATE_TARGET)
    .sort((a, b) => b.inquiryRate - a.inquiryRate)
    .slice(0, 3);

  // 点击量大但0转化的搜索词
  const wasteKeywords = (keywordAnalysis?.waste || [])
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);

  const deadProducts = (classifiedProducts || []).filter(p => p.tag === PRODUCT_TAGS.DEAD);
  const hotProducts  = (classifiedProducts || []).filter(p => p.tag === PRODUCT_TAGS.HOT);

  const lines = [
    `# 飞屏雷达 · AI 诊断包`,
    `> 生成时间：${now} | 数据100%本地处理`,
    ``,
    `## 一、全局 KPI 总览`,
    `| 指标 | 当前值 | 目标 | 状态 |`,
    `|------|--------|------|------|`,
    `| 总曝光量 | ${formatNum(kpis.totalImpressions)} | — | — |`,
    `| 全店 CTR | ${kpis.avgCTR.toFixed(2)}% | ≥1% | ${kpis.avgCTR >= 1 ? '✅ 达标' : '❌ 未达标'} |`,
    `| 询盘转化率 | ${kpis.avgInquiryRate.toFixed(2)}% | ≥2% | ${kpis.avgInquiryRate >= 2 ? '✅ 达标' : '❌ 未达标'} |`,
    `| 单商机成本 | ${formatMoney(kpis.costPerInquiry)} | <¥100 | ${kpis.costPerInquiry <= 100 ? '✅ 正常' : '🚨 超标'} |`,
    `| 总消耗 | ${formatMoney(kpis.totalSpend)} | — | — |`,
    `| 总询盘量 | ${kpis.totalInquiries} | — | — |`,
    ``,
    `## 二、异常警告（CTR < 1% 产品）`,
  ];

  if (lowCTR.length === 0) {
    lines.push(`> ✅ 暂无 CTR 低于1%的产品，表现良好。`);
  } else {
    lowCTR.forEach((p, i) => {
      lines.push(`${i + 1}. **${p.name}**`);
      lines.push(`   - CTR: ${p.ctr.toFixed(2)}% | 询盘率: ${p.inquiryRate.toFixed(2)}% | 消耗: ${formatMoney(p.spend)}`);
      lines.push(`   - 建议：${p.tagMeta?.action || '优化主图与标题'}`);
    });
  }

  lines.push(``, `## 三、烧钱/索命品（立即止血）`);
  if (deadProducts.length === 0) {
    lines.push(`> ✅ 暂无消耗前三且询盘为零的产品。`);
  } else {
    deadProducts.slice(0, 3).forEach((p, i) => {
      lines.push(`${i + 1}. 💀 **${p.name}** — 消耗 ${formatMoney(p.spend)}，询盘 0`);
      lines.push(`   - 操作：立即暂停P4P计划，分析主图与标题`);
    });
  }

  lines.push(``, `## 四、潜力推荐（询盘率 > 2%）`);
  if (highInquiry.length === 0) {
    lines.push(`> 暂无询盘率超过2%的产品，建议全面优化产品详情页。`);
  } else {
    highInquiry.forEach((p, i) => {
      lines.push(`${i + 1}. 🚀 **${p.name}**`);
      lines.push(`   - CTR: ${p.ctr.toFixed(2)}% | 询盘率: ${p.inquiryRate.toFixed(2)}% | 询盘量: ${p.inquiries}`);
      lines.push(`   - 建议：加大P4P预算，复制成功模型到同类产品`);
    });
  }

  lines.push(``, `## 五、搜索词坑位（高点击·零转化）`);
  if (wasteKeywords.length === 0) {
    lines.push(`> ✅ 暂无高点击零转化废词。`);
  } else {
    lines.push(`| 搜索词 | 点击 | 消耗 | 询盘 | 建议 |`);
    lines.push(`|--------|------|------|------|------|`);
    wasteKeywords.forEach(k => {
      lines.push(`| ${k.word} | ${k.clicks} | ${formatMoney(k.spend)} | 0 | 设为否词 |`);
    });
  }

  lines.push(
    ``,
    `## 六、下周调优清单`,
    `- [ ] 暂停/优化消耗前三且询盘为零的产品`,
    `- [ ] 将询盘率>2%的爆品追加P4P预算`,
    `- [ ] 在搜索词报告中批量添加废词为否定词`,
    `- [ ] 检查CTR<0.5%产品的主图（建议更换至少3张）`,
    `- [ ] 对视觉品（高CTR·0询盘）重构详情页10屏结构`,
    ``,
    `---`,
    `> *由【飞屏雷达 v2.0】自动生成 · 数据不上传任何服务器 · LED外贸专属*`,
  );

  return lines.join('\n');
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fallback
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    return true;
  }
}

// ─────────────────────────────────────────────
// Excel 周报
// ─────────────────────────────────────────────
export async function exportExcel(kpis, classifiedProducts, keywordAnalysis) {
  const XLSX = await import('xlsx');

  const wb = XLSX.utils.book_new();
  const now = new Date().toLocaleDateString('zh-CN');

  // Sheet 1: KPI
  const kpiData = [
    ['飞屏雷达周报', now],
    [],
    ['指标', '当前值', '目标', '状态'],
    ['总曝光量', kpis.totalImpressions, '—', '—'],
    ['全店CTR(%)', kpis.avgCTR.toFixed(2), '≥1%', kpis.avgCTR >= 1 ? '达标' : '未达标'],
    ['询盘转化率(%)', kpis.avgInquiryRate.toFixed(2), '≥2%', kpis.avgInquiryRate >= 2 ? '达标' : '未达标'],
    ['单商机成本(¥)', kpis.costPerInquiry.toFixed(2), '<100', kpis.costPerInquiry <= 100 ? '正常' : '超标'],
    ['总消耗(¥)', kpis.totalSpend.toFixed(2), '—', '—'],
    ['总询盘', kpis.totalInquiries, '—', '—'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpiData), 'KPI总览');

  // Sheet 2: Products
  if (classifiedProducts?.length) {
    const prodHeaders = ['产品名称', '类别', '花费(¥)', '曝光量', 'CTR(%)', '询盘量', '询盘率(%)', '操作建议'];
    const prodRows = classifiedProducts.map(p => [
      p.name, p.tagMeta?.label || '', p.spend.toFixed(2), p.impressions,
      p.ctr.toFixed(2), p.inquiries, p.inquiryRate.toFixed(2), p.tagMeta?.action || '',
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([prodHeaders, ...prodRows]), '产品生死榜');
  }

  // Sheet 3: Keywords
  if (keywordAnalysis?.all?.length) {
    const kwHeaders = ['搜索词', '曝光', '点击', 'CTR(%)', '消耗(¥)', '询盘', '状态'];
    const kwRows = keywordAnalysis.all.map(k => [
      k.word, k.impressions, k.clicks, k.ctr.toFixed(2),
      k.spend.toFixed(2), k.inquiries, k.isWaste ? '废词' : k.inquiries > 0 ? '优质' : '观察',
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([kwHeaders, ...kwRows]), '搜索词分析');
  }

  XLSX.writeFile(wb, `飞屏雷达周报_${now.replace(/\//g, '-')}.xlsx`);
}

// ─────────────────────────────────────────────
// PDF 周报
// ─────────────────────────────────────────────
export async function exportPDF(kpis, classifiedProducts, keywordAnalysis) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const now = new Date().toLocaleDateString('zh-CN');
  const pageW = doc.internal.pageSize.getWidth();

  // Helper: add section title
  const addTitle = (text, y) => {
    doc.setFillColor(13, 22, 64);
    doc.rect(10, y, pageW - 20, 8, 'F');
    doc.setTextColor(0, 212, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(text, 14, y + 5.5);
    return y + 12;
  };

  // Cover
  doc.setFillColor(5, 12, 31);
  doc.rect(0, 0, pageW, 297, 'F');

  doc.setTextColor(0, 212, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('FeiPing Radar', pageW / 2, 30, { align: 'center' });

  doc.setTextColor(0, 255, 136);
  doc.setFontSize(13);
  doc.text('LED Trade Weekly Report', pageW / 2, 40, { align: 'center' });

  doc.setTextColor(180, 200, 255);
  doc.setFontSize(9);
  doc.text(now, pageW / 2, 48, { align: 'center' });

  // KPI section
  let y = 60;
  y = addTitle('Global KPI Overview', y);

  const kpiRows = [
    ['Total Impressions', formatNum(kpis.totalImpressions), '-', '-'],
    ['Avg CTR', `${kpis.avgCTR.toFixed(2)}%`, '>=1%', kpis.avgCTR >= 1 ? 'OK' : 'ALERT'],
    ['Inquiry Rate', `${kpis.avgInquiryRate.toFixed(2)}%`, '>=2%', kpis.avgInquiryRate >= 2 ? 'OK' : 'ALERT'],
    ['Cost/Inquiry', `CNY ${kpis.costPerInquiry.toFixed(0)}`, '<100', kpis.costPerInquiry <= 100 ? 'OK' : 'WARNING'],
    ['Total Spend', `CNY ${kpis.totalSpend.toFixed(0)}`, '-', '-'],
    ['Total Inquiries', String(kpis.totalInquiries), '-', '-'],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value', 'Target', 'Status']],
    body: kpiRows,
    theme: 'grid',
    headStyles: { fillColor: [13, 22, 64], textColor: [0, 212, 255], fontSize: 9 },
    bodyStyles: { fillColor: [8, 15, 42], textColor: [200, 220, 255], fontSize: 8 },
    alternateRowStyles: { fillColor: [10, 18, 48] },
    didParseCell: (data) => {
      if (data.column.index === 3 && data.cell.raw === 'ALERT') {
        data.cell.styles.textColor = [255, 80, 80];
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.column.index === 3 && data.cell.raw === 'OK') {
        data.cell.styles.textColor = [0, 255, 136];
      }
    },
    margin: { left: 10, right: 10 },
  });

  y = doc.lastAutoTable.finalY + 10;

  // Product leaderboard
  if (classifiedProducts?.length) {
    if (y > 240) { doc.addPage(); y = 15; }
    y = addTitle('Product Leaderboard', y);
    const prodRows = classifiedProducts.slice(0, 20).map(p => [
      p.name.slice(0, 28),
      p.tagMeta?.label || '',
      `${p.ctr.toFixed(2)}%`,
      `${p.inquiryRate.toFixed(2)}%`,
      `CNY ${p.spend.toFixed(0)}`,
      String(p.inquiries),
    ]);
    autoTable(doc, {
      startY: y,
      head: [['Product', 'Category', 'CTR', 'InqRate', 'Spend', 'Inq']],
      body: prodRows,
      theme: 'grid',
      headStyles: { fillColor: [13, 22, 64], textColor: [0, 212, 255], fontSize: 8 },
      bodyStyles: { fillColor: [8, 15, 42], textColor: [200, 220, 255], fontSize: 7 },
      alternateRowStyles: { fillColor: [10, 18, 48] },
      margin: { left: 10, right: 10 },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Waste keywords
  if (keywordAnalysis?.waste?.length) {
    if (y > 240) { doc.addPage(); y = 15; }
    y = addTitle('Waste Keywords (High Spend, 0 Inquiries)', y);
    const wRows = keywordAnalysis.waste.slice(0, 20).map(k => [
      k.word, String(k.clicks), `${k.ctr.toFixed(2)}%`, `CNY ${k.spend.toFixed(0)}`, '0', 'Add as Negative KW',
    ]);
    autoTable(doc, {
      startY: y,
      head: [['Keyword', 'Clicks', 'CTR', 'Spend', 'Inquiries', 'Action']],
      body: wRows,
      theme: 'grid',
      headStyles: { fillColor: [64, 13, 13], textColor: [255, 80, 80], fontSize: 8 },
      bodyStyles: { fillColor: [8, 15, 42], textColor: [200, 220, 255], fontSize: 7 },
      alternateRowStyles: { fillColor: [10, 18, 48] },
      margin: { left: 10, right: 10 },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Action checklist
  if (y > 240) { doc.addPage(); y = 15; }
  y = addTitle('Next Week Action Checklist', y);
  doc.setTextColor(200, 220, 255);
  doc.setFontSize(8);
  const actions = [
    '[ ] Pause P4P for dead products (high spend, 0 inquiries)',
    '[ ] Increase budget for hot products (inquiry rate >2%)',
    '[ ] Add waste keywords as negative keywords',
    '[ ] Replace main images for products with CTR <0.5%',
    '[ ] Rebuild detail page 10-screen structure for visual products',
  ];
  actions.forEach((a, i) => {
    doc.text(a, 14, y + i * 6);
  });

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setTextColor(60, 80, 120);
    doc.setFontSize(7);
    doc.text('FeiPing Radar v2.0 · LED Trade Intelligence · Data processed locally', pageW / 2, 292, { align: 'center' });
    doc.text(`${i} / ${totalPages}`, pageW - 14, 292, { align: 'right' });
  }

  doc.save(`飞屏雷达周报_${now.replace(/\//g, '-')}.pdf`);
}
