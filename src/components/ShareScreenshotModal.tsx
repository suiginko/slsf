import React, { useState, useRef, useEffect } from 'react';
import { CellData, DuelRecord, Team } from '../types';
import { HexBoard } from './HexBoard';
import { toPng, toBlob } from 'html-to-image';
import { X, Download, Copy, Check, Camera, Loader2 } from 'lucide-react';

interface ShareScreenshotModalProps {
  cells: CellData[];
  duelRecords: DuelRecord[];
  activePackName: string;
  redScore: number;
  greenScore: number;
  winner: Team | null;
  onClose: () => void;
}

const FIXED_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", "Segoe UI", Roboto, sans-serif';

export const ShareScreenshotModal: React.FC<ShareScreenshotModalProps> = ({
  cells,
  duelRecords,
  activePackName,
  redScore,
  greenScore,
  onClose,
}) => {
  const captureRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generate screenshot image
  const generateImage = async () => {
    if (!captureRef.current) return;
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      // Small timeout to ensure DOM & fonts are fully settled
      await new Promise((res) => setTimeout(res, 300));

      const dataUrl = await toPng(captureRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#f8fafc',
        width: 1040,
        skipFonts: true,
        fontEmbedCSS: '',
      });

      setImageUrl(dataUrl);
    } catch (err: any) {
      console.error('Screenshot generation failed:', err);
      setErrorMsg('生成长图失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    generateImage();
  }, []);

  // Copy image to clipboard
  const handleCopyImage = async () => {
    if (!captureRef.current) return;
    try {
      const blob = await toBlob(captureRef.current, {
        pixelRatio: 2,
        backgroundColor: '#f8fafc',
        width: 1040,
        skipFonts: true,
        fontEmbedCSS: '',
      });

      if (blob && navigator.clipboard && (window as any).ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } else {
        alert('浏览器暂不支持直接复制图片到剪贴板，请点击“下载长图”保存。');
      }
    } catch (err) {
      console.error('Failed to copy image to clipboard', err);
      alert('复制失败，请直接使用“下载长图”');
    }
  };

  // Download image
  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.download = `随蓝射覆-盘面与对局记录-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = imageUrl;
    link.click();
  };

  return (
    <div
      id="share-screenshot-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Hidden Offscreen / Absolute DOM Element to capture with strictly fixed 1040px width & font-sizes */}
      <div
        style={{
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          width: '1040px',
          minWidth: '1040px',
          maxWidth: '1040px',
          zoom: 1,
        }}
      >
        <div
          ref={captureRef}
          style={{
            width: '1040px',
            minWidth: '1040px',
            maxWidth: '1040px',
            backgroundColor: '#f8fafc',
            padding: '36px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            fontFamily: FIXED_FONT_FAMILY,
            color: '#0f172a',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '18px',
              borderBottom: '1px solid #e2e8f0',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  backgroundColor: '#2563eb',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '22px',
                  lineHeight: '26px',
                }}
              >
                蓝
              </div>
              <div>
                <h1
                  style={{
                    fontSize: '22px',
                    lineHeight: '28px',
                    fontWeight: 900,
                    color: '#0f172a',
                    margin: 0,
                    letterSpacing: '-0.02em',
                  }}
                >
                  随蓝射覆 · 对局盘面与记录
                </h1>
                <p
                  style={{
                    fontSize: '13px',
                    lineHeight: '18px',
                    color: '#64748b',
                    fontWeight: 500,
                    margin: '4px 0 0 0',
                  }}
                >
                  题库：{activePackName} · 时间：{new Date().toLocaleString()}
                </p>
              </div>
            </div>

            {/* Score pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '8px 24px',
                borderRadius: '9999px',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#d81c2f',
                    display: 'inline-block',
                  }}
                />
                <span style={{ fontSize: '13px', lineHeight: '18px', fontWeight: 700, color: '#d81c2f' }}>
                  红方占领
                </span>
                <span
                  style={{
                    fontSize: '22px',
                    lineHeight: '26px',
                    fontWeight: 900,
                    color: '#d81c2f',
                  }}
                >
                  {redScore}
                </span>
              </div>
              <span style={{ color: '#cbd5e1', fontWeight: 700, fontSize: '16px' }}>:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '22px',
                    lineHeight: '26px',
                    fontWeight: 900,
                    color: '#37b484',
                  }}
                >
                  {greenScore}
                </span>
                <span style={{ fontSize: '13px', lineHeight: '18px', fontWeight: 700, color: '#37b484' }}>
                  绿方占领
                </span>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#37b484',
                    display: 'inline-block',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Hexagonal Honeycomb Board Section */}
          <div
            style={{
              width: '100%',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxSizing: 'border-box',
            }}
          >
            <HexBoard
              cells={cells}
              selectedCellId={null}
              onSelectCell={() => {}}
              godMode={true}
            />
          </div>

          {/* Duel Records Table Section */}
          <div
            style={{
              width: '100%',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '10px',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div
                style={{
                  fontSize: '15px',
                  lineHeight: '22px',
                  fontWeight: 700,
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>📋 对局记录</span>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400 }}>
                  (共 {duelRecords.length} 组格子记录)
                </span>
              </div>
            </div>

            {duelRecords.length === 0 ? (
              <div
                style={{
                  padding: '28px 0',
                  textAlign: 'center',
                  fontSize: '13px',
                  lineHeight: '18px',
                  color: '#94a3b8',
                }}
              >
                暂无对局记录
              </div>
            ) : (
              <div
                style={{
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                  width: '100%',
                }}
              >
                <table
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    fontSize: '13px',
                    lineHeight: '18px',
                    borderCollapse: 'collapse',
                    tableLayout: 'fixed',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                        color: '#475569',
                        fontWeight: 700,
                      }}
                    >
                      <th
                        style={{
                          padding: '12px 14px',
                          width: '90px',
                          minWidth: '90px',
                          maxWidth: '90px',
                          textAlign: 'center',
                          fontSize: '13px',
                          boxSizing: 'border-box',
                        }}
                      >
                        格子
                      </th>
                      <th style={{ padding: '12px 16px', boxSizing: 'border-box' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '10px',
                            fontSize: '12px',
                            fontWeight: 400,
                            color: '#64748b',
                            flexWrap: 'nowrap',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>图例:</span>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1.5px solid #d81c2f',
                              color: '#d81c2f',
                              fontWeight: 700,
                              backgroundColor: '#ffffff',
                              fontSize: '12px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            红方描述
                          </span>
                          <span
                            style={{
                              padding: '2px 6px',
                              color: '#d81c2f',
                              fontWeight: 800,
                              fontSize: '12px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            红方猜词
                          </span>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1.5px solid #37b484',
                              color: '#37b484',
                              fontWeight: 700,
                              backgroundColor: '#ffffff',
                              fontSize: '12px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            绿方描述
                          </span>
                          <span
                            style={{
                              padding: '2px 6px',
                              color: '#37b484',
                              fontWeight: 800,
                              fontSize: '12px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            绿方猜词
                          </span>
                          <span
                            style={{
                              padding: '2px 6px',
                              color: '#d81c2f',
                              fontWeight: 800,
                              fontSize: '12px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            答对猜中<span style={{ color: '#000000', fontWeight: 900, marginLeft: '2px' }}>✓</span>
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {duelRecords.map((record, index) => {
                      const actions = record.actions || [];
                      return (
                        <tr
                          key={record.id}
                          style={{
                            backgroundColor: '#ffffff',
                            borderTop: index === 0 ? 'none' : '1px solid #e2e8f0',
                          }}
                        >
                          <td
                            style={{
                              padding: '12px 14px',
                              verticalAlign: 'middle',
                              textAlign: 'center',
                              backgroundColor: '#f8fafc',
                              borderRight: '1px solid #e2e8f0',
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              color: '#0f172a',
                              fontSize: '14px',
                              width: '90px',
                              minWidth: '90px',
                              maxWidth: '90px',
                              boxSizing: 'border-box',
                            }}
                          >
                            {record.cellCode}
                          </td>
                          <td
                            style={{
                              padding: '12px 16px',
                              verticalAlign: 'middle',
                              boxSizing: 'border-box',
                            }}
                          >
                            {actions.length === 0 ? (
                              <span style={{ color: '#cbd5e1', fontStyle: 'italic', fontSize: '13px' }}>
                                无操作记录
                              </span>
                            ) : (
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  alignItems: 'center',
                                  gap: '8px',
                                  rowGap: '8px',
                                  width: '100%',
                                }}
                              >
                                {actions.map((act) => {
                                  const isRedClue = act.type === 'RED_CLUE';
                                  const isGreenClue = act.type === 'GREEN_CLUE';
                                  const isRedGuess = act.type === 'RED_GUESS';
                                  const isGreenGuess = act.type === 'GREEN_GUESS';

                                  let badgeStyle: React.CSSProperties = {
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontSize: '13px',
                                    lineHeight: '18px',
                                    whiteSpace: 'nowrap',
                                    wordBreak: 'keep-all',
                                    flexShrink: 0,
                                    boxSizing: 'border-box',
                                  };

                                  if (isRedClue) {
                                    badgeStyle = {
                                      ...badgeStyle,
                                      border: '1.5px solid #d81c2f',
                                      color: '#d81c2f',
                                      backgroundColor: 'rgba(216, 28, 47, 0.08)',
                                      fontWeight: 700,
                                      padding: '3px 9px',
                                      borderRadius: '6px',
                                    };
                                  } else if (isGreenClue) {
                                    badgeStyle = {
                                      ...badgeStyle,
                                      border: '1.5px solid #37b484',
                                      color: '#37b484',
                                      backgroundColor: 'rgba(55, 180, 132, 0.08)',
                                      fontWeight: 700,
                                      padding: '3px 9px',
                                      borderRadius: '6px',
                                    };
                                  } else if (isRedGuess) {
                                    badgeStyle = {
                                      ...badgeStyle,
                                      color: '#d81c2f',
                                      fontWeight: 800,
                                      padding: '3px 6px',
                                      borderRadius: '4px',
                                    };
                                  } else if (isGreenGuess) {
                                    badgeStyle = {
                                      ...badgeStyle,
                                      color: '#37b484',
                                      fontWeight: 800,
                                      padding: '3px 6px',
                                      borderRadius: '4px',
                                    };
                                  }

                                  return (
                                    <span key={act.id} style={badgeStyle}>
                                      <span style={{ whiteSpace: 'nowrap' }}>{act.text}</span>
                                      {act.isCorrect && (
                                        <span
                                          style={{
                                            color: '#000000',
                                            fontWeight: 900,
                                            marginLeft: '3px',
                                            fontSize: '13px',
                                          }}
                                        >
                                          ✓
                                        </span>
                                      )}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Dialog Box */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">盘面与对局记录长图</h2>
              <p className="text-xs text-slate-400">已将当前蜂巢盘面与描述猜词表格合成为长图，便于分享</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content / Preview Area */}
        <div className="flex-1 overflow-y-auto min-h-[260px] max-h-[480px] bg-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center border border-slate-200">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-xs font-semibold">正在渲染高清合成长图...</p>
            </div>
          ) : errorMsg ? (
            <div className="text-center text-[#d81c2f] text-xs py-8">
              <p className="font-semibold">{errorMsg}</p>
              <button
                type="button"
                onClick={generateImage}
                className="mt-3 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
              >
                重试生成
              </button>
            </div>
          ) : imageUrl ? (
            <div className="w-full flex flex-col items-center">
              <img
                src={imageUrl}
                alt="对决长图预览"
                className="w-full max-w-lg h-auto rounded-xl shadow-md border border-slate-200"
              />
            </div>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={generateImage}
            disabled={isGenerating}
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            刷新重绘
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={isGenerating || !imageUrl}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {copySuccess ? <Check className="w-4 h-4 text-[#37b484]" /> : <Copy className="w-4 h-4" />}
              <span>{copySuccess ? '已复制到剪贴板' : '复制图片'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating || !imageUrl}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>下载长图</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

