/**
 * 解析阿里巴巴国际站三类报告
 * 基于实际列名（中文）
 */

export const parseNum = (v) => {
  if (v === null || v === undefined || v === '' || v === '-' || v === '--') return 0;
  const s = String(v).replace(/[¥￥,\s%]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

// ── plan.xlsx 解析 ────────────────────────────
// 列：日期 | 花费 | 全站商机量 | L1+买家点击占比 | 曝光量 | 点击量
//     全站商机-TM咨询量 | 全站商机-询盘量 | 全站商机成本 | L1+全站商机量
//     全站商机转化率 | L1+点击量 | 点击成本 | 点击率 | 全站商机-订单量
export function parsePlanReport(rows) {
  if (!rows?.length) return [];
  return rows.map(r => ({
    date:           String(r['日期'] || ''),
    spend:          parseNum(r['花费']),
    impressions:    parseNum(r['曝光量']),
    clicks:         parseNum(r['点击量']),
    ctr:            parseNum(r['点击率']),
    inquiries:      parseNum(r['全站商机-询盘量']),
    tmChats:        parseNum(r['全站商机-TM咨询量']),
    opportunities:  parseNum(r['全站商机量']),
    oppCost:        parseNum(r['全站商机成本']),
    orders:         parseNum(r['全站商机-订单量']),
    convRate:       parseNum(r['全站商机转化率']),
    cpc:            parseNum(r['点击成本']),
    l1Clicks:       parseNum(r['L1+点击量']),
    l1Opportunitiies: parseNum(r['L1+全站商机量']),
    _raw: r,
  })).filter(r => r.impressions > 0 || r.clicks > 0 || r.spend > 0);
}

// ── product.xlsx 解析 ─────────────────────────
// 列：日期 | 商品信息 | 产品ID | 点击量 | 全站商机量 | L1+买家点击占比
//     曝光量 | L1+点击量 | 全站商机-询盘量 | 全站商机-TM咨询量
//     L1+全站商机量 | 全站商机转化率 | 点击率 | 全站商机-订单量
export function parseProductReport(rows) {
  if (!rows?.length) return [];
  return rows.map(r => {
    const impressions  = parseNum(r['曝光量']);
    const clicks       = parseNum(r['点击量']);
    const inquiries    = parseNum(r['全站商机-询盘量']);
    const tmChats      = parseNum(r['全站商机-TM咨询量']);
    const opportunities= parseNum(r['全站商机量']);
    const spend        = parseNum(r['花费'] || r['消耗'] || 0);
    const ctr          = parseNum(r['点击率']);
    // 商机转化率 = 全站商机量 / 点击量
    const oppRate      = clicks > 0 ? (opportunities / clicks) * 100 : parseNum(r['全站商机转化率']);

    return {
      productId:    String(r['产品ID'] || ''),
      name:         String(r['商品信息'] || ''),
      date:         String(r['日期'] || ''),
      impressions,
      clicks,
      inquiries,
      tmChats,
      opportunities,
      spend,
      ctr,
      oppRate,
      orders:       parseNum(r['全站商机-订单量']),
      l1Clicks:     parseNum(r['L1+点击量']),
      l1Opportunities: parseNum(r['L1+全站商机量']),
      // 保持向后兼容
      inquiryRate:  oppRate,
      _raw: r,
    };
  }).filter(r => r.impressions > 0 || r.clicks > 0);
}

// ── keyword.xlsx 解析 ─────────────────────────
// 列：买家搜索词 | 状态 | 点击占比 | 曝光占比
// 注意：该报告无消耗/询盘数字，只有占比
export function parseKeywordReport(rows) {
  if (!rows?.length) return [];
  return rows.map(r => ({
    word:         String(r['买家搜索词'] || ''),
    status:       String(r['状态'] || ''),
    clickShare:   parseNum(r['点击占比']),   // %
    impShare:     parseNum(r['曝光占比']),   // %
    isDemoted:    String(r['状态'] || '').includes('降权'),
    _raw: r,
  })).filter(r => r.word);
}

// ── 通用：从 File/Blob 读取 xlsx rows ────────
export async function xlsxToRows(arrayBuffer) {
  const XLSX = await import('xlsx');
  const wb   = XLSX.read(arrayBuffer, { type: 'array' });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

// ── 从后端 Blob 解析 ──────────────────────────
export async function parseBlobAs(blob, type) {
  const ab   = await blob.arrayBuffer();
  const rows = await xlsxToRows(ab);
  if (type === 'plan')    return parsePlanReport(rows);
  if (type === 'product') return parseProductReport(rows);
  if (type === 'keyword') return parseKeywordReport(rows);
  return rows;
}

// ── 旧接口兼容（CSV 文本） ───────────────────
export async function readFileToRows(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'csv') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const Papa = (await import('papaparse')).default;
        const result = Papa.parse(e.target.result, { header: true, skipEmptyLines: true });
        resolve(result.data);
      };
      reader.onerror = reject;
      reader.readAsText(file, 'UTF-8');
    });
  }
  if (['xlsx', 'xls'].includes(ext)) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const rows = await xlsxToRows(e.target.result);
        resolve(rows);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
  throw new Error(`不支持的文件格式: .${ext}`);
}
