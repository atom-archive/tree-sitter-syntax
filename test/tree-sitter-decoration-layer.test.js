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
        '")"': 'punctuation.definition.parameters.end.bracket.round.js'
      })

      console.log(scopeMap);

      const layer = new TreeSitterDecorationLayer({buffer, language: javascriptLanguage, scopeMap})
      const iterator = layer.buildIterator()

      iterator.seek({row: 0, column: 0})
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 0})
      assert.deepEqual(iterator.getCloseTags(), [])
      assert.deepEqual(iterator.getOpenTags(), ['source.js', 'meta.function.js', 'storage.type.function.js'])

      iterator.moveToSuccessor()
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function'.length})
      assert.deepEqual(iterator.getCloseTags(), ['storage.type.function.js'])
      assert.deepEqual(iterator.getOpenTags(), [])

      iterator.moveToSuccessor()
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function '.length})
      assert.deepEqual(iterator.getCloseTags(), [])
      assert.deepEqual(iterator.getOpenTags(), ['entity.name.function.js'])

      iterator.moveToSuccessor()
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function foo'.length})
      assert.deepEqual(iterator.getCloseTags(), ['entity.name.function.js'])
      assert.deepEqual(iterator.getOpenTags(), [])

      iterator.moveToSuccessor()
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function foo '.length})
      assert.deepEqual(iterator.getCloseTags(), [])
      assert.deepEqual(iterator.getOpenTags(), ['meta.parameters.js', 'punctuation.definition.parameters.begin.bracket.round.js'])

      iterator.moveToSuccessor()
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function foo ('.length})
      assert.deepEqual(iterator.getCloseTags(), ['punctuation.definition.parameters.begin.bracket.round.js'])
      assert.deepEqual(iterator.getOpenTags(), ['variable.parameter.function.js'])

      iterator.moveToSuccessor()
      assert.deepEqual(iterator.getPosition(), {row: 0, column: 'function foo (a'.length})
      assert.deepEqual(iterator.getCloseTags(), ['variable.parameter.function.js'])
      assert.deepEqual(iterator.getOpenTags(), ['punctuation.definition.parameters.end.bracket.round.js'])
    })
  })
})
