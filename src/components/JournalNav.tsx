import React, { useContext, useMemo, useState } from 'react';
import appContext from '../stores/appContext';
import { locationService, memoService } from '../services';
import { t } from '../translations/helper';
import Search from '../icons/search.svg?component';
import Feather from '../icons/feather.svg?component';

interface Props {}

// 心情 / 标签 暂为 UI 占位（不做真实过滤）；全部 / 图片 接入 memoType 过滤。
const TABS: { key: string; label: string; type?: MemoSpecType }[] = [
  { key: 'all', label: t('All') },
  { key: 'mood', label: t('Mood') },
  { key: 'image', label: t('Images'), type: 'IMAGED' },
  { key: 'tag', label: t('Tags') },
];

const JournalNav: React.FC<Props> = () => {
  const {
    locationState: {
      query: { tag: tagQuery, type: memoType },
    },
    memoState: { tagsNum, memos },
  } = useContext(appContext);

  const totalCount = memos.length;

  // 侧栏移除后 TagList 不再渲染，需在此处触发 tagsNum 更新
  useEffect(() => {
    memoService.updateTagsState();
  }, [memos]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // 真实过滤态（图片）优先反映到高亮
  const effectiveTab = memoType === 'IMAGED' ? 'image' : memoType ? 'all' : activeTab;

  const topTags = useMemo(() => {
    return Object.entries(tagsNum as { [k: string]: number })
      .sort((a, b) => b[1] - a[1])
      .slice(0, 16);
  }, [tagsNum]);

  const handleTabClick = (tab: { key: string; type?: MemoSpecType }) => {
    setActiveTab(tab.key);
    locationService.setMemoTypeQuery(tab.type ?? '');
  };

  const handleSearchInput = (e: React.FormEvent<HTMLInputElement>) => {
    locationService.setTextQuery(e.currentTarget.value);
  };

  const toggleSearch = () => {
    if (searchOpen) {
      locationService.setTextQuery('');
    }
    setSearchOpen(!searchOpen);
  };

  const handleTagClick = (name: string) => {
    locationService.setTagQuery(tagQuery === name ? '' : name);
  };

  const handleInsightClick = () => {
    locationService.pushHistory('/insights');
  };

  return (
    <>
      <div className="lumo-jnav">
        <div className="lumo-jnav-pills">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`lumo-jnav-pill ${effectiveTab === tab.key ? 'is-active' : ''}`}
              onClick={() => handleTabClick(tab)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="lumo-jnav-spacer" />
        {searchOpen && (
          <input
            className="lumo-jnav-search"
            type="text"
            autoFocus
            placeholder={t('Search')}
            onChange={handleSearchInput}
          />
        )}
        <button className="lumo-jnav-icon" aria-label={t('Search')} onClick={toggleSearch}>
          <Search />
        </button>
        <button className="lumo-jnav-insight" onClick={handleInsightClick}>
          <Feather />
          {t('Insights')}
        </button>
      </div>

      <div className="lumo-tagfilter">
        <span
          className={`lumo-tagfilter-chip ${!tagQuery ? 'is-active' : ''}`}
          onClick={() => locationService.setTagQuery('')}
        >
          # {t('All')}
          <span className="n">{totalCount}</span>
        </span>
        {topTags.map(([name, count]) => (
          <span
            key={name}
            className={`lumo-tagfilter-chip ${tagQuery === name ? 'is-active' : ''}`}
            onClick={() => handleTagClick(name)}
          >
            # {name}
            <span className="n">{count}</span>
          </span>
        ))}
      </div>
    </>
  );
};

export default JournalNav;
