import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { CellData } from '../types';
import { HexCell } from './HexCell';
import {
  BOARD_ROWS,
  BOARD_COLS,
  HEX_RADIUS,
  getHexCenter,
  getHexagonPoints,
} from '../utils/hexGeometry';

interface HexBoardProps {
  cells: CellData[];
  selectedCellId: string | null;
  onSelectCell: (cell: CellData) => void;
  godMode?: boolean;
  isDraggable?: boolean;
  onSwapCells?: (sourceId: string, targetId: string) => void;
}

export const HexBoard: React.FC<HexBoardProps> = ({
  cells,
  selectedCellId,
  onSelectCell,
  godMode = false,
  isDraggable = false,
  onSwapCells,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Dragging state for PLAY (出题) mode
  const [dragState, setDragState] = useState<{
    sourceCell: CellData;
    startClientX: number;
    startClientY: number;
    currentSvgX: number;
    currentSvgY: number;
    isDragging: boolean;
    targetCellId: string | null;
  } | null>(null);

  // Precompute pixel positions for all cells (Center 5x5 + Border Hexes + Corner Hexes)
  const cellPositions: Map<string, { cx: number; cy: number; cell: CellData }> = useMemo(() => {
    const posMap = new Map<string, { cx: number; cy: number; cell: CellData }>();

    // 1. Center Grid Cells
    for (const cell of cells) {
      if (cell.type === 'CENTER') {
        const { cx, cy } = getHexCenter(cell.row, cell.col);
        posMap.set(cell.id, { cx, cy, cell });
      }
    }

    // 2. Red Top Border Hexes (above row 0)
    for (let c = 0; c < BOARD_COLS; c++) {
      const id = `border-top-${c}`;
      const { cx, cy } = getHexCenter(-1, c);
      const cell: CellData = {
        id,
        row: -1,
        col: c,
        type: 'BORDER_TOP',
        word: '',
        pinyin: '',
        firstLetter: '',
        charCount: 0,
        code: '',
        rawCode: '',
        owner: 'RED',
        revealed: true,
        attempts: 0,
        isPartOfWinningPath: false,
      };
      posMap.set(id, { cx, cy, cell });
    }

    // 3. Red Bottom Border Hexes (below row 4)
    for (let c = 0; c < BOARD_COLS; c++) {
      const id = `border-bottom-${c}`;
      const { cx, cy } = getHexCenter(BOARD_ROWS, c);
      const cell: CellData = {
        id,
        row: BOARD_ROWS,
        col: c,
        type: 'BORDER_BOTTOM',
        word: '',
        pinyin: '',
        firstLetter: '',
        charCount: 0,
        code: '',
        rawCode: '',
        owner: 'RED',
        revealed: true,
        attempts: 0,
        isPartOfWinningPath: false,
      };
      posMap.set(id, { cx, cy, cell });
    }

    // 4. Green Left Border Hexes (left of col 0)
    for (let r = 0; r < BOARD_ROWS; r++) {
      const id = `border-left-${r}`;
      const { cx, cy } = getHexCenter(r, -1);
      const cell: CellData = {
        id,
        row: r,
        col: -1,
        type: 'BORDER_LEFT',
        word: '',
        pinyin: '',
        firstLetter: '',
        charCount: 0,
        code: '',
        rawCode: '',
        owner: 'GREEN',
        revealed: true,
        attempts: 0,
        isPartOfWinningPath: false,
      };
      posMap.set(id, { cx, cy, cell });
    }

    // 5. Green Right Border Hexes (right of col 4)
    for (let r = 0; r < BOARD_ROWS; r++) {
      const id = `border-right-${r}`;
      const { cx, cy } = getHexCenter(r, BOARD_COLS);
      const cell: CellData = {
        id,
        row: r,
        col: BOARD_COLS,
        type: 'BORDER_RIGHT',
        word: '',
        pinyin: '',
        firstLetter: '',
        charCount: 0,
        code: '',
        rawCode: '',
        owner: 'GREEN',
        revealed: true,
        attempts: 0,
        isPartOfWinningPath: false,
      };
      posMap.set(id, { cx, cy, cell });
    }

    // 6. Top-Left Red Corner Hex (at row -1, col -1)
    {
      const id = 'border-corner-top-left';
      const { cx, cy } = getHexCenter(-1, -1);
      const cell: CellData = {
        id,
        row: -1,
        col: -1,
        type: 'BORDER_TOP',
        word: '',
        pinyin: '',
        firstLetter: '',
        charCount: 0,
        code: '',
        rawCode: '',
        owner: 'RED',
        revealed: true,
        attempts: 0,
        isPartOfWinningPath: false,
      };
      posMap.set(id, { cx, cy, cell });
    }

    // 7. Bottom-Right Green Corner Hex (at row BOARD_ROWS, col BOARD_COLS)
    {
      const id = 'border-corner-bottom-right';
      const { cx, cy } = getHexCenter(BOARD_ROWS, BOARD_COLS);
      const cell: CellData = {
        id,
        row: BOARD_ROWS,
        col: BOARD_COLS,
        type: 'BORDER_RIGHT',
        word: '',
        pinyin: '',
        firstLetter: '',
        charCount: 0,
        code: '',
        rawCode: '',
        owner: 'GREEN',
        revealed: true,
        attempts: 0,
        isPartOfWinningPath: false,
      };
      posMap.set(id, { cx, cy, cell });
    }

    return posMap;
  }, [cells]);

  // Center cells list with coordinates for distance comparison during drag
  const centerCells = useMemo(() => {
    const list: { cx: number; cy: number; cell: CellData }[] = [];
    cellPositions.forEach((val) => {
      if (val.cell.type === 'CENTER') {
        list.push(val);
      }
    });
    return list;
  }, [cellPositions]);

  // Convert screen client coordinates to SVG viewBox coordinates
  const getSvgCoordinates = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const inverted = ctm.inverse();
      const transformed = pt.matrixTransform(inverted);
      return { x: transformed.x, y: transformed.y };
    }
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 920,
      y: ((clientY - rect.top) / rect.height) * 580,
    };
  }, []);

  // Pointer Down on Cell
  const handlePointerDown = (e: React.PointerEvent, cell: CellData) => {
    if (cell.type !== 'CENTER' || e.button !== 0) return;

    const coords = getSvgCoordinates(e.clientX, e.clientY);
    setDragState({
      sourceCell: cell,
      startClientX: e.clientX,
      startClientY: e.clientY,
      currentSvgX: coords.x,
      currentSvgY: coords.y,
      isDragging: false,
      targetCellId: null,
    });
  };

  // Global Pointer Move and Up listeners during active drag/press
  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - dragState.startClientX, e.clientY - dragState.startClientY);
      const isActualDrag = dist > 5 && isDraggable;
      const coords = getSvgCoordinates(e.clientX, e.clientY);

      // Find closest center cell in SVG space
      let closestId: string | null = null;
      let minD = Infinity;
      if (isActualDrag) {
        for (const cp of centerCells) {
          const d = Math.hypot(coords.x - cp.cx, coords.y - cp.cy);
          if (d < HEX_RADIUS * 1.15 && d < minD) {
            minD = d;
            closestId = cp.cell.id;
          }
        }
      }

      setDragState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentSvgX: coords.x,
          currentSvgY: coords.y,
          isDragging: isActualDrag,
          targetCellId: closestId !== prev.sourceCell.id ? closestId : null,
        };
      });
    };

    const handlePointerUp = () => {
      if (dragState.isDragging && dragState.targetCellId && dragState.targetCellId !== dragState.sourceCell.id) {
        onSwapCells?.(dragState.sourceCell.id, dragState.targetCellId);
      } else if (!dragState.isDragging) {
        onSelectCell(dragState.sourceCell);
      }
      setDragState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, centerCells, isDraggable, onSwapCells, onSelectCell, getSvgCoordinates]);

  // Selected cell coordinates for topmost overlay rendering
  const selectedPos = useMemo(() => {
    if (!selectedCellId) return null;
    return cellPositions.get(selectedCellId) || null;
  }, [selectedCellId, cellPositions]);

  return (
    <div id="hex-board-container" className="relative w-full flex flex-col items-center select-none">
      {/* Main SVG Board */}
      <div className="relative w-full max-w-full overflow-hidden flex justify-center py-1 px-1">
        <svg
          ref={svgRef}
          id="honeycomb-svg"
          viewBox="0 0 920 580"
          className="w-full h-auto max-h-[570px] touch-none max-w-[920px] drop-shadow-xs"
        >
          {/* Render All Hex Cells */}
          {Array.from(cellPositions.values()).map(({ cx, cy, cell }) => {
            const isSelected = selectedCellId === cell.id;
            const isDragSource = dragState?.isDragging && dragState.sourceCell.id === cell.id;
            const isDragTarget = dragState?.isDragging && dragState.targetCellId === cell.id;

            return (
              <HexCell
                key={cell.id}
                cell={cell}
                cx={cx}
                cy={cy}
                isSelected={isSelected}
                onClick={onSelectCell}
                godMode={godMode}
                isDraggable={isDraggable}
                isDragSource={isDragSource}
                isDragTarget={isDragTarget}
                onPointerDown={handlePointerDown}
              />
            );
          })}

          {/* Dedicated Top Layer for Selected Cell Outline */}
          {selectedPos && !dragState?.isDragging && (
            <g id="selected-cell-top-overlay" className="pointer-events-none">
              {/* Soft outer glow ring */}
              <polygon
                points={getHexagonPoints(selectedPos.cx, selectedPos.cy, HEX_RADIUS + 4)}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="5"
                opacity="0.35"
                strokeLinejoin="round"
              />
              {/* Sharp High-Contrast Inner Outline */}
              <polygon
                points={getHexagonPoints(selectedPos.cx, selectedPos.cy, HEX_RADIUS + 1.5)}
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="3.2"
                strokeLinejoin="round"
              />
            </g>
          )}

          {/* Floating Drag Ghost Tile following cursor in PLAY mode */}
          {dragState?.isDragging && (
            <g id="drag-ghost-tile" className="pointer-events-none" opacity="0.92">
              {/* Ghost shadow */}
              <polygon
                points={getHexagonPoints(dragState.currentSvgX + 4, dragState.currentSvgY + 6, HEX_RADIUS + 2)}
                fill="rgba(0,0,0,0.15)"
                stroke="none"
              />
              {/* Ghost hex */}
              <polygon
                points={getHexagonPoints(dragState.currentSvgX, dragState.currentSvgY, HEX_RADIUS)}
                fill="#faf5ff"
                stroke="#9333ea"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              {/* Ghost code & text */}
              <text
                x={dragState.currentSvgX}
                y={dragState.currentSvgY - 14}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#581c87"
                fontSize="13"
                fontWeight="900"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                {dragState.sourceCell.code}
              </text>
              <text
                x={dragState.currentSvgX}
                y={dragState.currentSvgY + 10}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#1e1b4b"
                fontSize="16"
                fontWeight="900"
                fontFamily='system-ui, -apple-system, "PingFang SC", sans-serif'
              >
                {dragState.sourceCell.word}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
