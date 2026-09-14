import React, { useMemo, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  OnlineRoomState,
  PlayerRole,
  SecretWordInfo,
} from '../../types/online';
import { CellData } from '../../types';
import { HexBoard } from '../HexBoard';
import { BuzzerIndicators } from './BuzzerIndicators';
import { RoleActionPanel } from './RoleActionPanel';
import {
  Copy,
  Check,
  Users,
  LogOut,
  Trophy,
  Sparkles,
  ArrowRight,
  Flame,
  Radio,
} from 'lucide-react';

interface OnlineBattleStageProps {
  roomState: OnlineRoomState;
  myRole: PlayerRole;
  myPlayerId: string;
  secretWord: SecretWordInfo | null;
  toastMessage: string | null;
  onOpenLobby: () => void;
  onLeaveRoom: () => void;
  onSelectCell: (cellId: string) => void;
  onSubmitClue: (clueText: string) => void;
  onPressBuzzer: () => void;
  onSubmitGuess: (guessText: string) => void;
}

export const OnlineBattleStage: React.FC<OnlineBattleStageProps> = ({
  roomState,
  myRole,
  myPlayerId,
  secretWord,
  toastMessage,
  onOpenLobby,
  onLeaveRoom,
  onSelectCell,
  onSubmitClue,
  onPressBuzzer,
  onSubmitGuess,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomState.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 将 OnlineCellData[] 转换为 HexBoard 所需的 CellData[]
  const mappedCells = useMemo((): CellData[] => {
    return roomState.cells.map((c, idx) => ({
      id: c.id,
      row: c.row,
      col: c.col,
      type: 'CENTER',
      word: c.word || '',
      pinyin: c.pinyin || '',
      firstLetter: c.firstLetter,
      charCount: c.charCount,
      code: c.code,
      rawCode: c.rawCode,
      category: c.category,
      owner: c.owner,
      revealed: c.revealed,
      attempts: 0,
      isPartOfWinningPath: roomState.winningPath.includes(c.id),
      centerIndex: idx,
    }));
  }, [roomState.cells, roomState.winningPath]);

  // 统计双方当前占领分数
  const redScore = useMemo(
    () => roomState.cells.filter((c) => c.owner === 'RED').length,
    [roomState.cells]
  );
  const greenScore = useMemo(
    () => roomState.cells.filter((c) => c.owner === 'GREEN').length,
    [roomState.cells]
  );

  const activeCell = useMemo(() => {
    return roomState.cells.find((c) => c.id === roomState.selectedCellId) || null;
  }, [roomState.cells, roomState.selectedCellId]);

  // 寻找四大席位的选手名字
  const redDesc = roomState.players.find((p) => p.role === 'RED_DESC');
  const redGuess = roomState.players.find((p) => p.role === 'RED_GUESS');
  const greenDesc = roomState.players.find((p) => p.role === 'GREEN_DESC');
  const greenGuess = roomState.players.find((p) => p.role === 'GREEN_GUESS');

  // 胜利撒花特效
  useEffect(() => {
    if (roomState.phase === 'GAME_OVER' && roomState.winner) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: roomState.winner === 'RED' ? ['#d81c2f', '#ff8591'] : ['#37b484', '#7ef0c1'],
      });
    }
  }, [roomState.phase, roomState.winner]);

  const handleSelectCell = (cell: CellData) => {
    if (roomState.phase === 'SELECTING_CELL' && cell.owner === null) {
      onSelectCell(cell.id);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Toast 悬浮通知 */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-3 border border-slate-700">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 联机对战状态顶条 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* 房间与词库信息 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-900">
              对战房号: #{roomState.roomId}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
              title="复制房间号"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <span className="text-slate-300">|</span>
          <span className="text-xs text-slate-500">
            题库: <strong className="text-slate-700">{roomState.wordPackName}</strong>
          </span>
        </div>

        {/* 双方阵营席位信息卡 */}
        <div className="flex items-center gap-4 sm:gap-6 bg-slate-50 px-4 py-1.5 rounded-xl border border-slate-200 text-xs">
          {/* 红方 */}
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d81c2f]" />
            <div className="text-left">
              <span className="font-bold text-[#d81c2f]">红方 ({redScore})</span>
              <div className="text-[10px] text-slate-500 flex gap-1.5">
                <span>描: {redDesc?.name || '空缺'}</span>
                <span>猜: {redGuess?.name || '空缺'}</span>
              </div>
            </div>
          </div>

          <span className="text-slate-300 font-bold">:</span>

          {/* 绿方 */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="font-bold text-[#37b484]">绿方 ({greenScore})</span>
              <div className="text-[10px] text-slate-500 flex gap-1.5">
                <span>描: {greenDesc?.name || '空缺'}</span>
                <span>猜: {greenGuess?.name || '空缺'}</span>
              </div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-[#37b484]" />
          </div>
        </div>

        {/* 右侧控制：大厅席位设置与退出 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenLobby}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>席位/房间</span>
          </button>
          <button
            type="button"
            onClick={onLeaveRoom}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>退出对战</span>
          </button>
        </div>
      </div>

      {/* 主对决区域：左棋盘 + 右操作面板 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* 左侧 Hex 棋盘区 */}
        <div className="lg:col-span-7 flex flex-col items-center space-y-3">
          {/* 行/列抢答指示灯 */}
          <div className="w-full">
            <BuzzerIndicators
              buzzerQuotas={roomState.buzzerQuotas}
              activeRow={activeCell?.row}
              activeCol={activeCell?.col}
            />
          </div>

          <HexBoard
            cells={mappedCells}
            selectedCellId={roomState.selectedCellId}
            onSelectCell={handleSelectCell}
            godMode={false} // 在线对战模式绝不作弊透题，严格遵守规则
            isDraggable={false}
          />
        </div>

        {/* 右侧角色专属操作与博弈面板 */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <RoleActionPanel
            roomState={roomState}
            myRole={myRole}
            myPlayerId={myPlayerId}
            secretWord={secretWord}
            onSelectCell={onSelectCell}
            onSubmitClue={onSubmitClue}
            onPressBuzzer={onPressBuzzer}
            onSubmitGuess={onSubmitGuess}
          />
        </div>
      </div>

      {/* 获胜终局结算模态框 */}
      {roomState.phase === 'GAME_OVER' && roomState.winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in zoom-in-95">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div
              className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-lg ${
                roomState.winner === 'RED'
                  ? 'bg-[#d81c2f] text-white shadow-[#d81c2f]/30'
                  : 'bg-[#37b484] text-white shadow-[#37b484]/30'
              }`}
            >
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">
                {roomState.winner === 'RED' ? '🔴 红方纵向贯通获胜！' : '🟢 绿方横向贯通获胜！'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                恭喜【{roomState.winner === 'RED' ? '红方' : '绿方'}】率先达成蜂巢拓扑连通，夺得本场巅峰胜利！
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between font-medium">
                <span>总对决轮数：</span>
                <span className="font-bold">{roomState.roundCount} 轮</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>最终占领比：</span>
                <span className="font-bold">红方 {redScore} : {greenScore} 绿方</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onOpenLobby}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                返回房间准备下一局
              </button>
              <button
                type="button"
                onClick={onLeaveRoom}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
