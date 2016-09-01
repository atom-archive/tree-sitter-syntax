/** @babel */

import {assert} from 'chai'
import ScopeMap from '../lib/scope-map'

describe('ScopeMap', function () {
  describe('scopeNameForNode(node)', function () {
    it('can match immediate child selectors', function () {
      const map = new ScopeMap({
        'a > b > c': 'x',
        'b > c': 'y',
        'c': 'z'
      })

      assert.equal(map.scopeNameForScopeDescriptor(['a', 'b', 'c']), 'x')
      assert.equal(map.scopeNameForScopeDescriptor(['d', 'b', 'c']), 'y')
      assert.equal(map.scopeNameForScopeDescriptor(['d', 'e', 'c']), 'z')
      assert.equal(map.scopeNameForScopeDescriptor(['e', 'c']), 'z')
      assert.equal(map.scopeNameForScopeDescriptor(['c']), 'z')
      assert.equal(map.scopeNameForScopeDescriptor(['d', 'e', 'f']), undefined)
    })
  })
})
