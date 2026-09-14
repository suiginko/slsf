export type Team = 'RED' | 'GREEN';

export type CellType =
  | 'CENTER'
  | 'BORDER_TOP'
  | 'BORDER_BOTTOM'
  | 'BORDER_LEFT'
  | 'BORDER_RIGHT';

export interface CellData {
  id: string;
  row: number;
  col: number;
  type: CellType;
  // Center playable cell specific properties
  word: string;
  pinyin: string;
  firstLetter: string;
  charCount: number;
  code: string; // e.g. "X3" or "X3a"
  rawCode: string; // e.g. "X3"
  category?: string;
  owner: Team | null; // null = white/neutral
  revealed: boolean;
  attempts: number;
  lastAttempt?: string;
  isPartOfWinningPath: boolean;
  centerIndex?: number; // 0..24
}

export type GameMode = 'PLAY' | 'HOST';

export interface WordItem {
  word: string;
  category?: string;
  pinyin?: string;
}

export interface WordPack {
  id: string;
  name: string;
  description: string;
  tags: string[];
  words: WordItem[];
  isCustom?: boolean;
}

export interface GameHistoryItem {
  id: string;
  timestamp: number;
  cellId: string;
  code: string;
  word: string;
  guess: string;
  team: Team;
  correct: boolean;
}

export type DuelActionType = 'RED_CLUE' | 'RED_GUESS' | 'GREEN_CLUE' | 'GREEN_GUESS';

export interface DuelActionItem {
  id: string;
  type: DuelActionType;
  text: string;
  isCorrect?: boolean;
  timestamp?: number;
}

export interface DuelRecord {
  id: string;
  timestamp: number;
  cellId: string;
  cellCode: string; // e.g. "X3"
  cellWord: string; // e.g. "向日葵"
  charCount: number;
  pinyin?: string;
  category?: string;
  actions: DuelActionItem[]; // Continuous stream of clue / guess operations for this cell
  resultOwner?: Team | null; // Captured team or null
}

export interface GameState {
  cells: CellData[];
  selectedCellId: string | null;
  currentTurn: Team;
  gameMode: GameMode;
  isGameOver: boolean;
  winner: Team | null;
  winningPath: string[]; // List of cell IDs
  timerSeconds: number;
  isTimerRunning: boolean;
  activeWordPackId: string;
  history: GameHistoryItem[];
  godMode: boolean; // Host can see all words
  soundEnabled: boolean;
  redScore: number;
  greenScore: number;
  redWinCount: number;
  greenWinCount: number;
}
