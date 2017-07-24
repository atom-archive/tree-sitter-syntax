module.exports =
function(node, buffer, document) {
  switch (node.type) {
    case 'variable_name':
      return getVariableUsages(node, buffer, document)
  }
}

function getVariableUsages(node, buffer, document) {
  const variableName = getText(node, buffer)
  let scope = node

  while (true) {
    let nextScope = closest(scope, 'compound_statement')
    if (!nextScope) {
      const parameterList = closest(scope, 'parameter_list')
      if (parameterList) {
        nextScope = getNamedChild(closest(parameterList, 'function_definition'), 'compound_statement')
      } else if (scope.parent) {
        nextScope = document.rootNode
      }
    }
    scope = nextScope
    if (!scope) break

    let variableDeclarationNode

    const {parent} = scope
    if (parent && parent.type === 'function_definition') {
      const parameterList = findFirstNamed(parent, 'parameter_list')
      parameterList.namedChildren.forEach(parameterDeclaration => {
        const parameterNameNode = findFirstNamed(parameterDeclaration, 'variable_name')
        if (getText(parameterNameNode, buffer) === variableName) {
          variableDeclarationNode = parameterNameNode
        }
      })
    }

    if (!variableDeclarationNode) {
      const declarationNodes = findAll(scope, 'declaration', {stopAt: 'compound_statement'})

      declarationLoop:
      for (const declarationNode of declarationNodes) {
        const declarators = declarationNode.namedChildren
        for (let i = 1, n = declarators.length; i < n; i++) {
          const variableNameNode = findFirstNamed(declarators[i], 'variable_name', true)
          if (variableNameNode && getText(variableNameNode, buffer) === variableName) {
            variableDeclarationNode = variableNameNode
            break declarationLoop
          }
        }
      }
    }

    if (variableDeclarationNode) {
      const results = [
        {node: variableDeclarationNode, highlightClass: 'variable-definition'}
      ]

      const identifiers = findAll(scope, 'variable_name');
      for (let i = 0, n = identifiers.length; i < n; i++) {
        const identifier = identifiers[i];
        if (identifier.id !== variableDeclarationNode.id) {
          if (getText(identifier, buffer) === variableName) {
            results.push({node: identifier, highlightClass: 'variable-usage'})
          }
        }
      }

      return results
    }
  }

  return null
}

function getText(node, buffer) {
  return buffer.getTextInRange([node.startPosition, node.endPosition]);
}

function closest(node, type) {
  let result = node.parent
  while (result && result.type !== type) {
    result = result.parent
  }
  return result
}

function getNamedChild(node, type) {
  return node.namedChildren.find(child => child.type === type)
}

function findFirstNamed(node, type, includeSelf = false) {
  if (includeSelf && node.type === type) {
    return node
  } else {
    const {namedChildren} = node
    for (let i = 0, n = namedChildren.length; i < n; i++) {
      const result = findFirstNamed(namedChildren[i], type, true)
      if (result) return result
    }
  }
}

function findAll(node, type, options) {
  const results = []
  const nodeTypeToStopAt = options && options.stopAt
  findAllHelper(node, type, results, nodeTypeToStopAt)
  return results
}

function findAllHelper(node, type, results, nodeTypeToStopAt) {
  node.namedChildren.forEach(child => {
    if (child.type === type) results.push(child)
    if (child.type === nodeTypeToStopAt) return
    findAllHelper(child, type, results)
  })
}
