/** @babel */

import parser from 'postcss-selector-parser'

export default class ScopeMap {
  constructor (scopeNamesBySelector) {
    this.namedSelectorIndex = {}
    this.anonymousSelectorIndex = {}
    for (let selector in scopeNamesBySelector) {
      this.addToSelectorIndex(selector, scopeNamesBySelector[selector])
    }
  }

  addToSelectorIndex (selector, scopeName) {
    parser((parseResult) => {
      for (let selectorNode of parseResult.nodes) {
        let currentIndex = null
        for (let i = selectorNode.nodes.length - 1; i >= 0; i--) {
          const termNode = selectorNode.nodes[i]
          switch (termNode.type) {
            case 'tag':
              if (!currentIndex) currentIndex = this.namedSelectorIndex
              if (!currentIndex[termNode.value]) currentIndex[termNode.value] = {}
              currentIndex = currentIndex[termNode.value]
              break

            case 'string':
              if (!currentIndex) currentIndex = this.anonymousSelectorIndex
              const value = termNode.value.slice(1, -1)
              if (!currentIndex[termNode.value]) currentIndex[value] = {}
              currentIndex = currentIndex[value]
              break

            case 'combinator':
              if (termNode.value !== '>')
                throw new TypeError(`Unsupported selector '${selector}'`)
              if (!currentIndex.parents) currentIndex.parents = {}
              currentIndex = currentIndex.parents
              break
          }
        }
        currentIndex.scopeName = scopeName
      }
    }).process(selector)
  }

  scopeNameForScopeDescriptor (descriptor, leafIsNamed=true) {
    let i = descriptor.length - 1

    const selectorIndex = leafIsNamed ?
      this.namedSelectorIndex :
      this.anonymousSelectorIndex
    let currentIndex = selectorIndex[descriptor[i]]
    let mostSpecificScopeName = currentIndex && currentIndex.scopeName

    while (currentIndex && currentIndex.parents && i > 0) {
      currentIndex = currentIndex.parents[descriptor[i - 1]]
      if (currentIndex && currentIndex.scopeName) mostSpecificScopeName = currentIndex.scopeName
      i--
    }

    return mostSpecificScopeName
  }
}
