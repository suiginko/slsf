import React, { useState, useMemo } from 'react';
import {
  OnlineRoomState,
  PlayerRole,
  SecretWordInfo,
  OnlineCellData,
} from '../../types/online';
import { Team } from '../../types';
import {
  Zap,
  ShieldAlert,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Flame,
  HelpCircle,
  Volume2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface RoleActionPanelProps {
  roomState: OnlineRoomState;
  myRole: PlayerRole;
  myPlayerId: string;
  secretWord: SecretWordInfo | null;
  onSelectCell: (cellId: string) => void;
  onSubmitClue: (clueText: string) => void;
  onPressBuzzer: () => void;
  onSubmitGuess: (guessText: string) => void;
}

export const RoleActionPanel: React.FC<RoleActionPanelProps> = ({
  roomState,
  myRole,
  myPlayerId,
  secretWord,
  onSubmitClue,
  onPressBuzzer,
  onSubmitGuess,
}) => {
  const [clueInput, setClueInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [clueError, setClueError] = useState('');

  const activeCell = useMemo(() => {
    return roomState.cells.find((c) => c.id === roomState.selectedCellId) || null;
  }, [roomState.cells, roomState.selectedCellId]);

  const isMyTeamSelecting =
    (roomState.selectingTeam === 'RED' && (myRole === 'RED_DESC' || myRole === 'RED_GUESS')) ||
    (roomState.selectingTeam === 'GREEN' && (myRole === 'GREEN_DESC' || myRole === 'GREEN_GUESS'));

  const isMyClueTurn =
    (roomState.clueTeam === 'RED' && myRole === 'RED_DESC') ||
    (roomState.clueTeam === 'GREEN' && myRole === 'GREEN_DESC');

  const isMyGuessTurn =
    (roomState.answeringTeam === 'RED' && myRole === 'RED_GUESS') ||
    (roomState.answeringTeam === 'GREEN' && myRole === 'GREEN_GUESS');

  const isDescriber = myRole === 'RED_DESC' || myRole === 'GREEN_DESC';
  const isGuesser = myRole === 'RED_GUESS' || myRole === 'GREEN_GUESS';
  const myTeam: Team | null =
    myRole.startsWith('RED') ? 'RED' : myRole.startsWith('GREEN') ? 'GREEN' : null;

  // 描述输入前置合法性检查
  const handleClueChange = (val: string) => {
    setClueInput(val);
    setClueError('');
    if (val.trim().length > 2) {
      setClueError('必须恰好输入两个汉字！');
    } else if (secretWord && val.trim().length > 0) {
      for (const char of secretWord.word) {
        if (val.includes(char)) {
          setClueError(`违规：不可包含目标词原字【${char}】！`);
          break;
        }
      }
    }
  };

  const handleSendClue = () => {
    const trimmed = clueInput.trim();
    if (trimmed.length !== 2) {
      setClueError('描述必须恰好为两个汉字！');
      return;
    }
    if (secretWord) {
      for (const char of secretWord.word) {
        if (trimmed.includes(char)) {
          setClueError(`违规：不可包含目标词原字【${char}】！`);
          return;
        }
      }
    }
    onSubmitClue(trimmed);
    setClueInput('');
    setClueError('');
  };

  const handleSendGuess = () => {
    if (!guessInput.trim()) return;
    onSubmitGuess(guessInput.trim());
    setGuessInput('');
  };

  // 计算对手猜词位是否还有抢答机会
  const canHijackBuzzer = useMemo(() => {
    if (!isGuesser || !activeCell || !myTeam) return false;
    if (roomState.answeringTeam === myTeam) return false; // 自己是答题方，只能防抢
    if (roomState.isProtected) return false; // 对方已提前防抢

    if (myTeam === 'RED') {
      return roomState.buzzerQuotas.redRowQuotas[activeCell.row];
    } else {
      return roomState.buzzerQuotas.greenColQuotas[activeCell.col];
    }
  }, [isGuesser, activeCell, myTeam, roomState.answeringTeam, roomState.isProtected, roomState.buzzerQuotas]);

  // 1. 选题阶段提示
  if (roomState.phase === 'SELECTING_CELL') {
    return (
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col items-center justify-center text-center space-y-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${
              roomState.selectingTeam === 'RED' ? 'bg-[#d81c2f] animate-ping' : 'bg-[#37b484] animate-ping'
            }`}
          />
          <h3 className="text-sm font-bold text-slate-800">
            等待【{roomState.selectingTeam === 'RED' ? '红方' : '绿方'}】在棋盘上选题
          </h3>
        </div>
        <p className="text-xs text-slate-500 max-w-md">
          {isMyTeamSelecting
            ? '请直接在棋盘上点击任意一个未被占领的白色格子作为对决目标！'
            : '对方正在斟酌棋盘拓扑连通路径，请等待对方选定格子...'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      {/* 头部：当前对决格子与倒计时 */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1 bg-slate-900 text-white font-mono font-bold text-sm rounded-xl">
            {activeCell?.code}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>正在对决此格</span>
              <span className="text-[11px] font-normal text-slate-400">
                ({activeCell?.charCount} 字词 · 第 {activeCell ? activeCell.row + 1 : 0} 行 / 第{' '}
                {activeCell ? activeCell.col + 1 : 0} 列)
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              当前描述权：
              <strong className={roomState.clueTeam === 'RED' ? 'text-[#d81c2f]' : 'text-[#37b484]'}>
                {roomState.clueTeam === 'RED' ? '红方' : '绿方'}
              </strong>
            </div>
          </div>
        </div>

        {/* 倒计时 */}
        {['GUESSING_NORMAL', 'GUESSING_BUZZED'].includes(roomState.phase) && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-xs ${
              roomState.timerRemaining <= 5
                ? 'bg-rose-100 text-rose-700 animate-pulse ring-2 ring-rose-300'
                : roomState.phase === 'GUESSING_BUZZED'
                ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-300'
                : 'bg-blue-50 text-blue-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {roomState.phase === 'GUESSING_BUZZED' ? '扣1作答中: ' : '答题倒计时: '}
              {roomState.timerRemaining}s
            </span>
          </div>
        )}
      </div>

      {/* 双方描述位：秘密题面显示卡片 */}
      {isDescriber && secretWord && (
        <div className="p-3.5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-purple-900">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              【描述位专属密函·绝密勿露】
            </span>
            <span className="font-mono text-purple-700">{secretWord.pinyin}</span>
          </div>
          <div className="text-xl font-black text-purple-950 tracking-wider font-mono">
            {secretWord.word}
          </div>
          <p className="text-[10px] text-purple-700/80">
            * 双方描述位均可见。请用<strong>任意二字组合</strong>进行描述，严禁直接带入原词任意汉字！
          </p>
        </div>
      )}

      {/* 阶段 1：CLUE_INPUT 等待二字描述输入 */}
      {roomState.phase === 'CLUE_INPUT' && (
        <div className="space-y-3">
          {isMyClueTurn ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>请输入你的二字描述：</span>
                <span
                  className={`text-[11px] font-mono ${
                    clueInput.trim().length === 2 ? 'text-emerald-600 font-bold' : 'text-slate-400'
                  }`}
                >
                  {clueInput.trim().length} / 2 字
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={clueInput}
                  onChange={(e) => handleClueChange(e.target.value)}
                  maxLength={2}
                  placeholder="如：朝阳、金色..."
                  className={`flex-1 px-3 py-2.5 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 font-bold tracking-widest ${
                    clueError
                      ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/30'
                      : 'border-slate-200 focus:ring-blue-200'
                  }`}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendClue()}
                />
                <button
                  type="button"
                  onClick={handleSendClue}
                  disabled={clueInput.trim().length !== 2 || !!clueError}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>发出描述</span>
                </button>
              </div>
              {clueError && (
                <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{clueError}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <p className="text-xs font-bold text-slate-700">
                等待【{roomState.clueTeam === 'RED' ? '红方' : '绿方'}描述位】输入二字描述...
              </p>
              <p className="text-[11px] text-slate-400 mt-1">描述位将给出不含原词的二字线索</p>
            </div>
          )}
        </div>
      )}

      {/* 阶段 2：GUESSING_NORMAL 或 GUESSING_BUZZED 猜词与抢答博弈 */}
      {['GUESSING_NORMAL', 'GUESSING_BUZZED'].includes(roomState.phase) && (
        <div className="space-y-4">
          {/* 公布的二字线索横幅（对全场所有玩家完全可见） */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-blue-600 font-bold block">
                  最新二字描述线索 (双方可见)
                </span>
                <span className="text-xl font-black text-blue-950 tracking-widest font-mono">
                  “{roomState.currentClueText}”
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">当前作答方</span>
                <strong
                  className={`text-xs font-bold ${
                    roomState.answeringTeam === 'RED' ? 'text-[#d81c2f]' : 'text-[#37b484]'
                  }`}
                >
                  {roomState.answeringTeam === 'RED' ? '🔴 红方猜词位' : '🟢 绿方猜词位'}
                </strong>
              </div>
            </div>

            {/* 本格此前双方给出的所有累计线索 */}
            {roomState.logs.filter((l) => l.type === 'CLUE').length > 1 && (
              <div className="pt-2 border-t border-blue-200/60 flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-[10px] font-bold text-slate-400">本格累计线索：</span>
                {roomState.logs
                  .filter((l) => l.type === 'CLUE')
                  .map((c, idx) => (
                    <span
                      key={c.id || idx}
                      className={`px-2 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1 border ${
                        c.team === 'RED'
                          ? 'bg-[#d81c2f]/10 text-[#d81c2f] border-[#d81c2f]/30'
                          : 'bg-[#37b484]/10 text-[#37b484] border-[#37b484]/30'
                      }`}
                    >
                      <span>{c.team === 'RED' ? '红述' : '绿述'}:</span>
                      <span>{c.text.replace(/给出二字描述：【(.*)】/, '$1')}</span>
                    </span>
                  ))}
              </div>
            )}
          </div>

          {/* 猜词位专属：抢答与防抢扣1按钮 */}
          {isGuesser && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  抢答与防抢博弈 (扣1)
                </span>
                <span className="text-[10px] text-slate-400">无论何方扣1，作答时间均缩减为20秒</span>
              </div>

              {/* 若我是当前作答方 -> 可提前扣1防抢 */}
              {roomState.answeringTeam === myTeam ? (
                <button
                  type="button"
                  disabled={roomState.isProtected}
                  onClick={onPressBuzzer}
                  className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                    roomState.isProtected
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>
                    {roomState.isProtected
                      ? '✅ 已开启防抢保护（对方无法截胡，倒计时20s）'
                      : '🛡️ 提前扣 1 防抢（锁定作答权，时间缩为20s）'}
                  </span>
                </button>
              ) : (
                /* 若我是对手猜词位 -> 可截胡抢答 (消耗对应行/列机会) */
                <button
                  type="button"
                  disabled={!canHijackBuzzer}
                  onClick={onPressBuzzer}
                  className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                    canHijackBuzzer
                      ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white animate-pulse'
                      : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  }`}
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>
                    {roomState.isProtected
                      ? '对方已防抢，无法截胡'
                      : canHijackBuzzer
                      ? `⚡ 扣 1 截胡抢答！（消耗本${myTeam === 'RED' ? '行' : '列'}机会，抢下20s答题权）`
                      : `本${myTeam === 'RED' ? '行' : '列'}抢答机会已耗尽，无法抢答`}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* 猜词输入框：仅当前作答猜词位可输入 */}
          {isMyGuessTurn ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">
                轮到你猜词了（共 {activeCell?.charCount} 个字）：
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  placeholder={`输入 ${activeCell?.charCount} 字猜测答案 (如: ${activeCell?.code})...`}
                  className="flex-1 px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 font-bold"
                  onKeyDown={(e) => e.key === 'Enter' && handleSendGuess()}
                />
                <button
                  type="button"
                  onClick={handleSendGuess}
                  disabled={!guessInput.trim()}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  提交答案
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
              {isGuesser
                ? '等待对方猜词位作答中，你可伺机抢答...'
                : '猜词位思考中，系统将自动核对正误...'}
            </div>
          )}
        </div>
      )}

      {/* 对局动态与系统流水 (最近几条) */}
      <div className="space-y-1.5 pt-2 border-t border-slate-100">
        <span className="text-[11px] font-bold text-slate-400">实时对战流水：</span>
        <div className="max-h-28 overflow-y-auto space-y-1 text-xs font-medium">
          {roomState.logs.slice(-4).map((log) => (
            <div
              key={log.id}
              className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[11px] ${
                log.type === 'CLUE'
                  ? 'bg-blue-50 text-blue-900'
                  : log.type === 'GUESS'
                  ? log.isCorrect
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-rose-50 text-rose-800'
                  : log.type === 'BUZZER_HIJACK' || log.type === 'BUZZER_DEFEND'
                  ? 'bg-amber-50 text-amber-900'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              <span>
                <strong>{log.authorName}:</strong> {log.text}
              </span>
              <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
