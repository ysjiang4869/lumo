const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { EditorState } = require('@codemirror/state');
const { keymap } = require('@codemirror/view');
const { historyField, undo, redo } = require('@codemirror/commands');

// Load the exact TypeScript extension used by Editor, without a separate test bundle.
const filename = path.resolve(__dirname, '../src/components/Editor/markdownEditing.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const sourceModule = new Module(filename, module);
sourceModule.filename = filename;
sourceModule.paths = Module._nodeModulePaths(path.dirname(filename));
sourceModule._compile(compiled, filename);
const { markdownEditing } = sourceModule.exports;

function editor(doc, selection = { anchor: doc.length }) {
  const target = {
    state: EditorState.create({ doc, selection, extensions: markdownEditing }),
    dispatch(transaction) {
      target.state = transaction.state ?? target.state.update(transaction).state;
    },
  };
  return target;
}
function press(target, key) {
  const bindings = target.state.facet(keymap).flat();
  for (const binding of bindings) {
    if (binding.key === key && binding.run?.(target)) return;
  }
  assert.fail(`No handler accepted ${key}`);
}

for (const [before, after] of [
  ['- 第一项', '- 第一项\n- '],
  ['* 第一项', '* 第一项\n* '],
  ['+ 第一项', '+ 第一项\n+ '],
  ['9. 第九项', '9. 第九项\n10. '],
  ['1) 第一项', '1) 第一项\n2) '],
  ['- [ ] 待办', '- [ ] 待办\n- [ ] '],
  ['- [x] 已完成', '- [x] 已完成\n- [ ] '],
  ['- 第一项\n- ', '- 第一项\n'],
  ['1. 第一项\n2. ', '1. 第一项\n'],
  ['- [ ] ', ''],
  ['- 父级\n  - 子级', '- 父级\n  - 子级\n  - '],
  ['> 引用', '> 引用\n> '],
  ['普通文字', '普通文字\n'],
  ['```md\n- 代码里的符号', '```md\n- 代码里的符号\n'],
]) {
  test(`Enter: ${JSON.stringify(before)}`, () => {
    const target = editor(before);
    press(target, 'Enter');
    assert.equal(target.state.doc.toString(), after);
    assert.equal(target.state.selection.main.head, after.length);
  });
}

test('Shift-Enter inserts a plain line without list markup', () => {
  const target = editor('- 第一项');
  press(target, 'Shift-Enter');
  assert.equal(target.state.doc.toString(), '- 第一项\n');
});

test('Enter replaces a selection without continuing a list', () => {
  const target = editor('- 第一项', { anchor: 2, head: 5 });
  press(target, 'Enter');
  assert.equal(target.state.doc.toString(), '- \n');
});

test('Undo and redo restore a continued list and its cursor', () => {
  const target = editor('- 第一项');
  press(target, 'Enter');
  assert.equal(undo(target), true);
  assert.equal(target.state.doc.toString(), '- 第一项');
  assert.equal(redo(target), true);
  assert.equal(target.state.doc.toString(), '- 第一项\n- ');
});

test('Persisted draft retains its undo history after remount', () => {
  const target = editor('1. 第一项');
  press(target, 'Enter');
  const saved = target.state.toJSON({ history: historyField });
  target.state = EditorState.fromJSON(saved, { extensions: markdownEditing }, { history: historyField });
  assert.equal(undo(target), true);
  assert.equal(target.state.doc.toString(), '1. 第一项');
});
