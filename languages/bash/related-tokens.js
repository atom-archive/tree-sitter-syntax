const {closest, findAll, getText, getChild} = require('../../lib/node-helpers');

module.exports =
function(node, buffer, document) {
  switch (node.type) {
    case 'variable_name': {
      return getVariableUsages(node, buffer, document)
    }

    case 'if':
    case 'then':
    case 'else':
    case 'fi': {
      const result = []
      closest(node, 'if_statement').children.forEach(child => {
        if (['if', 'then', 'fi'].includes(child.type)) {
          result.push({node: child, highlightClass: 'matching-tag'})
        } else if (child.type === 'else_clause') {
          result.push({node: child.children[0], highlightClass: 'matching-tag'})
        }
      })
      return result
    }

    case 'for':
    case 'while':
    case 'do':
    case 'done': {
      const result = []
      const statement = closest(node, ['for_statement', 'while_statement'])
      result.push({node: statement.firstChild, highlightClass: 'matching-tag'})
      const doGroup = statement.lastChild
      result.push({node: doGroup.firstChild, highlightClass: 'matching-tag'})
      result.push({node: doGroup.lastChild, highlightClass: 'matching-tag'})
      return result
    }
  }
}

function getVariableUsages(node, buffer, document) {
  const result = []

  let foundFirstAssignment = false;
  const variableName = getText(node, buffer);
  const variableNodes = findAll(document.rootNode, 'variable_name');

  for (let i = 0, n = variableNodes.length; i < n; i++) {
    const variableNode = variableNodes[i];
    if (getText(variableNode, buffer) === variableName) {
      if (!foundFirstAssignment && variableNode.parent.type === 'environment_variable_assignment') {
        foundFirstAssignment = true;
        result.push({
          node: variableNode,
          highlightClass: 'variable-definition'
        })
      } else {
        result.push({
          node: variableNode,
          highlightClass: 'variable-usage'
        })
      }
    }
  }

  return result
}