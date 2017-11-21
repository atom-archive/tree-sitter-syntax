const path = require('path');
const CSON = require('season');
const {CompositeDisposable, Emitter} = require('atom');
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

let disposables = null
const grammarCache = {}
const emitter = new Emitter()

exports.activate =  function() {
  disposables = new CompositeDisposable(
    atom.workspace.observeTextEditors(enableSyntaxForEditor)
  );
};

exports.deactivate =  function() {
  disposables.dispose()
};

exports.provideTreeSitterSyntaxBeta = function() {
  return {
    onMarkersCreated: (cb) => emitter.on("markers-created", cb)
  }
}

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
      new RelatedTokenManager(editor, document, relatedTokenProvider, emitter)
    }

    const grammar = getGrammar(config.name)

    const languageMode = new TreeSitterLanguageMode({
      buffer, document, grammar, scopeDescriptor
    })

    buffer.registerTextDecorationLayer(languageMode)
    editor.displayLayer.setTextDecorationLayer(languageMode)
    editor.tokenizedBuffer.destroy()
    editor.tokenizedBuffer = languageMode
    editor.displayLayer.reset({})
  }
}

function getRelatedTokenProvider(languageName) {
  try {
    return require('../languages/' + languageName + '/related-tokens');
  } catch (e) {
    return null;
  }
}

function getGrammar (languageName) {
  if (!grammarCache[languageName]) {
    const grammarCSON = CSON.readFileSync(
      require.resolve('../languages/' + languageName + '/grammar.cson')
    )
    const scopeMapSelectors = grammarCSON.scopes
    for (const key of Object.keys(scopeMapSelectors)) {
      scopeMapSelectors[key] = scopeMapSelectors[key]
        .split('.')
        .map(s => `syntax--${s}`)
        .join(' ')
    }
    grammarCache[languageName] = {
      scopeMap: new ScopeMap(scopeMapSelectors),
      foldConfig: Object.assign({
        tokens: [],
        delimiters: []
      }, grammarCSON.folds),
      commentStrings: {
        commentStartString: grammarCSON.comments.start,
        commentEndString: grammarCSON.comments.end
      }
    }
  }
  return grammarCache[languageName]
}
