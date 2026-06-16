import { useContext } from 'react';
import appContext from '../stores/appContext';
import { globalStateService, memoService } from '../services';
import { parseHtmlToRawText } from '../helpers/marked';
import { formatMemoContent } from './Memo';
import '../less/preferences-section.less';
import React from 'react';
import checkboxActive from '../icons/checkbox-active.svg';
import checkbox from '../icons/checkbox.svg';

interface Props {}

const PreferencesSection: React.FC<Props> = () => {
  const { globalState } = useContext(appContext);
  const { useTinyUndoHistoryCache, shouldHideImageUrl, shouldSplitMemoWord, shouldUseMarkdownParser } = globalState;

  const demoMemoContent =
    '👋 你好呀～欢迎使用 Lumo!\n* ✨ **开源项目**；\n* 😋 精美且细节的视觉样式；\n* 📑 体验优良的交互逻辑；';

  const handleOpenTinyUndoChanged = () => {
    globalStateService.setAppSetting({
      useTinyUndoHistoryCache: !useTinyUndoHistoryCache,
    });
  };

  const handleSplitWordsValueChanged = () => {
    globalStateService.setAppSetting({
      shouldSplitMemoWord: !shouldSplitMemoWord,
    });
  };

  const handleHideImageUrlValueChanged = () => {
    globalStateService.setAppSetting({
      shouldHideImageUrl: !shouldHideImageUrl,
    });
  };

  const handleUseMarkdownParserChanged = () => {
    globalStateService.setAppSetting({
      shouldUseMarkdownParser: !shouldUseMarkdownParser,
    });
  };

  const handleExportBtnClick = async () => {
    const formatedMemos = memoService.getState().memos.map((m) => {
      return {
        ...m,
      };
    });

    const jsonStr = JSON.stringify(formatedMemos);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(jsonStr));
    element.setAttribute('download', 'data.json');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // const handleFormatMemosBtnClick = async () => {
  //   const memos = memoService.getState().memos;
  //   for (const m of memos) {
  //     memoService.updateMemo(m.id, parseHtmlToRawText(m.content));
  //   }
  // };

  return (
    <>
      <div className="section-container preferences-section-container">
        <p className="title-text">Memo 显示相关</p>
        <div
          className="demo-content-container memo-content-text"
          dangerouslySetInnerHTML={{ __html: formatMemoContent(demoMemoContent) }}
        ></div>
        <label className="form-label checkbox-form-label" onClick={handleSplitWordsValueChanged}>
          <span className="normal-text">中英文内容自动间隔</span>
          <img className="icon-img" src={shouldSplitMemoWord ? checkboxActive : checkbox} />
        </label>
        <label className="form-label checkbox-form-label" onClick={handleUseMarkdownParserChanged}>
          <span className="normal-text">部分 markdown 格式解析</span>
          <img className="icon-img" src={shouldUseMarkdownParser ? checkboxActive : checkbox} />
        </label>
        <label className="form-label checkbox-form-label" onClick={handleHideImageUrlValueChanged}>
          <span className="normal-text">隐藏图片链接地址</span>
          <img className="icon-img" src={shouldHideImageUrl ? checkboxActive : checkbox} />
        </label>
      </div>
      <div className="section-container preferences-section-container">
        <p className="title-text">编辑器</p>
        <label className="form-label checkbox-form-label" onClick={handleOpenTinyUndoChanged}>
          <span className="normal-text">
            启用{' '}
            <a
              target="_blank"
              href="https://github.com/boojack/tiny-undo"
              onClick={(e) => e.stopPropagation()}
              rel="noreferrer"
            >
              tiny-undo
            </a>
          </span>
          <img className="icon-img" src={useTinyUndoHistoryCache ? checkboxActive : checkbox} />
        </label>
      </div>
      <div className="section-container hidden">
        <p className="title-text">其他</p>
        <div className="btn-container">
          <button className="btn export-btn" onClick={handleExportBtnClick}>
            导出数据(JSON)
          </button>
          {/* <button className="btn format-btn" onClick={handleFormatMemosBtnClick}>
            格式化数据
          </button> */}
        </div>
      </div>
    </>
  );
};

export default PreferencesSection;
