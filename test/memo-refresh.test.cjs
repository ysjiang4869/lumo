const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function setup() {
  let state = { memos: [{ id: 'existing', content: 'Existing note' }], commentMemos: [] };
  const requests = [];
  const actions = [];
  const store = {
    getState: () => ({ memoState: state }),
    dispatch(action) {
      actions.push(action.type);
      if (action.type === 'SET_MEMOS') state = { ...state, memos: action.payload.memos };
      if (action.type === 'SET_COMMENT_MEMOS') state = { ...state, commentMemos: action.payload.commentMemos };
      if (action.type === 'INSERT_MEMO') state = { ...state, memos: [action.payload.memo, ...state.memos] };
      if (action.type === 'INSERT_COMMENT_MEMO')
        state = { ...state, commentMemos: [action.payload.memo, ...state.commentMemos] };
      if (action.type === 'EDIT_MEMO')
        state = { ...state, memos: state.memos.map((memo) => (memo.id === action.payload.id ? action.payload : memo)) };
    },
  };
  const api = {
    getMyMemos: () =>
      new Promise((resolve, reject) => {
        requests.push({ resolve, reject });
      }),
  };
  const filename = path.resolve(__dirname, '../src/services/memoService.ts');
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const target = new Module(filename, module);
  target.filename = filename;
  target.require = (id) => {
    if (id === '../helpers/api') return { default: api };
    if (id === '../stores/appStore') return { default: store };
    return {};
  };
  target._compile(compiled, filename);
  return { service: target.exports.default, requests, actions };
}

test('a refresh started before saving cannot remove the newly inserted card', async () => {
  const { service, requests, actions } = setup();
  const oldSnapshot = [...service.getState().memos];
  const refresh = service.fetchAllMemos();
  service.pushMemo({ id: 'new', content: 'Just saved' });
  requests[0].resolve({ memos: oldSnapshot, commentMemos: [] });
  await refresh;
  assert.deepEqual(service.getState().memos.map((memo) => memo.id), ['new', 'existing']);
  assert.deepEqual(actions, ['INSERT_MEMO']);

  const nextRefresh = service.fetchAllMemos();
  requests[1].resolve({ memos: [...service.getState().memos], commentMemos: [] });
  await nextRefresh;
  assert.equal(service.getState().memos.length, 2);
  assert.equal(service.initialized, true);
});

test('an older slow refresh cannot overwrite a newer completed refresh', async () => {
  const { service, requests } = setup();
  const first = service.fetchAllMemos();
  const second = service.fetchAllMemos();
  const latest = [{ id: 'latest', content: 'Latest data' }];
  const comments = [{ id: 'comment', content: 'Latest comment' }];
  requests[1].resolve({ memos: latest, commentMemos: comments });
  await second;
  requests[0].resolve({ memos: [], commentMemos: [] });
  await first;
  assert.deepEqual(service.getState(), { memos: latest, commentMemos: comments });
});

test('a pending refresh cannot revert a local edit', async () => {
  const { service, requests } = setup();
  const oldSnapshot = [...service.getState().memos];
  const refresh = service.fetchAllMemos();
  service.editMemo({ id: 'existing', content: 'Edited content' });
  requests[0].resolve({ memos: oldSnapshot, commentMemos: [] });
  await refresh;
  assert.equal(service.getState().memos[0].content, 'Edited content');
});

test('a pending refresh cannot remove a newly saved comment', async () => {
  const { service, requests } = setup();
  const refresh = service.fetchAllMemos();
  service.pushCommentMemo({ id: 'comment', content: 'Just commented' });
  requests[0].resolve({ memos: [], commentMemos: [] });
  await refresh;
  assert.equal(service.getState().commentMemos[0].id, 'comment');
});

test('a current empty snapshot still removes notes deleted from disk', async () => {
  const { service, requests } = setup();
  const refresh = service.fetchAllMemos();
  requests[0].resolve({ memos: [], commentMemos: [] });
  await refresh;
  assert.deepEqual(service.getState().memos, []);
});

test('a failed refresh keeps the currently visible cards', async () => {
  const { service, requests } = setup();
  const refresh = service.fetchAllMemos();
  requests[0].reject(new Error('Read failed'));
  await assert.rejects(refresh, /Read failed/);
  assert.equal(service.getState().memos[0].id, 'existing');
});
