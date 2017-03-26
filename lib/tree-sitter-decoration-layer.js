const {Point, Range, Emitter} = require('atom');

let identifiers = []

module.exports =
class TreeSitterDecorationLayer {
  constructor ({buffer, document, scopeMap}) {
    this.buffer = buffer
    this.scopeMap = scopeMap
    this.document = document
    this.emitter = new Emitter()
  }

  buildIterator () {
    const invalidatedRanges = this.document.parse()
    for (let i = 0, n = invalidatedRanges.length; i < n; i++) {
      this.emitter.emit('did-invalidate-range', invalidatedRanges[i])
    }
    return new TreeSitterDecorationIterator(this)
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
}

class TreeSitterDecorationIterator {
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
        if (this.currentIndex === currentNode.startIndex) {
          this.openTags.push(scopeName)
        } else {
          containingTags.push(scopeName)
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

  getCloseTags () {
    return this.closeTags
  }

  getOpenTags () {
    return this.openTags
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
    let scopeName = this.layer.scopeMap.get(
      this.containingNodeTypes,
      this.containingNodeChildIndices,
      this.currentNode.isNamed
    )

    if (atom.config.get('tree-sitter-syntax.semanticHighlighting')) {
      let className

      if (this.currentNode.parent === null) {
        // Root node
        className = 'syntax--semantic'
      } else if (this.currentNode.isNamed && this.currentNode.type === 'identifier') {
        let name = this.layer.buffer.getTextInRange([this.currentNode.startPosition, this.currentNode.endPosition])
        let index = identifiers.indexOf(name)
        if (index === -1) {
          identifiers.push(name)
          index = identifiers.length - 1
        }
        let numberOfIdentifierClasses = atom.config.get('tree-sitter-syntax.numberOfIdentifierClasses')
        let classIndex = (numberOfIdentifierClasses > 0) ? (index % numberOfIdentifierClasses) : index
        className = 'syntax--identifier.syntax--identifier-' + classIndex
      }

      if (className)
        scopeName = scopeName ? (scopeName + '.' + className) : className
    }

    return scopeName
  }

  pushCloseTag () {
    const scopeName = this.currentScopeName()
    if (scopeName) this.closeTags.push(scopeName)
    this.containingNodeTypes.pop()
    this.containingNodeChildIndices.pop()
  }

  pushOpenTag () {
    this.containingNodeTypes.push(this.currentNode.type)
    this.containingNodeChildIndices.push(this.currentChildIndex)
    const scopeName = this.currentScopeName()
    if (scopeName) this.openTags.push(scopeName)
  }
};

function last (array) {
  return array[array.length - 1]
}
