import React, { useState } from 'react';
import { CellData, Team, DuelRecord, DuelActionItem } from '../types';
import { checkAnswerMatch } from '../utils/pinyinUtils';
import { Send, RotateCcw } from 'lucide-react';

interface HostDuelPanelProps {
  selectedCell: CellData | null;
  onSetCellOwner: (cellId: string, owner: Team | null) => void;
  onSubmitDuelRecord: (record: Omit<DuelRecord, 'id' | 'timestamp'>) => void;
}

export const HostDuelPanel: React.FC<HostDuelPanelProps> = ({
  selectedCell,
  onSetCellOwner,
  onSubmitDuelRecord,
}) => {
  const [redClue, setRedClue] = useState('');
  const [redGuess, setRedGuess] = useState('');
  const [greenClue, setGreenClue] = useState('');
  const [greenGuess, setGreenGuess] = useState('');

  if (!selectedCell) {
    return (
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-xs min-h-[340px] flex flex-col items-center justify-center">
        <p className="text-sm font-semibold text-slate-700">请在棋盘上选择一个格子</p>
        <p className="text-xs text-slate-400 mt-1">点击棋盘格子进行选中，即可记录描述与猜词</p>
      </div>
    );
  }

  const handleResetInputs = () => {
    setRedClue('');
    setRedGuess('');
    setGreenClue('');
    setGreenGuess('');
  };

  /**
   * Submit duel record and handle auto-determination or host explicit override.
   */
  const handleSubmitWithCheck = (explicitOwner?: Team | null) => {
    const cleanRedClue = redClue.trim();
    const cleanRedGuess = redGuess.trim();
    const cleanGreenClue = greenClue.trim();
    const cleanGreenGuess = greenGuess.trim();

    let finalOwner: Team | null = selectedCell.owner;

    const isRedMatch = cleanRedGuess ? checkAnswerMatch(cleanRedGuess, selectedCell.word) : false;
    const isGreenMatch = cleanGreenGuess ? checkAnswerMatch(cleanGreenGuess, selectedCell.word) : false;

    if (explicitOwner !== undefined) {
      // Host explicitly clicked an ownership button
      finalOwner = explicitOwner;
      onSetCellOwner(selectedCell.id, explicitOwner);
    } else {
      // Automatic validation based on guess inputs
      if (isRedMatch && !isGreenMatch) {
        finalOwner = 'RED';
        onSetCellOwner(selectedCell.id, 'RED');
      } else if (isGreenMatch && !isRedMatch) {
        finalOwner = 'GREEN';
        onSetCellOwner(selectedCell.id, 'GREEN');
      } else if (isRedMatch && isGreenMatch) {
        finalOwner = 'RED';
        onSetCellOwner(selectedCell.id, 'RED');
      }
    }

    // Build action items
    const actions: DuelActionItem[] = [];
    const baseId = `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    if (cleanRedClue) {
      actions.push({
        id: `act-${baseId}-rc`,
        type: 'RED_CLUE',
        text: cleanRedClue,
        timestamp: Date.now(),
      });
    }

    if (cleanRedGuess) {
      actions.push({
        id: `act-${baseId}-rg`,
        type: 'RED_GUESS',
        text: cleanRedGuess,
        isCorrect: isRedMatch,
        timestamp: Date.now(),
      });
    }

    if (cleanGreenClue) {
      actions.push({
        id: `act-${baseId}-gc`,
        type: 'GREEN_CLUE',
        text: cleanGreenClue,
        timestamp: Date.now(),
      });
    }

    if (cleanGreenGuess) {
      actions.push({
        id: `act-${baseId}-gg`,
        type: 'GREEN_GUESS',
        text: cleanGreenGuess,
        isCorrect: isGreenMatch,
        timestamp: Date.now(),
      });
    }

    if (actions.length > 0) {
      onSubmitDuelRecord({
        cellId: selectedCell.id,
        cellCode: selectedCell.code,
        cellWord: selectedCell.word,
        charCount: selectedCell.charCount,
        pinyin: selectedCell.pinyin,
        category: selectedCell.category,
        actions,
        resultOwner: finalOwner,
      });
    }

    // Clear inputs after submission
    setRedClue('');
    setRedGuess('');
    setGreenClue('');
    setGreenGuess('');
  };

  // Handle Enter key inside inputs
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmitWithCheck();
    }
  };

  return (
    <div id="host-duel-panel" className="w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3.5 min-h-[340px]">
      {/* Header: Selected Cell Prompt & Quick Owner Tag */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center shadow-xs shrink-0">
            <span className="text-lg font-black font-mono text-slate-900 tracking-wider">
              {selectedCell.code}
            </span>
            <span className="text-[9px] text-slate-400 font-medium">代号</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900">{selectedCell.word}</span>
              <span className="text-xs font-mono text-slate-400">({selectedCell.pinyin})</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>首字母: <strong className="text-blue-600 font-bold">{selectedCell.firstLetter}</strong></span>
              <span>•</span>
              <span>字数: <strong className="text-blue-600 font-bold">{selectedCell.charCount} 字</strong></span>
            </div>
          </div>
        </div>

        {/* Current State Tag */}
        <div>
          {selectedCell.owner === 'RED' ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#d81c2f]/10 text-[#d81c2f] border border-[#d81c2f]/30">
              🔴 红方占领
            </span>
          ) : selectedCell.owner === 'GREEN' ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#37b484]/10 text-[#37b484] border border-[#37b484]/30">
              🟢 绿方占领
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              ⚪ 中立未占
            </span>
          )}
        </div>
      </div>

      {/* Four Input Fields (红方描述, 红方猜词, 绿方描述, 绿方猜词) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>对决输入（按回车键即可直接提交并记录）：</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Red Team Inputs Box */}
          <div className="bg-[#d81c2f]/5 border border-[#d81c2f]/20 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#d81c2f] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#d81c2f]" />
                红方输入
              </span>
              <span className="text-[10px] text-[#d81c2f]/70 font-mono">RED TEAM</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#d81c2f] mb-1">红方描述</label>
              <input
                type="text"
                value={redClue}
                onChange={(e) => setRedClue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-white border border-[#d81c2f]/30 focus:border-[#d81c2f] focus:ring-1 focus:ring-[#d81c2f]/20 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#d81c2f] mb-1">红方猜词</label>
              <input
                type="text"
                value={redGuess}
                onChange={(e) => setRedGuess(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-white border border-[#d81c2f]/30 focus:border-[#d81c2f] focus:ring-1 focus:ring-[#d81c2f]/20 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 outline-none transition-all"
              />
            </div>
          </div>

          {/* Green Team Inputs Box */}
          <div className="bg-[#37b484]/5 border border-[#37b484]/20 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#37b484] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#37b484]" />
                绿方输入
              </span>
              <span className="text-[10px] text-[#37b484]/70 font-mono">GREEN TEAM</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#37b484] mb-1">绿方描述</label>
              <input
                type="text"
                value={greenClue}
                onChange={(e) => setGreenClue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-white border border-[#37b484]/30 focus:border-[#37b484] focus:ring-1 focus:ring-[#37b484]/20 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#37b484] mb-1">绿方猜词</label>
              <input
                type="text"
                value={greenGuess}
                onChange={(e) => setGreenGuess(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-white border border-[#37b484]/30 focus:border-[#37b484] focus:ring-1 focus:ring-[#37b484]/20 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Submission and Control Buttons */}
      <div className="pt-1 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
          <span>提交与判定操作：</span>
          <button
            type="button"
            onClick={handleResetInputs}
            className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>清空输入</span>
          </button>
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => handleSubmitWithCheck('RED')}
            className="flex items-center justify-center gap-1 py-2 px-2.5 bg-[#d81c2f] hover:bg-[#b81525] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="判定为红方占领并记录"
          >
            <span>🔴 判定红方占领</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmitWithCheck('GREEN')}
            className="flex items-center justify-center gap-1 py-2 px-2.5 bg-[#37b484] hover:bg-[#2b8f68] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="判定为绿方占领并记录"
          >
            <span>🟢 判定绿方占领</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmitWithCheck(null)}
            className="flex items-center justify-center gap-1 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
            title="判定为中立未占领并记录"
          >
            <span>⚪ 设为中立</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmitWithCheck()}
            className="flex items-center justify-center gap-1 py-2 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="自动检测猜词是否命中并提交记录 (或按回车)"
          >
            <Send className="w-3.5 h-3.5" />
            <span>提交记录(回车)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
