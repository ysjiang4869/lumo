import React, { memo, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import useState from 'react-usestateref';
import utils, { getDailyNoteFormat } from '../helpers/utils';
import useToggle from '../hooks/useToggle';
import { globalStateService, memoService, resourceService } from '../services';
import showMemoCardDialog from './MemoCardDialog';
import showShareMemoImageDialog from './ShareMemoImageDialog';
import '../less/memo.less';
import { moment, Notice, Platform } from 'obsidian';
import { showMemoInDailyNotes } from '../obComponents/obShowMemo';
import More from '../icons/more.svg?component';
import Pin from '../icons/pin.svg?component';
import Comment from '../icons/comment.svg?component';
import TaskBlank from '../icons/task-blank.svg?component';
import Task from '../icons/task.svg?component';
import {
  CommentOnMemos,
  CommentsInOriginalNotes,
  DefaultEditorLocation,
  ShowCommentOnMemos,
  ShowTaskLabel,
  UseButtonToShowEditor,
} from '../memos';
import { t } from '../translations/helper';
import Editor, { EditorRefActions } from './Editor/Editor';
import MemoImage from './MemoImage';
import MemoContent from './MemoContent';
import appContext from '../stores/appContext';

// interface LinkedMemo extends FormattedMemo {
//   dateStr: string;
// }

interface Props {
  memo: Model.Memo;
}

// Get Current Memos And Change it

const Memo: React.FC<Props> = (props: Props) => {
  const { globalState } = useContext(appContext);
  const { memo: propsMemo } = props;
  const [showConfirmDeleteBtn, toggleConfirmDeleteBtn] = useToggle(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const memoCommentRef = useRef<EditorRefActions>(null);
  const commentDraft = useRef('');
  const pendingComment = useRef<string | null>(null);
  const [isCommentShown, toggleComment] = useToggle(false);
  const [isCommentListShown, toggleCommentList] = useToggle(ShowCommentOnMemos);
  const [commentMemos, setCommentMemos, commentMemosRef] = useState<Model.Memo[]>([]);
  const [, setAddRandomIDflag, RandomIDRef] = useState(false);
  useEffect(() => {
    if (!isMenuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMenuOpen]);
  // const imageUrls = Array.from(memo.content.match(IMAGE_URL_REG) ?? []);

  useEffect(() => {
    if (!CommentOnMemos) {
      return;
    }

    const fetchCommentMemos = async () => {
      // console.log(memoService.getState().commentMemos);
      const allCommentMemos = memoService
        .getState()
        .commentMemos.filter((m) => m.linkId === propsMemo.hasId)
        .sort((a, b) => utils.getTimeStampByDate(b.createdAt) - utils.getTimeStampByDate(a.createdAt));
      // if (allCommentMemos !== memoState.commentMemos) {
      setCommentMemos(allCommentMemos);
      // }
    };

    fetchCommentMemos();
  }, [propsMemo.content, propsMemo.id, propsMemo.hasId]);

  useEffect(() => {
    if (!memoCommentRef.current) {
      return;
    }

    if (pendingComment.current !== null) {
      memoCommentRef.current.setContent(pendingComment.current);
      pendingComment.current = null;
    }
    memoCommentRef.current.focus();

    const handlePasteEvent = async (event: ClipboardEvent) => {
      if (event.clipboardData && event.clipboardData.files.length > 0) {
        event.preventDefault();
        const file = event.clipboardData.files[0];
        const url = await handleUploadFile(file);
        if (url) {
          memoCommentRef.current?.insertText(url);
        }
      }
    };

    const handleDropEvent = async (event: DragEvent) => {
      if (event.dataTransfer && event.dataTransfer.files.length > 0) {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        const url = await handleUploadFile(file);
        if (url) {
          memoCommentRef.current?.insertText(url);
        }
      }
    };

    const handleClickEvent = () => {
      handleContentChange(memoCommentRef.current?.getContent() ?? '');
    };

    const handleKeyDownEvent = () => {
      setTimeout(() => {
        handleContentChange(memoCommentRef.current?.getContent() ?? '');
      });
    };

    const element = memoCommentRef.current.element;
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
  }, [isCommentShown]);

  const handleCancelBtnClick = useCallback(() => {
    globalStateService.setCommentMemoId('');
    memoCommentRef.current?.setContent('');
    toggleComment(false);
    // setEditorContentCache('');
  }, []);

  const handleContentChange = useCallback((content: string) => {
    commentDraft.current = content;
  }, []);

  const handleSaveBtnClick = useCallback(async (content: string) => {
    if (content === '') {
      new Notice(t('Content cannot be empty'));
      return false;
    }

    const { commentMemoId } = globalStateService.getState();
    content = content.replaceAll('&nbsp;', ' ');
    globalStateService.setChangedByMemos(true);
    try {
      if (commentMemoId) {
        let prevMemo: Model.Memo;
        if (CommentOnMemos && CommentsInOriginalNotes) {
          prevMemo = memoService.getCommentMemoById(commentMemoId);
          // console.log(prevMemo);
          content = moment().format('YYYYMMDDHHmmss') + ' ' + content;
        } else {
          prevMemo = memoService.getMemoById(commentMemoId);
          // console.log(prevMemo);
          content = prevMemo.content.replace(/^(.*) comment:/g, content + ' comment:');
        }

        // console.log(content);

        // console.log(m);

        if (prevMemo && prevMemo.content !== content) {
          let editedMemo: Model.Memo;
          if (CommentOnMemos && CommentsInOriginalNotes) {
            editedMemo = await memoService.updateMemo(
              prevMemo.id,
              prevMemo.content,
              content,
              prevMemo.memoType,
              prevMemo.path,
            );
          } else {
            editedMemo = await memoService.updateMemo(prevMemo.id, prevMemo.content, content, prevMemo.memoType);
          }
          if (CommentOnMemos && CommentsInOriginalNotes) {
            memoService.editCommentMemo(editedMemo);
          } else {
            editedMemo.updatedAt = utils.getDateTimeString(Date.now());
            memoService.editMemo(editedMemo);
          }

          setCommentMemos(
            commentMemosRef.current.map((m) => {
              // console.log(m);
              if (m.id.slice(14) === commentMemoId.slice(14) && m.path === prevMemo.path) {
                return editedMemo;
              }
              return m;
            }),
          );
        }

        globalStateService.setCommentMemoId('');
        toggleComment(false);
      } else {
        const dailyFormat = getDailyNoteFormat();
        let randomId: string;
        if (propsMemo.hasId.length > 0) {
          randomId = propsMemo.hasId;
        } else if (!CommentsInOriginalNotes) {
          randomId = Math.random().toString(36).slice(-6);
          setAddRandomIDflag(true);
        }

        if (!CommentsInOriginalNotes) {
          content =
            content + ' comment: [[' + moment(propsMemo.id.slice(0, 8)).format(dailyFormat) + '#^' + randomId + ']]';
        }

        // setEditorContentCache('');

        let newMemo: Model.Memo;
        if (CommentsInOriginalNotes) {
          newMemo = await memoService.createCommentMemo(content, true, propsMemo.path, propsMemo.id, randomId);
          memoService.pushCommentMemo(newMemo);
        } else {
          newMemo = await memoService.createMemo(content, true);
          memoService.pushMemo(newMemo);
        }
        // const newCommentMemos = commentMemosRef.current;
        // newCommentMemos.push(newMemo);
        // console.log(newCommentMemos.current);
        setCommentMemos(
          [...commentMemosRef.current, newMemo].sort(
            (a, b) => utils.getTimeStampByDate(b.createdAt) - utils.getTimeStampByDate(a.createdAt),
          ),
        );
        // setCommentMemos(
        //   newCommentMemos.current.sort(
        //     (a, b) => utils.getTimeStampByDate(b.createdAt) - utils.getTimeStampByDate(a.createdAt),
        //   ),
        // );
        if (RandomIDRef.current) {
          const editedMemo = await memoService.updateMemo(
            propsMemo.id,
            propsMemo.content,
            propsMemo.content + ' ^' + randomId,
            propsMemo.memoType,
          );
          editedMemo.updatedAt = utils.getDateTimeString(Date.now());
          memoService.editMemo(editedMemo);
          setAddRandomIDflag(false);
        }
      }
    } catch (error: any) {
      new Notice(error.message);
      return false;
    }

    commentDraft.current = '';
    return true;
    // globalStateService.setChangedByMemos(false);
    // setEditorContentCache('');
  }, [propsMemo]);

  const handleUploadFile = useCallback(async (file: File) => {
    const { type } = file;

    if (!type.startsWith('image')) {
      return;
    }

    try {
      const image = await resourceService.upload(file);
      const url = `${image}`;

      return url;
    } catch (error: any) {
      new Notice(error);
    }
  }, []);

  const handleShowMemoStoryDialog = () => {
    showMemoCardDialog(propsMemo);
  };

  const focusMobileComposer = () => {
    if (!Platform.isMobile) return;
    // Focus within the tap gesture so iOS can open the keyboard, including when
    // reopening the same memo after collapsing its draft.
    menuRef.current
      ?.closest("div[data-type='lumo_view']")
      ?.querySelector<HTMLElement>('.lumo-mobile-composer .cm-content')
      ?.focus({ preventScroll: true });
  };

  const handleMarkMemoClick = () => {
    if (UseButtonToShowEditor && DefaultEditorLocation === 'Bottom') {
      const elem = document.querySelector(
        "div[data-type='lumo_view'] .view-content .memo-show-editor-button",
      ) as HTMLElement;
      if (typeof elem?.onclick == 'function') {
        elem.onclick.apply(elem);
      }
    }

    globalStateService.setMarkMemoId(propsMemo.id);
    focusMobileComposer();
  };

  const handleEditMemoClick = () => {
    if (UseButtonToShowEditor && DefaultEditorLocation === 'Bottom' && Platform.isMobile) {
      const elem = document.querySelector(
        "div[data-type='lumo_view'] .view-content .memo-show-editor-button",
      ) as HTMLElement;
      if (typeof elem?.onclick == 'function') {
        elem.onclick.apply(elem);
      }
    }

    globalStateService.setEditMemoId(propsMemo.id);
    focusMobileComposer();
  };

  const handleSourceMemoClick = (m: Model.Memo) => {
    showMemoInDailyNotes(m.id, m.path);
  };

  // const handleCreateNewNoteClick = () => {
  //   turnIntoNote(memo.id);
  // };

  const handleDeleteMemoClick = async () => {
    if (showConfirmDeleteBtn) {
      try {
        await memoService.hideMemoById(propsMemo.id);
      } catch (error: any) {
        new Notice(error.message);
      }

      if (globalStateService.getState().editMemoId === propsMemo.id) {
        globalStateService.setEditMemoId('');
      }
    } else {
      toggleConfirmDeleteBtn();
    }
  };

  const handleArchiveMemoClick = async () => {
    try {
      await memoService.archiveMemoById(propsMemo.id);
      new Notice(t('ARCHIVE SUCCEED'));
    } catch (error: any) {
      new Notice(error.message);
    }

    if (globalStateService.getState().editMemoId === propsMemo.id) {
      globalStateService.setEditMemoId('');
    }
  };

  const handleTogglePinClick = async () => {
    try {
      await memoService.pinMemoById(propsMemo.id, !propsMemo.pinned);
    } catch (error: any) {
      new Notice(error.message);
    }
  };

  const handleMouseLeaveMemoWrapper = () => {
    if (showConfirmDeleteBtn) {
      toggleConfirmDeleteBtn(false);
    }
  };

  const handleGenMemoImageBtnClick = () => {
    showShareMemoImageDialog(propsMemo);
  };

  const handleMemoTypeShow = () => {
    if (!ShowTaskLabel) {
      return;
    }

    if (propsMemo.memoType === 'TASK-TODO') {
      return <TaskBlank />;
    } else if (propsMemo.memoType === 'TASK-DONE') {
      return <Task />;
    }
  };

  // const handleMemoKeyDown = useCallback((event: React.MouseEvent, m) => {
  //   if (event.ctrlKey || event.metaKey) {
  //     handleSourceMemoClick(m);
  //   }
  // }, []);

  const handleMemoDoubleClick = useCallback((event: React.MouseEvent) => {
    if (event) {
      handleEditMemoClick();
    }
  }, []);

  const handleMemoContentClick = async (e: React.MouseEvent, m: Model.Memo) => {
    const targetEl = e.target as HTMLElement;

    if (e.ctrlKey || e.metaKey) {
      handleSourceMemoClick(m);
    }

    if (targetEl.className === 'memo-link-text') {
      const memoId = targetEl.dataset?.value;
      const memoTemp = memoService.getMemoById(memoId ?? '');

      if (memoTemp) {
        showMemoCardDialog(memoTemp);
      } else {
        new Notice('MEMO Not Found');
        targetEl.classList.remove('memo-link-text');
      }
    } else if (targetEl.className === 'todo-block') {
      // do nth
    }
  };

  const handleCommentBlock = () => {
    if (!isCommentShown) {
      toggleComment(true);
    } else {
      toggleComment(false);
    }
    if (!isCommentListShown) {
      toggleCommentList(true);
    } else if (!ShowCommentOnMemos && isCommentListShown) {
      toggleCommentList(false);
    }
  };

  const handleEditCommentClick = useCallback((memo: Model.Memo) => {
    if (!CommentOnMemos) {
      return;
    }

    globalStateService.setCommentMemoId(memo.id);
    // console.log(Boolean(globalStateService.getState().commentMemoId));
    // console.log(globalStateService.getState().commentMemoId);

    if (!isCommentShown) {
      toggleComment(true);
    }
    const content = memo.content.replace(/ comment: (.*)$/g, '').replace(/^\d{14} /g, '');
    if (memoCommentRef.current) {
      memoCommentRef.current.setContent(content);
      memoCommentRef.current.focus();
    } else {
      pendingComment.current = content;
    }
  }, []);

  const showEditStatus = Boolean(globalState.commentMemoId);

  const { cardDateStr, cardPeriod } = useMemo(() => {
    const d = new Date(utils.getTimeStampByDate(propsMemo.createdAt));
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const wk = WEEKDAYS[d.getDay()];
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return { cardDateStr: `${y}.${mo}.${day}`, cardPeriod: `${wk} · ${hh}:${mm}` };
  }, [propsMemo.createdAt]);

  const moodEmojis = useMemo(() => {
    return Array.from(propsMemo.content.matchAll(/\[mood::([^\]]+)\]/g)).map((m) => m[1]);
  }, [propsMemo.content]);

  const editorConfig = useMemo(
    () => ({
      className: 'memo-editor',
      inputerType: 'commentMemo',
      initialContent: '',
      placeholder: t('Comment it...'),
      showConfirmBtn: true,
      showCancelBtn: showEditStatus,
      showTools: true,
      onConfirmBtnClick: handleSaveBtnClick,
      onCancelBtnClick: handleCancelBtnClick,
      onContentChange: handleContentChange,
    }),
    [globalState.commentMemoId, handleSaveBtnClick],
  );

  const imageProps = {
    memo: propsMemo.content,
  };

  return (
    <div
      className={`memo-wrapper ${'memos-' + propsMemo.id} ${propsMemo.memoType} ${
        propsMemo.pinned ? 'memo-pinned' : ''
      }`}
      onMouseLeave={handleMouseLeaveMemoWrapper}
    >
      <div className="memo-top-wrapper">
        <div className="memo-top-left-wrapper">
          <button
            type="button"
            className="memo-card-time"
            onClick={handleShowMemoStoryDialog}
            draggable="true"
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', propsMemo.content.replace(/<br>/g, '\n'));
            }}
          >
            <span className="memo-card-date">{cardDateStr}</span>
            <span className="memo-card-period">{cardPeriod}</span>
          </button>
          <div className={`memo-type-img ${ShowTaskLabel ? '' : 'hidden'}`}>
            {handleMemoTypeShow() ?? ''}
            <span>
              {propsMemo.memoType === 'TASK-TODO'
                ? t('To-do')
                : propsMemo.memoType === 'TASK-DONE'
                ? t('Completed')
                : t('Record')}
            </span>
          </div>
          {propsMemo.pinned && <span className="lumo-pinned-label">{t('Pinned')}</span>}
        </div>
        <div className="memo-top-right-wrapper">
          {CommentOnMemos ? (
            <div className="comment-button-wrapper">
              {/*<img className="comment-logo" onClick={handleCommentBlock} src={} alt="memo-comment" />*/}
              <Comment className="icon-img" onClick={handleCommentBlock} />
              {commentMemos.length > 0 ? <div className="comment-text-count">{commentMemos.length}</div> : null}
            </div>
          ) : (
            ''
          )}
          <button
            type="button"
            className={`btn pin-btn ${propsMemo.pinned ? 'pinned' : ''}`}
            onClick={handleTogglePinClick}
            aria-label={propsMemo.pinned ? t('UNPIN') : t('PIN')}
            aria-pressed={Boolean(propsMemo.pinned)}
          >
            <Pin className="icon-img" />
          </button>
          <div
            className={`btns-container ${isMenuOpen ? 'is-menu-open' : ''}`}
            ref={menuRef}
            onMouseEnter={() => setMenuOpen(true)}
            onMouseLeave={(event) => {
              if (!event.currentTarget.contains(document.activeElement)) setMenuOpen(false);
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) setMenuOpen(false);
            }}
          >
            <button
              type="button"
              className="btn more-action-btn"
              aria-label={t('Menu')}
              aria-expanded={isMenuOpen}
              onClick={() => setMenuOpen(true)}
            >
              {/*<img className="icon-img" src={more} />*/}
              <More className="icon-img" />
            </button>
            <div className="more-action-btns-wrapper">
              <div className="more-action-btns-container">
                <button type="button" className="btn" onClick={handleShowMemoStoryDialog}>
                  {t('READ')}
                </button>
                <button type="button" className="btn" onClick={handleMarkMemoClick}>
                  {t('MARK')}
                </button>
                <button type="button" className="btn" onClick={handleGenMemoImageBtnClick}>
                  {t('SHARE')}
                </button>
                <button type="button" className="btn" onClick={handleEditMemoClick}>
                  {t('EDIT')}
                </button>
                <button type="button" className="btn" onClick={() => handleSourceMemoClick(propsMemo)}>
                  {t('SOURCE')}
                </button>
                <button type="button" className="btn" onClick={handleArchiveMemoClick}>
                  {t('ARCHIVE')}
                </button>
                <button
                  type="button"
                  className={`btn delete-btn ${showConfirmDeleteBtn ? 'final-confirm' : ''}`}
                  onClick={handleDeleteMemoClick}
                >
                  {showConfirmDeleteBtn ? t('CONFIRM！') : t('DELETE')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {moodEmojis.length > 0 && (
        <div className="memo-card-meta">
          {moodEmojis.map((em, i) => (
            <span key={i} className="memo-card-mood">
              {em}
            </span>
          ))}
        </div>
      )}
      <MemoContent
        className="memo-content-text"
        content={propsMemo.content}
        memoId={propsMemo.id}
        sourcePath={propsMemo.path ?? ''}
        onClick={(e) => handleMemoContentClick(e, propsMemo)}
        onDoubleClick={handleMemoDoubleClick}
      />
      <MemoImage {...imageProps} />
      {/*<Only when={externalImageUrls.length > 0}>*/}
      {/*  <div className="images-wrapper">*/}
      {/*    {externalImageUrls.map((imgUrl, idx) => (*/}
      {/*      <Image alt="" key={idx} className="memo-img" imgUrl={imgUrl} referrerPolicy="no-referrer" />*/}
      {/*    ))}*/}
      {/*  </div>*/}
      {/*</Only>*/}
      {/*<Only when={internalImageUrls.length > 0}>*/}
      {/*  <div className="images-wrapper internal-embed image-embed is-loaded">*/}
      {/*    {internalImageUrls.map((imgUrl, idx) => (*/}
      {/*      <Image*/}
      {/*        key={idx}*/}
      {/*        className="memo-img"*/}
      {/*        imgUrl={imgUrl.path}*/}
      {/*        alt={imgUrl.altText}*/}
      {/*        filepath={imgUrl.filepath}*/}
      {/*      />*/}
      {/*    ))}*/}
      {/*  </div>*/}
      {/*</Only>*/}
      {CommentOnMemos ? (
        <div className={`memo-comment-wrapper`}>
          {commentMemos.length > 0 && isCommentListShown ? (
            <div className={`memo-comment-list`}>
              {/*// TODO*/}
              {commentMemos.map((m, idx) => (
                <div key={idx} className="memo-comment">
                  <div className="memo-comment-time">{m.createdAt}</div>
                  {/*<div className="memo-comment-text" onDoubleClick={() => handleEditCommentClick(m)}>*/}
                  {/*  {m.content.replace(/comment:(.*)]]/g, '').replace(/^\d{14} /g, '')}*/}
                  {/*</div>*/}
                  <MemoContent
                    className="memo-comment-text"
                    content={m.content
                      .replace(/comment:(.*)]]/g, '')
                      .replace(/^\d{14} /g, '')
                      .trim()}
                    memoId={m.id}
                    sourcePath={m.path ?? ''}
                    onClick={(e) => handleMemoContentClick(e, m)}
                    onDoubleClick={() => handleEditCommentClick(m)}
                  />
                </div>
              ))}
            </div>
          ) : null}
          <div className={`memo-comment-inputer ${isCommentShown ? '' : 'hidden'}`}>
            {isCommentShown && <Editor ref={memoCommentRef} {...editorConfig} initialContent={commentDraft.current} />}
          </div>
        </div>
      ) : (
        ''
      )}
      {/* <Only when={imageUrls.length > 0}>
        <div className="images-wrapper">
          {imageUrls.map((imgUrl, idx) => (
            <Image className="memo-img" key={idx} imgUrl={imgUrl} />
          ))}
        </div>
      </Only> */}
    </div>
  );
};

// formatMemoContent 已迁移至 helpers，此处重新导出以兼容既有引用
export { formatMemoContent } from '../helpers/formatMemoContent';

export default memo(Memo);
