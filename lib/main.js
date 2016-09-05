/** @babel */

import path from 'path'
import CSON from 'season'
import {CompositeDisposable} from 'atom'
import TreeSitterDecorationLayer from './tree-sitter-decoration-layer'
import SelectionManager from './selection-manager'
import InputAdaptor from './input-adapter'
import ScopeMap from './scope-map'
import {Document} from 'tree-sitter'

const LANGUAGE_CONFIGURATIONS_BY_SCOPE = {
  'source.js': {
    name: 'javascript',
    language: 'tree-sitter-javascript'
  },

  'source.go': {
    name: 'go',
    language: 'tree-sitter-go'
  },

  'source.c': {
    name: 'c',
    language: 'tree-sitter-c'
  }
}

let disposables = null
let scopeMapCache = {}

export function activate () {
  disposables = new CompositeDisposable()
  disposables.add(
    atom.workspace.observeTextEditors(enableSyntaxForEditor)
  )
}

export function deactivate () {
  disposables.dispose()
  disposables = null
}

function enableSyntaxForEditor (editor) {
  const currentScopeName = editor.getRootScopeDescriptor().getScopesArray()[0]
  const config = LANGUAGE_CONFIGURATIONS_BY_SCOPE[currentScopeName]
  if (config && atom.config.get('tree-sitter-syntax.enabledLanguages').includes(config.name)) {
    const buffer = editor.getBuffer()
    const language = require(config.language)

    const document = new Document()
      .setInput(new InputAdaptor(editor.getBuffer()))
      .setLanguage(language)
      .parse()

    let scopeMap = scopeMapCache[config.name]
    if (!scopeMap) {
      const scopeMapSelectorPath =
        path.join(__dirname, '..', 'scope-mappings', config.name + '.cson')
      const scopeMapSelectors = CSON.readFileSync(scopeMapSelectorPath)
      scopeMap = scopeMapCache[config.scopeMapSelectors] = new ScopeMap(scopeMapSelectors)
    }

    const controller = new SelectionManager({editor, document})

    const decorationLayer = new TreeSitterDecorationLayer({buffer, document, scopeMap})
    buffer.registerTextDecorationLayer(decorationLayer)
    editor.displayLayer.setTextDecorationLayer(decorationLayer)
    editor.displayLayer.reset({})
  }
}
