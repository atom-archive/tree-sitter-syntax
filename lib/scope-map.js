/** @babel */

import parser from 'postcss-selector-parser'

export default class ScopeMap {
  constructor (scopeNamesBySelector) {
    this.namedScopeTable = {}
    this.anonymousScopeTable = {}
    for (let selector in scopeNamesBySelector) {
      this.addSelector(selector, scopeNamesBySelector[selector])
    }
    this.setIndexTableDefaults(this.namedScopeTable)
    this.setIndexTableDefaults(this.anonymousScopeTable)
  }

  addSelector (selector, scopeName) {
    parser((parseResult) => {
      for (let selectorNode of parseResult.nodes) {
        let currentTable = null
        let currentIndexValue = null

        for (let i = selectorNode.nodes.length - 1; i >= 0; i--) {
          const termNode = selectorNode.nodes[i]

          switch (termNode.type) {
            case 'tag':
              if (!currentTable) currentTable = this.namedScopeTable
              if (!currentTable[termNode.value]) currentTable[termNode.value] = {}
              currentTable = currentTable[termNode.value]
              if (currentIndexValue != null) {
                if (!currentTable.indices) currentTable.indices = {}
                if (!currentTable.indices[currentIndexValue]) currentTable.indices[currentIndexValue] = {}
                currentTable = currentTable.indices[currentIndexValue]
                currentIndexValue = null
              }
              break

            case 'string':
              if (!currentTable) currentTable = this.anonymousScopeTable
              const value = termNode.value.slice(1, -1)
              if (!currentTable[value]) currentTable[value] = {}
              currentTable = currentTable[value]
              if (currentIndexValue != null) {
                if (!currentTable.indices) currentTable.indices = {}
                if (!currentTable.indices[currentIndexValue]) currentTable.indices[currentIndexValue] = {}
                currentTable = currentTable.indices[currentIndexValue]
                currentIndexValue = null
              }
              break

            case 'combinator':
              if (termNode.value === '>') {
                if (!currentTable.parents) currentTable.parents = {}
                currentTable = currentTable.parents
              } else {
                rejectSelector(selector)
              }
              break

            case 'pseudo':
              if (termNode.value === ':nth-child') {
                currentIndexValue = termNode.nodes[0].nodes[0].value
              } else {
                rejectSelector(selector)
              }
              break

            default:
              rejectSelector(selector)
          }
        }

        currentTable.scopeName = scopeName
      }
    }).process(selector)
  }

  setIndexTableDefaults (table) {
    for (let type in table) {
      let currentTable = table[type]

      for (let index in currentTable.indices) {
        let indexTable = currentTable.indices[index]

        if (currentTable.parents) {
          if (!indexTable.parents) {
            indexTable.parents = {}
          }

          for (let key in currentTable.parents) {
            if (!indexTable.parents[key]) {
              indexTable.parents[key] = currentTable.parents[key]
              this.setIndexTableDefaults(indexTable.parents[key])
            }
          }
        }

        if (currentTable.scopeName) {
          if (!indexTable.scopeName) {
            indexTable.scopeName = currentTable.scopeName
          }
        }
      }
    }
  }

  get (nodeTypes, childIndices, leafIsNamed = true) {
    let result = undefined
    let i = nodeTypes.length - 1
    let currentTable = leafIsNamed ?
      this.namedScopeTable[nodeTypes[i]] :
      this.anonymousScopeTable[nodeTypes[i]]

    while (currentTable) {
      if (currentTable.indices && currentTable.indices[childIndices[i]]) {
        currentTable = currentTable.indices[childIndices[i]]
      }

      if (currentTable.scopeName) {
        result = currentTable.scopeName
      }

      if (i === 0) break
      i--
      currentTable = currentTable.parents && currentTable.parents[nodeTypes[i]]
    }

    return result
  }
}

function rejectSelector (selector) {
  throw new TypeError(`Unsupported selector '${selector}'`)
}
