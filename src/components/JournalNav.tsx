import React, { useContext, useEffect, useMemo, useRef } from 'react';
import appContext from '../stores/appContext';
import { locationService, memoService } from '../services';
import { memoSpecialTypes } from '../helpers/filter';
import { t } from '../translations/helper';

const TABS: { key: string; label: string; type: MemoSpecType | '' }[] = [
  { key: 'all', label: t('All'), type: '' },
  { key: 'mood', label: t('Mood'), type: 'MOOD' },
  { key: 'image', label: t('Images'), type: 'IMAGED' },
  { key: 'task', label: t('To-do'), type: 'TASK-TODO' },
];

const JournalNav = () => {
  const {
    locationState: {
      query: { tag: tagQuery, type: memoType },
    },
    memoState: { tagsNum, memos },
  } = useContext(appContext);
  const tagList = useRef<HTMLDivElement>(null);
  const totalCount = memos.filter(
    (memo) => !memo.archived && !memo.deletedAt && !memo.content.includes('comment:'),
  ).length;
  const tags = useMemo(() => Object.entries(tagsNum as Record<string, number>).sort((a, b) => b[1] - a[1]), [tagsNum]);

  useEffect(() => {
    memoService.updateTagsState();
  }, [memos]);

  useEffect(() => {
    const list = tagList.current;
    const selected = list?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!list || !selected) return;
    const left = selected.offsetLeft;
    if (left < list.scrollLeft) list.scrollLeft = left;
    else if (left + selected.offsetWidth > list.scrollLeft + list.clientWidth)
      list.scrollLeft = left + selected.offsetWidth - list.clientWidth;
  }, [tagQuery, tags]);

  const isPrimaryType = TABS.some((tab) => tab.type === memoType);

  return (
    <div className="lumo-browse-controls">
      <div className="lumo-jnav">
        <div className="lumo-jnav-pills" aria-label={t('Filter notes')}>
          {TABS.map((tab) => (
            <button
              type="button"
              key={tab.key}
              className={`lumo-jnav-pill ${memoType === tab.type ? 'is-active' : ''}`}
              aria-pressed={memoType === tab.type}
              onClick={() => locationService.setMemoTypeQuery(tab.type)}
            >
              {tab.label}
            </button>
          ))}
          <button
            type="button"
            className="lumo-jnav-pill"
            onClick={() => tagList.current?.querySelector<HTMLButtonElement>('button')?.focus()}
          >
            {t('Tags')}
          </button>
        </div>
        <select
          className="lumo-more-filters"
          aria-label={t('More filters')}
          value={isPrimaryType ? '' : memoType}
          onChange={(event) => locationService.setMemoTypeQuery(event.currentTarget.value as MemoSpecType | '')}
        >
          <option value="">{t('More filters')}</option>
          {memoSpecialTypes
            .filter((type) => !TABS.some((tab) => tab.type === type.value))
            .map((type) => (
              <option key={type.value} value={type.value}>
                {type.text}
              </option>
            ))}
        </select>
      </div>
      <div className="lumo-tagfilter" ref={tagList} role="group" aria-label={t('Tags')}>
        <button
          type="button"
          className={`lumo-tagfilter-chip ${!tagQuery ? 'is-active' : ''}`}
          aria-pressed={!tagQuery}
          onClick={() => locationService.setTagQuery('')}
        >
          # {t('All')}
          <span className="n">{totalCount}</span>
        </button>
        {tags.map(([name, count]) => (
          <button
            type="button"
            key={name}
            className={`lumo-tagfilter-chip ${tagQuery === name ? 'is-active' : ''}`}
            aria-pressed={tagQuery === name}
            onClick={() => locationService.setTagQuery(tagQuery === name ? '' : name)}
          >
            # {name}
            <span className="n">{count}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default JournalNav;
