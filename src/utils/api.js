const BASE = '/radar/api';

export async function fetchPlans() {
  const r = await fetch(`${BASE}/plans`);
  if (!r.ok) throw new Error('无法连接文件服务，请确认飞屏雷达已启动');
  return r.json();
}

export async function createPlan(data) {
  const r = await fetch(`${BASE}/plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error || '创建失败'); }
  return r.json();
}

export async function deletePlan(id) {
  const r = await fetch(`${BASE}/plans/${id}`, { method: 'DELETE' });
  if (!r.ok) throw new Error('删除失败');
  return r.json();
}

export async function fetchPlanScan(planId) {
  const r = await fetch(`${BASE}/plans/${planId}/scan`);
  if (!r.ok) throw new Error('扫描失败');
  return r.json();
}

export async function fetchDataRoot() {
  const r = await fetch(`${BASE}/data-root`);
  if (!r.ok) return { path: '~/Desktop/feiping-radar/radar' };
  return r.json();
}

export async function ensureToday(planId) {
  const r = await fetch(`${BASE}/plans/${planId}/ensure-today`, { method: 'POST' });
  if (!r.ok) throw new Error('创建文件夹失败');
  return r.json();
}

/** 获取某类文件的 Blob */
export async function fetchFileBlob(planId, folder, type) {
  const r = await fetch(`${BASE}/plans/${planId}/file?folder=${encodeURIComponent(folder)}&type=${type}`);
  if (!r.ok) return null;
  return r.blob();
}
