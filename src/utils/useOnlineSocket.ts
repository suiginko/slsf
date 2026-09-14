import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  OnlineRoomState,
  PlayerRole,
  SecretWordInfo,
} from '../types/online';

export function useOnlineSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomState, setRoomState] = useState<OnlineRoomState | null>(null);
  const [myRole, setMyRole] = useState<PlayerRole>('SPECTATOR');
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [secretWord, setSecretWord] = useState<SecretWordInfo | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  useEffect(() => {
    // 自动连接同源 Socket.IO 服务器
    const socket = io({
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setMyPlayerId(socket.id || '');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // 接收全局房间状态广播
    socket.on('online:room_state', (state: OnlineRoomState) => {
      setRoomState(state);
      // 更新自己的最新席位
      const me = state.players.find((p) => p.id === socket.id);
      if (me) {
        setMyRole(me.role);
      }
    });

    // 接收每秒权威倒计时更新
    socket.on('online:timer_tick', ({ remaining, total }: { remaining: number; total: number }) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          timerRemaining: remaining,
          timerTotal: total,
        };
      });
    });

    // 接收描述位专属秘密词语
    socket.on('online:secret_word_reveal', (secret: SecretWordInfo) => {
      setSecretWord(secret);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 1. 创建房间 (支持预设题库或 AI 定制题库)
  const createRoom = useCallback(
    (
      playerName: string,
      wordPackId: string,
      customWords?: { word: string; category?: string }[],
      customPackName?: string
    ) => {
      socketRef.current?.emit(
        'online:create_room',
        { playerName, wordPackId, customWords, customPackName },
        (res: { success: boolean; roomId?: string; role?: PlayerRole; error?: string }) => {
          if (res.success && res.role) {
            setMyRole(res.role);
            setSecretWord(null);
          } else if (res.error) {
            showToast(res.error);
          }
        }
      );
    },
    [showToast]
  );

  // 2. 加入房间
  const joinRoom = useCallback((roomId: string, playerName: string, preferredRole?: PlayerRole) => {
    socketRef.current?.emit(
      'online:join_room',
      { roomId, playerName, preferredRole },
      (res: { success: boolean; role?: PlayerRole; error?: string }) => {
        if (res.success && res.role) {
          setMyRole(res.role);
          setSecretWord(null);
        } else if (res.error) {
          showToast(res.error);
        }
      }
    );
  }, [showToast]);

  // 3. 选择/更换席位
  const selectRole = useCallback((role: PlayerRole) => {
    if (!roomState) return;
    socketRef.current?.emit(
      'online:select_role',
      { roomId: roomState.roomId, role },
      (res: { success: boolean; role?: PlayerRole; error?: string }) => {
        if (res.success && res.role) {
          setMyRole(res.role);
        } else if (res.error) {
          showToast(res.error);
        }
      }
    );
  }, [roomState, showToast]);

  // 4. 准备就绪
  const toggleReady = useCallback(() => {
    if (!roomState) return;
    socketRef.current?.emit('online:toggle_ready', { roomId: roomState.roomId });
  }, [roomState]);

  // 5. 选题（选格子）
  const selectCell = useCallback((cellId: string) => {
    if (!roomState) return;
    socketRef.current?.emit('online:select_cell', { roomId: roomState.roomId, cellId });
  }, [roomState]);

  // 6. 提交二字描述
  const submitClue = useCallback((clueText: string) => {
    if (!roomState) return;
    socketRef.current?.emit(
      'online:submit_clue',
      { roomId: roomState.roomId, clueText },
      (res: { success: boolean; error?: string }) => {
        if (res?.error) {
          showToast(res.error);
        }
      }
    );
  }, [roomState, showToast]);

  // 7. 抢答 / 防抢 (扣1)
  const pressBuzzer = useCallback(() => {
    if (!roomState) return;
    socketRef.current?.emit(
      'online:press_buzzer',
      { roomId: roomState.roomId },
      (res: { success: boolean; message?: string; error?: string }) => {
        if (res?.message) {
          showToast(res.message);
        } else if (res?.error) {
          showToast(res.error);
        }
      }
    );
  }, [roomState, showToast]);

  // 8. 提交猜词答案
  const submitGuess = useCallback((guessText: string) => {
    if (!roomState) return;
    socketRef.current?.emit(
      'online:submit_guess',
      { roomId: roomState.roomId, guessText },
      (res: { success: boolean; correct?: boolean; error?: string }) => {
        if (res?.error) {
          showToast(res.error);
        }
      }
    );
  }, [roomState, showToast]);

  // 强制开局 / 单人或人数未满时测试开局
  const forceStartGame = useCallback(() => {
    if (!roomState) return;
    socketRef.current?.emit('online:force_start', { roomId: roomState.roomId });
  }, [roomState]);

  // 离开房间
  const leaveRoom = useCallback(() => {
    setRoomState(null);
    setSecretWord(null);
  }, []);

  return {
    isConnected,
    roomState,
    myRole,
    myPlayerId,
    secretWord,
    toastMessage,
    createRoom,
    joinRoom,
    selectRole,
    toggleReady,
    forceStartGame,
    selectCell,
    submitClue,
    pressBuzzer,
    submitGuess,
    leaveRoom,
  };
}
