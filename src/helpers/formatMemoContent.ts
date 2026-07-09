import {
  FIRST_TAG_REG,
  IMAGE_URL_REG,
  LINK_REG,
  MARKDOWN_URL_REG,
  MD_LINK_REG,
  MEMO_LINK_REG,
  TAG_REG,
  WIKI_IMAGE_URL_REG,
} from './consts';
import { encodeHtml, parseMarkedToHtml, parseRawTextToHtml } from './marked';
import { globalStateService } from '../services';

// 旧版简易渲染管线：当「使用 Markdown 解析器」关闭时，或需要同步 HTML 字符串
// （如分享图片 html2canvas、设置页预览）时使用。
export function formatMemoContent(content: string, memoid?: string): string {
  // 过滤 picker 表情元数据（不在内容文本中渲染）
  content = content.replace(/\s*\[mood::[^\]]*\]/g, '');
  content = encodeHtml(content);
  content = parseRawTextToHtml(content)
    .split('<br>')
    .map((t) => {
      return `<p>${t !== '' ? t : '<br>'}</p>`;
    })
    .join('');

  const { shouldUseMarkdownParser, shouldHideImageUrl } = globalStateService.getState();

  if (shouldUseMarkdownParser) {
    content = parseMarkedToHtml(content, memoid);
  }

  if (shouldHideImageUrl) {
    content = content.replace(WIKI_IMAGE_URL_REG, '').replace(MARKDOWN_URL_REG, '').replace(IMAGE_URL_REG, '');
  }

  content = content
    .replace(TAG_REG, "<span class='tag-span'>#$1</span>")
    .replace(FIRST_TAG_REG, "<p><span class='tag-span'>#$2</span>")
    .replace(LINK_REG, "$1<a class='link' target='_blank' rel='noreferrer' href='$2'>$2</a>")
    .replace(MD_LINK_REG, "<a class='link' target='_blank' rel='noreferrer' href='$2'>$1</a>")
    .replace(MEMO_LINK_REG, "<span class='memo-link-text' data-value='$2'>$1</span>")
    .replace(/\^\S{6}/g, '');

  const tempDivContainer = document.createElement('div');
  tempDivContainer.innerHTML = content;
  for (let i = 0; i < tempDivContainer.children.length; i++) {
    const c = tempDivContainer.children[i];

    if (c.tagName === 'P' && c.textContent === '' && c.firstElementChild?.tagName !== 'BR') {
      c.remove();
      i--;
      continue;
    }
  }

  return tempDivContainer.innerHTML;
}
