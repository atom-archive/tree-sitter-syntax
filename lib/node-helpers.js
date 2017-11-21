function getText(node, buffer) {
  return buffer.getTextInRange([node.startPosition, node.endPosition]);
}

function closest(node, types) {
  if (typeof types === 'string') types = [types]
  let result = node.parent
  while (result && !types.includes(result.type)) {
    result = result.parent
  }
  return result
}

function getNamedChild(node, type) {
  return node.namedChildren.find(child => child.type === type)
}

function getChild(node, type) {
  return node.children.find(child => child.type === type)
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

function findAll(node, types, options) {
  if (typeof(types) === 'string') types = [types]
  const results = []
  const nodeTypeToStopAt = options && options.stopAt
  findAllHelper(node, types, results, nodeTypeToStopAt)
  return results
}

function findAllHelper(node, types, results, nodeTypeToStopAt) {
  node.namedChildren.forEach(child => {
    if (types.includes(child.type)) results.push(child)
    if (child.type === nodeTypeToStopAt) return
    findAllHelper(child, types, results)
  })
}

module.exports = {
  closest, findAll, findFirstNamed, getNamedChild, getChild, getText
}
