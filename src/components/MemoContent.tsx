import React, { useEffect, useRef } from 'react';
import { Component, MarkdownRenderer } from 'obsidian';
import { globalStateService } from '../services';
import { IMAGE_URL_REG, MARKDOWN_URL_REG, MEMO_LINK_REG, WIKI_IMAGE_URL_REG } from '../helpers/consts';
import { formatMemoContent } from '../helpers/formatMemoContent';

interface Props {
  content: string;
  memoId?: string;
  // 用于解析相对链接/wiki 链接的来源文件路径
  sourcePath?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
}

/**
 * 把 memo 私有语法转换成 Obsidian Markdown 能安全渲染的形式：
 * - 剔除表情元数据 [mood::..] 与 block-ref 锚点 ^xxxxxx；
 * - memo 关联链接 [@label](id) → 自定义 span（OB 透传内联 HTML）；
 * - 图片交给 <MemoImage> 单独渲染，这里从正文剔除，避免重复渲染。
 */
function preprocess(content: string): string {
  content = content
    // memo 正文用 <br> 记录换行，需还原为真实换行，块级 Markdown（标题/列表/引用/表格）才能被解析
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/\s*\[mood::[^\]]*\]/g, '')
    .replace(/\s*\^\S{6}\b/g, '')
    .replace(MEMO_LINK_REG, (_m, label, id) => `<span class="memo-link-text" data-value="${id}">${label}</span>`)
    .replace(WIKI_IMAGE_URL_REG, '')
    .replace(MARKDOWN_URL_REG, '')
    .replace(IMAGE_URL_REG, '');
  return content;
}

/**
 * 渲染完成后修正 DOM，保证与既有交互/样式兼容：
 * - OB 原生标签 a.tag → span.tag-span（保留卡片自有样式 + MemoList 的标签筛选点击）；
 * - 内部链接补 data-filepath，兼容 MemoList 打开链接的逻辑；
 * - 外部链接新标签打开。
 */
function postprocess(el: HTMLElement): void {
  el.querySelectorAll('a.tag').forEach((a) => {
    const span = document.createElement('span');
    span.className = 'tag-span';
    span.textContent = a.textContent ?? ''; // 含 # 前缀，MemoList 会 slice(1)
    a.replaceWith(span);
  });

  el.querySelectorAll('a.internal-link').forEach((a) => {
    if (!a.getAttribute('data-filepath')) {
      const href = a.getAttribute('data-href') ?? a.getAttribute('href') ?? '';
      a.setAttribute('data-filepath', href);
    }
  });

  el.querySelectorAll('a.external-link').forEach((a) => {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noreferrer');
  });
}

const MemoContent: React.FC<Props> = ({
  content,
  memoId,
  sourcePath = '',
  className,
  onClick,
  onDoubleClick,
}: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const { shouldUseMarkdownParser } = globalStateService.getState();

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    // 未开启 Markdown 解析：沿用旧的同步字符串管线，行为保持不变。
    if (!shouldUseMarkdownParser) {
      el.classList.remove('memo-md');
      el.innerHTML = formatMemoContent(content, memoId);
      return;
    }

    // memo-md 标记：让 CSS 关掉 pre-wrap，避免块级元素间的换行文本被当成空行显示
    el.classList.add('memo-md');
    const component = new Component();
    component.load();
    el.empty();

    let cancelled = false;
    MarkdownRenderer.renderMarkdown(preprocess(content), el, sourcePath, component)
      .then(() => {
        if (!cancelled) {
          postprocess(el);
        }
      })
      .catch(() => {
        // 渲染失败兜底为纯文本，避免卡片空白
        if (!cancelled) {
          el.setText(content);
        }
      });

    return () => {
      cancelled = true;
      component.unload();
    };
  }, [content, memoId, sourcePath, shouldUseMarkdownParser]);

  return <div ref={ref} className={className} onClick={onClick} onDoubleClick={onDoubleClick} />;
};

export default MemoContent;
