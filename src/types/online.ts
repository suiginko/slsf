import { Team } from '../types';

export type PlayerRole = 'RED_DESC' | 'RED_GUESS' | 'GREEN_DESC' | 'GREEN_GUESS' | 'SPECTATOR';

export type OnlinePhase =
  | 'LOBBY'            // 等待玩家就绪
  | 'SELECTING_CELL'   // 当前先手队选题
  | 'CLUE_INPUT'       // 等待描述位输入二字线索
  | 'GUESSING_NORMAL'  // 正常90秒答题阶段
  | 'GUESSING_BUZZED'  // 触发扣1抢答或防抢，20秒答题阶段
  | 'ROUND_RESOLVED'   // 题目揭晓结算阶段
  | 'GAME_OVER';       // 一方达成连通，游戏结束

export interface OnlinePlayer {
  id: string;
  name: string;
  role: PlayerRole;
  isReady: boolean;
  isHost: boolean;
  connected: boolean;
}

export interface BuzzerQuotas {
  redRowQuotas: [boolean, boolean, boolean, boolean, boolean];   // 红方5行，true可用，false已消耗
  greenColQuotas: [boolean, boolean, boolean, boolean, boolean]; // 绿方5列，true可用，false已消耗
}

export interface OnlineCellData {
  id: string;
  row: number;
  col: number;
  code: string;
  rawCode: string;
  charCount: number;
  firstLetter: string;
  category?: string;
  owner: Team | null;
  revealed: boolean;
  word?: string;   // 仅当 revealed===true 或属于双方描述位私密推流时存在
  pinyin?: string; // 同上
}

export interface OnlineClueLog {
  id: string;
  timestamp: number;
  type: 'CLUE' | 'GUESS' | 'BUZZER_DEFEND' | 'BUZZER_HIJACK' | 'TIMEOUT' | 'SYSTEM';
  team: Team;
  authorRole: PlayerRole;
  authorName: string;
  text: string;
  isCorrect?: boolean;
}

export interface SecretWordInfo {
  cellId: string;
  word: string;
  pinyin: string;
  code: string;
  charCount: number;
  category?: string;
}

export interface OnlineRoomState {
  roomId: string;
  phase: OnlinePhase;
  players: OnlinePlayer[];
  cells: OnlineCellData[];
  selectedCellId: string | null;
  selectingTeam: Team;       // 当前拥有选格权的一方
  clueTeam: Team;            // 当前拥有描述权的一方
  answeringTeam: Team | null;// 当前正在作答的一方 (RED 或 GREEN)
  isProtected: boolean;      // 答题方是否已提前扣1防抢
  timerRemaining: number;    // 剩余秒数 (90s 或 20s)
  timerTotal: number;        // 总秒数
  buzzerQuotas: BuzzerQuotas;
  logs: OnlineClueLog[];
  winner: Team | null;
  winningPath: string[];
  wordPackName: string;
  currentClueText?: string;  // 当前轮次的二字描述
  roundCount: number;
}
