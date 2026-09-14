import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CellData, GameMode, Team, WordPack, DuelRecord, DuelActionItem } from './types';
import { DEFAULT_WORD_PACKS } from './data/defaultWordPacks';
import { processWordsWithUniqueCodes, generateRawCode, getFullPinyin } from './utils/pinyinUtils';
import { checkWinCondition, BOARD_ROWS, BOARD_COLS } from './utils/hexGeometry';
import { HexBoard } from './components/HexBoard';
import { Navbar } from './components/Navbar';
import { WordPackManager } from './components/WordPackManager';
import { RuleGuideModal } from './components/RuleGuideModal';
import { EditCellModal } from './components/EditCellModal';
import { HostDuelPanel } from './components/HostDuelPanel';
import { DuelRecordsTable } from './components/DuelRecordsTable';
import { ShareScreenshotModal } from './components/ShareScreenshotModal';
import { OnlineBattleStage } from './components/online/OnlineBattleStage';
import { OnlineLobbyModal } from './components/online/OnlineLobbyModal';
import { useOnlineSocket } from './utils/useOnlineSocket';
import { PenTool, Camera } from 'lucide-react';

const DUEL_RECORDS_STORAGE_KEY = 'suilan_duel_records_v1';

export default function App() {
  // Game Setup & Mode: PLAY (出题模式) vs HOST (主持模式)
  const [activeWordPack, setActiveWordPack] = useState<WordPack>(DEFAULT_WORD_PACKS[0]);
  const [gameMode, setGameMode] = useState<GameMode>('HOST');

  // Modals & visibility state
  const [showWordPackModal, setShowWordPackModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showOnlineLobby, setShowOnlineLobby] = useState(false);
  const [godMode, setGodMode] = useState(true); // Default visible for host convenience, toggleable at any time
  const [editingCell, setEditingCell] = useState<CellData | null>(null);

  // Online Multiplayer Socket Hook
  const {
    isConnected: isOnlineConnected,
    roomState,
    myRole,
    myPlayerId,
    secretWord,
    toastMessage,
    createRoom,
    joinRoom,
    selectRole,
    toggleReady,
    selectCell: onlineSelectCell,
    submitClue: onlineSubmitClue,
    pressBuzzer: onlinePressBuzzer,
    submitGuess: onlineSubmitGuess,
    leaveRoom: onlineLeaveRoom,
  } = useOnlineSocket();

  // Match State
  const [cells, setCells] = useState<CellData[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string | null>('cell-2-2');
  const [winner, setWinner] = useState<Team | null>(null);

  // Duel Records for Host Table with automatic legacy data migration
  const [duelRecords, setDuelRecords] = useState<DuelRecord[]>(() => {
    try {
      const saved = localStorage.getItem(DUEL_RECORDS_STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];

      // Normalize any legacy format records to ensure .actions array always exists
      return parsed.map((r: any): DuelRecord => {
        if (Array.isArray(r.actions)) {
          return r as DuelRecord;
        }
        const actions: DuelActionItem[] = [];
        const baseId = r.id || `${Date.now()}`;
        if (r.redClue) {
          actions.push({ id: `act-${baseId}-rc`, type: 'RED_CLUE', text: r.redClue });
        }
        if (r.redGuess) {
          actions.push({ id: `act-${baseId}-rg`, type: 'RED_GUESS', text: r.redGuess });
        }
        if (r.greenClue) {
          actions.push({ id: `act-${baseId}-gc`, type: 'GREEN_CLUE', text: r.greenClue });
        }
        if (r.greenGuess) {
          actions.push({ id: `act-${baseId}-gg`, type: 'GREEN_GUESS', text: r.greenGuess });
        }
        return {
          id: r.id || `duel-${Date.now()}`,
          timestamp: r.timestamp || Date.now(),
          cellId: r.cellId || '',
          cellCode: r.cellCode || '',
          cellWord: r.cellWord || '',
          charCount: r.charCount || 0,
          pinyin: r.pinyin,
          category: r.category,
          actions,
          resultOwner: r.resultOwner,
        };
      });
    } catch {
      return [];
    }
  });

  // Sync duel records to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(DUEL_RECORDS_STORAGE_KEY, JSON.stringify(duelRecords));
    } catch (e) {
      console.error('Failed to save duel records to localStorage', e);
    }
  }, [duelRecords]);

  // Initialize or Reset the 25 Center Grid with words
  const initBoard = useCallback(
    (pack: WordPack) => {
      // Pick 25 words from the pack (or repeat if less)
      const selectedWords = pack.words.slice(0, 25);
      while (selectedWords.length < 25) {
        selectedWords.push(pack.words[selectedWords.length % pack.words.length]);
      }

      // Generate unique differentiated codes (e.g. X3, X3a, X3b)
      const processed = processWordsWithUniqueCodes(selectedWords);

      const newCells: CellData[] = [];
      let idx = 0;
      for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
          const item = processed[idx];
          newCells.push({
            id: `cell-${r}-${c}`,
            row: r,
            col: c,
            type: 'CENTER',
            word: item.word,
            pinyin: item.pinyin,
            firstLetter: item.firstLetter,
            charCount: item.charCount,
            code: item.code,
            rawCode: item.rawCode,
            category: item.category,
            owner: null,
            revealed: false,
            attempts: 0,
            isPartOfWinningPath: false,
            centerIndex: idx,
          });
          idx++;
        }
      }

      setCells(newCells);
      setSelectedCellId('cell-2-2'); // default to center tile
      setWinner(null);
      setDuelRecords([]); // Clear records on board reset
      try {
        localStorage.removeItem(DUEL_RECORDS_STORAGE_KEY);
      } catch {}
    },
    []
  );

  // Initial load
  useEffect(() => {
    initBoard(activeWordPack);
  }, [activeWordPack, initBoard]);

  // Check victory helper
  const evaluateVictory = useCallback((updatedCells: CellData[]) => {
    const winResult = checkWinCondition(updatedCells);
    if (winResult.isWon && winResult.winner) {
      setWinner(winResult.winner);
      return true;
    } else {
      setWinner(null);
      return false;
    }
  }, []);

  // Shuffle words across the 25 center grid
  const handleShuffleWords = () => {
    const centerCells = cells.filter((c) => c.type === 'CENTER');
    if (centerCells.length === 0) return;

    // Collect all words from center cells
    const wordsList = centerCells.map((c) => ({
      word: c.word,
      category: c.category,
    }));

    // Fisher-Yates shuffle
    for (let i = wordsList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [wordsList[i], wordsList[j]] = [wordsList[j], wordsList[i]];
    }

    // Re-process unique codes for the shuffled order
    const processed = processWordsWithUniqueCodes(wordsList);

    const updatedCells = cells.map((cell) => {
      if (cell.type !== 'CENTER' || cell.centerIndex === undefined) return cell;
      const item = processed[cell.centerIndex];
      return {
        ...cell,
        word: item.word,
        pinyin: item.pinyin,
        firstLetter: item.firstLetter,
        charCount: item.charCount,
        code: item.code,
        rawCode: item.rawCode,
        category: item.category,
        owner: null, // Reset capture state on shuffle
        revealed: false,
        attempts: 0,
        isPartOfWinningPath: false,
      };
    });

    setCells(updatedCells);
    setWinner(null);
    setDuelRecords([]);
    try {
      localStorage.removeItem(DUEL_RECORDS_STORAGE_KEY);
    } catch {}
  };

  // Edit single cell word and code (出题模式)
  const handleSaveCellEdit = (cellId: string, newWord: string, newCode?: string) => {
    const cleanWord = newWord.trim();
    const { firstLetter, charCount, rawCode } = generateRawCode(cleanWord);
    const pinyin = getFullPinyin(cleanWord);
    const finalCode = newCode && newCode.trim().length > 0 ? newCode.trim().toUpperCase() : rawCode;

    setCells((prev) =>
      prev.map((c) =>
        c.id === cellId
          ? {
              ...c,
              word: cleanWord,
              pinyin,
              firstLetter,
              charCount,
              rawCode,
              code: finalCode,
            }
          : c
      )
    );
  };

  // Selected cell object
  const selectedCell = useMemo(() => {
    return cells.find((c) => c.id === selectedCellId) || null;
  }, [cells, selectedCellId]);

  // Handle cell selection / click
  // In HOST mode: clicking ONLY selects the cell. Does NOT cycle ownership.
  // In PLAY mode: clicking opens single-cell edit modal.
  const handleSelectCell = (cell: CellData) => {
    if (cell.type !== 'CENTER') return;
    setSelectedCellId(cell.id);

    if (gameMode === 'PLAY') {
      setEditingCell(cell);
    }
  };

  // Quick direct state change from host panel
  const handleSetCellOwner = (cellId: string, owner: Team | null) => {
    const updatedCells = cells.map((c) =>
      c.id === cellId
        ? {
            ...c,
            owner,
            revealed: owner !== null,
          }
        : c
    );
    setCells(updatedCells);
    evaluateVictory(updatedCells);
  };

  // Submit a duel record from Host Panel (merges into existing cell row or creates new)
  const handleSubmitDuelRecord = (recordData: Omit<DuelRecord, 'id' | 'timestamp'>) => {
    setDuelRecords((prev) => {
      const existingIdx = prev.findIndex((r) => r.cellId === recordData.cellId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        const existing = updated[existingIdx];
        updated[existingIdx] = {
          ...existing,
          cellCode: recordData.cellCode,
          cellWord: recordData.cellWord,
          charCount: recordData.charCount,
          pinyin: recordData.pinyin,
          category: recordData.category,
          resultOwner: recordData.resultOwner,
          actions: [...(existing.actions || []), ...(recordData.actions || [])],
        };
        return updated;
      } else {
        const newRecord: DuelRecord = {
          ...recordData,
          id: `duel-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          timestamp: Date.now(),
        };
        return [newRecord, ...prev];
      }
    });
  };

  // Delete an individual action chip inside a cell record
  const handleDeleteAction = (cellId: string, actionId: string) => {
    setDuelRecords((prev) =>
      prev
        .map((r) => {
          if (r.cellId === cellId) {
            return {
              ...r,
              actions: (r.actions || []).filter((a) => a.id !== actionId),
            };
          }
          return r;
        })
        .filter((r) => (r.actions || []).length > 0)
    );
  };

  // Reorder action chips within a cell record
  const handleReorderActions = (cellId: string, sourceActionId: string, targetIndex: number) => {
    setDuelRecords((prev) =>
      prev.map((r) => {
        if (r.cellId === cellId) {
          const items = [...(r.actions || [])];
          const srcIdx = items.findIndex((a) => a.id === sourceActionId);
          if (srcIdx >= 0) {
            const [removed] = items.splice(srcIdx, 1);
            let finalIdx = targetIndex;
            if (srcIdx < targetIndex) {
              finalIdx = targetIndex - 1;
            }
            finalIdx = Math.max(0, Math.min(items.length, finalIdx));
            items.splice(finalIdx, 0, removed);
            return { ...r, actions: items };
          }
        }
        return r;
      })
    );
  };

  // Delete an entire cell record row
  const handleDeleteRecord = (id: string) => {
    setDuelRecords((prev) => prev.filter((r) => r.id !== id));
  };

  // Clear all duel records
  const handleClearAllRecords = () => {
    setDuelRecords([]);
    try {
      localStorage.removeItem(DUEL_RECORDS_STORAGE_KEY);
    } catch {}
  };

  // Drag and drop swap cell positions in PLAY (出题) mode
  const handleSwapCells = (sourceId: string, targetId: string) => {
    setCells((prev) => {
      const sourceCell = prev.find((c) => c.id === sourceId);
      const targetCell = prev.find((c) => c.id === targetId);
      if (!sourceCell || !targetCell) return prev;
      if (sourceCell.type !== 'CENTER' || targetCell.type !== 'CENTER') return prev;

      const updated = prev.map((c) => {
        if (c.id === sourceId) {
          return {
            ...c,
            word: targetCell.word,
            pinyin: targetCell.pinyin,
            firstLetter: targetCell.firstLetter,
            charCount: targetCell.charCount,
            code: targetCell.code,
            rawCode: targetCell.rawCode,
            category: targetCell.category,
            owner: targetCell.owner,
            revealed: targetCell.revealed,
            attempts: targetCell.attempts,
          };
        }
        if (c.id === targetId) {
          return {
            ...c,
            word: sourceCell.word,
            pinyin: sourceCell.pinyin,
            firstLetter: sourceCell.firstLetter,
            charCount: sourceCell.charCount,
            code: sourceCell.code,
            rawCode: sourceCell.rawCode,
            category: sourceCell.category,
            owner: sourceCell.owner,
            revealed: sourceCell.revealed,
            attempts: sourceCell.attempts,
          };
        }
        return c;
      });

      evaluateVictory(updated);
      return updated;
    });
  };

  // Live Score / Capture Counts
  const redScore = useMemo(() => cells.filter((c) => c.type === 'CENTER' && c.owner === 'RED').length, [cells]);
  const greenScore = useMemo(() => cells.filter((c) => c.type === 'CENTER' && c.owner === 'GREEN').length, [cells]);

  return (
    <div id="app-root" className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 selection:bg-blue-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        gameMode={gameMode}
        onSelectGameMode={setGameMode}
        redScore={roomState ? roomState.cells.filter((c) => c.owner === 'RED').length : redScore}
        greenScore={roomState ? roomState.cells.filter((c) => c.owner === 'GREEN').length : greenScore}
        onOpenWordPacks={() => setShowWordPackModal(true)}
        onOpenRules={() => setShowRulesModal(true)}
        onOpenShareScreenshot={() => setShowShareModal(true)}
        onRestart={() => initBoard(activeWordPack)}
        activePackName={roomState ? roomState.wordPackName : activeWordPack.name}
        godMode={godMode}
        onToggleGodMode={() => setGodMode((g) => !g)}
        onShuffleWords={handleShuffleWords}
        isOnlineMode={!!roomState}
        onlineRoomId={roomState?.roomId}
        onOpenOnlineLobby={() => setShowOnlineLobby(true)}
      />

      {/* Main Stage */}
      <main className="flex-1 max-w-[1580px] w-full mx-auto px-3 sm:px-4 py-3">
        {roomState ? (
          /* 在线 2v2 对战主舞台 */
          <OnlineBattleStage
            roomState={roomState}
            myRole={myRole}
            myPlayerId={myPlayerId}
            secretWord={secretWord}
            toastMessage={toastMessage}
            onOpenLobby={() => setShowOnlineLobby(true)}
            onLeaveRoom={onlineLeaveRoom}
            onSelectCell={onlineSelectCell}
            onSubmitClue={onlineSubmitClue}
            onPressBuzzer={onlinePressBuzzer}
            onSubmitGuess={onlineSubmitGuess}
          />
        ) : (
          /* 本地主持人工作台舞台 */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Main Board Column (7 cols) */}
          <div className="lg:col-span-7 xl:col-span-7 flex flex-col items-center">
            <HexBoard
              cells={cells}
              selectedCellId={selectedCellId}
              onSelectCell={handleSelectCell}
              godMode={godMode}
              isDraggable={gameMode === 'PLAY'}
              onSwapCells={handleSwapCells}
            />
          </div>

          {/* Right Controls & Duel Records Column (5 cols) */}
          <div className="lg:col-span-5 xl:col-span-5 flex flex-col gap-3">
            {/* In 出题模式 (PLAY), structured helper cards with stable height */}
            {gameMode === 'PLAY' && (
              <div className="w-full bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4 shadow-xs space-y-3 transition-all duration-200">
                {selectedCell ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded font-mono">
                          {selectedCell.code}
                        </span>
                        <span className="text-sm font-bold text-slate-800">【{selectedCell.word}】</span>
                        <span className="text-xs text-purple-700 font-mono">({selectedCell.pinyin})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingCell(selectedCell)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>编辑该格词语</span>
                      </button>
                    </div>
                    <div className="bg-white/80 border border-purple-100 rounded-xl p-3 text-xs text-purple-900 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-purple-800">分类：</span>
                        <span>{selectedCell.category || '通用词'}</span>
                        <span className="text-purple-300">|</span>
                        <span className="font-semibold text-purple-800">字数：</span>
                        <span>{selectedCell.charCount} 字</span>
                        <span className="text-purple-300">|</span>
                        <span className="font-semibold text-purple-800">首字母：</span>
                        <span className="font-bold">{selectedCell.firstLetter}</span>
                      </div>
                      <p className="text-[11px] text-purple-700/80 mt-1">
                        💡 <strong>出题操作提示</strong>：可点击上方按钮编辑词语拼音；也可以按住该格子直接拖拽到其他格子上进行位置互换。
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="py-2.5 text-center space-y-1.5">
                    <div className="flex items-center justify-center gap-2 text-purple-900 font-bold text-xs">
                      <PenTool className="w-4 h-4 text-purple-600" />
                      <span>出题与布盘模式</span>
                    </div>
                    <p className="text-xs text-purple-700/90 leading-relaxed max-w-sm mx-auto">
                      点击棋盘上任意格子即可编辑该格词语；按住格子拖拽至其他格子可直接互换位置。
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* In 主持模式 (HOST), Four-Input Duel Panel */}
            {gameMode === 'HOST' && (
              <HostDuelPanel
                selectedCell={selectedCell}
                onSetCellOwner={handleSetCellOwner}
                onSubmitDuelRecord={handleSubmitDuelRecord}
              />
            )}

            {/* Duel Records Table (每行标题为格子缩写如X3b，同格记录保持在同一行表头下) */}
            <DuelRecordsTable
              records={duelRecords}
              onDeleteRecord={handleDeleteRecord}
              onDeleteAction={handleDeleteAction}
              onReorderActions={handleReorderActions}
              onClearAllRecords={handleClearAllRecords}
              onSelectCellById={(cellId) => setSelectedCellId(cellId)}
            />
          </div>
        </div>
        )}
      </main>

      {/* Share Screenshot Modal (盘面 + 对决记录合成为长图) */}
      {showShareModal && (
        <ShareScreenshotModal
          cells={cells}
          duelRecords={duelRecords}
          activePackName={activeWordPack.name}
          redScore={redScore}
          greenScore={greenScore}
          winner={winner}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Single Cell Word & Code Edit Modal (出题模式) */}
      {editingCell && (
        <EditCellModal
          cell={editingCell}
          onSave={handleSaveCellEdit}
          onClose={() => setEditingCell(null)}
        />
      )}

      {/* Word Pack Modal (自定义导入) */}
      {showWordPackModal && (
        <WordPackManager
          activeWordPackId={activeWordPack.id}
          onSelectWordPack={(pack) => {
            setActiveWordPack(pack);
            initBoard(pack);
          }}
          onClose={() => setShowWordPackModal(false)}
        />
      )}

      {/* Rules Modal */}
      {showRulesModal && <RuleGuideModal onClose={() => setShowRulesModal(false)} />}

      {/* 2v2 Online Multiplayer Lobby Modal */}
      {(showOnlineLobby || (roomState && roomState.phase === 'LOBBY')) && (
        <OnlineLobbyModal
          roomState={roomState}
          myRole={myRole}
          myPlayerId={myPlayerId}
          onClose={() => setShowOnlineLobby(false)}
          onCreateRoom={(pName, pId) => {
            createRoom(pName, pId);
            setShowOnlineLobby(true);
          }}
          onJoinRoom={(rId, pName, prefRole) => {
            joinRoom(rId, pName, prefRole);
            setShowOnlineLobby(true);
          }}
          onSelectRole={selectRole}
          onToggleReady={toggleReady}
        />
      )}
    </div>
  );
}
