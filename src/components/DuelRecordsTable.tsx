import React, { useState } from 'react';
import { DuelRecord } from '../types';
import { Table, Trash2, Copy, Check, X } from 'lucide-react';

interface DuelRecordsTableProps {
  records: DuelRecord[];
  onDeleteRecord: (id: string) => void;
  onDeleteAction: (cellId: string, actionId: string) => void;
  onReorderActions: (cellId: string, sourceActionId: string, targetIndex: number) => void;
  onClearAllRecords: () => void;
  onSelectCellById?: (cellId: string) => void;
}

export const DuelRecordsTable: React.FC<DuelRecordsTableProps> = ({
  records,
  onDeleteRecord,
  onDeleteAction,
  onReorderActions,
  onClearAllRecords,
  onSelectCellById,
}) => {
  const [copied, setCopied] = useState(false);
  const [draggingActionId, setDraggingActionId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ cellId: string; insertIndex: number } | null>(null);

  if (records.length === 0) {
    return (
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-xs">
        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
          <Table className="w-5 h-5" />
        </div>
        <p className="text-sm font-semibold text-slate-700">暂无对局记录</p>
        <p className="text-xs text-slate-400 mt-0.5">
          在输入框中填写描述或猜词后按回车，操作流水将在此按格汇聚呈现
        </p>
      </div>
    );
  }

  // Copy records to clipboard as formatted text
  const handleCopyText = () => {
    const lines = records.map((record) => {
      const actionsStr = (record.actions || [])
        .map((a) => {
          if (a.type === 'RED_CLUE') return `[红述: ${a.text}]`;
          if (a.type === 'RED_GUESS') return `(红猜: ${a.text}${a.isCorrect ? '✓' : ''})`;
          if (a.type === 'GREEN_CLUE') return `[绿述: ${a.text}]`;
          if (a.type === 'GREEN_GUESS') return `(绿猜: ${a.text}${a.isCorrect ? '✓' : ''})`;
          return a.text;
        })
        .join(' ');
      return `【${record.cellCode}】 ${actionsStr || '无记录'}`;
    });

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div id="duel-records-card" className="w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
      {/* Header with actions */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Table className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">对局记录</h3>
            <p className="text-[11px] text-slate-400">支持直接拖拽排序与删除小记录</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyText}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            title="复制对局记录内容"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '已复制' : '复制记录'}</span>
          </button>
          <button
            type="button"
            onClick={onClearAllRecords}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#d81c2f] hover:text-[#b81525] bg-[#d81c2f]/8 hover:bg-[#d81c2f]/15 rounded-lg transition-colors cursor-pointer"
            title="全部清空所有对局记录"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>全部清空</span>
          </button>
        </div>
      </div>

      {/* Structured Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <th className="py-2.5 px-3 w-[12%] min-w-[70px] text-center font-bold">格子</th>
              <th className="py-2.5 px-3">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {/* Legend / Sample Explanation in Table Header */}
                  <div className="flex items-center gap-2.5 text-[11px] font-normal text-slate-500 flex-wrap">
                    <span className="text-slate-400 font-semibold">图例:</span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded border border-[#d81c2f] text-[#d81c2f] font-semibold bg-white shadow-2xs">
                      红方描述
                    </span>
                    <span className="inline-flex items-center px-1 text-[#d81c2f] font-bold">
                      红方猜词
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded border border-[#37b484] text-[#37b484] font-semibold bg-white shadow-2xs">
                      绿方描述
                    </span>
                    <span className="inline-flex items-center px-1 text-[#37b484] font-bold">
                      绿方猜词
                    </span>
                    <span className="inline-flex items-center px-1 text-[#d81c2f] font-bold">
                      答对猜中<span className="text-black font-black ml-0.5">✓</span>
                    </span>
                  </div>
                </div>
              </th>
              <th className="py-2.5 px-2 w-[45px] text-center font-bold">清空</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {records.map((record) => {
              const actions = record.actions || [];

              const handleContainerDrop = (e: React.DragEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (draggingActionId && dropTarget && dropTarget.cellId === record.cellId) {
                  onReorderActions(record.cellId, draggingActionId, dropTarget.insertIndex);
                }
                setDraggingActionId(null);
                setDropTarget(null);
              };

              return (
                <tr key={record.id} className="hover:bg-slate-50/70 transition-colors group">
                  {/* Row Header: Cell Code only (e.g. X3b) */}
                  <td className="py-3 px-3 align-middle text-center bg-slate-50/40 border-r border-slate-200 font-bold">
                    <button
                      type="button"
                      onClick={() => onSelectCellById?.(record.cellId)}
                      className="inline-flex items-center justify-center font-mono font-bold text-xs text-slate-800 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 px-2.5 py-1 rounded-md border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer"
                      title="点击在棋盘定位高亮该格子"
                    >
                      {record.cellCode}
                    </button>
                  </td>

                  {/* Continuous Stream of Operations / Actions for this Cell */}
                  <td
                    className="py-3 px-3 align-middle"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        if (dropTarget?.cellId === record.cellId) {
                          setDropTarget(null);
                        }
                      }
                    }}
                    onDrop={handleContainerDrop}
                  >
                    {actions.length === 0 ? (
                      <span className="text-slate-400 text-xs italic">暂无记录</span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5 min-h-[30px] p-0.5">
                        {actions.map((act, idx) => {
                          const isRedClue = act.type === 'RED_CLUE';
                          const isGreenClue = act.type === 'GREEN_CLUE';
                          const isRedGuess = act.type === 'RED_GUESS';
                          const isGreenGuess = act.type === 'GREEN_GUESS';

                          let badgeClasses = '';
                          if (isRedClue) {
                            badgeClasses =
                              'border border-[#d81c2f] text-[#d81c2f] bg-[#d81c2f]/8 font-semibold px-2 py-0.5 rounded shadow-2xs';
                          } else if (isGreenClue) {
                            badgeClasses =
                              'border border-[#37b484] text-[#37b484] bg-[#37b484]/8 font-semibold px-2 py-0.5 rounded shadow-2xs';
                          } else if (isRedGuess) {
                            badgeClasses = 'text-[#d81c2f] font-bold px-1.5 py-0.5 hover:bg-[#d81c2f]/10 rounded';
                          } else if (isGreenGuess) {
                            badgeClasses = 'text-[#37b484] font-bold px-1.5 py-0.5 hover:bg-[#37b484]/10 rounded';
                          }

                          const isDropBefore =
                            dropTarget?.cellId === record.cellId &&
                            dropTarget?.insertIndex === idx &&
                            draggingActionId !== act.id;

                          const isDropAfter =
                            dropTarget?.cellId === record.cellId &&
                            dropTarget?.insertIndex === idx + 1 &&
                            idx === actions.length - 1 &&
                            draggingActionId !== act.id;

                          return (
                            <React.Fragment key={act.id}>
                              {/* Animated Insertion Drop Indicator (Before this item) */}
                              {isDropBefore && (
                                <div className="h-6 w-2 bg-blue-500 rounded-full animate-pulse shadow-xs mx-0.5 shrink-0 transition-all duration-150" />
                              )}

                              <div
                                draggable
                                onDragStart={(e) => {
                                  setDraggingActionId(act.id);
                                  e.dataTransfer.effectAllowed = 'move';
                                  e.dataTransfer.setData(
                                    'application/x-duel-action',
                                    JSON.stringify({ cellId: record.cellId, actionId: act.id, index: idx })
                                  );
                                  window.getSelection()?.removeAllRanges();
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  e.dataTransfer.dropEffect = 'move';
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const isLeftHalf = e.clientX - rect.left < rect.width / 2;
                                  const targetIdx = isLeftHalf ? idx : idx + 1;
                                  setDropTarget({ cellId: record.cellId, insertIndex: targetIdx });
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (draggingActionId && dropTarget && dropTarget.cellId === record.cellId) {
                                    onReorderActions(record.cellId, draggingActionId, dropTarget.insertIndex);
                                  }
                                  setDraggingActionId(null);
                                  setDropTarget(null);
                                }}
                                onDragEnd={() => {
                                  setDraggingActionId(null);
                                  setDropTarget(null);
                                }}
                                className={`relative inline-flex items-center gap-0.5 group/item select-none cursor-grab active:cursor-grabbing transition-all duration-200 ease-out ${badgeClasses} ${
                                  draggingActionId === act.id
                                    ? 'opacity-25 scale-90'
                                    : 'hover:scale-[1.03]'
                                }`}
                                title="可拖拽调整顺序，鼠标悬浮右上角删除该条记录"
                              >
                                <span>{act.text}</span>

                                {/* Correct checkmark suffix - Pure Black */}
                                {act.isCorrect && (
                                  <span
                                    className="text-black font-black text-xs ml-0.5"
                                    title="命中答对"
                                  >
                                    ✓
                                  </span>
                                )}

                                {/* Sleek Micro Floating Close Button on Top-Right Corner */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteAction(record.cellId, act.id);
                                  }}
                                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-slate-700 hover:bg-[#d81c2f] text-white rounded-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all shadow-xs scale-75 group-hover/item:scale-100 cursor-pointer z-10"
                                  title="删除此条记录"
                                >
                                  <X className="w-2 h-2 stroke-[3]" />
                                </button>
                              </div>

                              {/* Animated Insertion Drop Indicator (After the very last item) */}
                              {isDropAfter && (
                                <div className="h-6 w-2 bg-blue-500 rounded-full animate-pulse shadow-xs mx-0.5 shrink-0 transition-all duration-150" />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}
                  </td>

                  {/* Row Delete Action */}
                  <td className="py-3 px-2 align-middle text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteRecord(record.id)}
                      className="p-1 text-slate-300 hover:text-[#d81c2f] rounded hover:bg-[#d81c2f]/8 transition-colors cursor-pointer"
                      title="清空该格子全部记录"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
