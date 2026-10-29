import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import appContext from '../stores/appContext';
import { locationService, memoService } from '../services';
import dailyNotesService from '../services/dailyNotesService';
import MenuBtnsPopup from './MenuBtnsPopup';
import utils from '../helpers/utils';
import '../less/memos-header.less';
import More from '../icons/more.svg?component';
import Feather from '../icons/feather.svg?component';
import { moment } from 'obsidian';
import { UserName } from '../memos';
import { t } from '../translations/helper';

interface Props {}

const getGreeting = (now: number): string => {
  const h = moment(now).hour();
  if (h < 6) return t('Good night');
  if (h < 11) return t('Good morning');
  if (h < 13) return t('Good noon');
  if (h < 18) return t('Good afternoon');
  return t('Good evening');
};

const MemosHeader: React.FC<Props> = () => {
  const {
    memoState: { memos, tags },
    userState: { user },
  } = useContext(appContext);

  const headerRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const doc = headerRef.current?.ownerDocument;
    const win = doc?.defaultView;
    if (!doc || !win) return;
    const refresh = () => setNow(Date.now());
    const onVisible = () => {
      if (!doc.hidden) refresh();
    };
    const { workspace } = dailyNotesService.getState().app;
    const activeLeafEvent = workspace.on('active-leaf-change', refresh);
    win.addEventListener('focus', refresh);
    doc.addEventListener('visibilitychange', onVisible);
    const timer = win.setInterval(onVisible, 60_000);
    return () => {
      workspace.offref(activeLeafEvent);
      win.removeEventListener('focus', refresh);
      doc.removeEventListener('visibilitychange', onVisible);
      win.clearInterval(timer);
    };
  }, []);

  const username = user ? user.username : UserName;
  const [shouldShowMenu, setShouldShowMenu] = useState(false);

  const { createdDays, total } = useMemo(() => {
    const listable = memos.filter((m) => !m.archived && !m.deletedAt);
    const totalCount = listable.length;
    let days = 0;
    if (listable.length) {
      const first = listable[listable.length - 1];
      days = Math.ceil((now - utils.getTimeStampByDate(first.createdAt)) / 1000 / 3600 / 24) + 1;
    }
    return { createdDays: days, total: totalCount };
  }, [memos, now]);

  const dateStr = `${moment(now).format('M 月 D 日')} · ${moment(now).format('dddd')}`;

  const handleGreetingClick = () => {
    memoService.fetchAllMemos().catch(() => {
      // do nth
    });
  };

  return (
    <div ref={headerRef} className="section-header-container memos-header-container lumo-greeting">
      <div className="lumo-greeting-row">
        <button type="button" className="lumo-greeting-hello" onClick={handleGreetingClick}>
          {getGreeting(now)}，{username}
        </button>
        <span className="lumo-greeting-date">{dateStr}</span>
        <span className="lumo-greeting-spacer" />
        <button type="button" className="lumo-insight-link" onClick={() => locationService.pushHistory('/insights')}>
          <Feather aria-hidden="true" />
          {t('Insights')}
        </button>
        <div className="lumo-menu-wrapper">
          <button className="lumo-menu-btn" aria-label={t('Menu')} onClick={() => setShouldShowMenu(true)}>
            <More className="icon-img" />
          </button>
          <MenuBtnsPopup shownStatus={shouldShowMenu} setShownStatus={setShouldShowMenu} />
        </div>
      </div>
      <p className="lumo-greeting-stats">
        {t('Recorded for')} <b className="accent">{createdDays}</b> {t('days in a row')} · {t('Captured')}{' '}
        <b>{total}</b> {t('notes total')} · <b>{tags.length}</b> {t('tags collected')}
      </p>
    </div>
  );
};

export default MemosHeader;
