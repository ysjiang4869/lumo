import { DefaultMemoComposition } from '../memos';

// Disk storage format for multi-line memos uses indented Markdown continuation lines:
//
//   - 15:21 first line
//   \tsecond line
//   \tthird line
//
// Internally, a memo's `content` always represents line breaks with `<br>` so the
// rendering / editor / copy pipeline keeps working. These helpers convert between the
// two representations and locate the on-disk line range a memo occupies.

const CONTINUATION_INDENT = '\t';

const getAllLinesFromFile = (cache: string): string[] => cache.split(/\r?\n/);

// Build the regex matching the leading "- [ ] HH:mm " (or "- HH:mm ") part of a bullet
// line, so the remainder is treated as the first content line.
const getBulletPrefixRegex = (): RegExp => {
  let regexMatch;
  if (
    DefaultMemoComposition != '' &&
    /{TIME}/g.test(DefaultMemoComposition) &&
    /{CONTENT}/g.test(DefaultMemoComposition)
  ) {
    //eslint-disable-next-line
    regexMatch =
      '^(\\s*[\\-\\*]\\s(?:\\[.\\]\\s?)?' +
      DefaultMemoComposition.replace(/{TIME}/g, '(?:\\<time\\>)?(?:\\d{1,2}\\:\\d{2})?(?:\\<\\/time\\>)?').replace(
        /{CONTENT}/g,
        '\\s?)(.*)$',
      );
  } else {
    //eslint-disable-next-line
    regexMatch = '^(\\s*[\\-\\*]\\s(?:\\[.\\]\\s?)?(?:\\<time\\>)?(?:\\d{1,2}\\:\\d{2})?(?:\\<\\/time\\>)?\\s?)(.*)$';
  }
  return new RegExp(regexMatch, '');
};

// Split a memo bullet line into its leading prefix ("- 15:21 ") and the first content line.
export const splitBulletLine = (line: string): { prefix: string; firstContent: string } => {
  const match = getBulletPrefixRegex().exec(line);
  if (!match) {
    return { prefix: '', firstContent: line };
  }
  return { prefix: match[1], firstContent: match[2] ?? '' };
};

// Remove a single level of leading indentation (one tab, or up to 4 spaces) from a line.
const dedent = (line: string): string => {
  if (line.startsWith('\t')) {
    return line.slice(1);
  }
  const spaces = line.match(/^ {1,4}/);
  if (spaces) {
    return line.slice(spaces[0].length);
  }
  return line;
};

// Given the bullet line index, return the index of the last on-disk line that belongs to
// this memo (trailing blank lines are excluded).
export const findMemoBlockEnd = (fileLines: string[], startIdx: number): number => {
  let endIdx = startIdx;
  for (let j = startIdx + 1; j < fileLines.length; j++) {
    const line = fileLines[j];
    if (/^\s*$/.test(line)) {
      // Blank line: tentatively part of the block, but don't extend the end yet.
      continue;
    }
    if (/^[\t ]/.test(line)) {
      endIdx = j;
      continue;
    }
    // A non-indented, non-blank line starts a new top-level entry.
    break;
  }
  return endIdx;
};

// Merge a bullet line and its continuation lines into a single `<br>`-joined content string.
export const buildContentFromBlock = (firstContent: string, continuationLines: string[]): string => {
  const parts: string[] = [];
  if (firstContent !== '') {
    parts.push(firstContent);
  }
  for (const line of continuationLines) {
    parts.push(/^\s*$/.test(line) ? '' : dedent(line));
  }
  return parts.join('<br>');
};

// Read a memo starting at `startIdx`, returning its full `<br>` content and the end index.
export const readMemoBlock = (fileLines: string[], startIdx: number): { content: string; endIdx: number } => {
  const { firstContent } = splitBulletLine(fileLines[startIdx]);
  const endIdx = findMemoBlockEnd(fileLines, startIdx);
  const continuationLines = fileLines.slice(startIdx + 1, endIdx + 1);
  return { content: buildContentFromBlock(firstContent, continuationLines), endIdx };
};

// Convert an internal content string (which may contain `<br>` or `\n`) into the on-disk
// representation: the first line, plus indented continuation lines.
export const serializeContent = (
  content: string,
  indent: string = CONTINUATION_INDENT,
): { firstLine: string; continuation: string[] } => {
  const lines = content.replace(/<br>/g, '\n').split('\n');
  return {
    firstLine: lines[0] ?? '',
    continuation: lines.slice(1).map((line) => indent + line),
  };
};

// Build the full on-disk text block (bullet line + continuation lines) for a memo, given
// the bullet prefix and the internal content.
export const buildMemoBlockText = (prefix: string, content: string, indent: string = CONTINUATION_INDENT): string => {
  const { firstLine, continuation } = serializeContent(content, indent);
  return [prefix + firstLine, ...continuation].join('\n');
};

// Inline dataview-style state markers appended to a memo's bullet line on disk:
//   [deleted::20260615123014]  -> soft-deleted (recycle bin), timestamp = deletion time
//   [archived::true]           -> archived (hidden from list but still counted in stats)
export const DELETED_FIELD_REG = /\s*\[deleted::\s*([^\]]*)\]/;
export const ARCHIVED_FIELD_REG = /\s*\[archived::\s*true\s*\]/i;

// Strip the state markers out of a memo's content and report what was found.
export const parseMemoMarkers = (content: string): { content: string; deletedRaw: string; archived: boolean } => {
  const deletedMatch = content.match(DELETED_FIELD_REG);
  const archived = ARCHIVED_FIELD_REG.test(content);
  const cleanContent = content
    .replace(new RegExp(DELETED_FIELD_REG.source, 'g'), '')
    .replace(new RegExp(ARCHIVED_FIELD_REG.source, 'gi'), '');
  return { content: cleanContent, deletedRaw: deletedMatch ? deletedMatch[1].trim() : '', archived };
};

// Append a marker to a bullet line, avoiding duplicates.
export const appendMarker = (line: string, marker: string): string => {
  return line.replace(/\s*$/, '') + ' ' + marker;
};

export { getAllLinesFromFile, CONTINUATION_INDENT };
