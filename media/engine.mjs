// engine.js —— CNView 映射引擎（纯函数，无环境依赖）
// 从 cnview-extension 的 scanner.ts / keywords.ts / convertCore.ts 移植为 ES Module。
//
// 核心保证：
//  1. 字符串 / 注释 / 模板串 / 数字字面量在扫描阶段整体剔除，不可能被替换；
//  2. 只替换"完整匹配"映射条目的 token，"如果_2"、"my如果" 等混合 token 不受影响；
//  3. 别名查找最长匹配优先：点号限定链 > 类作用域限定 > 裸名；
//  4. 反向还原是作用域感知的：限定键首段与当前类作用域同名时只还原末段，
//     保证类体内裸方法名往返逐字节一致；
//  5. 降级模式（超大文件 / 不支持语言）仅做关键字替换。

// ==================== 语言 ====================

/** @returns {'typescript'|'javascript'|'python'|'other'} */
export function langOfPath(p) {
  const s = String(p || '').toLowerCase();
  if (/\.(ts|tsx|mts|cts)$/.test(s)) return 'typescript';
  if (/\.(js|jsx|mjs|cjs)$/.test(s)) return 'javascript';
  if (/\.(py|pyw)$/.test(s)) return 'python';
  return 'other';
}

export function langOfMonaco(languageId, path) {
  const id = String(languageId || '');
  if (id === 'typescript' || id === 'typescriptreact') return 'typescript';
  if (id === 'javascript' || id === 'javascriptreact') return 'javascript';
  if (id === 'python') return 'python';
  return langOfPath(path);
}

// ==================== 词法扫描器 ====================

const ID_START = /[A-Za-z_$\u4e00-\u9fff]/;
const ID_CHAR = /[A-Za-z0-9_$\u4e00-\u9fff]/;
const NUM_CHAR = /[A-Za-z0-9_.xX]/;

// ==================== 全角标点归一化 ====================
//
// 中文输入法常打出全角标点（，。、（）“”…）。反向还原（toEnglish）时统一
// 替换为 ASCII，避免写回英文源码后出现语法错误。字符串/注释内的字符不受影响。

/** 全角标点 -> ASCII（"(" 等单字符或多字符） */
const FULLWIDTH_PUNCT = {
  '，': ',', '。': '.', '、': ',', '；': ';', '：': ':',
  '？': '?', '！': '!', '（': '(', '）': ')',
  '【': '[', '】': ']', '〔': '[', '〕': ']', '［': '[', '］': ']',
  '｛': '{', '｝': '}', '《': '<', '》': '>', '〈': '<', '〉': '>',
  '＜': '<', '＞': '>', '＝': '=', '＋': '+', '－': '-', '—': '-',
  '～': '~', '＊': '*', '／': '/', '＼': '\\', '％': '%', '＠': '@',
  '＃': '#', '＄': '$', '＆': '&', '｜': '|', '＾': '^', '｀': '`',
  '．': '.', '·': '.', '…': '...', '　': ' ',
  '“': '"', '”': '"', '‘': "'", '’': "'",
  '「': '"', '」': '"', '『': "'", '』': "'", '＂': '"', '＇': "'",
};
// 全角数字与字母（中文输入法误触时也归一到 ASCII）
for (let k = 0; k < 10; k++) {
  FULLWIDTH_PUNCT[String.fromCharCode(0xFF10 + k)] = String(k);
}
for (let k = 0; k < 26; k++) {
  FULLWIDTH_PUNCT[String.fromCharCode(0xFF21 + k)] = String.fromCharCode(65 + k);
  FULLWIDTH_PUNCT[String.fromCharCode(0xFF41 + k)] = String.fromCharCode(97 + k);
}

/** 全角引号：开引号 -> 闭引号（自配对时两值相同） */
const FW_QUOTES = {
  '“': '”', '‘': '’', '「': '」', '『': '』', '＂': '＂', '＇': '＇',
};
/** 全角引号 -> ASCII 引号 */
const FW_QUOTE_ASCII = {
  '“': '"', '”': '"', '‘': "'", '’': "'", '「': '"', '」': '"',
  '『': "'", '』': "'", '＂': '"', '＇': "'",
};

/** 扫描源码，只返回"代码区" token（id/num/punct/全角字符串），字符串与注释被整体跳过 */
export function scan(src, lang) {
  const tokens = [];
  const n = src.length;
  let i = 0, line = 0;

  const skipTo = (end) => {
    while (i < end) { if (src[i] === '\n') line++; i++; }
  };

  /** 跳过字符串，返回 {end, closed} */
  const skipString = (open, close, quoteLen) => {
    let j = i + quoteLen;
    let closed = false;
    while (j < n) {
      const c = src[j];
      if (c === '\\') { j += 2; continue; }
      if (quoteLen === 1) {
        if (c === close) { j++; closed = true; break; }
        if (c === '\n') break;
      } else {
        if (c === open && src[j + 1] === open && src[j + 2] === open) { j += 3; closed = true; break; }
      }
      j++;
    }
    const end = Math.min(j, n);
    skipTo(end);
    return { end, closed };
  };

  const skipTemplate = () => {
    let j = i + 1, depth = 0;
    while (j < n) {
      const c = src[j];
      if (c === '\\') { j += 2; continue; }
      if (c === '`' && depth === 0) { j++; break; }
      if (c === '$' && src[j + 1] === '{') { depth++; j += 2; continue; }
      if (c === '}' && depth > 0) depth--;
      j++;
    }
    skipTo(Math.min(j, n));
  };

  /** 全角引号字符串：产出 str token，供反向还原时替换定界符 */
  const skipFullwidthString = (open) => {
    const start = i, ln = line;
    const close = FW_QUOTES[open];
    const { end, closed } = skipString(open, close, 1);
    if (closed) tokens.push({ kind: 'str', text: src.slice(start, end), start, end, line: ln, quote: open, quoteClose: close });
  };

  while (i < n) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }

    if (lang === 'python') {
      if (c === '#') {
        let j = i;
        while (j < n && src[j] !== '\n') j++;
        skipTo(j); continue;
      }
      if (c === '"' || c === "'") {
        skipString(c, c, (src[i + 1] === c && src[i + 2] === c) ? 3 : 1);
        continue;
      }
      if (FW_QUOTES[c]) { skipFullwidthString(c); continue; }
    } else {
      if (c === '/' && src[i + 1] === '/') {
        let j = i;
        while (j < n && src[j] !== '\n') j++;
        skipTo(j); continue;
      }
      if (c === '/' && src[i + 1] === '*') {
        let j = i + 2;
        while (j < n && !(src[j] === '*' && src[j + 1] === '/')) j++;
        skipTo(Math.min(j + 2, n)); continue;
      }
      if (c === '"' || c === "'") { skipString(c, c, 1); continue; }
      if (c === '`') { skipTemplate(); continue; }
      if (FW_QUOTES[c]) { skipFullwidthString(c); continue; }
    }


    if (ID_START.test(c)) {
      const start = i, ln = line;
      while (i < n && ID_CHAR.test(src[i])) i++;
      tokens.push({ text: src.slice(start, i), start, end: i, line: ln, kind: 'id' });
      continue;
    }
    if (c >= '0' && c <= '9') {
      const start = i, ln = line;
      while (i < n && NUM_CHAR.test(src[i])) i++;
      tokens.push({ text: src.slice(start, i), start, end: i, line: ln, kind: 'num' });
      continue;
    }
    tokens.push({ text: c, start: i, end: i + 1, line, kind: 'punct' });
    i++;
  }
  return tokens;
}

export function countLines(src) {
  let n = 1;
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') n++;
  return n;
}

// ==================== 内置关键字表 ====================

const TS_JS = [
  ['如果', 'if'], ['否则', 'else'], ['否则如果', 'else if'], ['循环', 'for'],
  ['当', 'while'], ['函数', 'function'], ['返回', 'return'], ['类', 'class'],
  ['导入', 'import'], ['从', 'from'], ['常量', 'const'], ['变量', 'let'],
  ['异步', 'async'], ['等待', 'await'],
];

const PYTHON = [
  ['如果', 'if'], ['否则', 'else'], ['否则如果', 'elif'], ['循环', 'for'],
  ['当', 'while'], ['函数', 'def'], ['返回', 'return'], ['类', 'class'],
  ['导入', 'import'], ['从', 'from'], ['异步', 'async'], ['等待', 'await'],
];

const MERGED = (() => {
  const seen = new Map();
  for (const [cn, en] of [...TS_JS, ...PYTHON]) if (!seen.has(cn)) seen.set(cn, en);
  return [...seen.entries()];
})();

function tableFor(lang) {
  if (lang === 'python') return PYTHON;
  if (lang === 'typescript' || lang === 'javascript') return TS_JS;
  return MERGED;
}

/** dir: 'toChinese' => en->cn；'toEnglish' => cn->en（"else if" 复合对由引擎处理） */
export function keywordMap(lang, dir) {
  const map = new Map();
  for (const [cn, en] of tableFor(lang)) {
    if (dir === 'toChinese') { if (!en.includes(' ')) map.set(en, cn); }
    else map.set(cn, en);
  }
  return map;
}

// ==================== 转换核心 ====================

const CN_CHAR = /[\u4e00-\u9fff]/;

/** 组装某方向的映射表；crossRef 为反方向别名表（作用域名解析用） */
export function buildTables(lang, dir, forwardAliases, reverseAliases) {
  return {
    kw: keywordMap(lang, dir),
    aliases: dir === 'toChinese' ? forwardAliases : reverseAliases,
    crossRef: dir === 'toChinese' ? reverseAliases : forwardAliases,
  };
}

function lastSegment(key) {
  const i = key.lastIndexOf('.');
  return i < 0 ? key : key.slice(i + 1);
}

/** 反向还原：限定键首段与当前类作用域同名 -> 只还原末段（原始代码写的是裸名） */
function scopeAwareEmit(val, scopes, crossRef) {
  if (!val.includes('.') || scopes.length === 0) return val;
  const firstSeg = val.slice(0, val.indexOf('.'));
  for (let s = scopes.length - 1; s >= 0; s--) {
    const scopeName = scopes[s].name;
    if (scopeName === firstSeg || crossRef.get(firstSeg) === scopeName) {
      return lastSegment(val);
    }
  }
  return val;
}

/** 从 token i 向前的最长 "id (. id)*" 链，返回链上 id 的下标 */
export function forwardChain(tokens, i) {
  const chain = [i];
  let j = i;
  while (j + 2 < tokens.length &&
    tokens[j + 1].kind === 'punct' && tokens[j + 1].text === '.' &&
    tokens[j + 2].kind === 'id') {
    chain.push(j + 2); j += 2;
  }
  return chain;
}

/**
 * 双向转换主函数。
 * @returns {{text:string, unmapped:Array<{token:string,line:number,character:number}>, degraded:boolean}}
 */
export function convertSource(source, lang, dir, tables, maxLines) {
  const lines = countLines(source);
  const degraded = lines > (maxLines || 10000) || lang === 'other';

  const tokens = scan(source, lang);
  const { kw, aliases } = tables;

  const edits = [];
  const unmapped = [];

  const scopes = [];
  let braceDepth = 0;
  let pendingClass = null;

  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];

    if (t.kind === 'punct') {
      const open = t.text === '{' || t.text === '｛';
      const close = t.text === '}' || t.text === '｝';
      if (open) {
        braceDepth++;
        if (pendingClass !== null) { scopes.push({ name: pendingClass, depth: braceDepth }); pendingClass = null; }
      } else if (close) {
        while (scopes.length > 0 && scopes[scopes.length - 1].depth === braceDepth) scopes.pop();
        braceDepth--;
      }
      // 中文模式常打出全角标点；回到英文源码时统一归一化为半角
      if (dir === 'toEnglish') {
        const rep = FULLWIDTH_PUNCT[t.text];
        if (rep !== undefined) edits.push({ start: t.start, end: t.end, text: rep });
      }
      i++; continue;
    }
    if (t.kind === 'str') {
      // 全角引号定界符 -> ASCII 引号（字符串内容保持原样）
      if (dir === 'toEnglish') {
        const open = FW_QUOTE_ASCII[t.quote];
        const close = FW_QUOTE_ASCII[t.quoteClose];
        if (open !== undefined) edits.push({ start: t.start, end: t.start + t.quote.length, text: open });
        if (close !== undefined) edits.push({ start: t.end - t.quoteClose.length, end: t.end, text: close });
      }
      i++; continue;
    }
    if (t.kind !== 'id') { i++; continue; }

    // class 声明跟踪（中英文视图均可能遇到）
    if ((t.text === 'class' || t.text === '类') && i + 1 < tokens.length && tokens[i + 1].kind === 'id') {
      pendingClass = tokens[i + 1].text;
    }

    let matched = false;

    if (!degraded) {
      const chain = forwardChain(tokens, i);

      // 1) 最长限定链优先
      for (let L = chain.length; L >= 2; L--) {
        const key = chain.slice(0, L).map(k => tokens[k].text).join('.');
        const val = aliases.get(key);
        if (val !== undefined) {
          const out = dir === 'toEnglish' ? scopeAwareEmit(val, scopes, tables.crossRef) : val;
          edits.push({ start: tokens[i].start, end: tokens[chain[L - 1]].end, text: out });
          i = chain[L - 1] + 1; matched = true; break;
        }
      }

      // 2) 类作用域限定（由内而外）
      if (!matched) {
        for (let s = scopes.length - 1; s >= 0; s--) {
          const key = scopes[s].name + '.' + t.text;
          const val = aliases.get(key);
          if (val !== undefined) {
            const out = dir === 'toEnglish' ? scopeAwareEmit(val, scopes, tables.crossRef) : val;
            edits.push({ start: t.start, end: t.end, text: out });
            i++; matched = true; break;
          }
        }
      }

      // 3) 裸名
      if (!matched) {
        const val = aliases.get(t.text);
        if (val !== undefined) {
          const out = dir === 'toEnglish' ? scopeAwareEmit(val, scopes, tables.crossRef) : val;
          edits.push({ start: t.start, end: t.end, text: out });
          i++; matched = true;
        }
      }
    }

    // 4) 关键字（降级模式唯一路径）
    if (!matched) {
      if (dir === 'toChinese' && t.text === 'else') {
        const nxt = tokens[i + 1];
        if (nxt && nxt.kind === 'id' && nxt.text === 'if') {
          const between = source.slice(t.end, nxt.start);
          if (!/[^\s]/.test(between)) {
            edits.push({ start: t.start, end: nxt.end, text: '否则如果' });
            i += 2; matched = true;
          }
        }
      }
      if (!matched) {
        const kwVal = kw.get(t.text);
        if (kwVal !== undefined) {
          edits.push({ start: t.start, end: t.end, text: kwVal });
          i++; matched = true;
        }
      }
    }

    // 反向兜底：中文 token 未命中任何映射 -> 记录供保存阻断
    if (!matched && dir === 'toEnglish' && CN_CHAR.test(t.text)) {
      unmapped.push({
        token: t.text, line: t.line,
        character: t.start - (source.lastIndexOf('\n', t.start - 1) + 1),
      });
    }

    if (!matched) i++;
  }

  edits.sort((a, b) => b.start - a.start);
  let out = source;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return { text: out, unmapped, degraded };
}

/** 偏移处单 token 定向翻译（输入法即时映射用），命中返回 {start,end,text} 否则 null */
export function translateTokenAtOffset(text, offset, lang, dir, tables) {
  const tokens = scan(text, lang);
  const idx = tokens.findIndex(t => t.kind === 'id' && t.start <= offset && offset <= t.end);
  if (idx < 0) return null;

  const chain = forwardChain(tokens, idx);
  for (let L = chain.length; L >= 1; L--) {
    const key = chain.slice(0, L).map(k => tokens[k].text).join('.');
    const val = tables.aliases.get(key);
    if (val !== undefined) {
      return { start: tokens[chain[0]].start, end: tokens[chain[L - 1]].end, text: val };
    }
  }
  const kwVal = tables.kw.get(tokens[idx].text);
  if (kwVal !== undefined) return { start: tokens[idx].start, end: tokens[idx].end, text: kwVal };
  return null;
}

/** 光标处标识符的限定路径（最长点号链），作为 .cnmap 的键 */
export function qualifiedKeyAtOffset(text, offset, lang) {
  const tokens = scan(text, lang);
  const idx = tokens.findIndex(t => t.kind === 'id' && t.start <= offset && offset <= t.end);
  if (idx < 0) return null;

  let first = idx;
  while (first - 2 >= 0 &&
    tokens[first - 1].kind === 'punct' && tokens[first - 1].text === '.' &&
    tokens[first - 2].kind === 'id') first -= 2;
  let last = idx;
  while (last + 2 < tokens.length &&
    tokens[last + 1].kind === 'punct' && tokens[last + 1].text === '.' &&
    tokens[last + 2].kind === 'id') last += 2;

  const ids = [];
  for (let k = first; k <= last; k++) if (tokens[k].kind === 'id') ids.push(tokens[k].text);
  return { key: ids.join('.'), start: tokens[first].start, end: tokens[last].end };
}
