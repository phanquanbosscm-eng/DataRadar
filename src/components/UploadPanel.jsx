import React, { useRef, useState } from 'react';
import { readFileToRows, parsePlanReport, parseProductReport, parseKeywordReport } from '../utils/parser';

const REPORT_TYPES = [
  {
    id: 'plan',
    label: '计划报告',
    subtitle: '全站/直通车计划',
    icon: '📡',
    color: '#00d4ff',
    bg: 'rgba(0,212,255,0.06)',
    border: 'rgba(0,212,255,0.2)',
    desc: '监控预算与日均曝光',
    parser: parsePlanReport,
  },
  {
    id: 'product',
    label: '产品分析报告',
    subtitle: '点击率与询盘转化',
    icon: '📦',
    color: '#00ff88',
    bg: 'rgba(0,255,136,0.06)',
    border: 'rgba(0,255,136,0.2)',
    desc: '监控CTR与询盘率',
    parser: parseProductReport,
  },
  {
    id: 'keyword',
    label: '搜索词报告',
    subtitle: '流量精准度分析',
    icon: '🔍',
    color: '#ffd700',
    bg: 'rgba(255,215,0,0.06)',
    border: 'rgba(255,215,0,0.2)',
    desc: '监控废词与WAP流量',
    parser: parseKeywordReport,
  },
];

function UploadZone({ type, period, onUploaded, uploaded }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const rows = await readFileToRows(file);
      const parsed = type.parser(rows);
      if (parsed.length === 0) {
        setError('未解析到有效数据，请检查文件格式');
        setLoading(false);
        return;
      }
      onUploaded(parsed, file.name);
    } catch (e) {
      setError(e.message || '解析失败');
    }
    setLoading(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  return (
    <div
      className={`upload-zone relative flex flex-col items-center justify-center gap-2 p-4 cursor-pointer transition-all duration-300 min-h-[90px] ${dragging ? 'drag-over' : ''}`}
      style={{ borderColor: uploaded ? type.color : undefined, background: uploaded ? type.bg : undefined }}
      onClick={() => inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />
      {loading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: type.color, borderTopColor: 'transparent' }} />
          <span className="text-xs font-mono" style={{ color: type.color }}>解析中...</span>
        </div>
      ) : uploaded ? (
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-lg">✅</span>
          <span className="text-xs font-mono" style={{ color: type.color }}>已加载</span>
          <span className="text-xs text-white/40 truncate max-w-[120px]">{uploaded}</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-xl">{type.icon}</span>
          <span className="text-xs font-mono" style={{ color: type.color }}>{period}</span>
          <span className="text-xs text-white/30">拖拽或点击上传</span>
        </div>
      )}
      {error && (
        <span className="absolute bottom-1 left-0 right-0 text-center text-xs text-red-400 px-2">{error}</span>
      )}
    </div>
  );
}

export default function UploadPanel({ data, onDataChange }) {
  const handleUpload = (typeId, period) => (parsed, filename) => {
    onDataChange(typeId, period, parsed, filename);
  };

  return (
    <div className="glass-card p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <h2 className="font-mono text-sm font-semibold text-cyan-300 tracking-widest uppercase">数据源接入</h2>
      </div>

      {REPORT_TYPES.map((type) => (
        <div key={type.id} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span>{type.icon}</span>
            <div>
              <div className="text-sm font-semibold" style={{ color: type.color }}>{type.label}</div>
              <div className="text-xs text-white/40">{type.desc}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <UploadZone
              type={type}
              period="本周"
              onUploaded={handleUpload(type.id, 'current')}
              uploaded={data?.[type.id]?.current?.filename}
            />
            <UploadZone
              type={type}
              period="上周(对比)"
              onUploaded={handleUpload(type.id, 'prev')}
              uploaded={data?.[type.id]?.prev?.filename}
            />
          </div>
        </div>
      ))}

      <div className="mt-1 p-3 rounded-lg text-xs font-mono text-white/30 leading-relaxed" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="text-white/50 mb-1 font-semibold">支持格式</div>
        CSV / XLSX / XLS<br/>
        支持中英文列名，数据隐私100%本地处理
      </div>
    </div>
  );
}
