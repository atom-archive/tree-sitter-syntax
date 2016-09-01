/** @babel */

import {Document} from 'tree-sitter'
import * as point from './point-helpers'

export default class TreeSitterDecorationLayer {
  constructor ({buffer, language, scopeMap}) {
    this.scopeMap = scopeMap
    this.document = new Document()
      .setInput(new InputAdaptor(buffer))
      .setLanguage(language)
      .parse()
  }

  buildIterator () {
    return new TreeSitterDecorationIterator(this)
  }

  scopeNameForNode (node) {
    switch (node.type) {
      case 'program':
        return 'source.js'
      case 'function':
        if (node.children.length > 0)
          return 'meta.function.js'
        else
          return 'storage.type.function.js'
    }
  }
}

class TreeSitterDecorationIterator {
  constructor (layer, document) {
    this.layer = layer
    this.closeTags = null
    this.openTags = null
    this.containingNodeTypes = null
  }

  seek (targetPosition) {
    this.openTags = []
    this.closeTags = []
    this.containingNodeTypes = []

    let currentNode = this.layer.document.rootNode
    while (currentNode) {
      this.containingNodeTypes.push(currentNode.type)

      if (point.isEqual(targetPosition, currentNode.startPosition)) {
        const scopeName = this.layer.scopeMap.scopeNameForScopeDescriptor(this.containingNodeTypes)
        if (scopeName) this.openTags.push(scopeName)
      }

      const {children} = currentNode
      currentNode = null
      for (let i = 0, childCount = children.length; i < childCount; i++) {
        const child = children[i]
        if (point.isGreater(child.endPosition, targetPosition)) {
          currentNode = child
          break
        }
      }
    }
  }

  moveToSuccessor () {
  }

  getCloseTags () {
    return this.closeTags
  }

  getOpenTags () {
    return this.openTags
  }
}

class InputAdaptor {
  constructor (buffer) {
    this.buffer = buffer
    this.seek(0)
  }

  seek (characterIndex) {
    this.position = this.buffer.positionForCharacterIndex(characterIndex)
  }

  read () {
    const endPosition = this.buffer.clipPosition(this.position.traverse({row: 1000, column: 0}))
    const text = this.buffer.getTextInRange([this.position, endPosition])
    this.position = endPosition
    return text
  }
}
