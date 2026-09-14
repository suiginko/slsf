import { Server, Socket } from 'socket.io';
import { Team, WordPack } from '../src/types';
import {
  PlayerRole,
  OnlineRoomState,
  OnlinePlayer,
  OnlineCellData,
  SecretWordInfo,
  OnlineClueLog,
} from '../src/types/online';
import { DEFAULT_WORD_PACKS } from '../src/data/defaultWordPacks';
import { processWordsWithUniqueCodes } from '../src/utils/pinyinUtils';
import { checkWinCondition, BOARD_ROWS, BOARD_COLS } from '../src/utils/hexGeometry';
import { checkAnswerMatch } from '../src/utils/pinyinUtils';

interface InternalRoom {
  state: OnlineRoomState;
  secretWords: Map<string, SecretWordInfo>; // 存储真实答案，绝不向猜词位泄露
  timerInterval: NodeJS.Timeout | null;
}

export class OnlineGameManager {
  private io: Server;
  private rooms: Map<string, InternalRoom> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  /**
   * 校验“双音节”二字描述：
   * 1. 严格恰好2个字符（中文汉字）
   * 2. 严禁漏字：不能包含目标词语中的任何汉字
   */
  public static validateClue(clue: string, targetWord: string): { valid: boolean; reason?: string } {
    const trimmed = clue.trim();
    if (trimmed.length !== 2) {
      return { valid: false, reason: '描述必须恰好为两个汉字！' };
    }
    // 检查是否全为中文（允许常用汉字）
    if (!/^[\u4e00-\u9fa5]{2}$/.test(trimmed)) {
      return { valid: false, reason: '描述必须为两个规范汉字！' };
    }
    // 严禁包含原词字符 (漏字违规)
    for (const char of targetWord) {
      if (trimmed.includes(char)) {
        return { valid: false, reason: `描述违规！包含了题目原词中的字【${char}】！` };
      }
    }
    return { valid: true };
  }

  public registerEvents(socket: Socket) {
    // 1. 创建房间
    socket.on('online:create_room', ({ playerName, wordPackId, customWords, customPackName }, callback) => {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const room = this.initRoom(roomId, wordPackId, customWords, customPackName);
      this.rooms.set(roomId, room);

      const player: OnlinePlayer = {
        id: socket.id,
        name: playerName || '房主',
        role: 'RED_DESC', // 默认分配给红方描述位
        isReady: true,
        isHost: true,
        connected: true,
      };
      room.state.players.push(player);

      socket.join(roomId);
      callback?.({ success: true, roomId, role: player.role });
      this.broadcastState(roomId);
    });

    // 2. 加入房间
    socket.on('online:join_room', ({ roomId, playerName, preferredRole }, callback) => {
      const room = this.rooms.get(roomId);
      if (!room) {
        return callback?.({ success: false, error: '房间不存在或已解散' });
      }

      // 检查席位是否被占用
      const occupiedRoles = new Set(room.state.players.map((p) => p.role));
      let assignedRole: PlayerRole = preferredRole || 'SPECTATOR';
      if (assignedRole !== 'SPECTATOR' && occupiedRoles.has(assignedRole)) {
        // 如果想选的角色被占，降级为观众席
        assignedRole = 'SPECTATOR';
      }

      const player: OnlinePlayer = {
        id: socket.id,
        name: playerName || `玩家-${socket.id.substring(0, 4)}`,
        role: assignedRole,
        isReady: false,
        isHost: room.state.players.length === 0,
        connected: true,
      };

      room.state.players.push(player);
      socket.join(roomId);

      callback?.({ success: true, roomId, role: assignedRole });
      this.broadcastState(roomId);
    });

    // 3. 选择/更换席位
    socket.on('online:select_role', ({ roomId, role }, callback) => {
      const room = this.rooms.get(roomId);
      if (!room) return;

      const player = room.state.players.find((p) => p.id === socket.id);
      if (!player) return;

      const isTestEnv = room.state.players.length < 4;
      if (room.state.phase !== 'LOBBY' && role !== 'SPECTATOR' && !isTestEnv) {
        return callback?.({ success: false, error: '对局已开始，不可更换对战席位' });
      }

      // 检查席位是否已被其他人占用
      const isTaken = room.state.players.some((p) => p.id !== socket.id && p.role === role && role !== 'SPECTATOR');
      if (isTaken) {
        return callback?.({ success: false, error: '该席位已被其他玩家占用' });
      }

      player.role = role;
      player.isReady = false; // 换席位后重置准备状态

      // 若在单人格子选中阶段换席位，同步下发当前题目答案
      if (room.state.selectedCellId) {
        const secret = room.secretWords.get(room.state.selectedCellId);
        if (secret && (isTestEnv || role === 'RED_DESC' || role === 'GREEN_DESC')) {
          socket.emit('online:secret_word_reveal', secret);
        }
      }

      callback?.({ success: true, role });
      this.broadcastState(roomId);
    });

    // 4. 准备就绪 / 取消准备
    socket.on('online:toggle_ready', ({ roomId }) => {
      const room = this.rooms.get(roomId);
      if (!room || room.state.phase !== 'LOBBY') return;

      const player = room.state.players.find((p) => p.id === socket.id);
      if (!player) return;

      player.isReady = !player.isReady;

      // 检查是否四位核心玩家（红描、红猜、绿描、绿猜）均已到齐并全部准备
      const coreRoles: PlayerRole[] = ['RED_DESC', 'RED_GUESS', 'GREEN_DESC', 'GREEN_GUESS'];
      const corePlayers = room.state.players.filter((p) => coreRoles.includes(p.role));
      const allFourPresent = coreRoles.every((r) => corePlayers.some((p) => p.role === r));
      const allFourReady = allFourPresent && corePlayers.every((p) => p.isReady);

      if (allFourReady) {
        // 开始游戏！
        this.startGame(roomId);
      } else {
        this.broadcastState(roomId);
      }
    });

    // 4.1 强制开局 / 单人或人数未满时快速开局测试
    socket.on('online:force_start', ({ roomId }) => {
      const room = this.rooms.get(roomId);
      if (!room || room.state.phase !== 'LOBBY') return;

      this.startGame(roomId);
      this.addLog(room, {
        type: 'SYSTEM',
        team: 'RED',
        authorRole: 'SPECTATOR',
        authorName: '系统裁判',
        text: '⚠️ 已启动【自由测试模式】：人数未满也可任意选题、作答与全流程测试！',
      });
    });

    // 5. 选题（选格子）
    socket.on('online:select_cell', ({ roomId, cellId }) => {
      const room = this.rooms.get(roomId);
      if (!room || room.state.phase !== 'SELECTING_CELL') return;

      const player = room.state.players.find((p) => p.id === socket.id);
      if (!player) return;

      const isTestEnv = room.state.players.length < 4;
      // 只有当前先手队的队员可选题；少于4人测试时允许任意玩家选格
      const isSelectingTeam =
        isTestEnv ||
        (room.state.selectingTeam === 'RED' && (player.role === 'RED_DESC' || player.role === 'RED_GUESS')) ||
        (room.state.selectingTeam === 'GREEN' && (player.role === 'GREEN_DESC' || player.role === 'GREEN_GUESS'));

      if (!isSelectingTeam) return;

      const cell = room.state.cells.find((c) => c.id === cellId);
      if (!cell || cell.owner !== null) return; // 必须是未占领的中心格子

      room.state.selectedCellId = cellId;
      room.state.phase = 'CLUE_INPUT';
      room.state.clueTeam = room.state.selectingTeam;
      room.state.isProtected = false;
      room.state.answeringTeam = null;
      room.state.currentClueText = '';

      // 向描述位（或测试模式下所有玩家）私密下发本题答案与拼音
      const secret = room.secretWords.get(cellId);
      if (secret) {
        this.sendSecretToDescribers(room, secret);
      }

      this.addLog(room, {
        type: 'SYSTEM',
        team: room.state.selectingTeam,
        authorRole: player.role,
        authorName: player.name,
        text: `选定了格子【${cell.code}】，等待【${room.state.clueTeam === 'RED' ? '红方' : '绿方'}描述位】给出二字描述`,
      });

      this.broadcastState(roomId);
    });

    // 6. 描述位提交二字描述
    socket.on('online:submit_clue', ({ roomId, clueText }, callback) => {
      const room = this.rooms.get(roomId);
      if (!room || room.state.phase !== 'CLUE_INPUT' || !room.state.selectedCellId) return;

      const player = room.state.players.find((p) => p.id === socket.id);
      if (!player) return;

      const isTestEnv = room.state.players.length < 4;
      // 验证是否为当前有权描述的描述位；测试模式允许直接描述
      const expectedRole: PlayerRole = room.state.clueTeam === 'RED' ? 'RED_DESC' : 'GREEN_DESC';
      if (!isTestEnv && player.role !== expectedRole) {
        return callback?.({ success: false, error: '当前不是你的描述轮次' });
      }

      const secret = room.secretWords.get(room.state.selectedCellId);
      if (!secret) return;

      // 自动裁判校验
      const check = OnlineGameManager.validateClue(clueText, secret.word);
      if (!check.valid) {
        return callback?.({ success: false, error: check.reason });
      }

      // 描述合法，开启正常 90 秒作答倒计时
      room.state.currentClueText = clueText.trim();
      room.state.phase = 'GUESSING_NORMAL';
      room.state.answeringTeam = room.state.clueTeam;
      room.state.isProtected = false;

      this.addLog(room, {
        type: 'CLUE',
        team: room.state.clueTeam,
        authorRole: player.role,
        authorName: player.name,
        text: `给出二字描述：【${room.state.currentClueText}】`,
      });

      callback?.({ success: true });
      this.startTimer(roomId, 90);
    });

    // 7. 抢答 / 防抢 (扣1)
    socket.on('online:press_buzzer', ({ roomId }, callback) => {
      const room = this.rooms.get(roomId);
      if (!room || !['GUESSING_NORMAL', 'GUESSING_BUZZED'].includes(room.state.phase) || !room.state.selectedCellId) {
        return;
      }

      const player = room.state.players.find((p) => p.id === socket.id);
      if (!player) return;

      const cell = room.state.cells.find((c) => c.id === room.state.selectedCellId);
      if (!cell) return;

      const isTestEnv = room.state.players.length < 4;
      const isCurrentGuesser =
        isTestEnv ||
        (room.state.answeringTeam === 'RED' && player.role === 'RED_GUESS') ||
        (room.state.answeringTeam === 'GREEN' && player.role === 'GREEN_GUESS');

      // 情形 A：当前作答方猜词位提前扣 1（防抢保护）
      if (isCurrentGuesser) {
        if (room.state.isProtected) {
          return callback?.({ success: false, error: '本方已处于防抢保护中' });
        }
        room.state.isProtected = true;
        room.state.phase = 'GUESSING_BUZZED';

        this.addLog(room, {
          type: 'BUZZER_DEFEND',
          team: room.state.answeringTeam!,
          authorRole: player.role,
          authorName: player.name,
          text: `扣 1 防抢成功！对方无法截胡，答题时间缩减为 20 秒`,
        });

        callback?.({ success: true, message: '防抢成功，20秒倒计时启动' });
        this.startTimer(roomId, 20);
        return;
      }

      // 情形 B：对手猜词位扣 1（截胡抢答）
      const opponentTeam: Team = room.state.answeringTeam === 'RED' ? 'GREEN' : 'RED';
      const isOpponentGuesser =
        isTestEnv ||
        (opponentTeam === 'RED' && player.role === 'RED_GUESS') ||
        (opponentTeam === 'GREEN' && player.role === 'GREEN_GUESS');

      if (!isOpponentGuesser) {
        return callback?.({ success: false, error: '只有双方猜词位可执行扣1操作' });
      }

      if (room.state.isProtected) {
        return callback?.({ success: false, error: '对方已提前扣1防抢，截胡失败！' });
      }

      // 检查抢答配额（红方按行，绿方按列）
      if (opponentTeam === 'RED') {
        const canBuzz = room.state.buzzerQuotas.redRowQuotas[cell.row];
        if (!canBuzz) {
          return callback?.({ success: false, error: `红方第 ${cell.row + 1} 行的抢答机会已消耗！` });
        }
        room.state.buzzerQuotas.redRowQuotas[cell.row] = false;
      } else {
        const canBuzz = room.state.buzzerQuotas.greenColQuotas[cell.col];
        if (!canBuzz) {
          return callback?.({ success: false, error: `绿方第 ${cell.col + 1} 列的抢答机会已消耗！` });
        }
        room.state.buzzerQuotas.greenColQuotas[cell.col] = false;
      }

      // 截胡抢答成功！答题权转移给对手，时间重设为 20 秒
      room.state.answeringTeam = opponentTeam;
      room.state.phase = 'GUESSING_BUZZED';

      this.addLog(room, {
        type: 'BUZZER_HIJACK',
        team: opponentTeam,
        authorRole: player.role,
        authorName: player.name,
        text: `【抢答成功！】消耗对应机会，获得 20 秒作答时间！`,
      });

      callback?.({ success: true, message: '抢答成功！请在20秒内作答' });
      this.startTimer(roomId, 20);
    });

    // 8. 猜词位提交答案
    socket.on('online:submit_guess', ({ roomId, guessText }, callback) => {
      const room = this.rooms.get(roomId);
      if (!room || !['GUESSING_NORMAL', 'GUESSING_BUZZED'].includes(room.state.phase) || !room.state.selectedCellId) {
        return;
      }

      const player = room.state.players.find((p) => p.id === socket.id);
      if (!player) return;

      const isTestEnv = room.state.players.length < 4;
      // 验证当前是否为该猜词位作答
      const expectedRole: PlayerRole = room.state.answeringTeam === 'RED' ? 'RED_GUESS' : 'GREEN_GUESS';
      if (!isTestEnv && player.role !== expectedRole) {
        return callback?.({ success: false, error: '当前不是你的答题时机' });
      }

      const secret = room.secretWords.get(room.state.selectedCellId);
      if (!secret) return;

      const cleanGuess = guessText.trim();
      const isCorrect = checkAnswerMatch(cleanGuess, secret.word);

      this.addLog(room, {
        type: 'GUESS',
        team: room.state.answeringTeam!,
        authorRole: player.role,
        authorName: player.name,
        text: `猜词【${cleanGuess}】 -> ${isCorrect ? '✅ 答对！' : '❌ 答错！'}`,
        isCorrect,
      });

      if (isCorrect) {
        // 答对：占领格子
        this.resolveCellWin(roomId, room.state.answeringTeam!);
        callback?.({ success: true, correct: true });
      } else {
        // 答错：轮换
        this.handleWrongGuessOrTimeout(roomId, 'WRONG_ANSWER');
        callback?.({ success: true, correct: false });
      }
    });

    // 9. 离开与断开连接
    socket.on('disconnect', () => {
      for (const [roomId, room] of this.rooms.entries()) {
        const player = room.state.players.find((p) => p.id === socket.id);
        if (player) {
          player.connected = false;
          this.broadcastState(roomId);
          break;
        }
      }
    });
  }

  private initRoom(
    roomId: string,
    packId?: string,
    customWords?: { word: string; category?: string }[],
    customPackName?: string
  ): InternalRoom {
    let packName = '精选词库';
    let selectedWords: { word: string; category?: string }[] = [];

    if (Array.isArray(customWords) && customWords.length >= 25) {
      selectedWords = customWords.slice(0, 25);
      packName = customPackName || 'AI专属定制题库';
    } else {
      const pack = DEFAULT_WORD_PACKS.find((p) => p.id === packId) || DEFAULT_WORD_PACKS[0];
      selectedWords = pack.words.slice(0, 25);
      while (selectedWords.length < 25) {
        selectedWords.push(pack.words[selectedWords.length % pack.words.length]);
      }
      packName = pack.name;
    }

    const processed = processWordsWithUniqueCodes(selectedWords);
    const cells: OnlineCellData[] = [];
    const secretWords = new Map<string, SecretWordInfo>();

    let idx = 0;
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const item = processed[idx];
        const cellId = `cell-${r}-${c}`;
        cells.push({
          id: cellId,
          row: r,
          col: c,
          code: item.code,
          rawCode: item.rawCode,
          charCount: item.charCount,
          firstLetter: item.firstLetter,
          category: item.category,
          owner: null,
          revealed: false,
        });

        secretWords.set(cellId, {
          cellId,
          word: item.word,
          pinyin: item.pinyin,
          code: item.code,
          charCount: item.charCount,
          category: item.category,
        });
        idx++;
      }
    }

    const state: OnlineRoomState = {
      roomId,
      phase: 'LOBBY',
      players: [],
      cells,
      selectedCellId: null,
      selectingTeam: 'RED',
      clueTeam: 'RED',
      answeringTeam: null,
      isProtected: false,
      timerRemaining: 0,
      timerTotal: 0,
      buzzerQuotas: {
        redRowQuotas: [true, true, true, true, true],
        greenColQuotas: [true, true, true, true, true],
      },
      logs: [],
      winner: null,
      winningPath: [],
      wordPackName: packName,
      roundCount: 1,
    };

    return {
      state,
      secretWords,
      timerInterval: null,
    };
  }

  private startGame(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.state.phase = 'SELECTING_CELL';
    room.state.selectingTeam = 'RED'; // 红方先手选题
    this.addLog(room, {
      type: 'SYSTEM',
      team: 'RED',
      authorRole: 'RED_DESC',
      authorName: '系统裁判',
      text: '对局正式开始！红方先手选题。',
    });

    this.broadcastState(roomId);
  }

  private startTimer(roomId: string, seconds: number) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.timerInterval) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
    }

    room.state.timerRemaining = seconds;
    room.state.timerTotal = seconds;
    this.broadcastState(roomId);

    room.timerInterval = setInterval(() => {
      if (room.state.timerRemaining > 0) {
        room.state.timerRemaining--;
        // 每秒广播时间更新
        this.io.to(roomId).emit('online:timer_tick', {
          remaining: room.state.timerRemaining,
          total: room.state.timerTotal,
        });
      } else {
        if (room.timerInterval) {
          clearInterval(room.timerInterval);
          room.timerInterval = null;
        }
        // 倒计时结束，处理超时逻辑
        this.handleTimeout(roomId);
      }
    }, 1000);
  }

  private handleTimeout(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    this.addLog(room, {
      type: 'TIMEOUT',
      team: room.state.answeringTeam || room.state.clueTeam,
      authorRole: 'SPECTATOR',
      authorName: '系统裁判',
      text: `作答时间已耗尽！`,
    });

    this.handleWrongGuessOrTimeout(roomId, 'TIMEOUT');
  }

  private handleWrongGuessOrTimeout(roomId: string, reason: 'WRONG_ANSWER' | 'TIMEOUT') {
    const room = this.rooms.get(roomId);
    if (!room || !room.state.selectedCellId) return;

    if (room.timerInterval) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
    }

    // 规则：若答错，交换到对方进行描述；若抢答方打错，下一个描述仍由对方给出
    const opponentTeam: Team = room.state.clueTeam === 'RED' ? 'GREEN' : 'RED';
    room.state.clueTeam = opponentTeam;
    room.state.phase = 'CLUE_INPUT';
    room.state.answeringTeam = null;
    room.state.isProtected = false;
    room.state.currentClueText = '';

    this.addLog(room, {
      type: 'SYSTEM',
      team: room.state.clueTeam,
      authorRole: 'SPECTATOR',
      authorName: '系统裁判',
      text: `交换描述权，由【${room.state.clueTeam === 'RED' ? '红方' : '绿方'}描述位】给出下一个二字描述`,
    });

    this.broadcastState(roomId);
  }

  private resolveCellWin(roomId: string, winningTeam: Team) {
    const room = this.rooms.get(roomId);
    if (!room || !room.state.selectedCellId) return;

    if (room.timerInterval) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
    }

    const secret = room.secretWords.get(room.state.selectedCellId);
    const cell = room.state.cells.find((c) => c.id === room.state.selectedCellId);
    if (cell && secret) {
      cell.owner = winningTeam;
      cell.revealed = true;
      cell.word = secret.word;
      cell.pinyin = secret.pinyin;
    }

    this.addLog(room, {
      type: 'SYSTEM',
      team: winningTeam,
      authorRole: 'SPECTATOR',
      authorName: '系统裁判',
      text: `【${winningTeam === 'RED' ? '红方' : '绿方'}】成功占领格子【${cell?.code}】（答案：${secret?.word}）！`,
    });

    // 拓扑胜负检测
    // 构建 CellData 映射以复用 checkWinCondition
    const winResult = checkWinCondition(
      room.state.cells.map((c) => ({
        ...c,
        type: 'CENTER',
        word: c.word || '',
        pinyin: c.pinyin || '',
        attempts: 0,
        isPartOfWinningPath: false,
      }))
    );

    if (winResult.isWon && winResult.winner) {
      room.state.phase = 'GAME_OVER';
      room.state.winner = winResult.winner;
      room.state.winningPath = winResult.winningPath;

      this.addLog(room, {
        type: 'SYSTEM',
        team: winResult.winner,
        authorRole: 'SPECTATOR',
        authorName: '系统裁判',
        text: `🏆 恭喜【${winResult.winner === 'RED' ? '红方' : '绿方'}】达成连通，取得本场最终胜利！`,
      });
    } else {
      // 答对一方获得继续选题权
      room.state.phase = 'SELECTING_CELL';
      room.state.selectingTeam = winningTeam;
      room.state.selectedCellId = null;
      room.state.roundCount++;

      this.addLog(room, {
        type: 'SYSTEM',
        team: winningTeam,
        authorRole: 'SPECTATOR',
        authorName: '系统裁判',
        text: `由胜方【${winningTeam === 'RED' ? '红方' : '绿方'}】继续选择下一个格子`,
      });
    }

    this.broadcastState(roomId);
  }

  private sendSecretToDescribers(room: InternalRoom, secret: SecretWordInfo) {
    const isTestEnv = room.state.players.length < 4;
    const descRoles: PlayerRole[] = ['RED_DESC', 'GREEN_DESC'];
    const targetPlayers = isTestEnv
      ? room.state.players
      : room.state.players.filter((p) => descRoles.includes(p.role));

    for (const dp of targetPlayers) {
      this.io.to(dp.id).emit('online:secret_word_reveal', secret);
    }
  }

  private addLog(room: InternalRoom, log: Omit<OnlineClueLog, 'id' | 'timestamp'>) {
    room.state.logs.push({
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
    });
  }

  private broadcastState(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    this.io.to(roomId).emit('online:room_state', room.state);
  }
}
