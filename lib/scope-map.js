/** @babel */

import parser from 'postcss-selector-parser'

export default class ScopeMap {
  constructor (scopeNamesBySelector) {
    this.selectorIndex = {}
    for (let selector in scopeNamesBySelector) {
      this.addToSelectorIndex(selector, scopeNamesBySelector[selector])
    }
  }

  addToSelectorIndex (selector, scopeName) {
    parser((parseResult) => {
      let currentIndex = this.selectorIndex

      for (let selectorNode of parseResult.nodes) {
        for (let i = selectorNode.nodes.length - 1; i >= 0; i--) {
          const node = selectorNode.nodes[i]
          if (node.type === 'tag') {
            if (!currentIndex[node.value]) currentIndex[node.value] = {}
            currentIndex = currentIndex[node.value]
          } else if (node.type === 'combinator' && node.value === '>') {
            if (!currentIndex.parents) currentIndex.parents = {}
            currentIndex = currentIndex.parents
          }
        }
        currentIndex.scopeName = scopeName
      }
    }).process(selector)
  }

  scopeNameForScopeDescriptor (descriptor) {
    let i = descriptor.length - 1
    let currentIndex = this.selectorIndex[descriptor[i]]
    let mostSpecificScopeName = currentIndex && currentIndex.scopeName

    while (currentIndex && currentIndex.parents && i > 0) {
      currentIndex = currentIndex.parents[descriptor[i - 1]]
      if (currentIndex && currentIndex.scopeName) mostSpecificScopeName = currentIndex.scopeName
      i--
    }

    return mostSpecificScopeName
  }
}
