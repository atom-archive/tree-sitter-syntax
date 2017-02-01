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
  },

  'source.python': {
    name: 'python',
    language: 'tree-sitter-python'
  }
}

let disposables = null
let scopeMapCache = {}

export function activate () {
  disposables = new CompositeDisposable(
    atom.workspace.observeTextEditors(enableSyntaxForEditor)
  )
}

export function deactivate () {
  disposables.dispose()
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

    document.parse()

    const selectionManager = new SelectionManager({editor, document})
    selectionManager.listen();

    const scopeMap = getScopeMap(config.name)
    const decorationLayer = new TreeSitterDecorationLayer({buffer, document, scopeMap})
    buffer.registerTextDecorationLayer(decorationLayer)
    editor.displayLayer.setTextDecorationLayer(decorationLayer)
    editor.displayLayer.reset({})
  }
}

function getScopeMap(languageName) {
  let scopeMap = scopeMapCache[languageName]
  if (!scopeMap) {
    const scopeMapSelectorPath = path.join(__dirname, '..', 'scope-mappings', languageName + '.cson')
    const scopeMapSelectors = CSON.readFileSync(scopeMapSelectorPath)
    for (const key of Object.keys(scopeMapSelectors)) {
      scopeMapSelectors[key] = scopeMapSelectors[key]
        .split('.')
        .map(s => `syntax--${s}`)
        .join('.')
    }
    scopeMap = scopeMapCache[languageName] = new ScopeMap(scopeMapSelectors)
  }
  return scopeMap
}
