module.exports =
function (node, buffer) {
  switch (node.type) {
    case 'identifier': return getVariableUsages(node, buffer)
  }
};

const FUNCTION_TYPES = new Set([
  'function',
  'method_definition',
  'arrow_function',
])

const SCOPE_TYPES = new Set([
  'statement_block',
  'program',
  ...FUNCTION_TYPES
]);

function getVariableUsages(currentNode, buffer) {
  const results = [];
  const variableName = getText(currentNode, buffer);

  // Walk up the syntax tree, looking for declarations in each scope.
  let node = closest(currentNode, SCOPE_TYPES);
  while (node) {
    let declaredVariable = null;
    let declaredVariableScope = null;

    // In each containing function, look for a parameter whose name matches.
    if (FUNCTION_TYPES.has(node.type)) {
      const parameterList = node.namedChildren.find(child =>
        child.type === 'formal_parameters'
      );

      if (parameterList) {
        const parameters = parameterList.namedChildren;
        for (let i = 0, n = parameters.length; i < n; i++) {
          const parameter = parameters[i];
          if (parameter.type === 'identifier') {
            if (getText(parameter, buffer) === variableName) {
              declaredVariable = parameter;
              break;
            }
          } else if (parameter.type === 'assignment_pattern') {
            if (declaredVariable = parameter.firstChild.namedChildren.find(child =>
              getText(child, buffer) === variableName
            )) break;
          }
        }
      } else {

        // Arrow functions may have a single parameter instead of a parameter
        // list.
        const singleParameter = node.firstChild;
        if (singleParameter.type === 'identifier' &&
            getText(singleParameter, buffer) === variableName) {
          declaredVariable = singleParameter;
        }
      }

      if (declaredVariable) {
        declaredVariableScope = node.namedChildren.find(child =>
          child.type === 'statement_block'
        );

        // Arrow functions may have a single expression as their body, instead
        // of a statement block.
        if (!declaredVariableScope) {
          declaredVariableScope = node.lastChild;
        }
      }
    } else {

      // In each containing statement block, look for a declaration whose
      // name matches.
      const statements = node.namedChildren;

      statement_loop:
      for (let i = 0, n = statements.length; i < n; i++) {
        const statement = statements[i];
        if (statement.type === 'var_declaration') {
          const declarationComponents = statement.namedChildren;
          for (let j = 0, m = declarationComponents.length; j < m; j++) {
            const declarationComponent = declarationComponents[j];

            let variable;
            switch (declarationComponent.type) {
              case 'identifier':
                variable = declarationComponent;
                break;
              case 'var_assignment':
                variable = declarationComponent.firstChild;
                break;
              default:
                continue;
            }

            if (getText(variable, buffer) === variableName) {
              declaredVariable = variable;
              declaredVariableScope = node;
              break statement_loop;
            }
          }
        }
      }
    }

    // Once a declaration is found, find all usages of the variable in its scope.
    if (declaredVariable) {
      results.push({node: declaredVariable, highlightClass: 'variable-definition'})

      const identifiers = findAll(declaredVariableScope, 'identifier');
      for (let i = 0, n = identifiers.length; i < n; i++) {
        const identifier = identifiers[i];
        if (identifier.id !== declaredVariable.id) {
          if (getText(identifier, buffer) === variableName) {
            results.push({node: identifier, highlightClass: 'variable-usage'})
          }
        }
      }

      break;
    }

    node = closest(node, SCOPE_TYPES);
  }

  return results
}

function getText(node, buffer) {
  return buffer.getTextInRange([node.startPosition, node.endPosition]);
}

function closest(node, types) {
  let result = node.parent
  while (result && !types.has(result.type)) {
    result = result.parent
  }
  return result
}

function findAll(node, type) {
  const results = []
  findAllHelper(node, type, results)
  return results
}

function findAllHelper(node, type, results) {
  node.children.forEach(child => {
    if (child.type === type) {
      results.push(child)
    }
    findAllHelper(child, type, results)
  })
}
