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

module.exports = {
  closest, findAll, findFirstNamed, getNamedChild, getChild, getText
}