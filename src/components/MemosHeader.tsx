import React, { useContext, useMemo } from 'react';
import appContext from '../stores/appContext';
import SearchBar from './SearchBar';
import { globalStateService, locationService, memoService } from '../services';
import Only from './common/OnlyWhen';
import utils from '../helpers/utils';
import '../less/memos-header.less';
import MenuSvg from '../icons/menu.svg?component';
import Feather from '../icons/feather.svg?component';
import { moment } from 'obsidian';
import { UserName } from '../memos';
import { t } from '../translations/helper';

interface Props {}

const getGreeting = (): string => {
  const h = moment().hour();
  if (h < 6) return t('Good night');
  if (h < 11) return t('Good morning');
  if (h < 13) return t('Good noon');
  if (h < 18) return t('Good afternoon');
  return t('Good evening');
};

const MemosHeader: React.FC<Props> = () => {
  const {
    globalState: { isMobileView },
    memoState: { memos, tags },
    userState: { user },
  } = useContext(appContext);

  const username = user ? user.username : UserName;

  const { createdDays, total } = useMemo(() => {
    const listable = memos.filter((m) => !m.archived && !m.deletedAt);
    const totalCount = listable.length;
    let days = 0;
    if (listable.length) {
      const first = listable[listable.length - 1];
      days = Math.ceil((Date.now() - utils.getTimeStampByDate(first.createdAt)) / 1000 / 3600 / 24) + 1;
    }
    return { createdDays: days, total: totalCount };
  }, [memos]);

  const dateStr = useMemo(() => `${moment().format('M 月 D 日')} · ${moment().format('dddd')}`, []);

  const handleGreetingClick = () => {
    memoService.fetchAllMemos().catch(() => {
      // do nth
    });
  };

  const handleShowSidebarBtnClick = () => {
    globalStateService.setShowSiderbarInMobileView(true);
  };

  const handleInsightClick = () => {
    locationService.pushHistory('/insights');
  };

  return (
    <div className="section-header-container memos-header-container lumo-greeting">
      <div className="lumo-greeting-row">
        <Only when={isMobileView}>
          <button className="action-btn" onClick={handleShowSidebarBtnClick}>
            <MenuSvg className="icon-img" />
          </button>
        </Only>
        <span className="lumo-greeting-hello" onClick={handleGreetingClick}>
          {getGreeting()}，{username}
        </span>
        <span className="lumo-greeting-date">{dateStr}</span>
        <span className="lumo-greeting-spacer" />
        <button className="lumo-insight-link" onClick={handleInsightClick}>
          <Feather />
          {t('Insights')}
        </button>
      </div>
      <p className="lumo-greeting-stats">
        {t('Recorded for')} <b className="accent">{createdDays}</b> {t('days in a row')} · {t('Captured')}{' '}
        <b>{total}</b> {t('notes total')} · <b>{tags.length}</b> {t('tags collected')}
      </p>
      <SearchBar />
    </div>
  );
};

export default MemosHeader;
