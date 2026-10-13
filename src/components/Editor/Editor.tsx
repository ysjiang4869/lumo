import { Notice, TFile } from 'obsidian';
import React, {
  forwardRef,
  ReactNode,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder as editorPlaceholder } from '@codemirror/view';
import { historyField } from '@codemirror/commands';
import { autocompletion, CompletionContext, completionKeymap } from '@codemirror/autocomplete';
import appContext from '../../stores/appContext';
import { storage } from '../../helpers/storage';
import { usedTags } from '../../obComponents/obTagSuggester';
import { getSuggestions } from '../../obComponents/obFileSuggester';
import appStore from '../../stores/appStore';
import { t } from '../../translations/helper';
import Feather from '../../icons/feather.svg?component';
import { livePreview } from './livePreview';
import { markdownEditing } from './markdownEditing';
import '../../less/editor.less';
import '../../less/live-editor.less';

export interface EditorRefActions {
  element: HTMLElement;
  focus: () => void;
  insertText: (text: string) => void;
  setContent: (text: string) => void;
  getContent: () => string;
  getSelection: () => { from: number; to: number };
  setSelection: (from: number, to?: number) => void;
  getCursorPosition: () => { x: number; y: number };
}

interface EditorProps {
  className: string;
  inputerType: string;
  initialContent: string;
  placeholder: string;
  showConfirmBtn: boolean;
  showCancelBtn: boolean;
  tools?: ReactNode;
  onConfirmBtnClick: (content: string) => boolean | void | Promise<boolean | void>;
  onCancelBtnClick: () => void;
  onContentChange: (content: string) => void;
}

function completeMemo(context: CompletionContext) {
  const tag = context.matchBefore(/#[^\s#]*$/);
  if (tag && (tag.from === 0 || /\s/.test(context.state.doc.sliceString(tag.from - 1, tag.from)))) {
    return {
      from: tag.from + 1,
      options: usedTags(tag.text.slice(1)).map(({ name, char }: { name: string; char: string }) => ({
        label: name,
        apply: char + ' ',
        type: 'keyword',
      })),
      validFor: /^[^\s#]*$/,
    };
  }
  const link = context.matchBefore(/\[\[[^\]\n]*$/);
  if (!link) return null;
  const { app } = appStore.getState().dailyNotesState;
  return {
    from: link.from,
    options: getSuggestions('[' + link.text.slice(2))
      .slice(0, 10)
      .map(({ file }: { file: TFile }) => ({
        label: file.basename,
        detail: file.path,
        type: 'text',
        apply: (view: EditorView, _completion: unknown, from: number, to: number) => {
          const text = app.fileManager.generateMarkdownLink(file, file.path, '', '');
          const end = view.state.doc.sliceString(to, to + 2) === ']]' ? to + 2 : to;
          view.dispatch({ changes: { from, to: end, insert: text }, selection: { anchor: from + text.length } });
        },
      })),
  };
}

const Editor = forwardRef<EditorRefActions, EditorProps>(function Editor(props, ref) {
  const {
    globalState: { useTinyUndoHistoryCache },
  } = useContext(appContext);
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorView>();
  const latest = useRef(props);
  latest.current = props;
  const cacheHistory = useRef(useTinyUndoHistoryCache);
  cacheHistory.current = useTinyUndoHistoryCache;
  const confirm = useRef<() => void>(() => undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [hasContent, setHasContent] = useState(Boolean(props.initialContent));

  useEffect(() => {
    if (!useTinyUndoHistoryCache && props.inputerType === 'memo') storage.remove(['liveEditorHistoryCache']);
  }, [useTinyUndoHistoryCache, props.inputerType]);

  useLayoutEffect(() => {
    if (!host.current) return;
    let saving = false;
    let destroyed = false;
    let cacheTimer: ReturnType<typeof setTimeout> | undefined;
    const persistHistory = () => {
      if (cacheHistory.current && latest.current.inputerType === 'memo' && editor.current) {
        storage.set({ liveEditorHistoryCache: editor.current.state.toJSON({ history: historyField }) });
      }
    };
    const extensions = [
      livePreview,
      EditorView.lineWrapping,
      editorPlaceholder(latest.current.placeholder),
      EditorView.contentAttributes.of({ 'aria-label': latest.current.placeholder, spellcheck: 'true' }),
      autocompletion({ override: [completeMemo] }),
      keymap.of([
        {
          key: 'Mod-Enter',
          run: () => {
            confirm.current();
            return true;
          },
        },
        ...completionKeymap,
      ]),
      markdownEditing,
      EditorView.domEventHandlers({
        keydown: (event) => {
          event.stopPropagation();
          return false;
        },
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const content = update.state.doc.toString();
          setHasContent(Boolean(content));
          latest.current.onContentChange(content);
          clearTimeout(cacheTimer);
          cacheTimer = setTimeout(persistHistory, 300);
        }
      }),
    ];
    const content = latest.current.initialContent;
    let state = EditorState.create({ doc: content, extensions });
    const cached = storage.get(['liveEditorHistoryCache']).liveEditorHistoryCache;
    if (cacheHistory.current && latest.current.inputerType === 'memo' && cached?.doc === content) {
      try {
        state = EditorState.fromJSON(cached, { extensions }, { history: historyField });
      } catch {
        // 损坏缓存不应阻止编辑器启动。
      }
    }
    const view = new EditorView({ state, parent: host.current });
    editor.current = view;
    confirm.current = async () => {
      const text = view.state.doc.toString();
      if (!text.trim() || view.composing || saving) return;
      saving = true;
      setIsSaving(true);
      try {
        const saved = await latest.current.onConfirmBtnClick(text);
        if (destroyed || saved === false) return;
        if (view.state.doc.toString() === text) {
          view.setState(EditorState.create({ extensions }));
          setHasContent(false);
        }
        latest.current.onContentChange(view.state.doc.toString());
        persistHistory();
      } catch (error) {
        new Notice(error instanceof Error ? error.message : String(error));
      } finally {
        saving = false;
        if (!destroyed) setIsSaving(false);
      }
    };
    return () => {
      destroyed = true;
      clearTimeout(cacheTimer);
      persistHistory();
      view.destroy();
      editor.current = undefined;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      get element() {
        return editor.current?.contentDOM ?? (host.current as HTMLElement);
      },
      focus: () => editor.current?.focus(),
      getContent: () => editor.current?.state.doc.toString() ?? '',
      getSelection: () => {
        const range = editor.current?.state.selection.main;
        return { from: range?.from ?? 0, to: range?.to ?? 0 };
      },
      setSelection: (from, to = from) => {
        const view = editor.current;
        if (view) {
          const limit = view.state.doc.length;
          view.dispatch({
            selection: { anchor: Math.max(0, Math.min(from, limit)), head: Math.max(0, Math.min(to, limit)) },
            scrollIntoView: true,
          });
        }
      },
      setContent: (text) => {
        const view = editor.current;
        if (view && view.state.doc.toString() !== text)
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: text },
            selection: { anchor: text.length },
          });
      },
      insertText: (text) => {
        const view = editor.current;
        if (view) {
          const { from, to } = view.state.selection.main;
          view.dispatch({
            changes: { from, to, insert: text },
            selection: { anchor: from + text.length },
            scrollIntoView: true,
          });
        }
      },
      getCursorPosition: () => {
        const view = editor.current;
        const coords = view?.coordsAtPos(view.state.selection.main.head);
        const parent = host.current?.offsetParent as HTMLElement | null;
        const bounds = parent?.getBoundingClientRect();
        return { x: (coords?.left ?? 0) - (bounds?.left ?? 0), y: (coords?.top ?? 0) - (bounds?.top ?? 0) };
      },
    }),
    [],
  );

  return (
    <div className={'common-editor-wrapper ' + props.className}>
      <div ref={host} className="common-editor-inputer lumo-live-editor" />
      <div className="common-tools-wrapper">
        <div className="common-tools-container">{props.tools}</div>
        <div className="btns-container">
          {props.showCancelBtn && (
            <button className="action-btn cancel-btn" onClick={() => latest.current.onCancelBtnClick()}>
              {t('CANCEL EDIT')}
            </button>
          )}
          {props.showConfirmBtn && (
            <button
              className="action-btn confirm-btn"
              aria-label={t('Record this moment')}
              disabled={!hasContent || isSaving}
              onClick={() => confirm.current()}
            >
              <Feather className="confirm-icon" />
              <span className="confirm-label">{t('Record this moment')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default Editor;
