import { moment } from 'obsidian';
import { getDailyNote } from 'obsidian-daily-notes-interface';
import appStore from '../stores/appStore';
import dailyNotesService from '../services/dailyNotesService';
import { getMemos } from './obGetMemos';
import { getAllLinesFromFile, findMemoBlockEnd, DELETED_FIELD_REG } from './obMemoContent';

// Deletion is now a soft, in-place operation: a memo carries a `[deleted::<ts>]` marker in
// its own daily note (the recycle bin is just the set of memos with that marker). Restore
// removes the marker; permanent delete removes the whole block.

// Resolve the daily note file and bullet-line index encoded in a memo id (date + line index).
const locateMemo = (memoid: string): { file: any; idString: number } | null => {
  const { dailyNotes } = dailyNotesService.getState();
  const changeDate = moment(memoid.slice(0, 14), 'YYYYMMDDHHmmSS');
  const file = getDailyNote(changeDate, dailyNotes);
  const idString = parseInt(memoid.slice(14));
  if (!file || isNaN(idString)) {
    return null;
  }
  return { file, idString };
};

// Recycle bin contents: every memo that currently carries a [deleted::ts] marker.
export async function getDeletedMemos(): Promise<any[]> {
  const result = await getMemos();
  return result?.deletedMemos ?? [];
}

// Restore a memo by stripping its [deleted::ts] marker from the bullet line.
export async function restoreDeletedMemo(memoid: string): Promise<any[]> {
  if (!/\d{14,}/.test(memoid)) {
    return;
  }
  const { vault } = appStore.getState().dailyNotesState.app;
  const located = locateMemo(memoid);
  if (!located) {
    return;
  }
  const { file, idString } = located;
  const fileLines = getAllLinesFromFile(await vault.read(file));
  if (fileLines[idString] === undefined) {
    return;
  }
  fileLines[idString] = fileLines[idString].replace(new RegExp(DELETED_FIELD_REG.source, 'g'), '');
  await vault.modify(file, fileLines.join('\n'));
  return [{ deletedAt: '' }];
}

// Permanently remove a memo: delete its whole block (bullet line + continuation lines).
export async function deleteForever(memoid: string): Promise<void> {
  if (!/\d{14,}/.test(memoid)) {
    return;
  }
  const { vault } = appStore.getState().dailyNotesState.app;
  const located = locateMemo(memoid);
  if (!located) {
    return;
  }
  const { file, idString } = located;
  const fileLines = getAllLinesFromFile(await vault.read(file));
  if (fileLines[idString] === undefined) {
    return;
  }
  const blockEnd = findMemoBlockEnd(fileLines, idString);
  const newLines = [...fileLines.slice(0, idString), ...fileLines.slice(blockEnd + 1)];
  await vault.modify(file, newLines.join('\n'));
}
