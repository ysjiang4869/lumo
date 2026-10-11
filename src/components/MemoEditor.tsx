import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import appContext from '../stores/appContext';
import { dailyNotesService, globalStateService, locationService, memoService, resourceService } from '../services';
import utils from '../helpers/utils';
import { storage } from '../helpers/storage';
import Editor, { EditorRefActions } from './Editor/Editor';
import '../less/memo-editor.less';
import '../less/select-date-picker.less';
import Tag from '../icons/tag.svg?component';
import ImageSvg from '../icons/image.svg?component';
import JournalSvg from '../icons/journal.svg?component';
import TaskSvg from '../icons/checkbox-active.svg?component';
import Smile from '../icons/smile.svg?component';

const EMOJIS = [
  '😀',
  '😊',
  '😌',
  '🤔',
  '😍',
  '🥳',
  '😢',
  '😴',
  '😎',
  '🙏',
  '👍',
  '❤️',
  '🔥',
  '✨',
  '🎉',
  '☀️',
  '🌧️',
  '🌙',
  '☕',
  '🍜',
  '🏃',
  '💡',
  '📌',
  '✅',
];
import showEditorSvg from '../icons/show-editor.svg';
import { usePopper } from 'react-popper';
import { Placement } from '@popperjs/core';
import useState from 'react-usestateref';
import DatePicker from './common/DatePicker';
import { moment, Notice, Platform } from 'obsidian';
import { DefaultEditorLocation, DefaultPrefix, FocusOnEditor, InsertDateFormat, UseButtonToShowEditor } from '../memos';
import useToggle from '../hooks/useToggle';
import { LUMO_VIEW_TYPE } from '../constants';
import { t } from '../translations/helper';

interface Props {
  isBottomSheet?: boolean;
  onAfterSave?: () => void;
}

let isList: boolean;
let isEditor = false as boolean;
let isEditorGo = false as boolean;

const MemoEditor: React.FC<Props> = ({ isBottomSheet, onAfterSave }) => {
  const { globalState } = useContext(appContext);
  const { app } = dailyNotesService.getState();

  const [isListShown, toggleList] = useToggle(false);
  const [isEditorShown, toggleEditor] = useState(false);
  // 焦点展开：未获焦点且无内容时保持紧凑，获焦点后展开
  const [isFocused, setIsFocused] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerEmojis, setPickerEmojis, pickerEmojisRef] = useState<string[]>([]);

  const editorRef = useRef<EditorRefActions>(null);
  const prevGlobalStateRef = useRef(globalState);
  const onAfterSaveRef = useRef(onAfterSave);
  onAfterSaveRef.current = onAfterSave;

  // const [selected, setSelected] = useState<Date>();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [positionX, setPositionX] = useState(0);

  const popperRef = useRef<HTMLDivElement>(null);
  const [popperElement, setPopperElement] = useState(null);
  const [currentDateStamp] = useState(parseInt(moment().format('x')));

  // const [showDatePicker, toggleShowDatePicker] = useToggle(false);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    if (DefaultPrefix === 'List') {
      isList = false;
      toggleList(false);
    } else {
      isList = true;
      toggleList(true);
    }

    isEditor = false;

    // editorRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!editorRef.current || isBottomSheet) {
      return;
    }

    const leaves = app.workspace.getLeavesOfType(LUMO_VIEW_TYPE);
    let memosWidth;
    // let leafView;

    if (leaves.length > 0) {
      const leaf = leaves[0];
      // leafView = leaf.view.containerEl;
      memosWidth = leaf.width > 0 ? leaf.width : window.outerWidth;
    } else {
      // leafView = document;
      memosWidth = window.outerWidth;
    }

    if ((Platform.isMobile === true || memosWidth < 875) && UseButtonToShowEditor) {
      // if (isEditorGo === false) {
      toggleEditor(true);
      // }
    }

    if (FocusOnEditor) {
      editorRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (!editorRef.current || isBottomSheet) {
      return;
    }

    if (
      UseButtonToShowEditor === true &&
      DefaultEditorLocation === 'Bottom' &&
      Platform.isMobile === true &&
      window.innerWidth < 875
    ) {
      const leaves = app.workspace.getLeavesOfType(LUMO_VIEW_TYPE);
      let memosHeight;
      let leafView;
      if (leaves.length > 0) {
        const leaf = leaves[0];
        leafView = leaf.view.containerEl;
        memosHeight = leafView.offsetHeight;
      } else {
        leafView = document;
        memosHeight = window.innerHeight;
      }

      const divThis = document.createElement('img');
      const memoEditorDiv = leafView.querySelector(
        "div[data-type='lumo_view'] .view-content .memo-editor-wrapper",
      ) as HTMLElement;
      divThis.src = `${showEditorSvg}`;
      if (isEditorShown) {
        divThis.className = 'memo-show-editor-button hidden';
      } else {
        divThis.className = 'memo-show-editor-button';
      }
      const buttonTop = memosHeight - 200;
      const buttonLeft = window.innerWidth / 2 - 25;
      divThis.style.top = buttonTop + 'px';
      divThis.style.left = buttonLeft + 'px';

      divThis.onclick = function () {
        const scaleElementAni = divThis.animate(
          [
            // keyframes
            { transform: 'rotate(0deg) scale(1)' },
            { transform: 'rotate(60deg) scale(1.5)' },
          ],
          {
            // timing options
            duration: 300,
            iterations: Infinity,
          },
        );

        setTimeout(() => {
          divThis.className = 'memo-show-editor-button hidden';
          if (isEditor) {
            handleShowEditor(false);
            editorRef.current?.focus();
            scaleElementAni.reverse();
            // return;
          } else {
            handleShowEditor();
            editorRef.current?.focus();
            scaleElementAni.reverse();
          }

          // rotateElementAni.pause();
        }, 300);
      };
      leafView.querySelector('.content-wrapper').prepend(divThis);

      const memolistScroll = leafView.querySelector('.memolist-wrapper') as HTMLElement;
      memolistScroll.onscroll = function () {
        if (isEditor && !isEditorGo) {
          isEditorGo = true;
          const scaleEditorElementAni = memoEditorDiv.animate(
            [
              // keyframes
              { transform: 'scale(1)', opacity: 1 },
              { transform: 'scale(0.4)', opacity: 0 },
            ],
            {
              // timing options
              duration: 300,
              iterations: 1,
            },
          );
          let scaleOneElementAni: Animation;
          setTimeout(() => {
            scaleOneElementAni = divThis.animate(
              [
                // keyframes
                { transform: 'rotate(20deg) scale(1.5)' },
                { transform: 'rotate(0deg) scale(1)' },
              ],
              {
                // timing options
                duration: 100,
                iterations: 1,
              },
            );
          }, 300);
          setTimeout(() => {
            handleShowEditor(true);
            divThis.className = 'memo-show-editor-button';
          }, 300);
          setTimeout(() => {
            scaleOneElementAni.cancel();
            scaleEditorElementAni.reverse();
          }, 700);
        }
      };
    } else if (
      UseButtonToShowEditor === false &&
      DefaultEditorLocation === 'Bottom' &&
      Platform.isMobile === true &&
      window.innerWidth < 875
    ) {
      handleShowEditor(false);
      if (FocusOnEditor) {
        editorRef.current?.focus();
      }
    } else {
      if (!isEditor) {
        handleShowEditor(false);
      }
      if (FocusOnEditor) {
        editorRef.current?.focus();
      }
    }
  }, []);

  // Hooks must run once on every render, regardless of screen or editor position.
  let placement: Placement = 'right-end';
  let fallbackPlacement: Placement = 'bottom';
  const selectorWidth = 280;
  const spaceToRight = window.innerWidth - positionX;
  if (Platform.isMobile) {
    if (DefaultEditorLocation === 'Bottom') {
      placement =
        spaceToRight > selectorWidth * 1.2
          ? 'top-end'
          : spaceToRight < selectorWidth && positionX > selectorWidth
          ? 'top-start'
          : 'top';
      fallbackPlacement = placement === 'top-end' ? 'top-start' : placement === 'top-start' ? 'top-end' : 'top';
    } else {
      placement =
        spaceToRight > selectorWidth * 1.2
          ? 'right-end'
          : spaceToRight < selectorWidth && window.innerWidth > selectorWidth * 1.5
          ? 'left-end'
          : 'bottom';
      fallbackPlacement = placement === 'right-end' ? 'left-end' : placement === 'left-end' ? 'right-end' : 'bottom';
    }
  }
  const popper = usePopper(popperRef.current, popperElement, {
    placement,
    modifiers: [
      { name: 'flip', options: { allowedAutoPlacements: [fallbackPlacement], rootBoundary: 'document' } },
      { name: 'preventOverflow', options: { rootBoundary: 'document' } },
    ],
  });

  const closePopper = () => {
    setIsDatePickerOpen(false);
    // buttonRef?.current?.focus();
  };

  useEffect(() => {
    if (globalState.markMemoId) {
      const editorCurrentValue = editorRef.current?.getContent();
      const memoLinkText = `${editorCurrentValue ? '\n' : ''}${t('MARK')}: [@MEMO](${globalState.markMemoId})`;
      editorRef.current?.insertText(memoLinkText);
      globalStateService.setMarkMemoId('');
    }

    if (globalState.editMemoId && globalState.editMemoId !== prevGlobalStateRef.current.editMemoId) {
      const editMemo = memoService.getMemoById(globalState.editMemoId);
      if (editMemo) {
        const moods = Array.from(editMemo.content.matchAll(/\[mood::([^\]]+)\]/g)).map((m) => m[1]);
        setPickerEmojis(moods);
        const editContent = editMemo.content
          .replace(/<br>/g, '\n')
          .replace(/ \^\S{6}$/, '')
          .replace(/\s*\[mood::[^\]]*\]/g, '');
        editorRef.current?.setContent(editContent ?? '');
        editorRef.current?.focus();
      }
    }

    prevGlobalStateRef.current = globalState;
  }, [globalState.markMemoId, globalState.editMemoId]);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    // new TagsSuggest(app, editorRef.current.element);

    const handlePasteEvent = async (event: ClipboardEvent) => {
      if (event.clipboardData && event.clipboardData.files.length > 0) {
        event.preventDefault();
        const file = event.clipboardData.files[0];
        const url = await handleUploadFile(file);
        if (url) {
          editorRef.current?.insertText(url);
        }
      }
    };

    const handleDropEvent = async (event: DragEvent) => {
      if (event.dataTransfer && event.dataTransfer.files.length > 0) {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        const url = await handleUploadFile(file);
        if (url) {
          editorRef.current?.insertText(url);
        }
      }
    };

    const handleClickEvent = () => {
      handleContentChange(editorRef.current?.getContent() ?? '');
    };

    const handleKeyDownEvent = () => {
      setTimeout(() => {
        handleContentChange(editorRef.current?.getContent() ?? '');
      });
    };

    const element = editorRef.current.element;
    element.addEventListener('paste', handlePasteEvent);
    element.addEventListener('drop', handleDropEvent);
    element.addEventListener('click', handleClickEvent);
    element.addEventListener('keydown', handleKeyDownEvent);

    return () => {
      element.removeEventListener('paste', handlePasteEvent);
      element.removeEventListener('drop', handleDropEvent);
      element.removeEventListener('click', handleClickEvent);
      element.removeEventListener('keydown', handleKeyDownEvent);
    };
  }, [editorRef.current]);

  const handleUploadFile = useCallback(async (file: File) => {
    const { type } = file;

    if (!type.startsWith('image')) {
      return;
    }

    try {
      const image = await resourceService.upload(file);
      return `${image}`;
    } catch (error: any) {
      new Notice(error);
    }
  }, []);

  const handleSaveBtnClick = useCallback(async (content: string) => {
    if (content === '') {
      new Notice(t('Content cannot be empty'));
      return false;
    }

    const { editMemoId } = globalStateService.getState();
    content = content.replaceAll('&nbsp;', ' ');

    // 追加 picker 表情元数据
    const moods = pickerEmojisRef.current;
    if (moods.length > 0) {
      content = content + ' ' + moods.map((em) => `[mood::${em}]`).join(' ');
    }
    try {
      if (editMemoId) {
        const prevMemo = memoService.getMemoById(editMemoId);
        content = content + (prevMemo.hasId === '' ? '' : ' ^' + prevMemo.hasId);
        if (prevMemo && prevMemo.content !== content) {
          const editedMemo = await memoService.updateMemo(
            prevMemo.id,
            prevMemo.content,
            content,
            prevMemo.memoType,
            prevMemo.path,
          );
          editedMemo.updatedAt = utils.getDateTimeString(Date.now());
          memoService.editMemo(editedMemo);
        }
        globalStateService.setEditMemoId('');
      } else {
        const newMemo = await memoService.createMemo(content, isList);
        memoService.pushMemo(newMemo);
        // memoService.fetchAllMemos();
        locationService.clearQuery();
      }
    } catch (error: any) {
      new Notice(error.message);
      return false;
    }

    setPickerEmojis([]);
    setEditorContentCache('');
    onAfterSaveRef.current?.();
    return true;
  }, []);

  const handleCancelBtnClick = useCallback(() => {
    globalStateService.setEditMemoId('');
    editorRef.current?.setContent('');
    setPickerEmojis([]);
    setEditorContentCache('');
    onAfterSaveRef.current?.();
  }, []);

  const handleContentChange = useCallback((content: string) => {
    if (content.trim() === '') {
      content = '';
    }
    setEditorContentCache(content);
    setHasContent(content !== '');

    if (!editorRef.current) {
      return;
    }

    const currentValue = editorRef.current.getContent();
    const selectionStart = editorRef.current.getSelection().from;
    const prevString = currentValue.slice(0, selectionStart);
    const nextString = currentValue.slice(selectionStart);

    const atDateTrigger =
      (prevString.endsWith('@') || prevString.endsWith('📆')) && (nextString === '' || nextString.startsWith(' '));
    if (atDateTrigger) {
      requestAnimationFrame(() => {
        const current = editorRef.current;
        if (!current) return;
        const value = current.getContent();
        const cursor = current.getSelection().from;
        const before = value.slice(0, cursor);
        const after = value.slice(cursor);
        if ((before.endsWith('@') || before.endsWith('📆')) && (after === '' || after.startsWith(' '))) {
          updateDateSelectorPopupPosition();
          setIsDatePickerOpen(true);
        }
      });
    } else {
      setIsDatePickerOpen(false);
    }
  }, []);

  // const handleKeyPress = () => {
  //   console.log(handleKeyPress);
  // };

  const handleDateInsertTrigger = (date: number) => {
    if (!editorRef.current) {
      return;
    }

    if (date) {
      closePopper();
      isList = true;
      toggleList(true);
    }

    const currentValue = editorRef.current.getContent();
    const selectionStart = editorRef.current.getSelection().from;
    const prevString = currentValue.slice(0, selectionStart);
    const nextString = currentValue.slice(selectionStart);
    const todayMoment = moment(date);

    if (!prevString.endsWith('@')) {
      editorRef.current.setContent(prevString + todayMoment.format('YYYY-MM-DD') + nextString);
      editorRef.current.setSelection(selectionStart + 10, selectionStart + 10);
      editorRef.current.focus();
      handleContentChange(editorRef.current.getContent());
      return;
    } else {
      switch (InsertDateFormat) {
        case 'Dataview':
          editorRef.current.setContent(
            currentValue.slice(0, selectionStart - 1) + '[due::' + todayMoment.format('YYYY-MM-DD') + ']' + nextString,
          );
          editorRef.current.setSelection(selectionStart + 17, selectionStart + 17);
          editorRef.current.focus();
          handleContentChange(editorRef.current.getContent());
          break;
        case 'Tasks':
          editorRef.current.setContent(
            currentValue.slice(0, selectionStart - 1) + '📆' + todayMoment.format('YYYY-MM-DD') + nextString,
          );
          editorRef.current.setSelection(selectionStart + 11, selectionStart + 11);
          editorRef.current.focus();
          handleContentChange(editorRef.current.getContent());
      }
    }
  };

  // Toggle List OR TASK
  const handleChangeStatus = () => {
    if (!editorRef.current) {
      return;
    }

    if (isList) {
      isList = false;
      toggleList(false);
    } else {
      isList = true;
      toggleList(true);
    }
  };

  const handleShowEditor = (flag?: boolean) => {
    if (!editorRef.current) {
      return;
    }

    // Use flag to toggle editor show/hide
    if (isEditor || flag === true) {
      isEditor = false;
      toggleEditor(true);
    } else {
      isEditor = true;
      isEditorGo = false;
      toggleEditor(false);
    }
  };

  const handleTagTextBtnClick = useCallback(() => {
    if (!editorRef.current) {
      return;
    }

    const currentValue = editorRef.current.getContent();
    const selectionStart = editorRef.current.getSelection().from;
    const prevString = currentValue.slice(0, selectionStart);
    const nextString = currentValue.slice(selectionStart);

    let nextValue = prevString + '# ' + nextString;
    let cursorIndex = prevString.length + 1;

    if (prevString.endsWith('#') && nextString.startsWith(' ')) {
      nextValue = prevString.slice(0, prevString.length - 1) + nextString.slice(1);
      cursorIndex = prevString.length - 1;
    }

    editorRef.current.setContent(nextValue);
    editorRef.current.setSelection(cursorIndex, cursorIndex);

    editorRef.current.focus();
    handleContentChange(editorRef.current.getContent());
  }, []);

  const updateDateSelectorPopupPosition = useCallback(() => {
    if (!editorRef.current || !popperRef.current) {
      return;
    }

    const leaves = app.workspace.getLeavesOfType(LUMO_VIEW_TYPE);
    const leaf = leaves[0];
    const leafView = leaf.view.containerEl;

    const seletorPopupWidth = 280;
    const editorWidth = leafView.clientWidth;

    // positionX = editorWidth;

    const { x, y } = editorRef.current.getCursorPosition();
    // const left = x + seletorPopupWidth + 16 > editorWidth ? editorWidth + 20 - seletorPopupWidth : x + 2;
    let left: number;
    let top: number;
    if (!Platform.isMobile) {
      left = x + seletorPopupWidth + 16 > editorWidth ? x + 18 : x + 18;
      top = y + 34;
    } else {
      if (window.innerWidth - x > seletorPopupWidth) {
        left = x + seletorPopupWidth + 16 > editorWidth ? x + 18 : x + 18;
      } else if (window.innerWidth - x < seletorPopupWidth) {
        left = x + seletorPopupWidth + 16 > editorWidth ? x + 34 : x + 34;
      } else {
        left = editorRef.current.element.clientWidth / 2;
      }
      if (DefaultEditorLocation === 'Bottom' && window.innerWidth > 875) {
        top = y + 4;
      } else if (DefaultEditorLocation === 'Bottom' && window.innerWidth <= 875) {
        top = y + 19;
      } else if (DefaultEditorLocation === 'Top' && window.innerWidth <= 875) {
        top = y + 36;
      }
    }

    setPositionX(x);

    popperRef.current.style.left = `${left}px`;
    popperRef.current.style.top = `${top}px`;
  }, []);

  const handleUploadFileBtnClick = useCallback(() => {
    const inputEl = document.createElement('input');
    document.body.appendChild(inputEl);
    inputEl.type = 'file';
    inputEl.multiple = false;
    inputEl.accept = 'image/png, image/gif, image/jpeg';
    inputEl.onchange = async () => {
      if (!inputEl.files || inputEl.files.length === 0) {
        return;
      }

      const file = inputEl.files[0];
      const url = await handleUploadFile(file);
      if (url) {
        editorRef.current?.insertText(url);
      }
      document.body.removeChild(inputEl);
    };
    inputEl.click();
  }, []);

  const showEditStatus = Boolean(globalState.editMemoId);

  const editorConfig = useMemo(
    () => ({
      className: 'memo-editor',
      inputerType: 'memo',
      initialContent: getEditorContentCache(),
      placeholder: t('Write something, capture how you feel right now…'),
      showConfirmBtn: true,
      showCancelBtn: showEditStatus,
      showTools: true,
      onConfirmBtnClick: handleSaveBtnClick,
      onCancelBtnClick: handleCancelBtnClick,
      onContentChange: handleContentChange,
    }),
    [showEditStatus],
  );

  const expanded = isBottomSheet || isFocused || hasContent || showEditStatus;

  const handleEditorFocus = () => setIsFocused(true);

  const handleEditorBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // 焦点仍在卡片内（如点表情面板）不收起
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    if (hasContent || showEditStatus) {
      return;
    }
    setIsFocused(false);
    setShowEmojiPicker(false);
  };

  // 点击工具（非输入元素）时保留文本框焦点，避免误收起
  const keepEditorFocus = (e: React.MouseEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
      e.preventDefault();
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    setPickerEmojis([...pickerEmojisRef.current, emoji]);
    setShowEmojiPicker(false);
    editorRef.current?.focus();
  };

  const removePickerEmoji = (idx: number) => {
    setPickerEmojis(pickerEmojisRef.current.filter((_, i) => i !== idx));
  };

  return (
    <div
      className={`memo-editor-wrapper ${expanded ? 'expanded' : ''} ${showEditStatus ? 'edit-ing' : ''} ${
        isEditorShown && !isBottomSheet ? 'hidden' : ''
      }`}
      onFocus={handleEditorFocus}
      onBlur={handleEditorBlur}
    >
      <p className={`tip-text ${showEditStatus ? '' : 'hidden'}`}>Modifying...</p>
      <Editor
        ref={editorRef}
        {...editorConfig}
        tools={
          <div className="lumo-tools" onMouseDown={keepEditorFocus}>
            <span className="lumo-emoji-wrapper">
              <button
                type="button"
                className="action-btn emoji-btn"
                aria-label="emoji"
                onClick={() => setShowEmojiPicker((v) => !v)}
              >
                <Smile />
              </button>
              {pickerEmojis.length > 0 && (
                <span className="lumo-mood-chips">
                  {pickerEmojis.map((em, i) => (
                    <span key={i} className="lumo-mood-chip" title="点击移除" onClick={() => removePickerEmoji(i)}>
                      {em}
                    </span>
                  ))}
                </span>
              )}
              {showEmojiPicker && (
                <div className="lumo-emoji-popup">
                  {EMOJIS.map((em) => (
                    <button type="button" key={em} className="lumo-emoji-item" onClick={() => handleInsertEmoji(em)}>
                      {em}
                    </button>
                  ))}
                </div>
              )}
            </span>
            <Tag className="action-btn add-tag" onClick={handleTagTextBtnClick} />
            <ImageSvg className="action-btn file-upload" onClick={handleUploadFileBtnClick} />
            {!isListShown ? (
              <JournalSvg className="action-btn list-or-task" onClick={handleChangeStatus} />
            ) : (
              <TaskSvg className="action-btn list-or-task" onClick={handleChangeStatus} />
            )}
          </div>
        }
      />
      <div ref={popperRef} className="date-picker">
        {isDatePickerOpen && (
          // <FocusTrap
          //   active
          //   focusTrapOptions={{
          //     initialFocus: false,
          //     allowOutsideClick: true,
          //     clickOutsideDeactivates: true,
          //     onDeactivate: closePopper,
          //   }}
          // >
          <div
            tabIndex={-1}
            style={popper.styles.popper}
            {...popper.attributes.popper}
            ref={setPopperElement}
            role="dialog"
          >
            <DatePicker
              className={`editor-date-picker ${isDatePickerOpen ? '' : 'hidden'}`}
              datestamp={currentDateStamp}
              handleDateStampChange={handleDateInsertTrigger}
            />
            {/* <DayPicker
                initialFocus={isPopperOpen}
                mode="single"
                defaultMonth={selected}
                selected={selected}
                onSelect={handleDateInsertTrigger}
                onKeyPress={handleKeyPress}
              /> */}
          </div>
          // </FocusTrap>
        )}
      </div>
    </div>
  );
};

function getEditorContentCache(): string {
  return storage.get(['editorContentCache']).editorContentCache ?? '';
}

function setEditorContentCache(content: string) {
  storage.set({
    editorContentCache: content,
  });
}

export default MemoEditor;
