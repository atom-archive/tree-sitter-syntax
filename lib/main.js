const path = require('path');
const CSON = require('season');
const {CompositeDisposable} = require('atom');
const TreeSitterLanguageMode = require('./tree-sitter-language-mode');
const SelectionManager = require('./selection-manager');
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

  'source.cpp': {
    name: 'cpp',
    language: 'tree-sitter-cpp'
  },

  'source.python': {
    name: 'python',
    language: 'tree-sitter-python'
  },

  'source.ruby': {
    name: 'ruby',
    language: 'tree-sitter-ruby'
  },

  'source.ruby.rails': {
    name: 'ruby',
    language: 'tree-sitter-ruby'
  },

  'source.shell': {
    name: 'bash',
    language: 'tree-sitter-bash'
  },

  'source.ts': {
    name: 'typescript',
    language: 'tree-sitter-typescript'
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
  const scopeDescriptor = editor.getRootScopeDescriptor()
  const currentScopeName = scopeDescriptor.getScopesArray()[0]
  const config = LANGUAGE_CONFIGURATIONS_BY_SCOPE[currentScopeName]
  if (config && !atom.config.get('tree-sitter-syntax.disabledLanguages').includes(config.name)) {
    const buffer = editor.getBuffer()
    const language = require(config.language)

    const document = new Document()
      .setInput(new InputAdaptor(editor.getBuffer()))
      .setLanguage(language)

    document.parse()

    const selectionManager = new SelectionManager({editor, document})
    selectionManager.listen();


    const relatedTokenProvider = getRelatedTokenProvider(config.name);
    if (relatedTokenProvider) {
      new RelatedTokenManager(editor, document, relatedTokenProvider)
    }

    const languageMode = new TreeSitterLanguageMode({
      buffer,
      document,
      grammar: editor.getGrammar(),
      scopeMap: getScopeMap(config.name),
      foldConfig: getFoldConfig(config.name),
      scopeDescriptor
    })

    buffer.registerTextDecorationLayer(languageMode)
    editor.displayLayer.setTextDecorationLayer(languageMode)
    editor.tokenizedBuffer.destroy()
    editor.tokenizedBuffer = languageMode
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
  if (!result.tokens) result.tokens = []
  if (!result.delimiters) result.delimiters = []
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
        .join(' ')
    }
    scopeMap = scopeMapCache[languageName] = new ScopeMap(scopeMapSelectors)
  }
  return scopeMap
}
