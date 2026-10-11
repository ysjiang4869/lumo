import React, { useContext } from 'react';
import appContext from '../stores/appContext';
import { locationService } from '../services';
import Search from '../icons/search.svg?component';
import { t } from '../translations/helper';

const MemoSearch = () => {
  const {
    locationState: {
      query: { text },
    },
  } = useContext(appContext);

  return (
    <div className="lumo-search" role="search">
      <Search aria-hidden="true" />
      <input
        type="search"
        aria-label={t('Search notes or tags')}
        placeholder={t('Search notes or tags')}
        value={text}
        onChange={(event) => locationService.setTextQuery(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            locationService.setTextQuery('');
          }
        }}
      />
      {text && (
        <button type="button" aria-label={t('Clear search')} onClick={() => locationService.setTextQuery('')}>
          ×
        </button>
      )}
    </div>
  );
};

export default MemoSearch;
