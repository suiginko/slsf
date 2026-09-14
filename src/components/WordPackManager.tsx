import React, { useState, useRef } from 'react';
import { WordPack, WordItem } from '../types';
import { processWordsWithUniqueCodes } from '../utils/pinyinUtils';
import { BookOpen, Upload, Check, AlertCircle, X } from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            </div>
          </div>

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
