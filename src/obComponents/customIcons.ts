import { addIcon } from 'obsidian';

const icons: Record<string, string> = {
  // 鹅毛笔 quill logo (lucide feather), scaled to Obsidian's 100x100 icon space
  Lumo: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M84.3 51a25 25 0 0 0-35.36-35.37L21 43.75V79h35.4z"/><path d="M66.7 33.3 8.3 91.7"/><path d="M72.9 62.5H37.5"/></svg>`,
};
export default function addIcons() {
  Object.keys(icons).forEach((key) => {
    addIcon(key, icons[key]);
  });
}
