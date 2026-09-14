import { CellData, Team } from '../types';

export const BOARD_ROWS = 5;
export const BOARD_COLS = 5;

// Hexagon SVG geometry constants
export const HEX_RADIUS = 52; // Enlarged radius of circumcircle for bigger board
export const HEX_WIDTH = Math.sqrt(3) * HEX_RADIUS; // ~90.06
export const HEX_HEIGHT = 2 * HEX_RADIUS; // 104
export const HEX_DY = 1.5 * HEX_RADIUS; // Vertical pitch 78
export const HEX_DX = HEX_WIDTH; // Horizontal pitch

/**
 * Calculates SVG polygon points for a regular pointy-topped hexagon centered at (cx, cy)
 */
export function getHexagonPoints(cx: number, cy: number, radius = HEX_RADIUS): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    // Pointy-topped hex angles: 30, 90, 150, 210, 270, 330 degrees
    const angleRad = (Math.PI / 180) * (60 * i - 30);
    const x = cx + radius * Math.cos(angleRad);
    const y = cy + radius * Math.sin(angleRad);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(' ');
}

/**
 * Computes center (cx, cy) on SVG canvas for coordinate (r, c)
 * Slanted from Top-Right (Row 0 on right) to Bottom-Left (Row 4 on left)
 */
export function getHexCenter(
  r: number,
  c: number,
  originX = 185,
  originY = 135,
  radius = HEX_RADIUS
): { cx: number; cy: number } {
  const dx = Math.sqrt(3) * radius;
  const dy = 1.5 * radius;
  // (BOARD_ROWS - 1 - r) * (dx / 2) shifts row 0 rightward, row 4 leftward
  const cx = originX + c * dx + (BOARD_ROWS - 1 - r) * (dx / 2);
  const cy = originY + r * dy;
  return { cx, cy };
}

/**
 * Returns neighbor cell IDs for a given center grid cell (r, c)
 * in top-right to bottom-left skewed coordinate space
 */
export function getCenterNeighbors(r: number, c: number): string[] {
  const neighbors: { r: number; c: number }[] = [
    { r: r, c: c - 1 },     // W
    { r: r, c: c + 1 },     // E
    { r: r - 1, c: c - 1 }, // NW
    { r: r - 1, c: c },     // NE
    { r: r + 1, c: c },     // SW
    { r: r + 1, c: c + 1 }, // SE
  ];

  return neighbors
    .filter((n) => n.r >= 0 && n.r < BOARD_ROWS && n.c >= 0 && n.c < BOARD_COLS)
    .map((n) => `cell-${n.r}-${n.c}`);
}

/**
 * Checks for a win condition using Breadth-First Search (BFS).
 * - Red wins: Connected chain of Red-owned cells from Row 0 to Row 4 (Vertical)
 * - Green wins: Connected chain of Green-owned cells from Col 0 to Col 4 (Horizontal)
 */
export function checkWinCondition(cells: CellData[]): {
  isWon: boolean;
  winner: Team | null;
  winningPath: string[];
} {
  const cellMap = new Map<string, CellData>();
  for (const cell of cells) {
    if (cell.type === 'CENTER') {
      cellMap.set(cell.id, cell);
    }
  }

  // 1. Check RED victory (Vertical: Row 0 -> Row 4)
  const redStarts = cells.filter(
    (c) => c.type === 'CENTER' && c.row === 0 && c.owner === 'RED'
  );

  for (const start of redStarts) {
    const queue: { id: string; path: string[] }[] = [
      { id: start.id, path: [start.id] },
    ];
    const visited = new Set<string>([start.id]);

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;
      const cell = cellMap.get(id);
      if (!cell) continue;

      // Reached bottom row (row 4)
      if (cell.row === BOARD_ROWS - 1) {
        // Find best matching top and bottom border IDs for visual flare
        const topBorderId = `top-${cell.col}`;
        const bottomBorderId = `bottom-${cell.col}`;
        return {
          isWon: true,
          winner: 'RED',
          winningPath: [topBorderId, ...path, bottomBorderId],
        };
      }

      const neighborIds = getCenterNeighbors(cell.row, cell.col);
      for (const nId of neighborIds) {
        if (!visited.has(nId)) {
          const nCell = cellMap.get(nId);
          if (nCell && nCell.owner === 'RED') {
            visited.add(nId);
            queue.push({ id: nId, path: [...path, nId] });
          }
        }
      }
    }
  }

  // 2. Check GREEN victory (Horizontal: Col 0 -> Col 4)
  const greenStarts = cells.filter(
    (c) => c.type === 'CENTER' && c.col === 0 && c.owner === 'GREEN'
  );

  for (const start of greenStarts) {
    const queue: { id: string; path: string[] }[] = [
      { id: start.id, path: [start.id] },
    ];
    const visited = new Set<string>([start.id]);

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;
      const cell = cellMap.get(id);
      if (!cell) continue;

      // Reached rightmost column (col 4)
      if (cell.col === BOARD_COLS - 1) {
        const leftBorderId = `left-${cell.row}`;
        const rightBorderId = `right-${cell.row}`;
        return {
          isWon: true,
          winner: 'GREEN',
          winningPath: [leftBorderId, ...path, rightBorderId],
        };
      }

      const neighborIds = getCenterNeighbors(cell.row, cell.col);
      for (const nId of neighborIds) {
        if (!visited.has(nId)) {
          const nCell = cellMap.get(nId);
          if (nCell && nCell.owner === 'GREEN') {
            visited.add(nId);
            queue.push({ id: nId, path: [...path, nId] });
          }
        }
      }
    }
  }

  return { isWon: false, winner: null, winningPath: [] };
}

/**
 * Calculates shortest remaining hexes needed for Red and Green to win.
 */
export function calculateRemainingDistance(cells: CellData[]): {
  redDistance: number;
  greenDistance: number;
} {
  const cellMap = new Map<string, CellData>();
  for (const cell of cells) {
    if (cell.type === 'CENTER') {
      cellMap.set(cell.id, cell);
    }
  }

  // Red: minimum uncaptured/neutral steps needed from row 0 to row 4
  // Cost: 0 if owned by RED, 1 if neutral (owner === null), Infinity if owned by opponent (GREEN)
  function getRedDist(): number {
    const distMap = new Map<string, number>();
    const pq: { id: string; dist: number }[] = [];

    for (let c = 0; c < BOARD_COLS; c++) {
      const cell = cellMap.get(`cell-0-${c}`);
      if (cell && cell.owner !== 'GREEN') {
        const cost = cell.owner === 'RED' ? 0 : 1;
        distMap.set(cell.id, cost);
        pq.push({ id: cell.id, dist: cost });
      }
    }

    pq.sort((a, b) => a.dist - b.dist);

    while (pq.length > 0) {
      pq.sort((a, b) => a.dist - b.dist);
      const { id, dist } = pq.shift()!;
      const current = cellMap.get(id);
      if (!current) continue;
      if (current.row === BOARD_ROWS - 1) return dist;

      for (const nId of getCenterNeighbors(current.row, current.col)) {
        const nCell = cellMap.get(nId);
        if (nCell && nCell.owner !== 'GREEN') {
          const stepCost = nCell.owner === 'RED' ? 0 : 1;
          const newDist = dist + stepCost;
          if (!distMap.has(nId) || newDist < distMap.get(nId)!) {
            distMap.set(nId, newDist);
            pq.push({ id: nId, dist: newDist });
          }
        }
      }
    }
    return 99; // Blocked
  }

  // Green: minimum uncaptured/neutral steps needed from col 0 to col 4
  function getGreenDist(): number {
    const distMap = new Map<string, number>();
    const pq: { id: string; dist: number }[] = [];

    for (let r = 0; r < BOARD_ROWS; r++) {
      const cell = cellMap.get(`cell-${r}-0`);
      if (cell && cell.owner !== 'RED') {
        const cost = cell.owner === 'GREEN' ? 0 : 1;
        distMap.set(cell.id, cost);
        pq.push({ id: cell.id, dist: cost });
      }
    }

    pq.sort((a, b) => a.dist - b.dist);

    while (pq.length > 0) {
      pq.sort((a, b) => a.dist - b.dist);
      const { id, dist } = pq.shift()!;
      const current = cellMap.get(id);
      if (!current) continue;
      if (current.col === BOARD_COLS - 1) return dist;

      for (const nId of getCenterNeighbors(current.row, current.col)) {
        const nCell = cellMap.get(nId);
        if (nCell && nCell.owner !== 'RED') {
          const stepCost = nCell.owner === 'GREEN' ? 0 : 1;
          const newDist = dist + stepCost;
          if (!distMap.has(nId) || newDist < distMap.get(nId)!) {
            distMap.set(nId, newDist);
            pq.push({ id: nId, dist: newDist });
          }
        }
      }
    }
    return 99; // Blocked
  }

  return {
    redDistance: getRedDist(),
    greenDistance: getGreenDist(),
  };
}
