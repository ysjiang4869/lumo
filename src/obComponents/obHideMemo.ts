import { moment } from 'obsidian';
import { getDailyNote } from 'obsidian-daily-notes-interface';
import dailyNotesService from '../services/dailyNotesService';
import appStore from '../stores/appStore';
import { getAllLinesFromFile, appendMarker, ARCHIVED_FIELD_REG } from './obMemoContent';

// Resolve the daily note file and bullet-line index encoded in a memo id (date + line index).
const locateBulletLine = (memoid: string): { file: any; idString: number } | null => {
  const { dailyNotes } = dailyNotesService.getState();
  const changeDate = moment(memoid.slice(0, 14), 'YYYYMMDDHHmmSS');
  const file = getDailyNote(changeDate, dailyNotes);
  const idString = parseInt(memoid.slice(14));
  if (!file || isNaN(idString)) {
    return null;
  }
  return { file, idString };
};

// Soft delete: append a [deleted::<ts>] marker so the memo drops out of the list/search/stats
// and shows up in the recycle bin, without leaving its daily note.
export async function obHideMemo(memoid: string): Promise<any> {
  if (!/\d{14,}/.test(memoid)) {
    return;
  }
  const { vault } = appStore.getState().dailyNotesState.app;
  const located = locateBulletLine(memoid);
  if (!located) {
    return;
  }
  const { file, idString } = located;
  const fileLines = getAllLinesFromFile(await vault.read(file));
  if (fileLines[idString] === undefined) {
    return;
  }
  const deleteTime = moment().format('YYYYMMDDHHmmss');
  fileLines[idString] = appendMarker(fileLines[idString], `[deleted::${deleteTime}]`);
  await vault.modify(file, fileLines.join('\n'));
  return moment().format('YYYY/MM/DD HH:mm:ss');
}

// Archive: append [archived::true] so the memo is hidden from the list/search but still counted
// in statistics.
export async function obArchiveMemo(memoid: string): Promise<any> {
  if (!/\d{14,}/.test(memoid)) {
    return;
  }
  const { vault } = appStore.getState().dailyNotesState.app;
  const located = locateBulletLine(memoid);
  if (!located) {
    return;
  }
  const { file, idString } = located;
  const fileLines = getAllLinesFromFile(await vault.read(file));
  if (fileLines[idString] === undefined) {
    return;
  }
  if (ARCHIVED_FIELD_REG.test(fileLines[idString])) {
    return true;
  }
  fileLines[idString] = appendMarker(fileLines[idString], `[archived::true]`);
  await vault.modify(file, fileLines.join('\n'));
  return true;
}
