import React, { useState, useEffect } from 'react';
import { CellData } from '../types';
import { generateRawCode, getFullPinyin } from '../utils/pinyinUtils';
import { Edit3, Check, X, Sparkles } from 'lucide-react';

interface EditCellModalProps {
  cell: CellData;
  onSave: (cellId: string, newWord: string, newCode?: string) => void;
  onClose: () => void;
}

export const EditCellModal: React.FC<EditCellModalProps> = ({ cell, onSave, onClose }) => {
  const [word, setWord] = useState(cell.word);
  const [code, setCode] = useState(cell.code);
  const [isAutoCode, setIsAutoCode] = useState(true);

  // When word changes, if autoCode is enabled, recalculate rawCode
  useEffect(() => {
    if (isAutoCode && word.trim().length > 0) {
      const { rawCode } = generateRawCode(word.trim());
      setCode(rawCode);
    }
  }, [word, isAutoCode]);

  const handleManualCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsAutoCode(false);
    setCode(e.target.value.toUpperCase());
  };

  const handleResetAutoCode = () => {
    setIsAutoCode(true);
    if (word.trim().length > 0) {
      const { rawCode } = generateRawCode(word.trim());
      setCode(rawCode);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWord = word.trim();
    if (!cleanWord) return;
    onSave(cell.id, cleanWord, code.trim() || undefined);
    onClose();
  };

  const currentPinyin = getFullPinyin(word.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">编辑单元格词语</h3>
              <p className="text-[11px] text-slate-400">
                位置: 行 {cell.row + 1} 列 {cell.col + 1}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Word Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              词语内容 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="请输入词语，如：人工智能 / 画龙点睛"
              autoFocus
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all font-medium text-slate-900"
            />
            {word.trim() && (
              <p className="text-[11px] text-slate-400 mt-1">
                实时拼音: <span className="font-mono text-purple-700 font-medium">{currentPinyin}</span> (字数: {word.trim().length})
              </p>
            )}
          </div>

          {/* Code Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                缩写代码 (字母+字数)
              </label>
              {!isAutoCode && (
                <button
                  type="button"
                  onClick={handleResetAutoCode}
                  className="flex items-center gap-1 text-[11px] text-purple-600 hover:text-purple-700 font-semibold cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  恢复自动生成
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={code}
                onChange={handleManualCodeChange}
                placeholder="如 X3 / X3a"
                className="w-full px-3 py-2 text-sm font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 uppercase text-purple-900"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {isAutoCode ? '⚡ 代码根据输入词语实时自动生成' : '✏️ 已切换为手动自定义修改模式'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!word.trim()}
              className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-3.5 h-3.5" />
              <span>保存修改</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
