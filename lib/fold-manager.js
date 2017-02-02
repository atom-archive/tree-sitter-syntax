const {Point, Range} = require('atom');

module.exports =
class FoldManager {
  constructor(editor, document, config) {
    this.config = config;
    this.editor = editor;
    this.document = document;
  }

  activate() {
    this.editor.isFoldableAtBufferRow = this.isFoldableAtBufferRow.bind(this);
    this.editor.foldBufferRow = this.foldBufferRow.bind(this);
    this.editor.foldBufferRowRange = this.foldBufferRow.bind(this);
    this.editor.languageMode.rowRangeForFoldAtBufferRow = this.rowRangeForFoldAtBufferRow.bind(this);
  }

  isFoldableAtBufferRow(row) {
    return !!this.rangeForFoldAtRow(row);
  }

  foldBufferRow(row) {
    const range = this.rangeForFoldAtRow(row);
    if (range) {
      this.editor.foldBufferRange(range);
    }
  }

  rowRangeForFoldAtBufferRow(row) {
    const range = this.rangeForFoldAtRow(row)
    if (range) {
      return [range.start.row, range.start.row];
    }
  }

  rangeForFoldAtRow(row) {
    let node = this.document.rootNode.descendantForPosition(Point(
      row,
      this.editor.buffer.lineLengthForRow(row)
    ));

    for (; node; node = node.parent) {
      if (node.startPosition.row < row) break;
      if (node.endPosition.row === row) continue;

      const children = node.children;
      if (children.length > 0) {
        const firstChild = children[0];
        const lastChild = children[children.length - 1];
        for (let pair of this.config.delimiters) {
          if (firstChild.type === pair[0] && lastChild.type === pair[1]) {
            return Range(firstChild.endPosition, lastChild.startPosition);
          }
        }
      } else {
        for (let foldableToken of this.config.tokens) {
          if (node.type === foldableToken[0]) {
            const start = node.startPosition;
            const end = node.endPosition
            start.column += foldableToken[1]
            end.column -= foldableToken[2]
            return Range(start, end);
          }
        }
      }
    }

    return null;
  }
};
