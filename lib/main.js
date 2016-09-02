/** @babel */

import path from 'path'
import CSON from 'season'
import {CompositeDisposable} from 'atom'
import TreeSitterDecorationLayer from './tree-sitter-decoration-layer'
import ScopeMap from './scope-map'

const LANGUAGE_CONFIGURATIONS_BY_SCOPE = {
  'source.js': {
    language: 'tree-sitter-javascript',
    scopeMapSelectors: 'javascript'
  },
  'source.go': {
    language: 'tree-sitter-go',
    scopeMapSelectors: '../scope-mappings/go'
  },
}

let disposables = null

export function activate () {
  disposables = new CompositeDisposable()
  disposables.add(
    atom.commands.add(
      'atom-text-editor',
      'tree-sitter-syntax:toggle',
      toggleSyntaxForEditor
    )
  )
}

export function deactivate () {
  disposables.dispose()
  disposables = null
}

function toggleSyntaxForEditor ({target: editorElement}) {
  const
    editor = editorElement.getModel(),
    currentScopeName = editor.getRootScopeDescriptor().getScopesArray()[0],
    config = LANGUAGE_CONFIGURATIONS_BY_SCOPE[currentScopeName],
    buffer = editor.getBuffer(),
    language = require(config.language),
    scopeMapSelectorPath = path.join(__dirname, '..', 'scope-mappings', config.scopeMapSelectors + '.cson'),
    scopeMapSelectors = CSON.readFileSync(scopeMapSelectorPath),
    scopeMap = new ScopeMap(scopeMapSelectors),
    decorationLayer = new TreeSitterDecorationLayer({buffer, language, scopeMap})

  buffer.registerTextDecorationLayer(decorationLayer)
  editor.displayLayer.setTextDecorationLayer(decorationLayer)
  editor.displayLayer.reset({})
}
