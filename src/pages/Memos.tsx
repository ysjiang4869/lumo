import MemoEditor from '../components/MemoEditor';
import MemosHeader from '../components/MemosHeader';
import MemoFilter from '../components/MemoFilter';
import MemoList from '../components/MemoList';
import JournalNav from '../components/JournalNav';
import MemoSearch from '../components/MemoSearch';
import React, { useContext, useEffect, useRef } from 'react';
import { Platform } from 'obsidian';
import appContext from '../stores/appContext';
import { t } from '../translations/helper';
import useState from 'react-usestateref';

function Memos() {
  const { globalState } = useContext(appContext);
  const [composerOpen, setComposerOpen] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!Platform.isMobile) return;
    if (globalState.editMemoId || globalState.markMemoId) setComposerOpen(true);
  }, [globalState.editMemoId, globalState.markMemoId]);

  const handleComposerClose = () => {
    const active = document.activeElement as HTMLElement | null;
    if (active && composerRef.current?.contains(active)) active.blur();
    setComposerOpen(false);
  };

  if (Platform.isMobile) {
    return (
      <div className="lumo-mobile-layout" data-lumo-layout="inline-composer">
        <div className="lumo-timeline">
          <MemosHeader />
          <MemoSearch />
          <div
            className={`lumo-mobile-composer ${composerOpen ? 'is-expanded' : ''}`}
            ref={composerRef}
            onFocusCapture={() => setComposerOpen(true)}
          >
            {composerOpen && (
              <div className="lumo-composer-heading">
                <span>{globalState.editMemoId ? t('EDIT') : t('Write it down')}</span>
                <button type="button" onClick={handleComposerClose}>
                  {t('Collapse editor')}
                </button>
              </div>
            )}
            <MemoEditor isMobileComposer expanded={composerOpen} onAfterSave={handleComposerClose} />
          </div>
          <details className="lumo-mobile-filters">
            <summary>{t('Filter notes')}</summary>
            <JournalNav />
          </details>
          <MemoFilter />
          <MemoList />
        </div>
      </div>
    );
  }

  return (
    <div className="lumo-timeline">
      <MemosHeader />
      <MemoSearch />
      <MemoEditor />
      <JournalNav />
      <MemoFilter />
      <MemoList />
    </div>
  );
}

export default Memos;
