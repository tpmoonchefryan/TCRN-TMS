// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * Text Normalizer Utility
 * Handles homoglyph detection, leetspeak conversion, and special character cleanup
 */

// =============================================================================
// Homoglyph Mappings (Unicode lookalikes -> ASCII)
// =============================================================================

/**
 * Cyrillic characters that look like Latin letters
 */
const CYRILLIC_HOMOGLYPHS: Record<string, string> = {
  'а': 'a', 'А': 'A',
  'с': 'c', 'С': 'C',
  'е': 'e', 'Е': 'E',
  'һ': 'h', 'Һ': 'H',
  'і': 'i', 'І': 'I',
  'ј': 'j', 'Ј': 'J',
  'к': 'k', 'К': 'K',
  'м': 'm', 'М': 'M',
  'о': 'o', 'О': 'O',
  'р': 'p', 'Р': 'P',
  'ѕ': 's', 'Ѕ': 'S',
  'т': 't', 'Т': 'T',
  'ү': 'y', 'Ү': 'Y',
  'х': 'x', 'Х': 'X',
};

/**
 * Greek characters that look like Latin letters
 */
const GREEK_HOMOGLYPHS: Record<string, string> = {
  'Α': 'A', 'α': 'a',
  'Β': 'B', 'β': 'b',
  'Ε': 'E', 'ε': 'e',
  'Η': 'H', 'η': 'n',
  'Ι': 'I', 'ι': 'i',
  'Κ': 'K', 'κ': 'k',
  'Μ': 'M', 'μ': 'u',
  'Ν': 'N', 'ν': 'v',
  'Ο': 'O', 'ο': 'o',
  'Ρ': 'P', 'ρ': 'p',
  'Τ': 'T', 'τ': 't',
  'Υ': 'Y', 'υ': 'u',
  'Χ': 'X', 'χ': 'x',
};

/**
 * Fullwidth characters (commonly used in CJK text)
 */
const FULLWIDTH_HOMOGLYPHS: Record<string, string> = {
  '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
  '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
  'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D', 'Ｅ': 'E',
  'Ｆ': 'F', 'Ｇ': 'G', 'Ｈ': 'H', 'Ｉ': 'I', 'Ｊ': 'J',
  'Ｋ': 'K', 'Ｌ': 'L', 'Ｍ': 'M', 'Ｎ': 'N', 'Ｏ': 'O',
  'Ｐ': 'P', 'Ｑ': 'Q', 'Ｒ': 'R', 'Ｓ': 'S', 'Ｔ': 'T',
  'Ｕ': 'U', 'Ｖ': 'V', 'Ｗ': 'W', 'Ｘ': 'X', 'Ｙ': 'Y', 'Ｚ': 'Z',
  'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e',
  'ｆ': 'f', 'ｇ': 'g', 'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j',
  'ｋ': 'k', 'ｌ': 'l', 'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o',
  'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r', 'ｓ': 's', 'ｔ': 't',
  'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x', 'ｙ': 'y', 'ｚ': 'z',
};

/**
 * Other common lookalikes
 */
const OTHER_HOMOGLYPHS: Record<string, string> = {
  'ℂ': 'C', 'ℍ': 'H', 'ℕ': 'N', 'ℙ': 'P', 'ℚ': 'Q',
  'ℝ': 'R', 'ℤ': 'Z', 'ℯ': 'e', 'ℊ': 'g', 'ℎ': 'h',
  'ℹ': 'i', 'ℓ': 'l', 'ℬ': 'B', 'ℰ': 'E', 'ℱ': 'F',
  'ℳ': 'M', 'ⅰ': 'i', 'ⅱ': 'ii', 'ⅲ': 'iii', 'ⅳ': 'iv',
  'ⅴ': 'v', 'ⅵ': 'vi', 'ⅶ': 'vii', 'ⅷ': 'viii', 'ⅸ': 'ix',
  'ⅹ': 'x', 'ⅺ': 'xi', 'ⅻ': 'xii',
  '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5',
  '⑥': '6', '⑦': '7', '⑧': '8', '⑨': '9', '⑩': '10',
  '⓪': '0',
  '℮': 'e',
  '∅': 'O', '∞': '8',
};

// Combined homoglyph map
const HOMOGLYPHS: Record<string, string> = {
  ...CYRILLIC_HOMOGLYPHS,
  ...GREEK_HOMOGLYPHS,
  ...FULLWIDTH_HOMOGLYPHS,
  ...OTHER_HOMOGLYPHS,
};

// =============================================================================
// Leetspeak Mappings
// =============================================================================

/**
 * Common leetspeak substitutions (number/symbol -> letter)
 */
const LEETSPEAK: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '2': 'z',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '6': 'g',
  '7': 't',
  '8': 'b',
  '9': 'g',
  '@': 'a',
  '$': 's',
  '!': 'i',
  '|': 'i',
  '+': 't',
  '&': 'and',
  '€': 'e',
  '£': 'l',
  '¥': 'y',
  '(': 'c',
  ')': 'd',
  '[': 'c',
  ']': 'd',
  '{': 'c',
  '}': 'd',
  '<': 'c',
  '>': 'd',
  '/': 'v',
  '\\': 'l',
  '^': 'a',
  '*': 'x',
};

// =============================================================================
// Zero-width and Invisible Characters
// =============================================================================

/**
 * Zero-width characters that should be removed
 */
const ZERO_WIDTH_CHARS = [
  '\u200B', // Zero-width space
  '\u200C', // Zero-width non-joiner
  '\u200D', // Zero-width joiner
  '\u200E', // Left-to-right mark
  '\u200F', // Right-to-left mark
  '\u2060', // Word joiner
  '\u2061', // Function application
  '\u2062', // Invisible times
  '\u2063', // Invisible separator
  '\u2064', // Invisible plus
  '\uFEFF', // Byte order mark
  '\u180E', // Mongolian vowel separator
  '\u00AD', // Soft hyphen
];

/**
 * Control characters that should be removed
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

// =============================================================================
// TextNormalizer Class
// =============================================================================

export interface NormalizationResult {
  normalized: string;
  original: string;
  homoglyphsDetected: boolean;
  leetspeakDetected: boolean;
  zeroWidthRemoved: boolean;
  controlCharsRemoved: boolean;
}

export interface NormalizationOptions {
  normalizeHomoglyphs?: boolean;
  normalizeLeetspeak?: boolean;
  removeZeroWidth?: boolean;
  removeControlChars?: boolean;
  normalizeWhitespace?: boolean;
  toLowerCase?: boolean;
}

const DEFAULT_OPTIONS: NormalizationOptions = {
  normalizeHomoglyphs: true,
  normalizeLeetspeak: true,
  removeZeroWidth: true,
  removeControlChars: true,
  normalizeWhitespace: true,
  toLowerCase: true,
};

/**
 * TextNormalizer - Utility class for text normalization
 */
export class TextNormalizer {
  /**
   * Normalize text with all transformations
   */
  static normalize(text: string, options: NormalizationOptions = {}): NormalizationResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let result = text;
    let homoglyphsDetected = false;
    let leetspeakDetected = false;
    let zeroWidthRemoved = false;
    let controlCharsRemoved = false;

    // 1. Remove zero-width characters
    if (opts.removeZeroWidth) {
      const beforeZeroWidth = result;
      result = this.removeZeroWidthChars(result);
      zeroWidthRemoved = result !== beforeZeroWidth;
    }

    // 2. Remove control characters
    if (opts.removeControlChars) {
      const beforeControl = result;
      result = this.removeControlChars(result);
      controlCharsRemoved = result !== beforeControl;
    }

    // 3. Normalize whitespace
    if (opts.normalizeWhitespace) {
      result = this.normalizeWhitespace(result);
    }

    // 4. Normalize homoglyphs
    if (opts.normalizeHomoglyphs) {
      const beforeHomoglyphs = result;
      result = this.normalizeHomoglyphs(result);
      homoglyphsDetected = result !== beforeHomoglyphs;
    }

    // 5. Normalize leetspeak
    if (opts.normalizeLeetspeak) {
      const beforeLeetspeak = result;
      result = this.normalizeLeetspeak(result);
      leetspeakDetected = result !== beforeLeetspeak;
    }

    // 6. Convert to lowercase
    if (opts.toLowerCase) {
      result = result.toLowerCase();
    }

    return {
      normalized: result,
      original: text,
      homoglyphsDetected,
      leetspeakDetected,
      zeroWidthRemoved,
      controlCharsRemoved,
    };
  }

  /**
   * Normalize homoglyphs to ASCII equivalents
   */
  static normalizeHomoglyphs(text: string): string {
    return text.split('').map(char => HOMOGLYPHS[char] || char).join('');
  }

  /**
   * Normalize leetspeak to letters
   */
  static normalizeLeetspeak(text: string): string {
    return text.split('').map(char => LEETSPEAK[char] || char).join('');
  }

  /**
   * Remove zero-width characters
   */
  static removeZeroWidthChars(text: string): string {
    let result = text;
    for (const char of ZERO_WIDTH_CHARS) {
      result = result.split(char).join('');
    }
    return result;
  }

  /**
   * Remove control characters
   */
  static removeControlChars(text: string): string {
    return text.replace(CONTROL_CHAR_REGEX, '');
  }

  /**
   * Normalize whitespace (multiple spaces -> single space, trim)
   */
  static normalizeWhitespace(text: string): string {
    return text
      .replace(/[\t\r\n]+/g, ' ')  // Convert tabs/newlines to spaces
      .replace(/\s+/g, ' ')         // Multiple spaces to single
      .trim();
  }

  /**
   * Check if text contains homoglyphs
   */
  static containsHomoglyphs(text: string): boolean {
    return text.split('').some(char => char in HOMOGLYPHS);
  }

  /**
   * Check if text contains leetspeak
   */
  static containsLeetspeak(text: string): boolean {
    // Only check if it's in a word-like context
    const leetspeakPattern = /[0-9@$!|+][a-zA-Z]|[a-zA-Z][0-9@$!|+]/;
    return leetspeakPattern.test(text);
  }

  /**
   * Check if text contains zero-width characters
   */
  static containsZeroWidthChars(text: string): boolean {
    return ZERO_WIDTH_CHARS.some(char => text.includes(char));
  }

  /**
   * Get detected evasion techniques
   */
  static detectEvasionTechniques(text: string): string[] {
    const techniques: string[] = [];

    if (this.containsHomoglyphs(text)) {
      techniques.push('homoglyph_substitution');
    }

    if (this.containsLeetspeak(text)) {
      techniques.push('leetspeak');
    }

    if (this.containsZeroWidthChars(text)) {
      techniques.push('zero_width_injection');
    }

    // Check for character repetition to break word detection
    if (/(.)\1{3,}/.test(text)) {
      techniques.push('character_repetition');
    }

    // Check for spaces inserted between letters
    if (/\b[a-zA-Z]\s[a-zA-Z]\s[a-zA-Z]\b/.test(text)) {
      techniques.push('space_insertion');
    }

    // Check for dots/dashes between letters
    if (/[a-zA-Z][.\-_][a-zA-Z][.\-_][a-zA-Z]/.test(text)) {
      techniques.push('separator_insertion');
    }

    return techniques;
  }
}

// Export individual functions for convenience
export const normalizeText = TextNormalizer.normalize.bind(TextNormalizer);
export const normalizeHomoglyphs = TextNormalizer.normalizeHomoglyphs.bind(TextNormalizer);
export const normalizeLeetspeak = TextNormalizer.normalizeLeetspeak.bind(TextNormalizer);
export const removeZeroWidthChars = TextNormalizer.removeZeroWidthChars.bind(TextNormalizer);
export const detectEvasionTechniques = TextNormalizer.detectEvasionTechniques.bind(TextNormalizer);
