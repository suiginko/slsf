import React from 'react';
import { GameMode } from '../types';
import { RotateCcw, BookOpen, HelpCircle, Eye, EyeOff, Shuffle, PenTool, ShieldCheck, Camera, Users } from 'lucide-react';

interface NavbarProps {
  gameMode: GameMode;
  onSelectGameMode: (mode: GameMode) => void;
  redScore: number;
  greenScore: number;
  onOpenWordPacks: () => void;
  onOpenRules: () => void;
  onOpenShareScreenshot: () => void;
  onRestart: () => void;
  activePackName: string;
  godMode: boolean;
  onToggleGodMode: () => void;
  onShuffleWords: () => void;
  isOnlineMode?: boolean;
  onlineRoomId?: string | null;
  onOpenOnlineLobby: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  gameMode,
  onSelectGameMode,
  redScore,
  greenScore,
  onOpenWordPacks,
  onOpenRules,
  onOpenShareScreenshot,
  onRestart,
  activePackName,
  godMode,
  onToggleGodMode,
  onShuffleWords,
  isOnlineMode,
  onlineRoomId,
  onOpenOnlineLobby,
}) => {
  return (
    <header className="w-full border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-xs">
      <div className="w-full max-w-[1580px] mx-auto px-4 py-2.5 flex items-center justify-between gap-3 min-h-[64px]">
        {/* Left: Brand / Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 bg-blue-600 rounded-xl shadow-xs flex items-center justify-center text-white font-bold text-lg shrink-0">
            蓝
          </div>
          <div className="shrink-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-tight">
                随蓝射覆
              </h1>
              <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                主持人工作台
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[180px] sm:max-w-xs leading-tight mt-0.5">
              当前题库: <span className="text-slate-600 font-medium">{activePackName}</span>
            </p>
          </div>
        </div>

        {/* Center: Live Battle Scoreboard */}
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-full shadow-xs shrink-0">
          {/* Red Side */}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d81c2f]" />
            <span className="text-xs font-bold text-[#d81c2f]">红方</span>
            <span className="text-base font-black text-[#d81c2f]">{redScore}</span>
          </div>

          <span className="text-slate-300 font-bold">:</span>

          {/* Green Side */}
          <div className="flex items-center gap-1.5">
            <span className="text-base font-black text-[#37b484]">{greenScore}</span>
            <span className="text-xs font-bold text-[#37b484]">绿方</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#37b484]" />
          </div>
        </div>

        {/* Right: Controls & Mode Switcher */}
        <div className="flex items-center gap-2 shrink-0 flex-nowrap">
          {/* Mode Selector: 出题模式 (PLAY) and 主持模式 (HOST) with identical fixed border metrics */}
          <div className="flex bg-slate-100 border border-slate-200 p-0.5 rounded-xl shrink-0">
            <button
              onClick={() => onSelectGameMode('PLAY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                gameMode === 'PLAY'
                  ? 'bg-white text-purple-700 shadow-xs border-purple-200'
                  : 'bg-transparent text-slate-500 hover:text-slate-800 border-transparent'
              }`}
              title="出题模式：可直接点击棋盘任意格子编辑词语及代码"
            >
              <PenTool className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="whitespace-nowrap">出题模式</span>
            </button>

            <button
              onClick={() => onSelectGameMode('HOST')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                gameMode === 'HOST'
                  ? 'bg-white text-blue-700 shadow-xs border-blue-200'
                  : 'bg-transparent text-slate-500 hover:text-slate-800 border-transparent'
              }`}
              title="主持模式：点击棋盘格子进行选中，输入线索与猜词"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="whitespace-nowrap">主持模式</span>
            </button>
          </div>

          {/* Words Visibility Toggle */}
          <button
            onClick={onToggleGodMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs shrink-0 ${
              godMode
                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="随时开关棋盘词语显示与隐藏"
          >
            {godMode ? <Eye className="w-3.5 h-3.5 text-amber-600 shrink-0" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
            <span className="whitespace-nowrap">{godMode ? '词语可见' : '词语隐藏'}</span>
          </button>

          {/* Shuffle Words Button */}
          <button
            onClick={onShuffleWords}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs shrink-0"
            title="一键随机打乱棋盘25格词语分布"
          >
            <Shuffle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">打乱词语</span>
          </button>

          {/* Generate Long Screenshot Button */}
          <button
            onClick={onOpenShareScreenshot}
            className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs shrink-0"
            title="生成盘面与对局记录长图截图以便分享"
          >
            <Camera className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="whitespace-nowrap">长图分享</span>
          </button>

          {/* Word Pack Custom Import Modal Trigger */}
          <button
            onClick={onOpenWordPacks}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs shrink-0"
            title="自定义导入题库词表"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="hidden md:inline whitespace-nowrap">题库定制</span>
          </button>

          {/* Online 2v2 Battle Mode Trigger */}
          <button
            onClick={onOpenOnlineLobby}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0 ${
              isOnlineMode
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/20'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20'
            }`}
            title="进入双音节 2v2 线上自动裁判对战大厅"
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">
              {isOnlineMode ? `联机中 #${onlineRoomId || ''}` : '🌐 2v2 联机对战'}
            </span>
          </button>

          {/* Rule Guide Modal Trigger */}
          <button
            onClick={onOpenRules}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="hidden md:inline whitespace-nowrap">规则</span>
          </button>

          {/* Restart / Reset Board */}
          <button
            onClick={onRestart}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors cursor-pointer shadow-xs shrink-0"
            title="重置棋盘"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
