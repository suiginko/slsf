import { pinyin } from 'pinyin-pro';
import { WordItem } from '../types';

/**
 * Extracts the first uppercase pinyin letter of a Chinese string, skipping leading punctuation.
 * Example: "向日葵" -> "X", "《流浪地球》" -> "L"
 */
export function getFirstLetter(text: string): string {
  if (!text || text.trim().length === 0) return '?';
  // Strip leading whitespace and punctuation
  const clean = text.trim().replace(/^[\s,，、。；;：:!！?？"“”'‘’()（）[\]【】《》<>—…·\-_~`/\\]+/, '');
  if (!clean || clean.length === 0) return '?';
  const firstChar = clean[0];
  
  // If it's already an English letter / number
  if (/^[a-zA-Z]/.test(firstChar)) {
    return firstChar.toUpperCase();
  }

  try {
    const py = pinyin(firstChar, { toneType: 'none', type: 'array' });
    if (py && py.length > 0 && py[0].length > 0) {
      return py[0][0].toUpperCase();
    }
  } catch (err) {
    console.error('Pinyin extraction failed for:', firstChar, err);
  }

  return firstChar.toUpperCase();
}

/**
 * Gets full formatted pinyin with tones for display upon reveal.
 * Example: "向日葵" -> "xiàng rì kuí"
 */
export function getFullPinyin(text: string): string {
  if (!text) return '';
  try {
    return pinyin(text, { toneType: 'symbol' });
  } catch {
    return '';
  }
}

/**
 * Gets character count of a word excluding whitespace and punctuation (commas, dunhao, periods, brackets, etc.).
 */
export function getWordCharCount(text: string): number {
  if (!text) return 0;
  // Count meaningful characters, automatically ignoring commas, dunhao, periods, and all punctuation
  const meaningfulChars = text.replace(/[\s,，、。；;：:!！?？"“”'‘’()（）[\]【】《》<>—…·\-_~`/\\]+/g, '');
  return meaningfulChars.length;
}

/**
 * Generates raw clue code for a word.
 * Example: "向日葵" -> "X3"
 */
export function generateRawCode(text: string): { firstLetter: string; charCount: number; rawCode: string } {
  const firstLetter = getFirstLetter(text);
  const charCount = getWordCharCount(text);
  const rawCode = `${firstLetter}${charCount}`;
  return { firstLetter, charCount, rawCode };
}

/**
 * Assigns unique differentiated codes to an array of 25 words according to the game rule:
 * "若一局游戏内出现了对外展示相同的代码，则以例如X3a，X3b这种方法进行额外区分"
 */
export function processWordsWithUniqueCodes(words: (string | WordItem)[]): {
  word: string;
  pinyin: string;
  firstLetter: string;
  charCount: number;
  rawCode: string;
  code: string;
  category?: string;
}[] {
  // First pass: collect raw codes and group by rawCode
  const intermediate = words.map((item) => {
    const wordStr = typeof item === 'string' ? item : item.word;
    const category = typeof item === 'string' ? undefined : item.category;
    const cleanWord = wordStr.trim();
    const { firstLetter, charCount, rawCode } = generateRawCode(cleanWord);
    const py = getFullPinyin(cleanWord);

    return {
      word: cleanWord,
      pinyin: py,
      firstLetter,
      charCount,
      rawCode,
      category,
    };
  });

  // Count frequencies of each rawCode
  const codeCounts: Record<string, number> = {};
  for (const item of intermediate) {
    codeCounts[item.rawCode] = (codeCounts[item.rawCode] || 0) + 1;
  }

  // Second pass: assign suffix (a, b, c, ...) only if count > 1
  const codeTracker: Record<string, number> = {};
  return intermediate.map((item) => {
    const count = codeCounts[item.rawCode];
    if (count > 1) {
      const idx = codeTracker[item.rawCode] || 0;
      // Convert 0 -> 'a', 1 -> 'b', 2 -> 'c', etc.
      const suffix = String.fromCharCode(97 + idx); // 97 is 'a'
      codeTracker[item.rawCode] = idx + 1;
      return {
        ...item,
        code: `${item.rawCode}${suffix}`,
      };
    } else {
      return {
        ...item,
        code: item.rawCode,
      };
    }
  });
}

/**
 * Validates a user guess against the target word.
 * Tolerant to:
 * - Trimming spaces
 * - Exact Chinese match
 * - Case-insensitive Pinyin match (e.g. user types "xiangrikui" or "xiang ri kui")
 */
export function checkAnswerMatch(guess: string, targetWord: string): boolean {
  if (!guess || !targetWord) return false;
  const cleanGuess = guess.trim().replace(/[\s\-_，。！？,.!?]/g, '').toLowerCase();
  const cleanTarget = targetWord.trim().replace(/[\s\-_，。！？,.!?]/g, '').toLowerCase();

  // 1. Direct character match
  if (cleanGuess === cleanTarget) return true;

  // 2. Direct Pinyin tone-free match
  try {
    const targetPyNoTone = pinyin(targetWord, { toneType: 'none' }).replace(/\s+/g, '').toLowerCase();
    if (cleanGuess === targetPyNoTone) return true;
  } catch {
    // fallback
  }

  return false;
}
