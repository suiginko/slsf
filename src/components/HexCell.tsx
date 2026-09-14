import React from 'react';
import { CellData } from '../types';
import { getHexagonPoints, HEX_RADIUS } from '../utils/hexGeometry';

interface HexCellProps {
  cell: CellData;
  cx: number;
  cy: number;
  isSelected: boolean;
  onClick: (cell: CellData) => void;
  godMode?: boolean;
  isDraggable?: boolean;
  isDragSource?: boolean;
  isDragTarget?: boolean;
  onPointerDown?: (e: React.PointerEvent, cell: CellData) => void;
}

/**
 * Splits a Chinese word intelligently to prevent text clipping in the hexagon.
 * Balances line lengths so text fills the hex beautifully without overflowing.
 * - <= 4 chars: 1 line
 * - 5-7 chars: 1 line (fits nicely at standard font size)
 * - 8-11 chars: 2 lines
 * - 12-16 chars: 3 lines
 * - 17+ chars: 4 lines
 */
function splitWordLines(word: string): string[] {
  if (!word) return [];
  const len = word.length;
  if (len <= 7) {
    return [word];
  }
  if (len <= 11) {
    const mid = Math.ceil(len / 2);
    return [word.slice(0, mid), word.slice(mid)];
  }
  if (len <= 16) {
    const chunkSize = Math.ceil(len / 3);
    const line1 = word.slice(0, chunkSize);
    const line2 = word.slice(chunkSize, chunkSize * 2);
    const line3 = word.slice(chunkSize * 2);
    return [line1, line2, line3].filter(Boolean);
  }
  // >= 17 chars: 4 lines
  const chunkSize = Math.ceil(len / 4);
  const line1 = word.slice(0, chunkSize);
  const line2 = word.slice(chunkSize, chunkSize * 2);
  const line3 = word.slice(chunkSize * 2, chunkSize * 3);
  const line4 = word.slice(chunkSize * 3);
  return [line1, line2, line3, line4].filter(Boolean);
}

/**
 * Unified Layout Calculator for Cell Text:
 * Adapts code position vertically (纵向避让) based on the number of word lines
 * and ensures that the layout is 100% identical across White (neutral), Red, and Green ownership states.
 */
function getUnifiedCellLayout(word: string): {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  startY: number;
  codeY: number;
  codeFontSize: number;
} {
  const lines = splitWordLines(word);
  const lineCount = lines.length;
  const maxLineLen = Math.max(...lines.map((l) => l.length), 1);

  let fontSize = 16;
  let lineHeight = 18;
  let startY = 10;
  let codeY = -14;
  let codeFontSize = 12.5;

  if (lineCount === 1) {
    if (maxLineLen <= 2) fontSize = 19;
    else if (maxLineLen === 3) fontSize = 18;
    else if (maxLineLen === 4) fontSize = 16.5;
    else if (maxLineLen === 5) fontSize = 15;
    else if (maxLineLen === 6) fontSize = 13.5;
    else fontSize = 12; // 7 chars
    lineHeight = fontSize + 2;
    startY = 10;
    codeY = -14;
    codeFontSize = 12.5;
  } else if (lineCount === 2) {
    if (maxLineLen <= 4) fontSize = 14;
    else if (maxLineLen <= 6) fontSize = 12.5;
    else fontSize = 11;
    lineHeight = 17;
    startY = 1; // line 1 at cy + 1, line 2 at cy + 18
    codeY = -20; // code moves up to make space for 2 lines
    codeFontSize = 11.5;
  } else if (lineCount === 3) {
    if (maxLineLen <= 4) fontSize = 11.5;
    else fontSize = 10;
    lineHeight = 14;
    startY = -7; // line 1 at cy - 7, line 2 at cy + 7, line 3 at cy + 21
    codeY = -24; // code moves further up to vertically avoid 3 lines
    codeFontSize = 10.5;
  } else {
    // 4 lines
    fontSize = 9.5;
    lineHeight = 12;
    startY = -12; // line 1 at -12, line 2 at 0, line 3 at +12, line 4 at +24
    codeY = -27; // code moves up to vertically avoid 4 lines
    codeFontSize = 9.5;
  }

  return { lines, fontSize, lineHeight, startY, codeY, codeFontSize };
}

const UI_FONT_CHINESE =
  'system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif';
const UI_FONT_CODE =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export const HexCell: React.FC<HexCellProps> = ({
  cell,
  cx,
  cy,
  isSelected,
  onClick,
  godMode = false,
  isDraggable = false,
  isDragSource = false,
  isDragTarget = false,
  onPointerDown,
}) => {
  const points = getHexagonPoints(cx, cy, HEX_RADIUS);
  const innerPoints = getHexagonPoints(cx, cy, HEX_RADIUS - 3);

  const isCenter = cell.type === 'CENTER';
  const isTopBorder = cell.type === 'BORDER_TOP';
  const isBottomBorder = cell.type === 'BORDER_BOTTOM';
  const isLeftBorder = cell.type === 'BORDER_LEFT';
  const isRightBorder = cell.type === 'BORDER_RIGHT';

  // Determine fill & stroke based on ownership and type
  let fillColor = '#ffffff'; // default white
  let strokeColor = '#cbd5e1'; // slate-300

  if (isCenter) {
    if (cell.owner === 'RED') {
      fillColor = '#d81c2f'; // Red primary #d81c2f
      strokeColor = '#b81525';
    } else if (cell.owner === 'GREEN') {
      fillColor = '#37b484'; // Green primary #37b484
      strokeColor = '#2b8f68';
    } else {
      // Center White/Neutral tile
      fillColor = '#ffffff';
      strokeColor = isSelected ? '#2563eb' : '#cbd5e1';
    }
  } else if (isTopBorder || isBottomBorder) {
    // Red border hex
    fillColor = '#d81c2f';
    strokeColor = '#b81525';
  } else if (isLeftBorder || isRightBorder) {
    // Green border hex
    fillColor = '#37b484';
    strokeColor = '#2b8f68';
  }

  const isClickable = isCenter;
  // Word is visible either when godMode is on, or when the cell is captured/revealed
  const isWordVisible = isCenter && (godMode || cell.owner !== null);
  const layout = getUnifiedCellLayout(cell.word);

  return (
    <g
      id={`hex-group-${cell.id}`}
      onClick={(e) => {
        if (!isDraggable && isCenter) {
          onClick(cell);
        }
      }}
      onPointerDown={(e) => {
        if (isCenter && onPointerDown) {
          onPointerDown(e, cell);
        }
      }}
      className={`transition-all duration-150 select-none ${
        isDraggable && isCenter
          ? 'cursor-grab active:cursor-grabbing hover:opacity-90'
          : isClickable
          ? 'cursor-pointer hover:opacity-95'
          : 'cursor-default'
      }`}
      style={{
        transformOrigin: `${cx}px ${cy}px`,
        opacity: isDragSource ? 0.35 : 1,
      }}
    >
      {/* Drop Target Indicator when dragging in PLAY mode */}
      {isDragTarget && (
        <polygon
          points={getHexagonPoints(cx, cy, HEX_RADIUS + 6)}
          fill="#a855f7"
          fillOpacity="0.25"
          stroke="#9333ea"
          strokeWidth="3.5"
          strokeDasharray="6 3"
          strokeLinejoin="round"
          className="animate-pulse"
        />
      )}

      {/* Outer Aesthetic Highlight on Selection */}
      {isSelected && !isDragTarget && (
        <polygon
          points={getHexagonPoints(cx, cy, HEX_RADIUS + 3.5)}
          fill="none"
          stroke="#2563eb"
          strokeWidth="3.5"
          strokeLinejoin="round"
          className="transition-all"
        />
      )}

      {/* Main Base Hexagon */}
      <polygon
        points={points}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={isSelected ? 3 : 2}
        strokeLinejoin="round"
        className="transition-colors duration-200"
      />

      {/* Subtle Inner Bevel / Highlight */}
      <polygon
        points={innerPoints}
        fill="none"
        stroke={isCenter && cell.owner === null ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)'}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Center Word / Code Display: ALWAYS PURE BLACK (#000000) & UNCHANGED ACROSS OWNERSHIP STATES */}
      {isCenter ? (
        <>
          {isWordVisible ? (
            // Unified view: Code at top (with dynamic vertical avoidance based on word lines) + Words below
            // Completely identical typography and positions whether Neutral, Red, or Green
            <>
              {/* Code at top */}
              <text
                x={cx}
                y={cy + layout.codeY}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#000000"
                fontSize={layout.codeFontSize}
                fontFamily={UI_FONT_CODE}
                fontWeight="800"
                className="pointer-events-none"
              >
                {cell.code}
              </text>

              {/* Word lines */}
              {layout.lines.map((line, idx) => (
                <text
                  key={idx}
                  x={cx}
                  y={cy + layout.startY + idx * layout.lineHeight}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#000000"
                  fontSize={layout.fontSize}
                  fontWeight="800"
                  fontFamily={UI_FONT_CHINESE}
                  className="pointer-events-none"
                >
                  {line}
                </text>
              ))}
            </>
          ) : (
            // Neutral Uncaptured Tile when words are hidden: prominent clean code only (pure black)
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#000000"
              fontSize="22"
              fontWeight="900"
              fontFamily={UI_FONT_CODE}
              letterSpacing="0.04em"
              className="pointer-events-none"
            >
              {cell.code}
            </text>
          )}

          {/* Failed attempts indicator dot if any */}
          {cell.attempts > 0 && cell.owner === null && (
            <circle
              cx={cx + 22}
              cy={cy - 22}
              r="4"
              fill="#d81c2f"
              stroke="#ffffff"
              strokeWidth="2"
            />
          )}
        </>
      ) : null}
    </g>
  );
};
