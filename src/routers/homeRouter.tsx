import React from 'react';
import Memos from '../pages/Memos';
import MemoTrash from '../pages/MemoTrash';
import Setting from '../pages/Setting';
import Insights from '../pages/Insights';

const homeRouter = {
  '/recycle': <MemoTrash />,
  '/setting': <Setting />,
  '/insights': <Insights />,
  '*': <Memos />,
};

export default homeRouter;
