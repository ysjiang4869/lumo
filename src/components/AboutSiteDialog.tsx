import { showDialog } from './Dialog';
import '../less/about-site-dialog.less';
import React from 'react';
import Close from '../icons/close.svg?component';

interface Props extends DialogProps {}

const AboutSiteDialog: React.FC<Props> = ({ destroy }: Props) => {
  const handleCloseBtnClick = () => {
    destroy();
  };

  return (
    <>
      <div className="dialog-header-container">
        <p className="title-text">
          <span className="icon-text">🤠</span>About <b>Lumo</b>
        </p>
        <button className="btn close-btn" onClick={handleCloseBtnClick}>
          {/*<img className="icon-img" src={close} />*/}
          <Close className="icon-img" />
        </button>
      </div>
      <div className="dialog-content-container">
        Lumo is a quick-capture plugin for Obsidian. If you find it useful, feel free to star or open issues on{' '}
        <a href="https://github.com/ysjiang4869/lumo">GitHub</a>.
        <br />
        <p>
          基于 <a href="https://github.com/justmemos/memos">memos</a> 开源项目所构建的项目。 NOTE: Based on{' '}
          <a href="https://github.com/justmemos/memos">memos</a> project to build.
        </p>
        <br />
        <p>
          🏗 This project is working in progress, <br /> and very pleasure to welcome your{' '}
          <a href="https://github.com/ysjiang4869/lumo/issues">issues</a> and{' '}
          <a href="https://github.com/ysjiang4869/lumo/pulls">Pull Request</a>.
        </p>
        <hr />
        <p className="normal-text">
          Last updated on <span className="pre-text">2022/01/04 22:55:15</span> 🎉
        </p>
      </div>
    </>
  );
};

export default function showAboutSiteDialog(): void {
  showDialog(
    {
      className: 'about-site-dialog',
    },
    AboutSiteDialog,
  );
}
