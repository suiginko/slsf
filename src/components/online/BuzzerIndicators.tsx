import React from 'react';
import { BuzzerQuotas } from '../../types/online';
import { Zap } from 'lucide-react';

interface BuzzerIndicatorsProps {
  buzzerQuotas: BuzzerQuotas;
  activeRow?: number;
  activeCol?: number;
}

export const BuzzerIndicators: React.FC<BuzzerIndicatorsProps> = ({
  buzzerQuotas,
  activeRow,
  activeCol,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
      {/* 红方行抢答灯 (Row 0 ~ 4) */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 font-bold text-[#d81c2f]">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>红方抢答机会 (按行):</span>
        </div>
        <div className="flex items-center gap-1.5">
          {buzzerQuotas.redRowQuotas.map((available, idx) => {
            const isHighlight = activeRow === idx;
            return (
              <div
                key={`red-row-${idx}`}
                title={`第 ${idx + 1} 行抢答机会：${available ? '可用' : '已耗尽'}`}
                className={`flex items-center justify-center w-5 h-5 rounded-md font-mono text-[11px] font-bold transition-all ${
                  available
                    ? isHighlight
                      ? 'bg-[#d81c2f] text-white ring-2 ring-[#d81c2f]/40 animate-pulse'
                      : 'bg-[#d81c2f]/15 text-[#d81c2f] border border-[#d81c2f]/30'
                    : 'bg-slate-200 text-slate-400 line-through'
                }`}
              >
                R{idx + 1}
              </div>
            );
          })}
        </div>
      </div>

      {/* 绿方列抢答灯 (Col 0 ~ 4) */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 font-bold text-[#37b484]">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>绿方抢答机会 (按列):</span>
        </div>
        <div className="flex items-center gap-1.5">
          {buzzerQuotas.greenColQuotas.map((available, idx) => {
            const isHighlight = activeCol === idx;
            return (
              <div
                key={`green-col-${idx}`}
                title={`第 ${idx + 1} 列抢答机会：${available ? '可用' : '已耗尽'}`}
                className={`flex items-center justify-center w-5 h-5 rounded-md font-mono text-[11px] font-bold transition-all ${
                  available
                    ? isHighlight
                      ? 'bg-[#37b484] text-white ring-2 ring-[#37b484]/40 animate-pulse'
                      : 'bg-[#37b484]/15 text-[#37b484] border border-[#37b484]/30'
                    : 'bg-slate-200 text-slate-400 line-through'
                }`}
              >
                C{idx + 1}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
