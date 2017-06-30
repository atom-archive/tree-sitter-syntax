const {TextBuffer} = require('atom');
const {assert} = require('chai');
const dedent = require('dedent');
const {Document} = require('tree-sitter');
const javascriptLanguage = require('tree-sitter-javascript');
const point = require('../lib/point-helpers');
const InputAdaptor = require('../lib/input-adapter');
const TreeSitterDecorationLayer = require('../lib/tree-sitter-decoration-layer');
const ScopeMap = require('../lib/scope-map');

describe('TreeSitterDecorationLayer', function () {
  describe('iterator', function () {
    it('reports a tag boundary at relevant nodes in the tree', function () {
      const buffer = new TextBuffer(dedent`
        function foo (a) { return a + 1; }
      `)

      const scopeMap = new ScopeMap({
        'program': 'source.js',
        'function': 'meta.function.js',
        'function > "function"': 'storage.type.function.js',
        'function > identifier': 'entity.name.function.js',
        'formal_parameters': 'meta.parameters.js',
        'formal_parameters > identifier': 'variable.parameter.function.js',
        '"("': 'punctuation.definition.parameters.begin.bracket.round.js',
        '")"': 'punctuation.definition.parameters.end.bracket.round.js',
        '"{"': 'punctuation.definition.function.body.begin.bracket.curly.js',
        '"}"': 'punctuation.definition.function.body.end.bracket.curly.js',
        '"return"': 'keyword.control.js',
        '"+"': 'keyword.operator.js',
        'number': 'constant.numeric.decimal.js'
      })

      const document = new Document()
        .setInput(new InputAdaptor(buffer))
        .setLanguage(javascriptLanguage)

      const layer = new TreeSitterDecorationLayer({buffer, document, scopeMap})
      const iterator = layer.buildIterator()

      assert.deepEqual(getTokens(buffer, iterator)[0], [
        {text: 'function', scopes: ['source.js', 'meta.function.js', 'storage.type.function.js']},
        {text: ' ', scopes: ['source.js', 'meta.function.js']},
        {text: 'foo', scopes: ['source.js', 'meta.function.js', 'entity.name.function.js']},
        {text: ' ', scopes: ['source.js', 'meta.function.js']},
        {text: '(', scopes: ['source.js', 'meta.function.js', 'meta.parameters.js', 'punctuation.definition.parameters.begin.bracket.round.js']},
        {text: 'a', scopes: ['source.js', 'meta.function.js', 'meta.parameters.js', 'variable.parameter.function.js']},
        {text: ')', scopes: ['source.js', 'meta.function.js', 'meta.parameters.js', 'punctuation.definition.parameters.end.bracket.round.js']},
        {text: ' ', scopes: ['source.js', 'meta.function.js']},
        {text: '{', scopes: ['source.js', 'meta.function.js', 'punctuation.definition.function.body.begin.bracket.curly.js']},
        {text: ' ', scopes: ['source.js', 'meta.function.js']},
        {text: 'return', scopes: ['source.js', 'meta.function.js', 'keyword.control.js']},
        {text: ' a ', scopes: ['source.js', 'meta.function.js']},
        {text: '+', scopes: ['source.js', 'meta.function.js', 'keyword.operator.js']},
        {text: ' ', scopes: ['source.js', 'meta.function.js']},
        {text: '1', scopes: ['source.js', 'meta.function.js', 'constant.numeric.decimal.js']},
        {text: '; ', scopes: ['source.js', 'meta.function.js']},
        {text: '}', scopes: ['source.js', 'meta.function.js', 'punctuation.definition.function.body.end.bracket.curly.js']}
      ])
    })
  })
})

function getTokens (buffer, iterator) {
  const tokenLines = []
  let currentTokenLine = []
  let currentTokenScopes = []

  let startPosition = {row: 0, column: 0}
  iterator.seek(startPosition)
  currentTokenScopes.push(...iterator.getOpenTags())

  const eofPosition = buffer.getEndPosition()
  while (point.isLessThan(iterator.getPosition(), eofPosition)) {
    iterator.moveToSuccessor()
    const endPosition = iterator.getPosition()

    if (endPosition.row === startPosition.row) {
      const text = buffer.getTextInRange([startPosition, endPosition])
      currentTokenLine.push({text, scopes: currentTokenScopes.slice()})
    } else {
      tokenLines.push(currentTokenLine)
      currentTokenLine = []
    }

    for (let closeTag of iterator.getCloseTags()) {
      assert.equal(currentTokenScopes.pop(), closeTag)
    }

    currentTokenScopes.push(...iterator.getOpenTags())
    startPosition = endPosition
  }

  tokenLines.push(currentTokenLine)
  assert.equal(currentTokenScopes.length, 0)
  return tokenLines
}
