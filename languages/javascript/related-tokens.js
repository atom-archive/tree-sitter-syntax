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

module.exports =
function (node, buffer) {
  switch (node.type) {
    case 'variable_name':
    case 'shorthand_property_name':
      return getVariableUsages(node, buffer);

    case 'identifier':
      const {parent} = node;
      switch (parent.type) {
        case 'jsx_opening_element':
          return [
            {
              node,
              highlightClass: 'matching-tag'
            },
            {
              node: parent.parent.lastChild.firstNamedChild,
              highlightClass: 'matching-tag'
            }
          ];
        case 'jsx_closing_element':
          return [
            {
              node,
              highlightClass: 'matching-tag'
            },
            {
              node: parent.parent.firstChild.firstNamedChild,
              highlightClass: 'matching-tag'
            },
          ];
      }
      break;
  }
};

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
          if (parameter.type === 'variable_name') {
            if (getText(parameter, buffer) === variableName) {
              declaredVariable = parameter;
              break;
            }
          } else if (parameter.type === 'object_pattern' || parameter.type === 'array_pattern') {
            if (declaredVariable = parameter.namedChildren.find(child =>
              getText(child, buffer) === variableName
            )) break;
          }
        }
      } else {

        // Arrow functions may have a single parameter instead of a parameter
        // list.
        const singleParameter = node.firstChild;
        if (singleParameter.type === 'variable_name' &&
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
      for (let i = 0, n = statements.length; i < n; i++) {
        const statement = statements[i];
        eachDeclaredVariable(statement, (variable) => {
          if (getText(variable, buffer) === variableName) {
            declaredVariable = variable;
            declaredVariableScope = node;
            return true;
          }
        });
      }
    }

    // Once a declaration is found, find all usages of the variable in its scope.
    if (declaredVariable) {
      results.push({node: declaredVariable, highlightClass: 'variable-definition'})

      const identifiers = findAll(declaredVariableScope, 'variable_name');
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

function eachDeclaredVariable(statement, callback) {
  if (statement.type === 'for_statement') statement = statement.firstNamedChild;

  if (statement.type === 'variable_declaration' || statement.type === 'lexical_declaration') {
    const declarationComponents = statement.namedChildren;
    for (let i = 0, m = declarationComponents.length; i < m; i++) {
      const declarationComponent = declarationComponents[i];

      switch (declarationComponent.type) {
        case 'variable_name':
          if (callback(declarationComponent)) return;
          break;

        case 'variable_declarator':
          const leftHandSide = declarationComponent.firstChild;
          switch (leftHandSide.type) {
            case 'variable_name':
              if (callback(leftHandSide)) return;
              break;

            case 'object_pattern':
            case 'array_pattern':
              const patternChildren = leftHandSide.namedChildren;
              for (let j = 0, n = patternChildren.length; j < n; j++) {
                const patternChild = patternChildren[j];
                switch (patternChild.type) {
                  case 'variable_name':
                    if (callback(patternChild)) return;
                    break;

                  case 'pair':
                    if (callback(patternChild.lastChild)) return;
                    break;
                }
              }
              break;
          }
      }
    }
  }
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
