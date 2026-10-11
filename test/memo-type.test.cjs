const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(name) {
  const filename = path.resolve(__dirname, '../src/helpers/' + name + '.ts');
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const target = new Module(filename, module);
  target.filename = filename;
  target.paths = Module._nodeModulePaths(path.dirname(filename));
  target.require = (id) => (id === './consts' ? load('consts') : require(id));
  target._compile(source, filename);
  return target.exports;
}
const { matchesMemoType } = load('memoType');
for (const [type, content, memoType, expected] of [
  ['TASK-TODO', 'plain task', 'TASK-TODO', true],
  ['TASK-TODO', 'completed task', 'TASK-DONE', false],
  ['TASK-DONE', 'completed task', 'TASK-DONE', true],
  ['TASK-TODO', '- [ ] nested task in a normal note', undefined, false],
  ['MOOD', 'some text [mood::🙂]', undefined, true],
  ['MOOD', 'some text 🙂', undefined, false],
  ['MOOD', '[mood::]', undefined, false],
  ['NOT_TAGGED', '#读书 first tag', undefined, false],
  ['NOT_TAGGED', 'text #工作', undefined, false],
  ['NOT_TAGGED', 'plain note', undefined, true],
  ['IMAGED', '![[photo.png]]', undefined, true],
  ['IMAGED', 'no image', undefined, false],
  ['LINKED', 'https://example.com/page', undefined, true],
  ['LINKED', 'no link', undefined, false],
  ['CONNECTED', '[@Related](202610110900)', undefined, true],
  ['CONNECTED', '[[normal wiki link]]', undefined, false],
]) {
  test(`${type}: ${content}`, () => {
    for (let run = 0; run < 3; run++) assert.equal(matchesMemoType({ content, memoType }, type), expected);
  });
}
