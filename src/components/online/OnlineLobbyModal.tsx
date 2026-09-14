import React, { useState } from 'react';
import { OnlineRoomState, PlayerRole } from '../../types/online';
import { DEFAULT_WORD_PACKS } from '../../data/defaultWordPacks';
import {
  X,
  Users,
  Copy,
  Check,
  Shield,
  Eye,
  Sparkles,
  ArrowRight,
  Flame,
  CheckCircle2,
} from 'lucide-react';

interface OnlineLobbyModalProps {
  roomState: OnlineRoomState | null;
  myRole: PlayerRole;
  myPlayerId: string;
  onClose: () => void;
  onCreateRoom: (playerName: string, packId: string) => void;
  onJoinRoom: (roomId: string, playerName: string, role?: PlayerRole) => void;
  onSelectRole: (role: PlayerRole) => void;
  onToggleReady: () => void;
}

export const OnlineLobbyModal: React.FC<OnlineLobbyModalProps> = ({
  roomState,
  myRole,
  myPlayerId,
  onClose,
  onCreateRoom,
  onJoinRoom,
  onSelectRole,
  onToggleReady,
}) => {
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('suilan_player_name') || '侠客');
  const [targetRoomId, setTargetRoomId] = useState('');
  const [selectedPackId, setSelectedPackId] = useState(DEFAULT_WORD_PACKS[0].id);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleNameChange = (val: string) => {
    setPlayerName(val);
    localStorage.setItem('suilan_player_name', val);
  };

  const handleCopyRoomId = () => {
    if (!roomState) return;
    navigator.clipboard.writeText(roomState.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 渲染尚未加入房间时的创建/加入视图
  if (!roomState) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
        <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
          {/* 顶栏 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">“双音节” 2v2 在线对战大厅</h2>
                <p className="text-xs text-slate-400">两两组队·二字描述·有限抢答·自动裁判</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto">
            {/* 玩家昵称 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">我的对战昵称</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => handleNameChange(e.target.value)}
                maxLength={12}
                placeholder="请输入昵称"
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>

            {/* 创建房间区块 */}
            <div className="p-4 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 border border-blue-100 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  新建 2v2 对战房间
                </span>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-500 font-medium">选择对战词库</label>
                <select
                  value={selectedPackId}
                  onChange={(e) => setSelectedPackId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 font-medium"
                >
                  {DEFAULT_WORD_PACKS.map((pack) => (
                    <option key={pack.id} value={pack.id}>
                      {pack.name} ({pack.words.length} 词)
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => onCreateRoom(playerName, selectedPackId)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>创建房间并入座</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 加入已有房间 */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-600" />
                加入好友房间
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={targetRoomId}
                  onChange={(e) => setTargetRoomId(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="输入 6 位房间码 (如 ABCD)"
                  className="flex-1 px-3 py-2 text-xs uppercase font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                />
                <button
                  type="button"
                  disabled={!targetRoomId.trim()}
                  onClick={() => onJoinRoom(targetRoomId.trim(), playerName)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  加入
                </button>
              </div>
            </div>

            {/* 规则核心小贴士 */}
            <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl text-[11px] text-amber-900/90 leading-relaxed space-y-1">
              <p className="font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                双音节 2v2 核心竞技特色：
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800 pl-1">
                <li>红方纵向连通胜，绿方横向连通胜。</li>
                <li>描述位只能给出<strong>恰好两个字</strong>的描述，且严禁漏字。</li>
                <li>正常答题 90 秒；双方猜词位均可扣 1 触发 20 秒抢答/防抢。</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 渲染房间内 4 人选位与准备就绪状态
  const roles: { role: PlayerRole; title: string; desc: string; team: 'RED' | 'GREEN' | 'NEUTRAL' }[] = [
    { role: 'RED_DESC', title: '🔴 红方描述位', desc: '阅读秘密答案，给出二字线索', team: 'RED' },
    { role: 'RED_GUESS', title: '🔴 红方猜词位', desc: '根据二字线索猜词，可扣1抢答', team: 'RED' },
    { role: 'GREEN_DESC', title: '🟢 绿方描述位', desc: '阅读秘密答案，给出二字线索', team: 'GREEN' },
    { role: 'GREEN_GUESS', title: '🟢 绿方猜词位', desc: '根据二字线索猜词，可扣1抢答', team: 'GREEN' },
  ];

  const myPlayer = roomState.players.find((p) => p.id === myPlayerId);
  const coreRoles: PlayerRole[] = ['RED_DESC', 'RED_GUESS', 'GREEN_DESC', 'GREEN_GUESS'];
  const allCoreOccupied = coreRoles.every((r) => roomState.players.some((p) => p.role === r));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 房间头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">对战房间 #{roomState.roomId}</h2>
                <button
                  type="button"
                  onClick={handleCopyRoomId}
                  className="px-2 py-0.5 text-[11px] font-mono font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? '已复制' : '复制房间号'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-400">词库：{roomState.wordPackName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 席位卡片选择 */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">请选择对战席位（点击直接入座）：</span>
            <span className="text-[11px] text-slate-400">需要 4 位玩家入座并全部准备</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {roles.map((item) => {
              const occupant = roomState.players.find((p) => p.role === item.role);
              const isMe = occupant?.id === myPlayerId;
              const isRed = item.team === 'RED';

              return (
                <div
                  key={item.role}
                  onClick={() => !occupant && onSelectRole(item.role)}
                  className={`p-4 rounded-2xl border-2 transition-all relative ${
                    occupant
                      ? isMe
                        ? isRed
                          ? 'border-[#d81c2f] bg-[#d81c2f]/5 shadow-sm ring-2 ring-[#d81c2f]/20'
                          : 'border-[#37b484] bg-[#37b484]/5 shadow-sm ring-2 ring-[#37b484]/20'
                        : 'border-slate-200 bg-slate-50/50'
                      : 'border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-900">{item.title}</span>
                    {occupant?.isReady && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> 已准备
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">{item.desc}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    {occupant ? (
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                            isRed ? 'bg-[#d81c2f]' : 'bg-[#37b484]'
                          }`}
                        >
                          {occupant.name.charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-slate-800">
                          {occupant.name} {isMe && '(我)'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-blue-600 font-bold flex items-center gap-1">
                        + 点击入座此席位
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 观战席与观众列表 */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Eye className="w-4 h-4 text-slate-400" />
              <span>
                观战席位 ({roomState.players.filter((p) => p.role === 'SPECTATOR').length} 人):
              </span>
              <div className="flex items-center gap-1">
                {roomState.players
                  .filter((p) => p.role === 'SPECTATOR')
                  .map((p) => (
                    <span
                      key={p.id}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-medium"
                    >
                      {p.name} {p.id === myPlayerId && '(我)'}
                    </span>
                  ))}
              </div>
            </div>
            {myRole !== 'SPECTATOR' && (
              <button
                type="button"
                onClick={() => onSelectRole('SPECTATOR')}
                className="text-[11px] text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
              >
                切换为观众
              </button>
            )}
          </div>
        </div>

        {/* 底栏准备/开始 */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {!allCoreOccupied ? (
              <span className="text-amber-600 font-medium">⚠️ 尚缺席位，请等待好友入座...</span>
            ) : (
              <span className="text-emerald-600 font-medium">✅ 四大席位已集齐，请确认准备</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {myRole !== 'SPECTATOR' && (
              <button
                type="button"
                onClick={onToggleReady}
                className={`px-8 py-2.5 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer ${
                  myPlayer?.isReady
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {myPlayer?.isReady ? '取消准备' : '准备就绪'}
              </button>
            )}
            {roomState.phase !== 'LOBBY' && (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                返回对战盘面
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
