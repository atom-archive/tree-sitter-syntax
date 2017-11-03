const {Point, Range, Emitter, ScopeDescriptor} = require('atom');

module.exports =
class TreeSitterLanguageMode {
  constructor ({buffer, grammar, document, scopeDescriptor}) {
    this.buffer = buffer
    this.foldConfig = grammar.foldConfig
    this.scopeMap = grammar.scopeMap
    this.commentStrings = grammar.commentStrings
    this.document = document
    this.rootScopeDescriptor = scopeDescriptor
    this.emitter = new Emitter()
    this.scopesById = new Map()
    this.idsByScope = {}
    this.nextScopeId = 256 + 1

    this.grammar = {
      scopeName: scopeDescriptor.scopes[0]
    }
  }

  buildIterator () {
    const invalidatedRanges = this.document.parse()
    for (let i = 0, n = invalidatedRanges.length; i < n; i++) {
      this.emitter.emit('did-invalidate-range', invalidatedRanges[i])
    }
    return new TreeSitterHighlightIterator(this)
  }

  idForScope (scope) {
    let id = this.idsByScope[scope]
    if (!id) {
      id = this.nextScopeId += 2
      this.idsByScope[scope] = id
      this.scopesById.set(id, scope)
    }
    return id
  }

  classNameForScopeId (id) {
    return this.scopesById.get(id)
  }

  commentStringsForPosition () {
    return this.commentStrings
  }

  isRowCommented () {
    return false
  }

  bufferDidChange ({oldRange, newRange, oldText, newText}) {
    this.document.edit({
      startIndex: this.buffer.characterIndexForPosition(oldRange.start),
      lengthRemoved: oldText.length,
      lengthAdded: newText.length,
      startPosition: oldRange.start,
      extentRemoved: oldRange.getExtent(),
      extentAdded: newRange.getExtent()
    })
  }

  getInvalidatedRanges () {
    return []
  }

  onDidInvalidateRange (callback) {
    this.emitter.on('did-invalidate-range', callback)
  }

  suggestedIndentForLineAtBufferRow (row) {
    return this.suggestedIndentForBufferRow(row)
  }

  suggestedIndentForBufferRow (row) {
    const previousNonBlankRow = this.buffer.previousNonBlankRow(row)
    if (previousNonBlankRow) {
      return this.indentLevelForLine(this.buffer.lineForRow(previousNonBlankRow))
    } else {
      return 0
    }
  }

  suggestedIndentForEditedBufferRow (row) {
    return null
  }

  indentLevelForLine (line, tabLength = this.tabLength) {
    let indentLength = 0
    for (let i = 0, {length} = line; i < length; i++) {
      const char = line[i]
      if (char === '\t') {
        indentLength += tabLength - (indentLength % tabLength)
      } else if (char === ' ') {
        indentLength++
      } else {
        break
      }
    }
    return indentLength / tabLength
  }

  isFoldableAtRow (row) {
    return this.getFoldableRangeContainingPoint(Point(row, Infinity), false) != null
  }

  getFoldableRanges () {
    return this.getFoldableRangesAtIndentLevel(null)
  }

  getFoldableRangesAtIndentLevel (goalLevel) {
    let result = []
    let stack = [{node: this.document.rootNode, level: 0}]
    while (stack.length > 0) {
      const {node, level} = stack.pop()
      const startRow = node.startPosition.row
      const endRow = node.endPosition.row

      let childLevel = level
      const range = this.getFoldableRangeForNode(node)
      if (range) {
        if (goalLevel == null || level === goalLevel) {
          let updatedExistingRange = false
          for (let i = 0, {length} = result; i < length; i++) {
            if (result[i].start.row === range.start.row &&
                result[i].end.row === range.end.row) {
              result[i] = range
              updatedExistingRange = true
            }
          }
          if (!updatedExistingRange) result.push(range)
        }
        childLevel++
      }

      for (let children = node.namedChildren, i = 0, {length} = children; i < length; i++) {
        const child = children[i]
        const childStartRow = child.startPosition.row
        const childEndRow = child.endPosition.row
        if (childEndRow > childStartRow) {
          if (childStartRow === startRow && childEndRow === endRow) {
            stack.push({node: child, level: level})
          } else if (childLevel <= goalLevel || goalLevel == null) {
            stack.push({node: child, level: childLevel})
          }
        }
      }
    }

    return result.sort((a, b) => a.start.row - b.start.row)
  }

  getFoldableRangeContainingPoint (point, allowPreviousRows = true) {
    let node = this.document.rootNode.descendantForPosition(this.buffer.clipPosition(point));
    while (node) {
      if (!allowPreviousRows && node.startPosition.row < point.row) break
      if (node.endPosition.row > point.row) {
        const range = this.getFoldableRangeForNode(node)
        if (range) return range
      }
      node = node.parent
    }
  }

  getFoldableRangeForNode (node) {
    const {firstChild} = node;
    if (firstChild) {
      const {lastChild} = node;

      for (let i = 0, n = this.foldConfig.delimiters.length; i < n; i++) {
        const entry = this.foldConfig.delimiters[i];
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
      for (let i = 0, n = this.foldConfig.tokens.length; i < n; i++) {
        const foldableToken = this.foldConfig.tokens[i];
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

  // Temporary shims

  destroy () {}

  scopeDescriptorForPosition (point) {
    return this.rootScopeDescriptor
  }

  onDidChangeGrammar () {
    return {dispose() {}}
  }

  serialize () {
    return {bufferId: this.buffer.id}
  }

  setTabLength (tabLength) {
    this.tabLength = tabLength
  }

  getTabLength () {
    return this.tabLength
  }

  tokenizedLineForRow (row) {
    return {openScopes: [], tags: []}
  }

  getGrammar () {
    return atom.grammars.grammarForScopeName(this.rootScopeDescriptor.scopes[0]) || {}
  }

  setVisible () {}
}

class TreeSitterHighlightIterator {
  constructor (layer, document) {
    this.layer = layer
    this.closeTags = null
    this.openTags = null
    this.containingNodeTypes = null
    this.containingNodeChildIndices = null
    this.currentNode = null
    this.currentChildIndex = null
  }

  seek (targetPosition) {
    const containingTags = []

    this.closeTags = []
    this.openTags = []
    this.containingNodeTypes = []
    this.containingNodeChildIndices = []
    this.currentPosition = targetPosition
    this.currentIndex = this.layer.buffer.characterIndexForPosition(targetPosition)

    let currentNode = this.layer.document.rootNode
    let currentChildIndex = null
    while (currentNode) {
      this.currentNode = currentNode
      this.containingNodeTypes.push(currentNode.type)
      this.containingNodeChildIndices.push(currentChildIndex)

      const scopeName = this.currentScopeName()
      if (scopeName) {
        const id = this.layer.idForScope(scopeName)
        if (this.currentIndex === currentNode.startIndex) {
          this.openTags.push(id)
        } else {
          containingTags.push(id)
        }
      }

      const {children} = currentNode
      currentNode = null
      for (let i = 0, childCount = children.length; i < childCount; i++) {
        const child = children[i]
        if (child.endIndex > this.currentIndex) {
          currentNode = child
          currentChildIndex = i
          break
        }
      }
    }

    return containingTags
  }

  moveToSuccessor () {
    this.closeTags = []
    this.openTags = []

    if (!this.currentNode) {
      this.currentPosition = {row: Infinity, column: Infinity}
      return false
    }

    do {
      if (this.currentIndex < this.currentNode.endIndex) {
        while (true) {
          this.pushCloseTag()
          const nextSibling = this.currentNode.nextSibling
          if (nextSibling) {
            if (this.currentNode.endIndex === nextSibling.startIndex) {
              this.currentNode = nextSibling
              this.currentChildIndex++
              this.currentIndex = nextSibling.startIndex
              this.currentPosition = nextSibling.startPosition
              this.pushOpenTag()
              this.descendLeft()
            } else {
              this.currentIndex = this.currentNode.endIndex
              this.currentPosition = this.currentNode.endPosition
            }
            break
          } else {
            this.currentIndex = this.currentNode.endIndex
            this.currentPosition = this.currentNode.endPosition
            this.currentNode = this.currentNode.parent
            this.currentChildIndex = last(this.containingNodeChildIndices)
            if (!this.currentNode) break
          }
        }
      } else {
        if ((this.currentNode = this.currentNode.nextSibling)) {
          this.currentChildIndex++
          this.currentPosition = this.currentNode.startPosition
          this.currentIndex = this.currentNode.startIndex
          this.pushOpenTag()
          this.descendLeft()
        }
      }
    } while (this.closeTags.length === 0 && this.openTags.length === 0 && this.currentNode)

    return true
  }

  getPosition () {
    return this.currentPosition
  }

  getCloseScopeIds () {
    return this.closeTags.slice()
  }

  getOpenScopeIds () {
    return this.openTags.slice()
  }

  // Private methods

  descendLeft () {
    let child
    while ((child = this.currentNode.firstChild)) {
      this.currentNode = child
      this.currentChildIndex = 0
      this.pushOpenTag()
    }
  }

  currentScopeName () {
    return this.layer.scopeMap.get(
      this.containingNodeTypes,
      this.containingNodeChildIndices,
      this.currentNode.isNamed
    )
  }

  pushCloseTag () {
    const scopeName = this.currentScopeName()
    if (scopeName) this.closeTags.push(this.layer.idForScope(scopeName))
    this.containingNodeTypes.pop()
    this.containingNodeChildIndices.pop()
  }

  pushOpenTag () {
    this.containingNodeTypes.push(this.currentNode.type)
    this.containingNodeChildIndices.push(this.currentChildIndex)
    const scopeName = this.currentScopeName()
    if (scopeName) this.openTags.push(this.layer.idForScope(scopeName))
  }
};

function last (array) {
  return array[array.length - 1]
}
