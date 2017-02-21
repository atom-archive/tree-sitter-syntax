const {Point, Range} = require('atom');

module.exports =
class FoldManager {
  constructor(editor, document, config) {
    this.config = config;
    this.editor = editor;
    this.document = document;
    this.cachedFoldabilityByBufferRow = [];
    this.editor.getBuffer().onDidChangeText(() => this.cachedFoldabilityByBufferRow.length = 0);
  }

  activate() {
    this.editor.isFoldableAtBufferRow = this.isFoldableAtBufferRow.bind(this);
    this.editor.foldBufferRow = this.foldBufferRow.bind(this);
    this.editor.foldBufferRowRange = this.foldBufferRow.bind(this);
    this.editor.languageMode.rowRangeForFoldAtBufferRow = this.rowRangeForFoldAtBufferRow.bind(this);
  }

  isFoldableAtBufferRow(row) {
    let result = this.cachedFoldabilityByBufferRow[row];
    if (result == null) {
      result = this.cachedFoldabilityByBufferRow[row] = !!this.rangeForFoldAtRow(row);
    }
    return result;
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

      const {firstChild} = node;
      if (firstChild) {
        const {lastChild} = node;
        if (lastChild.endPosition.row === row) continue;

        for (let i = 0, n = this.config.delimiters.length; i < n; i++) {
          const entry = this.config.delimiters[i];
          if (firstChild.type === entry[0] && lastChild.type === entry[1]) {
            let childPrecedingFold = firstChild

            const options = entry[2]
            if (options) {
              const {children} = node;
              let childIndexPrecedingFold = options.afterChildCount || 0;
              if (options.afterType) {
                for (let i = childIndexPrecedingFold, n = children.length; i < n; i++) {
                  if (children[i].type === options.afterType) {
                    childIndexPrecedingFold = i;
                    break;
                  }
                }
              }
              childPrecedingFold = children[childIndexPrecedingFold];
            }

            let granchildPrecedingFold = childPrecedingFold.lastChild
            if (granchildPrecedingFold) {
              return Range(granchildPrecedingFold.endPosition, lastChild.startPosition);
            } else {
              return Range(childPrecedingFold.endPosition, lastChild.startPosition);
            }
          }
        }
      } else {
        if (node.endPosition.row === row) continue;

        if (this.config.tokens) {
          for (let i = 0, n = this.config.tokens.length; i < n; i++) {
            const foldableToken = this.config.tokens[i];
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
    }

    return null;
  }
};
