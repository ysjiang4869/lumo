import React, { useContext, useMemo } from 'react';
import appContext from '../stores/appContext';
import { locationService } from '../services';
import utils from '../helpers/utils';
import { moment } from 'obsidian';
import { t } from '../translations/helper';
import '../less/redesign.less';
import ArrowLeft from '../icons/arrow-left.svg?component';

// 情绪为暂未落地的功能，此处为 UI 占位（静态数据）
const MOCK_MOODS = [
  { e: '😊', l: '开心', pct: 72, count: 142 },
  { e: '😌', l: '平静', pct: 54, count: 98 },
  { e: '🤔', l: '思考', pct: 38, count: 64 },
  { e: '😴', l: '疲惫', pct: 22, count: 37 },
  { e: '🥳', l: '兴奋', pct: 14, count: 21 },
];

const HEAT_BG = ['#eceae3', '#cbe8db', '#8fd1b5', '#2f9e78'];

const Insights: React.FC = () => {
  const {
    memoState: { memos, tagsNum },
  } = useContext(appContext);

  const { total, daysCovered, heat, topTags } = useMemo(() => {
    const listable = memos.filter((m) => !m.archived && !m.deletedAt);
    const perDay = new Map<string, number>();
    for (const m of listable) {
      const key = moment(utils.getTimeStampByDate(m.createdAt)).format('YYYY-MM-DD');
      perDay.set(key, (perDay.get(key) ?? 0) + 1);
    }

    // 最近 78 天的热力格子
    const cells: number[] = [];
    for (let i = 77; i >= 0; i--) {
      const key = moment().subtract(i, 'days').format('YYYY-MM-DD');
      const c = perDay.get(key) ?? 0;
      cells.push(c === 0 ? 0 : c < 2 ? 1 : c < 4 ? 2 : 3);
    }

    const tagEntries = Object.entries(tagsNum as { [k: string]: number })
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14);

    return { total: listable.length, daysCovered: perDay.size, heat: cells, topTags: tagEntries };
  }, [memos, tagsNum]);

  const handleBack = () => {
    locationService.pushHistory('/');
  };

  return (
    <div className="lumo-insights">
      <button className="lumo-insights-back" onClick={handleBack}>
        <ArrowLeft />
        {t('Back')}
      </button>

      <div className="lumo-insights-head">
        <div className="lumo-insights-title">{t('Journal insights')}</div>
        <p className="lumo-insights-lead">
          {t('This year you have captured')} <b className="accent">{total}</b> {t('notes across')}{' '}
          <b>{daysCovered}</b> {t('days')}。
        </p>
      </div>

      <div className="lumo-insights-numbers">
        <div className="lumo-insights-num">
          <div className="v">{total}</div>
          <div className="l">{t('notes total')}</div>
        </div>
        <div className="lumo-insights-num">
          <div className="v">{daysCovered}</div>
          <div className="l">{t('days')}</div>
        </div>
        <div className="lumo-insights-num">
          <div className="v">{topTags.length}</div>
          <div className="l">{t('tags collected')}</div>
        </div>
      </div>

      <div className="lumo-insights-section">
        <div className="lumo-insights-label">{t('Common moods')}</div>
        <div className="lumo-mood-list">
          {MOCK_MOODS.map((m) => (
            <div className="lumo-mood-row" key={m.l}>
              <span className="e">{m.e}</span>
              <span className="l">{m.l}</span>
              <div className="bar">
                <div className="fill" style={{ width: `${m.pct}%` }} />
              </div>
              <span className="c">{m.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="lumo-insights-section">
        <div className="lumo-insights-label">{t('Frequent tags')}</div>
        <div className="lumo-tag-cloud">
          {topTags.length ? (
            topTags.map(([name, count]) => (
              <span className="lumo-tag-chip" key={name}>
                #{name}
                <span className="n">{count}</span>
              </span>
            ))
          ) : (
            <span className="lumo-tag-empty">—</span>
          )}
        </div>
      </div>

      <div className="lumo-insights-section">
        <div className="lumo-insights-label-row">
          <span className="lumo-insights-label">{t('Year in review')}</span>
          <span className="lumo-insights-sub">{t('Your footprint over the past year')}</span>
        </div>
        <div className="lumo-heat-grid">
          {heat.map((level, i) => (
            <span key={i} className="lumo-heat-cell" style={{ background: HEAT_BG[level] }} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Insights;
