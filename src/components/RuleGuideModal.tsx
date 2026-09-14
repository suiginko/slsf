import React, { useState } from 'react';
import {
  X,
  ArrowDown,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Layers,
  Award,
  BookOpen,
  Sparkles,
  Shuffle,
  Camera,
  CheckCircle2,
} from 'lucide-react';

interface RuleGuideModalProps {
  onClose: () => void;
}

export const RuleGuideModal: React.FC<RuleGuideModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'GAME' | 'TOOL' | 'TIPS'>('GAME');

  return (
    <div
      id="rule-guide-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">“随蓝射覆”规则说明与主持人指南</h2>
              <p className="text-xs text-slate-400">蜂巢六边形拓扑对抗猜词游戏与主持人工作台完整指南</p>
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 px-6 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('GAME')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'GAME'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>1. 游戏规则与拓扑胜负</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('TOOL')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'TOOL'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>2. 主持人工作台操作指南</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('TIPS')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'TIPS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>3. 代号体系与战术策略</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-600 text-xs sm:text-sm leading-relaxed flex-1">
          {activeTab === 'GAME' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Section 1: 核心概述 */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>游戏核心概述</span>
                </h3>
                <p className="text-slate-600 text-xs sm:text-sm">
                  “随蓝射覆”是一款融合了经典<strong>蜂巢六边形拓扑连通棋（Hex）</strong>与传统<strong>射覆猜词</strong>玩法的双人/双队语言对抗竞技游戏。
                  双方通过对决猜词来占领棋盘格子，最先将己方阵地两侧完全连通的一方获得胜利。
                </p>
              </div>

              {/* Section 2: 棋盘阵地结构 */}
              <div className="space-y-2.5">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>棋盘阵地与边界结构</span>
                </h3>
                <p className="text-slate-600 text-xs sm:text-sm">
                  棋盘由正六边形蜂巢网络组成，中心为 <strong>5 × 5 共 25 个中心白色题目格子</strong>。四周环绕双方的阵地起始与终点边界：
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 bg-[#d81c2f]/6 border border-[#d81c2f]/20 rounded-2xl space-y-1.5">
                    <div className="font-bold text-[#d81c2f] flex items-center gap-1.5 text-xs sm:text-sm">
                      <ArrowDown className="w-4 h-4 text-[#d81c2f]" />
                      <span>红方阵地（纵向南北贯通）</span>
                    </div>
                    <p className="text-xs text-[#d81c2f]/90 leading-relaxed">
                      上方 6 个红色边界格子 + 下方 5 个红色边界格子。红方目标是自上而下纵向贯通。
                    </p>
                  </div>

                  <div className="p-3.5 bg-[#37b484]/6 border border-[#37b484]/20 rounded-2xl space-y-1.5">
                    <div className="font-bold text-[#37b484] flex items-center gap-1.5 text-xs sm:text-sm">
                      <ArrowRight className="w-4 h-4 text-[#37b484]" />
                      <span>绿方阵地（横向东西贯通）</span>
                    </div>
                    <p className="text-xs text-[#37b484]/90 leading-relaxed">
                      左方 5 个绿色边界格子 + 右方 6 个绿色边界格子。绿方目标是自左向右横向贯通。
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: 胜负判定条件 */}
              <div className="space-y-2.5">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600" />
                  <span>胜负判定原则（拓扑连通定理）</span>
                </h3>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs sm:text-sm">
                  <div className="flex items-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#d81c2f] shrink-0 mt-1.5" />
                    <div>
                      <strong className="text-[#d81c2f]">红方获胜</strong>：
                      占领的红色格子形成一条<strong>从上方红色边界贯通至下方红色边界</strong>的不间断通路。
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#37b484] shrink-0 mt-1.5" />
                    <div>
                      <strong className="text-[#37b484]">绿方获胜</strong>：
                      占领的绿色格子形成一条<strong>从左方绿色边界贯通至右方绿色边界</strong>的不间断通路。
                    </div>
                  </div>
                  <div className="text-slate-400 text-xs pt-1 border-t border-slate-200 mt-2">
                    * 拓扑学定律：在 Hex 蜂巢棋盘中，双方绝不可能同时达成连通，亦不存在平局可能。
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'TOOL' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>主持人工作台核心功能</span>
                </h3>
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl">
                    <div className="font-bold text-purple-900 flex items-center gap-1.5 text-xs sm:text-sm mb-1">
                      <span>✏️ 出题模式（PLAY）</span>
                    </div>
                    <p className="text-xs text-purple-800/90 leading-relaxed">
                      点击棋盘任意中心格子可直接修改词语与拼音，代码与字数实时自动重新计算。支持拖拽任意两个格子直接互换位置。
                    </p>
                  </div>

                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl">
                    <div className="font-bold text-blue-900 flex items-center gap-1.5 text-xs sm:text-sm mb-1">
                      <span>🎙️ 主持模式（HOST）与四合一输入</span>
                    </div>
                    <p className="text-xs text-blue-800/90 leading-relaxed">
                      点击选中目标格子后，在右侧面板中可快捷输入红方描述、红方猜词、绿方描述、绿方猜词。按回车键或点击提交即可自动判定归属；亦可手动点击【判定红方】/【判定绿方】/【设为中立】。
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs sm:text-sm mb-1">
                      <span>📋 对局记录表流水与拖拽微调</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      每格的历史操作记录以小标签形式直观汇聚在表格同一行中（红述红框、绿述绿框、红猜红字、绿猜绿字，答对附带✓）。可直接拖拽调整前后顺序或点击右上角×快速删除单条记录。
                    </p>
                  </div>

                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl">
                    <div className="font-bold text-amber-900 flex items-center gap-1.5 text-xs sm:text-sm mb-1">
                      <span>👁️ 词语防窥屏可见性 & 随机打乱</span>
                    </div>
                    <p className="text-xs text-amber-800/90 leading-relaxed">
                      顶栏支持一键切换【词语可见/词语隐藏】（选手视角隐藏秘密词语，仅显首字母代号）；支持一键【随机打乱词语】打乱25格排布并重置盘面。
                    </p>
                  </div>

                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                    <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs sm:text-sm mb-1">
                      <Camera className="w-4 h-4 text-emerald-700 inline" />
                      <span>长图分享与复盘导出</span>
                    </div>
                    <p className="text-xs text-emerald-800/90 leading-relaxed">
                      一键将蜂巢盘面与对局记录流水表格合成为高清长图，支持直接复制图片到剪贴板或一键下载，便于战报分享和复盘回顾。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'TIPS' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>格子代号识别体系</span>
                </h3>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs sm:text-sm">
                  <p>
                    每个未占领的格子中央显示该格秘密词语的<strong>专属代号</strong>：
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-700">
                    <li>
                      <strong>基本构成</strong>：<code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-blue-600">首字母大写 + 字数</code>。例如词语“向日葵”的代号为 <code className="font-mono font-bold">X3</code>。
                    </li>
                    <li>
                      <strong>唯一性后缀</strong>：当同一盘面中存在首字母相同且字数相同的词语时（如同为X开头的3字词“向日葵”和“西瓜汁”），系统会自动附加小写字母后缀区分，例如 <code className="font-mono font-bold">X3a</code> 与 <code className="font-mono font-bold">X3b</code>。
                    </li>
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>自定义题库导入规范</span>
                </h3>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs sm:text-sm">
                  <p>
                    点击顶栏【题库定制】可导入自定义词表：
                  </p>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-slate-700">
                    <li>支持直接上传 <code className="font-mono">.txt</code> 文本文件或在文本框中粘贴词语。</li>
                    <li>词语之间使用<strong>换行回车</strong>或<strong>空格</strong>分隔。</li>
                    <li>系统自动忽略词语中的逗号、顿号等标点符号，并自动提取全拼与首字母。</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            随时可在顶栏点击【规则】打开本说明
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            明白，开始对局！
          </button>
        </div>
      </div>
    </div>
  );
};

