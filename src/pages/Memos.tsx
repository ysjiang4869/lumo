import MemoEditor from '../components/MemoEditor';
import MemosHeader from '../components/MemosHeader';
import MemoFilter from '../components/MemoFilter';
import MemoList from '../components/MemoList';
import JournalNav from '../components/JournalNav';
import MemoSearch from '../components/MemoSearch';
import React, { useContext, useEffect, useLayoutEffect, useRef } from 'react';
import { Platform } from 'obsidian';
import appContext from '../stores/appContext';
import { t } from '../translations/helper';
import useState from 'react-usestateref';

function Memos() {
  const { globalState } = useContext(appContext);
  const [composerOpen, setComposerOpen] = useState(false);
  const layoutRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!Platform.isMobile) return;
    if (globalState.editMemoId || globalState.markMemoId) setComposerOpen(true);
  }, [globalState.editMemoId, globalState.markMemoId]);

  useLayoutEffect(() => {
    const layout = layoutRef.current;
    const parent = layout?.parentElement;
    if (!Platform.isMobile || !layout || !parent) return;
    const viewport = window.visualViewport;
    const updateHeight = () => {
      // WebViews may resize the workspace, the visual viewport, or both when the keyboard opens.
      // Intersect them so the composer never extends underneath the keyboard or host navigation.
      const bounds = parent.getBoundingClientRect();
      const visibleBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      const height = Math.max(0, Math.min(parent.clientHeight, visibleBottom - bounds.top));
      layout.style.height = `${height}px`;
      layout.style.setProperty('--lumo-available-height', `${height}px`);
      layout.classList.toggle('is-short', height < 300);
    };
    const observer = new ResizeObserver(updateHeight);
    observer.observe(parent);
    viewport?.addEventListener('resize', updateHeight);
    viewport?.addEventListener('scroll', updateHeight);
    window.addEventListener('resize', updateHeight);
    updateHeight();
    return () => {
      observer.disconnect();
      viewport?.removeEventListener('resize', updateHeight);
      viewport?.removeEventListener('scroll', updateHeight);
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  const handleComposerClose = () => {
    const active = document.activeElement as HTMLElement | null;
    if (active && composerRef.current?.contains(active)) active.blur();
    setComposerOpen(false);
  };

  if (Platform.isMobile) {
    return (
      <div className="lumo-mobile-layout" ref={layoutRef}>
        <div className="lumo-timeline">
          <MemosHeader />
          <MemoSearch />
          <JournalNav />
          <MemoFilter />
          <MemoList />
        </div>
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
