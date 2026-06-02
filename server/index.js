/**
 * 飞屏雷达 · 本地文件服务 v2
 *
 * 数据根目录：<项目>/radar/
 * 目录结构：
 *   radar/
 *     计划列表.json
 *     新品加速/
 *       2026-04-01/          ← 日期文件夹（每日放 keyword.xlsx）
 *         keyword.xlsx
 *       2026-W14/            ← 周文件夹（每周放 plan.xlsx / product.xlsx）
 *         plan.xlsx
 *         product.xlsx
 *     优品助推/
 *       ...
 *
 * 文件频率：
 *   keyword  → 每日一次  → 放入 YYYY-MM-DD/ 文件夹
 *   plan     → 每周一次  → 放入 YYYY-WXX/   文件夹
 *   product  → 每周一次  → 放入 YYYY-WXX/   文件夹
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3001;

// 数据根目录：项目内 radar/ 文件夹
const DATA_ROOT   = path.join(__dirname, '..', 'radar');
const PLANS_FILE  = path.join(DATA_ROOT, '计划列表.json');

app.use(cors());
app.use(express.json());

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(DATA_ROOT);

// ── 周编号工具 ────────────────────────────────
function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentWeekStr() {
  return getISOWeek(new Date());
}

// ── 计划列表 ──────────────────────────────────
function readPlans() {
  if (!fs.existsSync(PLANS_FILE)) {
    const defaults = [
      { id: 'plan_1', name: '新品加速', color: '#00ff88', icon: '🚀', createdAt: '2026-03-22', description: '新品冷启动P4P加速计划' },
      { id: 'plan_2', name: '优品助推', color: '#00d4ff', icon: '⚡', createdAt: '2026-03-11', description: '优质老品ROI提升计划' },
    ];
    fs.writeFileSync(PLANS_FILE, JSON.stringify(defaults, null, 2), 'utf-8');
    return defaults;
  }
  return JSON.parse(fs.readFileSync(PLANS_FILE, 'utf-8'));
}

function writePlans(plans) {
  fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2), 'utf-8');
}

// ── 扫描计划目录，返回日期和周列表 ─────────────
function scanPlanDir(planDir) {
  ensureDir(planDir);
  const entries = fs.existsSync(planDir) ? fs.readdirSync(planDir) : [];

  const dailyDirs  = [];  // YYYY-MM-DD
  const weeklyDirs = [];  // YYYY-WXX

  for (const d of entries) {
    const full = path.join(planDir, d);
    if (!fs.statSync(full).isDirectory()) continue;
    const files = fs.readdirSync(full).filter(f => !f.startsWith('.'));

    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      dailyDirs.push({
        date: d,
        type: 'daily',
        hasKeyword: files.some(f => f.startsWith('keyword')),
        files,
      });
    } else if (/^\d{4}-W\d{2}$/.test(d)) {
      weeklyDirs.push({
        date: d,
        type: 'weekly',
        hasPlan:    files.some(f => f.startsWith('plan')),
        hasProduct: files.some(f => f.startsWith('product')),
        complete:   files.some(f => f.startsWith('plan')) && files.some(f => f.startsWith('product')),
        files,
      });
    }
  }

  dailyDirs.sort((a, b)  => b.date.localeCompare(a.date));
  weeklyDirs.sort((a, b) => b.date.localeCompare(a.date));

  return { dailyDirs, weeklyDirs };
}

// ── GET /api/plans ────────────────────────────
app.get('/api/plans', (req, res) => {
  const plans = readPlans();
  const enriched = plans.map(p => {
    const planDir = path.join(DATA_ROOT, p.name);
    const { dailyDirs, weeklyDirs } = scanPlanDir(planDir);
    return { ...p, dailyDirs, weeklyDirs };
  });
  res.json(enriched);
});

// ── POST /api/plans ───────────────────────────
app.post('/api/plans', (req, res) => {
  const { name, color, icon, description } = req.body;
  if (!name) return res.status(400).json({ error: '计划名称不能为空' });
  const plans = readPlans();
  if (plans.find(p => p.name === name)) return res.status(400).json({ error: '计划名称已存在' });
  const newPlan = { id: 'plan_' + Date.now(), name, color: color || '#00d4ff', icon: icon || '📊', createdAt: getTodayStr(), description: description || '' };
  plans.push(newPlan);
  writePlans(plans);
  ensureDir(path.join(DATA_ROOT, name));
  res.json(newPlan);
});

// ── DELETE /api/plans/:id ─────────────────────
app.delete('/api/plans/:id', (req, res) => {
  let plans = readPlans();
  const plan = plans.find(p => p.id === req.params.id);
  if (!plan) return res.status(404).json({ error: '计划不存在' });
  plans = plans.filter(p => p.id !== req.params.id);
  writePlans(plans);
  res.json({ ok: true });
});

// ── GET /api/plans/:id/scan ───────────────────
app.get('/api/plans/:id/scan', (req, res) => {
  const plans = readPlans();
  const plan  = plans.find(p => p.id === req.params.id);
  if (!plan) return res.status(404).json({ error: '计划不存在' });
  const planDir = path.join(DATA_ROOT, plan.name);
  res.json(scanPlanDir(planDir));
});

// ── POST /api/plans/:id/ensure-today ─────────
// 创建今日 keyword 文件夹 + 本周 plan/product 文件夹
app.post('/api/plans/:id/ensure-today', (req, res) => {
  const plans = readPlans();
  const plan  = plans.find(p => p.id === req.params.id);
  if (!plan) return res.status(404).json({ error: '计划不存在' });
  const planDir   = path.join(DATA_ROOT, plan.name);
  const dailyDir  = path.join(planDir, getTodayStr());
  const weeklyDir = path.join(planDir, getCurrentWeekStr());
  ensureDir(dailyDir);
  ensureDir(weeklyDir);
  res.json({ dailyDir, weeklyDir, today: getTodayStr(), week: getCurrentWeekStr() });
});

// ── GET /api/plans/:id/file?folder=2026-04-01&type=keyword ──
// 返回二进制文件供前端解析
app.get('/api/plans/:id/file', (req, res) => {
  const { folder, type } = req.query;
  const plans = readPlans();
  const plan  = plans.find(p => p.id === req.params.id);
  if (!plan) return res.status(404).json({ error: '计划不存在' });

  const dir   = path.join(DATA_ROOT, plan.name, folder);
  const exts  = ['.xlsx', '.xls', '.csv'];
  for (const ext of exts) {
    const fp = path.join(dir, type + ext);
    if (fs.existsSync(fp)) return res.sendFile(fp);
  }
  res.status(404).json({ error: '文件不存在' });
});

// ── GET /api/data-root ────────────────────────
app.get('/api/data-root', (req, res) => {
  res.json({ path: DATA_ROOT });
});

app.listen(PORT, () => {
  console.log(`\n  📂 飞屏雷达文件服务已启动`);
  console.log(`  数据根目录: ${DATA_ROOT}`);
  console.log(`  API地址: http://localhost:${PORT}\n`);
});
