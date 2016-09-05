/** @babel */

import {Point, Range} from 'atom'

export default class TreeSitterDecorationLayer {
  constructor ({buffer, document, scopeMap}) {
    this.buffer = buffer
    this.scopeMap = scopeMap
    this.document = document
  }

  buildIterator () {
    this.document.parse()
    return new TreeSitterDecorationIterator(this)
  }

  bufferDidChange ({oldRange, oldText, newText}) {
    this.document.edit({
      position: this.buffer.characterIndexForPosition(oldRange.start),
      charsRemoved: oldText.length,
      charsInserted: newText.length
    })
  }

  getInvalidatedRanges () {
    return [new Range(new Point(0, 0), new Point(this.buffer.getLineCount(), 0))]
  }

  onDidInvalidateRange (callback) {
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
    while ((child = this.currentNode.children[0])) {
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
}

function last (array) {
  return array[array.length - 1]
}
