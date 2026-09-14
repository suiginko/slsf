import React, { useState, useRef } from 'react';
import { WordPack, WordItem } from '../types';
import { processWordsWithUniqueCodes } from '../utils/pinyinUtils';
import { BookOpen, Upload, Check, AlertCircle, X, Sparkles, Loader2, Key } from 'lucide-react';

interface WordPackManagerProps {
  activeWordPackId: string;
  onSelectWordPack: (pack: WordPack) => void;
  onClose: () => void;
}

export const WordPackManager: React.FC<WordPackManagerProps> = ({
  onSelectWordPack,
  onClose,
}) => {
  const [customText, setCustomText] = useState('');
  const [customPackName, setCustomPackName] = useState('自定义题库');
  const [aiTopic, setAiTopic] = useState('');
  const [aiApiKey, setAiApiKey] = useState(() => localStorage.getItem('suilan_ai_api_key') || '');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [showAiSection, setShowAiSection] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateViaAi = async () => {
    if (!aiTopic.trim()) {
      setAiError('请输入出题主题（如：经典成语故事、金庸武侠世界、未来高新科技等）');
      return;
    }
    setIsAiGenerating(true);
    setAiError('');
    try {
      if (aiApiKey) {
        localStorage.setItem('suilan_ai_api_key', aiApiKey.trim());
      }
      const res = await fetch('/api/generate-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          count: 25,
          apiKey: aiApiKey.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '生成词语失败，请重试');
      }
      const words = data.words.map((w: any) => w.word).join('\n');
      setCustomText(words);
      setCustomPackName(`AI精选·${aiTopic.trim()}`);
      setShowAiSection(false);
    } catch (err: any) {
      setAiError(err.message || '生成失败，请检查网络或配置');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Parse custom text to WordItem[] (split by newline or spaces)
  const parsedWords: WordItem[] = customText
    .split(/[\r\n\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((w) => {
      if (w.includes(':') || w.includes('：')) {
        const parts = w.split(/[:：]/);
        return { word: parts[0].trim() };
      }
      return { word: w };
    });

  // Calculate live preview codes
  const previewCodes = parsedWords.length > 0 ? processWordsWithUniqueCodes(parsedWords.slice(0, 25)) : [];

  // File Upload Handler (.txt)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCustomText(content);
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        if (fileNameWithoutExt) {
          setCustomPackName(fileNameWithoutExt);
        }
      }
    };
    reader.readAsText(file);
    // Reset file input so user can re-select same file if needed
    e.target.value = '';
  };

  const handleApplyCustomWords = () => {
    if (parsedWords.length < 25) {
      alert(`当前已输入 ${parsedWords.length} 个词语，需要至少 25 个词语以填满 5×5 蜂巢棋盘！`);
      return;
    }

    const newPack: WordPack = {
      id: `custom-${Date.now()}`,
      name: customPackName.trim() || '自定义题库',
      description: `出题人自定义导入词表（共 ${parsedWords.length} 词）`,
      tags: ['自定义导入'],
      words: parsedWords.slice(0, 25),
      isCustom: true,
    };

    onSelectWordPack(newPack);
    onClose();
  };

  return (
    <div id="word-pack-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">自定义导入题库</h2>
              <p className="text-xs text-slate-400">导入或粘贴 25 个词语，系统将自动生成拼音缩写代码</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-slate-800">
          {/* Pack Name & File Upload */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="w-full sm:w-2/3">
              <label className="block text-xs font-bold text-slate-700 mb-1">题库名称</label>
              <input
                type="text"
                value={customPackName}
                onChange={(e) => setCustomPackName(e.target.value)}
                placeholder="例如：比赛专场词表 / 科技猜词 / 成语专场"
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 pt-0 sm:pt-5 w-full sm:w-auto justify-end">
              {/* TXT File Upload */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3.5 py-2 rounded-xl font-semibold transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>上传TXT文件</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAiSection(!showAiSection)}
                className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3.5 py-2 rounded-xl font-bold transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>AI智能出题</span>
              </button>
            </div>
          </div>

          {/* AI Generation Drawer */}
          {showAiSection && (
            <div className="p-4 bg-gradient-to-br from-purple-50/80 to-indigo-50/60 border border-purple-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  国产大模型免翻墙一键出题 (智谱 GLM-4-Flash / 硅基流动)
                </span>
                <span className="text-[10px] text-purple-700/80">国内直连 · 秒级生成 25 题</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    指定出题主题
                  </label>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="如：周星驰经典电影 / 金庸武侠人物 / 网络流行热梗"
                    className="w-full bg-white border border-purple-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-purple-200"
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateViaAi()}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>智谱 API Key (免费免翻墙)</span>
                    <a
                      href="https://open.bigmodel.cn"
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-600 hover:underline text-[10px]"
                    >
                      点击免费获取 Key ↗
                    </a>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="填入智谱 API Key (自动保存到本地)"
                      className="w-full bg-white border border-purple-200 pl-8 pr-3 py-1.5 rounded-xl text-xs font-mono text-slate-900 outline-none focus:ring-2 focus:ring-purple-200"
                    />
                    <Key className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  </div>
                </div>
              </div>

              {aiError && (
                <p className="text-xs text-rose-600 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{aiError}</span>
                </p>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={isAiGenerating}
                  onClick={handleGenerateViaAi}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isAiGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>正在调用国内 AI 构思题目中...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>立即生成 25 个精选题目</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Words Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                词语列表（每行一个词语，或用空格隔开）
              </label>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                  parsedWords.length >= 25
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                已识别: {parsedWords.length} / 25 词 {parsedWords.length >= 25 ? '✓ 满足开局' : '(需至少25词)'}
              </span>
            </div>

            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder={'向日葵 人工智能 画龙点睛\n青藏高原 量子力学 水落石出\n敦煌莫高窟\n...'}
              rows={8}
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-sm font-sans text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 leading-relaxed transition-all"
            />
          </div>

          {/* Live Preview of Code generation */}
          {previewCodes.length > 0 && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>棋盘格代号生成预览（自动处理首拼与重名后缀区分）</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  填入棋盘的前 25 个词语
                </span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                {previewCodes.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl text-xs shadow-2xs"
                  >
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">
                      {item.code}
                    </span>
                    <span className="font-medium text-slate-800">{item.word}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {parsedWords.length > 0 && parsedWords.length < 25 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>当前词语数量不足 25 个，还差 {25 - parsedWords.length} 个词语即可应用到棋盘。</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleApplyCustomWords}
            disabled={parsedWords.length < 25}
            className="flex items-center gap-1.5 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            <span>确认导入并应用到棋盘</span>
          </button>
        </div>
      </div>
    </div>
  );
};
