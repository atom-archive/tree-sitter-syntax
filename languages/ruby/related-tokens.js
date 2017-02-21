const BEGIN_TYPES = new Set([
  'begin',
  'def',
  'if',
  'case',
  'unless',
  'do',
  'class',
  'module'
]);

module.exports =
function (node, buffer) {
  if (node.type === 'end') {
    return [
      {
        node: node,
        highlightClass: 'matching-tag'
      },
      {
        node: node.parent.firstChild,
        highlightClass: 'matching-tag'
      }
    ]
  }

  if (!node.isNamed && BEGIN_TYPES.has(node.type)) {
    const endNode = node.parent.lastChild;
    if (endNode.type === 'end') {
      return [
        {
          node: node,
          highlightClass: 'matching-tag'
        },
        {
          node: node.parent.lastChild,
          highlightClass: 'matching-tag'
        }
      ]
    }
  }
}
