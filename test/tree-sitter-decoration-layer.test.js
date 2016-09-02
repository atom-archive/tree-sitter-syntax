/** @babel */

import {TextBuffer} from 'atom'
import {assert} from 'chai'
import dedent from 'dedent'
import javascriptLanguage from 'tree-sitter-javascript'

import TreeSitterDecorationLayer from '../lib/tree-sitter-decoration-layer'
import ScopeMap from '../lib/scope-map'

describe('TreeSitterDecorationLayer', function () {

  describe('iterator', function () {
    it('reports a tag boundary at relevant nodes in the tree', function () {
      const buffer = new TextBuffer(dedent`
        function foo (a) { return a + 1 }
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

      const layer = new TreeSitterDecorationLayer({buffer, language: javascriptLanguage, scopeMap})
      const iterator = layer.buildIterator()

      iterator.seek({row: 0, column: 0})
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 0})
      assert.deepEqual(iterator.getCloseTags(), [])
      assert.deepEqual(iterator.getOpenTags(), ['source.js', 'meta.function.js', 'storage.type.function.js'])

      assert(iterator.moveToSuccessor())
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function'.length})
      assert.deepEqual(iterator.getCloseTags(), ['storage.type.function.js'])
      assert.deepEqual(iterator.getOpenTags(), [])

      assert(iterator.moveToSuccessor())
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function '.length})
      assert.deepEqual(iterator.getCloseTags(), [])
      assert.deepEqual(iterator.getOpenTags(), ['entity.name.function.js'])

      assert(iterator.moveToSuccessor())
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function foo'.length})
      assert.deepEqual(iterator.getCloseTags(), ['entity.name.function.js'])
      assert.deepEqual(iterator.getOpenTags(), [])

      assert(iterator.moveToSuccessor())
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function foo '.length})
      assert.deepEqual(iterator.getCloseTags(), [])
      assert.deepEqual(iterator.getOpenTags(), ['meta.parameters.js', 'punctuation.definition.parameters.begin.bracket.round.js'])

      assert(iterator.moveToSuccessor())
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function foo ('.length})
      assert.deepEqual(iterator.getCloseTags(), ['punctuation.definition.parameters.begin.bracket.round.js'])
      assert.deepEqual(iterator.getOpenTags(), ['variable.parameter.function.js'])

      assert(iterator.moveToSuccessor())
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function foo (a'.length})
      assert.deepEqual(iterator.getCloseTags(), ['variable.parameter.function.js'])
      assert.deepEqual(iterator.getOpenTags(), ['punctuation.definition.parameters.end.bracket.round.js'])

      assert(iterator.moveToSuccessor())
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function foo (a)'.length})
      assert.deepEqual(iterator.getCloseTags(), ['punctuation.definition.parameters.end.bracket.round.js', 'meta.parameters.js'])
      assert.deepEqual(iterator.getOpenTags(), [])

      assert(iterator.moveToSuccessor())
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function foo (a) '.length})
      assert.deepEqual(iterator.getCloseTags(), [])
      assert.deepEqual(iterator.getOpenTags(), ['punctuation.definition.function.body.begin.bracket.curly.js'])

      assert(iterator.moveToSuccessor())
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function foo (a) {'.length})
      assert.deepEqual(iterator.getCloseTags(), ['punctuation.definition.function.body.begin.bracket.curly.js'])
      assert.deepEqual(iterator.getOpenTags(), [])

      assert(iterator.moveToSuccessor())
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function foo (a) { '.length})
      assert.deepEqual(iterator.getCloseTags(), [])
      assert.deepEqual(iterator.getOpenTags(), ['keyword.control.js'])

      assert(iterator.moveToSuccessor())
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function foo (a) { return'.length})
      assert.deepEqual(iterator.getCloseTags(), ['keyword.control.js'])
      assert.deepEqual(iterator.getOpenTags(), [])

      assert(iterator.moveToSuccessor())
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function foo (a) { return a '.length})
      assert.deepEqual(iterator.getCloseTags(), [])
      assert.deepEqual(iterator.getOpenTags(), ['keyword.operator.js'])

      assert(iterator.moveToSuccessor())
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function foo (a) { return a +'.length})
      assert.deepEqual(iterator.getCloseTags(), ['keyword.operator.js'])
      assert.deepEqual(iterator.getOpenTags(), [])

      assert(iterator.moveToSuccessor())
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function foo (a) { return a + '.length})
      assert.deepEqual(iterator.getCloseTags(), [])
      assert.deepEqual(iterator.getOpenTags(), ['constant.numeric.decimal.js'])

      assert(iterator.moveToSuccessor())
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function foo (a) { return a + 1'.length})
      assert.deepEqual(iterator.getCloseTags(), ['constant.numeric.decimal.js'])
      assert.deepEqual(iterator.getOpenTags(), [])

      assert(iterator.moveToSuccessor())
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function foo (a) { return a + 1 '.length})
      assert.deepEqual(iterator.getCloseTags(), [])
      assert.deepEqual(iterator.getOpenTags(), ['punctuation.definition.function.body.end.bracket.curly.js'])

      assert(!iterator.moveToSuccessor())
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function foo (a) { return a + 1 }'.length})
      assert.deepEqual(iterator.getCloseTags(), ['punctuation.definition.function.body.end.bracket.curly.js', 'meta.function.js', 'source.js'])
      assert.deepEqual(iterator.getOpenTags(), [])

      assert(!iterator.moveToSuccessor())
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function foo (a) { return a + 1 }'.length})
      assert.deepEqual(iterator.getCloseTags(), [])
      assert.deepEqual(iterator.getOpenTags(), [])
    })
  })
})
