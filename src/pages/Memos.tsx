import MemoEditor from '../components/MemoEditor';
import MemosHeader from '../components/MemosHeader';
import MemoFilter from '../components/MemoFilter';
import MemoList from '../components/MemoList';
import JournalNav from '../components/JournalNav';
import React from 'react';
import { Platform } from 'obsidian';
import { DefaultEditorLocation } from '../memos';

function Memos() {
  if (Platform.isMobile && DefaultEditorLocation === 'Bottom') {
    return (
      <>
        <MemosHeader />
        <JournalNav />
        <MemoFilter />
        <MemoList />
        <MemoEditor />
      </>
    );
  } else {
    return (
      <>
        <MemosHeader />
        <MemoEditor />
        <JournalNav />
        <MemoFilter />
        <MemoList />
      </>
    );
  }
}

export default Memos;
