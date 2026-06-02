/**
 * 从后端文件服务加载数据并解析
 */
import { fetchFileBlob } from './api.js';
import { parsePlanReport, parseProductReport, parseKeywordReport, xlsxToRows } from './parser.js';

async function loadFile(planId, folder, type, parserFn) {
  try {
    const blob = await fetchFileBlob(planId, folder, type);
    if (!blob) return [];
    const ab   = await blob.arrayBuffer();
    const rows = await xlsxToRows(ab);
    return parserFn(rows);
  } catch {
    return [];
  }
}

/**
 * 加载一个周文件夹的数据（plan + product）
 */
export async function loadWeeklyData(planId, weekFolder) {
  const [plan, product] = await Promise.all([
    loadFile(planId, weekFolder, 'plan',    parsePlanReport),
    loadFile(planId, weekFolder, 'product', parseProductReport),
  ]);
  return { plan, product };
}

/**
 * 加载一个日文件夹的数据（keyword）
 */
export async function loadDailyData(planId, dailyFolder) {
  const keyword = await loadFile(planId, dailyFolder, 'keyword', parseKeywordReport);
  return { keyword };
}

/**
 * 合并多日/多周数据
 */
export function mergeData(...datasets) {
  const merged = { plan: [], product: [], keyword: [] };
  for (const d of datasets) {
    if (!d) continue;
    if (d.plan)    merged.plan.push(...d.plan);
    if (d.product) merged.product.push(...d.product);
    if (d.keyword) merged.keyword.push(...d.keyword);
  }
  return merged;
}
