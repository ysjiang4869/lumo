import MemoEditor from '../components/MemoEditor';
import MemosHeader from '../components/MemosHeader';
import MemoFilter from '../components/MemoFilter';
import MemoList from '../components/MemoList';
import JournalNav from '../components/JournalNav';
import React, { useContext, useEffect, useRef } from 'react';
import { Platform } from 'obsidian';
import appContext from '../stores/appContext';
import Feather from '../icons/feather.svg?component';
import { t } from '../translations/helper';
import useState from 'react-usestateref';

function Memos() {
  const { globalState } = useContext(appContext);
  const [sheetOpen, setSheetOpen] = useState(false);
  const prevEditId = useRef(globalState.editMemoId);
  const prevMarkId = useRef(globalState.markMemoId);

  useEffect(() => {
    if (!Platform.isMobile) return;
    const editChanged = globalState.editMemoId && globalState.editMemoId !== prevEditId.current;
    const markChanged = globalState.markMemoId && globalState.markMemoId !== prevMarkId.current;
    if (editChanged || markChanged) {
      setSheetOpen(true);
    }
    prevEditId.current = globalState.editMemoId;
    prevMarkId.current = globalState.markMemoId;
  }, [globalState.editMemoId, globalState.markMemoId]);

  const handleSheetClose = () => {
    setSheetOpen(false);
  };

  const handleFabClick = () => {
    setSheetOpen(true);
    setTimeout(() => {
      const editor = document.querySelector(
        "div[data-type='lumo_view'] .lumo-sheet-panel .lumo-live-editor .cm-content",
      ) as HTMLElement;
      // preventScroll：弹层本身已固定在视口底部，浏览器为聚焦元素滚动祖先容器
      // 反而会把整个视图顶出可视区
      editor?.focus({ preventScroll: true });
    }, 120);
  };

  if (Platform.isMobile) {
    return (
      <>
        <MemosHeader />
        <JournalNav />
        <MemoFilter />
        <MemoList />
        {!sheetOpen && (
          <button className="lumo-fab" onClick={handleFabClick}>
            <Feather />
            {t('Write it down')}
          </button>
        )}
        <div className={`lumo-sheet-overlay ${sheetOpen ? 'is-open' : ''}`}>
          <div className="lumo-sheet-backdrop" onClick={handleSheetClose} />
          <div className="lumo-sheet-panel">
            <div className="lumo-sheet-handle" />
            <MemoEditor isBottomSheet onAfterSave={handleSheetClose} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <MemosHeader />
      <MemoEditor />
      <JournalNav />
      <MemoFilter />
      <MemoList />
    </>
  );
}

export default Memos;
