/** @babel */

const {assert} = require('chai');
const ScopeMap = require('../lib/scope-map');

describe('ScopeMap', function () {
  describe('scopeNameForNode(node)', function () {
    it('can match immediate child selectors', function () {
      const map = new ScopeMap({
        'a > b > c': 'x',
        'b > c': 'y',
        'c': 'z'
      })

      assert.equal(map.get(['a', 'b', 'c'], [0, 0, 0]), 'x')
      assert.equal(map.get(['d', 'b', 'c'], [0, 0, 0]), 'y')
      assert.equal(map.get(['d', 'e', 'c'], [0, 0, 0]), 'z')
      assert.equal(map.get(['e', 'c'], [0, 0, 0]), 'z')
      assert.equal(map.get(['c'], [0, 0, 0]), 'z')
      assert.equal(map.get(['d'], [0, 0, 0]), undefined)
    })

    it('can match :nth-child pseudo-selectors on leaves', function () {
      const map = new ScopeMap({
        'a > b': 'w',
        'a > b:nth-child(1)': 'x',
        'b': 'y',
        'b:nth-child(2)': 'z',
      })

      assert.equal(map.get(['a', 'b'], [0, 0]), 'w')
      assert.equal(map.get(['a', 'b'], [0, 1]), 'x')
      assert.equal(map.get(['a', 'b'], [0, 2]), 'w')
      assert.equal(map.get(['b'], [0]), 'y')
      assert.equal(map.get(['b'], [1]), 'y')
      assert.equal(map.get(['b'], [2]), 'z')
    })

    it('can match :nth-child pseudo-selectors on interior nodes', function () {
      const map = new ScopeMap({
        'b:nth-child(1) > c': 'w',
        'a > b > c': 'x',
        'a > b:nth-child(2) > c': 'y',
      })

      assert.equal(map.get(['b', 'c'], [0, 0]), undefined)
      assert.equal(map.get(['b', 'c'], [1, 0]), 'w')
      assert.equal(map.get(['a', 'b', 'c'], [1, 0, 0]), 'x')
      assert.equal(map.get(['a', 'b', 'c'], [1, 2, 0]), 'y')

    })

    it('allows anonymous tokens to be referred to by their string value', function () {
      const map = new ScopeMap({
        '"b"': 'w',
        'a > "b"': 'x',
        'a > "b":nth-child(1)': 'y',
      })

      assert.equal(map.get(['b'], [0], true), undefined)
      assert.equal(map.get(['b'], [0], false), 'w')
      assert.equal(map.get(['a', 'b'], [0, 0], false), 'x')
      assert.equal(map.get(['a', 'b'], [0, 1], false), 'y')
    })

    it('supports the wildcard selector', () => {
      const map = new ScopeMap({
        '*': 'w',
        'a > *': 'x',
        'a > *:nth-child(1)': 'y',
        'a > *:nth-child(1) > b': 'z',
      })

      assert.equal(map.get(['b'], [0]), 'w')
      assert.equal(map.get(['c'], [0]), 'w')
      assert.equal(map.get(['a', 'b'], [0, 0]), 'x')
      assert.equal(map.get(['a', 'b'], [0, 1]), 'y')
      assert.equal(map.get(['a', 'c'], [0, 1]), 'y')
      assert.equal(map.get(['a', 'c', 'b'], [0, 1, 1]), 'z')
      assert.equal(map.get(['a', 'c', 'b'], [0, 2, 1]), 'w')
    })
  })
})
