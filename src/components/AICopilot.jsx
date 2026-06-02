import React, { useState, useRef, useEffect } from 'react';
import { buildDiagnosisPrompt } from '../utils/analytics';

const API_PROVIDERS = [
  { id: 'openai', label: 'OpenAI GPT-4o', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  { id: 'deepseek', label: 'DeepSeek V3', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { id: 'gemini', label: 'Gemini 1.5 Pro', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-1.5-pro' },
  { id: 'custom', label: '自定义端点', baseUrl: '', model: '' },
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2">
      {[0, 0.2, 0.4].map((delay, i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-cyan-400"
          style={{ animation: `pulse 1s ease-in-out ${delay}s infinite` }}
        />
      ))}
      <span className="text-xs font-mono text-white/40 ml-1">AI 正在思考...</span>
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5"
          style={{ background: 'linear-gradient(135deg, #00d4ff, #00ff88)' }}
        >
          AI
        </div>
      )}
      <div
        className="max-w-[88%] px-3 py-2.5 rounded-xl text-xs font-mono leading-relaxed"
        style={{
          background: isUser
            ? 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,212,255,0.08))'
            : 'rgba(255,255,255,0.04)',
          border: isUser
            ? '1px solid rgba(0,212,255,0.25)'
            : '1px solid rgba(255,255,255,0.07)',
          color: isUser ? '#00d4ff' : 'rgba(255,255,255,0.82)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {msg.content}
      </div>
    </div>
  );
}

async function callOpenAICompatible(messages, apiKey, baseUrl, model) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API Error ${res.status}: ${err}`);
  }
  return res;
}

async function callGemini(messages, apiKey, model) {
  // Convert OpenAI format to Gemini format
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find((m) => m.role === 'system');

  const body = {
    contents,
    generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction.content }] };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini Error ${res.status}: ${err}`);
  }
  return res;
}

export default function AICopilot({ kpis, classifiedProducts, keywordAnalysis }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState('deepseek');
  const [apiKey, setApiKey] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const currentProvider = API_PROVIDERS.find((p) => p.id === provider);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const appendAssistantToken = (token) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'assistant') {
        return [...prev.slice(0, -1), { ...last, content: last.content + token }];
      }
      return [...prev, { role: 'assistant', content: token }];
    });
  };

  const streamResponse = async (allMessages) => {
    const baseUrl = provider === 'custom' ? customUrl : currentProvider.baseUrl;
    const model = provider === 'custom' ? customModel : currentProvider.model;

    let res;
    if (provider === 'gemini') {
      res = await callGemini(allMessages, apiKey, model);
    } else {
      res = await callOpenAICompatible(allMessages, apiKey, baseUrl, model);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));
          // OpenAI / DeepSeek format
          const token = json.choices?.[0]?.delta?.content;
          // Gemini format
          const geminiToken = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (token) appendAssistantToken(token);
          else if (geminiToken) appendAssistantToken(geminiToken);
        } catch { /* ignore malformed SSE */ }
      }
    }
  };

  const sendMessage = async (content) => {
    if (!content.trim()) return;
    if (!apiKey && provider !== 'custom') {
      setError('请先配置 API Key');
      setShowSettings(true);
      return;
    }
    setError('');

    const userMsg = { role: 'user', content: content.trim() };
    const systemMsg = {
      role: 'system',
      content: '你是一位资深阿里巴巴国际站LED外贸运营专家，擅长P4P投放优化、产品詳情页策略、搜索词管理。用简洁专业的中文回答，每条建议要具体可执行。',
    };

    const allMessages = [systemMsg, ...messages, userMsg];
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      await streamResponse(allMessages);
    } catch (e) {
      setError(e.message || '请求失败，请检查 API Key 和网络');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `❌ 错误: ${e.message}` },
      ]);
    }
    setIsLoading(false);
  };

  const oneDiagnosis = () => {
    if (!kpis) { setError('请先上传数据再使用一键诊断'); return; }
    const prompt = buildDiagnosisPrompt(
      kpis,
      classifiedProducts || [],
      keywordAnalysis || { waste: [], valuable: [], all: [] }
    );
    sendMessage(prompt);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full glass-card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: 'linear-gradient(135deg, #00d4ff22, #00ff8822)', border: '1px solid rgba(0,212,255,0.3)' }}
          >
            🤖
          </div>
          <div>
            <div className="text-xs font-mono font-semibold text-cyan-300">AI 诊断 Copilot</div>
            <div className="text-[10px] font-mono text-white/30">{currentProvider?.label}</div>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-xs font-mono text-white/30 hover:text-white/70 transition-colors px-2 py-1 rounded"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}
        >
          ⚙ 设置
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div
          className="flex-shrink-0 p-4 flex flex-col gap-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}
        >
          <div>
            <label className="block text-[10px] font-mono text-white/40 mb-1">AI 服务商</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-2 py-1.5 text-xs"
            >
              {API_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-mono text-white/40 mb-1">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-2 py-1.5 text-xs"
            />
          </div>
          {provider === 'custom' && (
            <>
              <div>
                <label className="block text-[10px] font-mono text-white/40 mb-1">API Base URL</label>
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://api.example.com/v1"
                  className="w-full px-2 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-white/40 mb-1">模型名称</label>
                <input
                  type="text"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="gpt-4o / claude-3-5-sonnet..."
                  className="w-full px-2 py-1.5 text-xs"
                />
              </div>
            </>
          )}
          <button
            onClick={() => setShowSettings(false)}
            className="btn-primary py-1.5 text-xs"
          >
            确认保存
          </button>
        </div>
      )}

      {/* One-click diagnosis */}
      <div className="flex-shrink-0 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          onClick={oneDiagnosis}
          disabled={isLoading || !kpis}
          className="w-full py-2.5 rounded-xl text-xs font-mono font-bold transition-all duration-200 flex items-center justify-center gap-2"
          style={{
            background: kpis
              ? 'linear-gradient(135deg, rgba(255,51,51,0.2), rgba(255,140,0,0.15))'
              : 'rgba(255,255,255,0.04)',
            border: kpis
              ? '1px solid rgba(255,51,51,0.4)'
              : '1px solid rgba(255,255,255,0.08)',
            color: kpis ? '#ff6644' : 'rgba(255,255,255,0.25)',
            cursor: kpis ? 'pointer' : 'not-allowed',
            boxShadow: kpis ? '0 0 20px rgba(255,51,51,0.1)' : 'none',
          }}
        >
          <span>🔬</span>
          <span>一键全店诊断</span>
          {isLoading && <span className="animate-spin">↻</span>}
        </button>
        {!kpis && (
          <div className="text-[10px] font-mono text-white/20 text-center mt-1">上传报告后启用</div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="text-4xl">🤖</div>
            <div className="text-xs font-mono text-white/30 leading-relaxed">
              配置 API Key 后<br/>
              点击「一键全店诊断」<br/>
              或直接输入问题
            </div>
            <div className="flex flex-col gap-2 w-full mt-2">
              {[
                '如何提升产品CTR？',
                'P4P预算如何分配？',
                'LED产品主图有哪些禁忌？',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-xs font-mono px-3 py-2 rounded-lg transition-all"
                  style={{
                    background: 'rgba(0,212,255,0.05)',
                    border: '1px solid rgba(0,212,255,0.12)',
                    color: 'rgba(0,212,255,0.6)',
                  }}
                >
                  💡 {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <TypingIndicator />
        )}

        {error && (
          <div
            className="text-xs font-mono px-3 py-2 rounded-lg mt-2"
            style={{ background: 'rgba(255,51,51,0.08)', border: '1px solid rgba(255,51,51,0.25)', color: '#ff6666' }}
          >
            ⚠ {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="flex-shrink-0 p-3 flex gap-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入问题... (Enter发送, Shift+Enter换行)"
          rows={2}
          className="flex-1 px-3 py-2 text-xs resize-none"
          style={{ minHeight: '56px' }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={isLoading || !input.trim()}
          className="px-3 rounded-xl text-sm transition-all flex-shrink-0 self-stretch flex items-center"
          style={{
            background: input.trim()
              ? 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,255,136,0.15))'
              : 'rgba(255,255,255,0.04)',
            border: `1px solid ${input.trim() ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
            color: input.trim() ? '#00d4ff' : 'rgba(255,255,255,0.2)',
          }}
        >
          {isLoading ? '↻' : '▶'}
        </button>
      </div>
    </div>
  );
}
