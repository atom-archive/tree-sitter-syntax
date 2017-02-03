const path = require('path');
const CSON = require('season');
const {CompositeDisposable} = require('atom');
const TreeSitterDecorationLayer = require('./tree-sitter-decoration-layer');
const SelectionManager = require('./selection-manager');
const FoldManager = require('./fold-manager');
const InputAdaptor = require('./input-adapter');
const ScopeMap = require('./scope-map');
const {Document} = require('tree-sitter');
const RelatedTokenManager = require('./related-token-manager');

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
  },

  'source.ruby': {
    name: 'ruby',
    language: 'tree-sitter-ruby'
  }
};

let disposables = null;
const scopeMapCache = {};
const foldConfigCache = {};

exports.activate =  function() {
  disposables = new CompositeDisposable(
    atom.workspace.observeTextEditors(enableSyntaxForEditor)
  );
};

exports.deactivate =  function() {
  disposables.dispose()
};

function enableSyntaxForEditor(editor) {
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

    const foldConfig = getFoldConfig(config.name);
    if (foldConfig) {
      new FoldManager(editor, document, foldConfig).activate();
    }

    const relatedTokenProvider = getRelatedTokenProvider(config.name);
    if (relatedTokenProvider) {
      new RelatedTokenManager(editor, document, relatedTokenProvider)
    }

    const scopeMap = getScopeMap(config.name)
    const decorationLayer = new TreeSitterDecorationLayer({buffer, document, scopeMap})
    buffer.registerTextDecorationLayer(decorationLayer)
    editor.displayLayer.setTextDecorationLayer(decorationLayer)
    editor.displayLayer.reset({})
  }
}

function getFoldConfig(languageName) {
  let result = foldConfigCache[languageName];
  if (result == null) {
    const configPath = path.join(__dirname, '..', 'languages', languageName, 'folds.cson')
    try {
      result = foldConfigCache[languageName] = CSON.readFileSync(configPath)
    } catch (e) {
      foldConfigCache[languageName] = false;
    }
  }
  return result;
}

function getRelatedTokenProvider(languageName) {
  try {
    return require('../languages/' + languageName + '/related-tokens');
  } catch (e) {
    return null;
  }
}

function getScopeMap(languageName) {
  let scopeMap = scopeMapCache[languageName]
  if (!scopeMap) {
    const scopeMapSelectorPath = path.join(__dirname, '..', 'languages', languageName, 'scopes.cson')
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
