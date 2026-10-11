import { keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentLess, indentMore, insertNewline } from '@codemirror/commands';
import {
  deleteMarkupBackward,
  insertNewlineContinueMarkupCommand,
  markdown,
  markdownLanguage,
} from '@codemirror/lang-markdown';

// Shared by the live editor and its keyboard regression tests.
export const markdownEditing = [
  markdown({ base: markdownLanguage, addKeymap: false }),
  history(),
  keymap.of([
    { key: 'Enter', run: insertNewlineContinueMarkupCommand({ nonTightLists: false }) },
    { key: 'Shift-Enter', run: insertNewline },
    { key: 'Backspace', run: deleteMarkupBackward },
    { key: 'Tab', run: indentMore },
    { key: 'Shift-Tab', run: indentLess },
    ...defaultKeymap,
    ...historyKeymap,
  ]),
];
