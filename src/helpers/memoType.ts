import { IMAGE_URL_REG, LINK_REG, MEMO_LINK_REG, NOP_FIRST_TAG_REG, TAG_REG } from './consts';

// Reset global regex state so repeated renders and combined filters give the same result.
const contains = (content: string, pattern: RegExp): boolean => content.match(pattern) !== null;

export function matchesMemoType(memo: Pick<Model.Memo, 'content' | 'memoType'>, type: MemoSpecType): boolean {
  switch (type) {
    case 'NOT_TAGGED':
      return !contains(memo.content, TAG_REG) && !contains(memo.content, NOP_FIRST_TAG_REG);
    case 'LINKED':
      return contains(memo.content, LINK_REG);
    case 'IMAGED':
      return contains(memo.content, IMAGE_URL_REG);
    case 'CONNECTED':
      return contains(memo.content, MEMO_LINK_REG);
    case 'MOOD':
      return /\[mood::[^\]]+\]/.test(memo.content);
    case 'TASK-TODO':
    case 'TASK-DONE':
      return memo.memoType === type;
    default:
      return false;
  }
}
