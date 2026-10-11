import { Range } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { tags } from '@lezer/highlight';

class MarkerWidget extends WidgetType {
  constructor(readonly text: string, readonly className: string) {
    super();
  }
  eq(other: MarkerWidget) {
    return this.text === other.text && this.className === other.className;
  }
  toDOM(view: EditorView) {
    const span = view.dom.ownerDocument.createElement('span');
    span.className = this.className;
    span.textContent = this.text;
    return span;
  }
  ignoreEvent() {
    return false;
  }
}

function decorate(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const active = view.state.selection.ranges;
  const onActiveLine = (from: number, to: number) =>
    active.some((range) => view.state.doc.lineAt(range.from).from <= to && view.state.doc.lineAt(range.to).to >= from);
  syntaxTree(view.state).iterate({
    enter: (node) => {
      const { name, from, to } = node;
      const heading = name.match(/^ATXHeading([1-6])$/);
      if (heading)
        decorations.push(
          Decoration.line({ class: 'lumo-md-heading-' + heading[1] }).range(view.state.doc.lineAt(from).from),
        );
      if (name === 'Blockquote' || name === 'FencedCode' || name === 'CodeBlock') {
        for (let pos = from; pos <= to; ) {
          const line = view.state.doc.lineAt(pos);
          decorations.push(
            Decoration.line({ class: name === 'Blockquote' ? 'lumo-md-quote' : 'lumo-md-code-block' }).range(line.from),
          );
          if (line.to >= to) break;
          pos = line.to + 1;
        }
      }
      if (onActiveLine(from, to)) return;
      if (name === 'ListMark' && /^[-+*]$/.test(view.state.sliceDoc(from, to))) {
        decorations.push(Decoration.replace({ widget: new MarkerWidget('•', 'lumo-md-bullet') }).range(from, to));
      } else if (name === 'TaskMarker') {
        const checked = /[xX]/.test(view.state.sliceDoc(from, to));
        decorations.push(
          Decoration.replace({ widget: new MarkerWidget(checked ? '☑' : '☐', 'lumo-md-checkbox') }).range(from, to),
        );
      } else if (
        ['HeaderMark', 'EmphasisMark', 'StrikethroughMark', 'CodeMark', 'QuoteMark', 'LinkMark'].includes(name)
      ) {
        decorations.push(Decoration.replace({}).range(from, to));
      } else if (name === 'URL' && node.node.parent?.name === 'Link') {
        decorations.push(Decoration.replace({}).range(from, to));
      }
    },
  });
  return Decoration.set(decorations, true);
}

const preview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = decorate(view);
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged ||
        syntaxTree(update.startState) !== syntaxTree(update.state)
      ) {
        this.decorations = decorate(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

export const livePreview = [
  preview,
  syntaxHighlighting(
    HighlightStyle.define([
      { tag: tags.strong, fontWeight: '700' },
      { tag: tags.emphasis, fontStyle: 'italic' },
      { tag: tags.strikethrough, textDecoration: 'line-through' },
      { tag: tags.link, color: 'var(--lumo-accent, var(--text-accent))', textDecoration: 'underline' },
      { tag: tags.monospace, fontFamily: 'var(--font-monospace)', backgroundColor: 'var(--background-secondary)' },
      { tag: tags.processingInstruction, color: 'var(--text-muted)' },
    ]),
  ),
];
