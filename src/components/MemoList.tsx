import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import appContext from '../stores/appContext';
import { locationService, memoService, queryService } from '../services';
import { FIRST_TAG_REG, NOP_FIRST_TAG_REG, TAG_REG } from '../helpers/consts';
import { matchesMemoType } from '../helpers/memoType';
import utils from '../helpers/utils';
import { checkShouldShowMemoWithFilters } from '../helpers/filter';
import Memo from './Memo';
// import toastHelper from "./Toast";
import '../less/memolist.less';
import dailyNotesService from '../services/dailyNotesService';
import appStore from '../stores/appStore';
import { moment, Notice, Platform } from 'obsidian';
import { HideDoneTasks } from '../memos';
// import {moment} from 'obsidian';
import { t } from '../translations/helper';

// import { DefaultEditorLocation } from '../memos';

interface Props {}

export let copyShownMemos: Model.Memo[];
const MEMO_BATCH_SIZE = 30;

const MemoList: React.FC<Props> = () => {
  const {
    locationState: { query },
    memoState: { memos },
  } = useContext(appContext);
  // let reverseMemos: Model.Memo[];
  // if(DefaultEditorLocation === "Bottom" && window.innerWidth < 875 && Platform.isMobile){
  //   reverseMemos = memos.reverse();
  // }
  const [isFetching, setFetchStatus] = useState(true);
  const wrapperElement = useRef<HTMLDivElement>(null);
  const loadMoreElement = useRef<HTMLDivElement>(null);
  const [pagination, setPagination] = useState({ query, count: MEMO_BATCH_SIZE });
  const visibleCount = pagination.query === query ? pagination.count : MEMO_BATCH_SIZE;
  const { tag: tagQuery, duration, type: memoContentType, text: textQuery, filter: queryId } = query;
  // const showMemoFilter = Boolean(tagQuery || (duration && duration.from < duration.to) || memoType || textQuery || queryId);
  const queryFilter = queryService.getQueryById(queryId);
  const showMemoFilter = Boolean(
    tagQuery || (duration && duration.from < duration.to) || memoContentType || textQuery || queryFilter,
  );

  // Archived and (soft-)deleted memos never appear in the list or search results.
  const listableMemos = memos.filter((memo) => !memo.archived && !memo.deletedAt);

  const shownMemos =
    showMemoFilter || queryFilter || HideDoneTasks
      ? listableMemos.filter((memo) => {
          let shouldShow = true;

          if (memo.memoType !== undefined) {
            if (HideDoneTasks && memo.memoType === 'TASK-DONE') {
              shouldShow = false;
            }
          }

          if (memo.content.contains('comment:')) {
            shouldShow = false;
          }

          if (queryFilter) {
            const filters = JSON.parse(queryFilter.querystring) as Filter[];
            if (Array.isArray(filters)) {
              shouldShow = checkShouldShowMemoWithFilters(memo, filters);
            }
          }

          if (tagQuery) {
            const tagsSet = new Set<string>();
            for (const t of Array.from(memo.content.match(TAG_REG) ?? [])) {
              const tag = t.replace(TAG_REG, '$1').trim();
              const items = tag.split('/');
              let temp = '';
              for (const i of items) {
                temp += i;
                tagsSet.add(temp);
                temp += '/';
              }
            }
            for (const t of Array.from(memo.content.match(NOP_FIRST_TAG_REG) ?? [])) {
              const tag = t.replace(NOP_FIRST_TAG_REG, '$1').trim();
              const items = tag.split('/');
              let temp = '';
              for (const i of items) {
                temp += i;
                tagsSet.add(temp);
                temp += '/';
              }
            }
            for (const t of Array.from(memo.content.match(FIRST_TAG_REG) ?? [])) {
              const tag = t.replace(FIRST_TAG_REG, '$2').trim();
              const items = tag.split('/');
              let temp = '';
              for (const i of items) {
                temp += i;
                tagsSet.add(temp);
                temp += '/';
              }
            }
            if (!tagsSet.has(tagQuery)) {
              shouldShow = false;
            }
          }
          if (
            duration &&
            duration.from < duration.to &&
            (utils.getTimeStampByDate(memo.createdAt) < duration.from ||
              utils.getTimeStampByDate(memo.createdAt) > duration.to)
          ) {
            shouldShow = false;
          }
          if (memoContentType && !matchesMemoType(memo, memoContentType)) shouldShow = false;
          if (textQuery && !memo.content.includes(textQuery)) {
            shouldShow = false;
          }

          return shouldShow;
        })
      : listableMemos.filter((memo) => {
          return !memo.content.contains('comment:');
        });

  // Pinned memos float to the top; Array.prototype.sort is stable so the existing order is
  // otherwise preserved.
  const sortedMemos = [...shownMemos].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  copyShownMemos = sortedMemos;

  useEffect(() => {
    let cancelled = false;
    dailyNotesService.getMyAllDailyNotes().catch(() => {
      if (!cancelled) new Notice('😭 Fetch DailyNotes Error');
    });
    memoService
      .fetchAllMemos()
      .then(() => {
        if (!cancelled) setFetchStatus(false);
      })
      .catch(() => {
        if (!cancelled) {
          setFetchStatus(false);
          new Notice(t('Fetch Error'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sentinel = loadMoreElement.current;
    if (!sentinel || visibleCount >= sortedMemos.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setPagination({ query, count: visibleCount + MEMO_BATCH_SIZE });
      },
      { root: wrapperElement.current?.closest('.lumo-timeline') ?? null, rootMargin: '600px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [query, visibleCount, sortedMemos.length]);

  useEffect(() => {
    wrapperElement.current?.scrollTo({ top: 0 });
    // The timeline has one scroll surface; keep its search and composer in view on filter changes.
    wrapperElement.current?.closest('.lumo-timeline')?.scrollTo({ top: 0 });
  }, [query]);

  const handleMemoListClick = useCallback((event: React.MouseEvent) => {
    const { workspace } = appStore.getState().dailyNotesState.app;

    const targetEl = event.target as HTMLElement;
    if (targetEl.tagName === 'SPAN' && targetEl.className === 'tag-span') {
      const tagName = targetEl.innerText.slice(1);
      const currTagQuery = locationService.getState().query.tag;
      if (currTagQuery === tagName) {
        locationService.setTagQuery('');
      } else {
        locationService.setTagQuery(tagName);
      }
    } else if (targetEl.tagName === 'A' && targetEl.className === 'internal-link') {
      const sourcePath = targetEl.getAttribute('data-filepath');
      if (Platform.isMobile) {
        workspace.openLinkText(sourcePath, sourcePath, false);
      } else {
        workspace.openLinkText(sourcePath, sourcePath, true);
      }
    }
  }, []);

  return (
    <div
      className={`memolist-wrapper ${isFetching ? '' : 'completed'}`}
      onClick={handleMemoListClick}
      ref={wrapperElement}
    >
      <div className="lumo-list-heading">
        <span aria-live="polite">
          {showMemoFilter ? `${t('Search results')} · ${shownMemos.length}` : t('Recent notes')}
        </span>
        <select
          aria-label={t('Date range')}
          value={duration && duration.from < duration.to ? 'custom' : 'all'}
          onChange={(event) => {
            const days = Number(event.currentTarget.value);
            if (!days) locationService.setFromAndToQuery(0, 0);
            else
              locationService.setFromAndToQuery(
                moment()
                  .subtract(days - 1, 'days')
                  .startOf('day')
                  .valueOf(),
                moment().endOf('day').valueOf(),
              );
          }}
        >
          <option value="all">{t('All time')}</option>
          <option value="1">{t('Today')}</option>
          <option value="7">{t('Last 7 days')}</option>
          <option value="30">{t('Last 30 days')}</option>
          {duration && duration.from < duration.to && (
            <option value="custom">
              {moment(duration.from).format('MM/DD')} – {moment(duration.to).format('MM/DD')}
            </option>
          )}
        </select>
      </div>
      {sortedMemos.slice(0, visibleCount).map((memo) => (
        <Memo key={memo.id} memo={memo} />
      ))}
      {visibleCount < sortedMemos.length && <div ref={loadMoreElement} aria-hidden="true" style={{ minHeight: 1 }} />}
      <div className="status-text-container">
        <p className="status-text">
          {isFetching
            ? t('Fetching data...')
            : shownMemos.length === 0
            ? t('Noooop!')
            : showMemoFilter || visibleCount < sortedMemos.length
            ? ''
            : t('All Data is Loaded 🎉')}
        </p>
      </div>
    </div>
  );
};

export default MemoList;
