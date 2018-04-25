const path = require('path')
const RelatedTokenManager = require('./related-token-manager')
const {CompositeDisposable, Emitter} = require('atom')

let disposables = null
const emitter = new Emitter()

exports.activate =  function () {
  disposables = new CompositeDisposable()
  disposables.add(atom.workspace.observeTextEditors(enableSyntaxForEditor))
}

exports.deactivate =  function () {
  disposables.dispose()
}

exports.provideTreeSitterSyntaxBeta = function() {
  return {
    onMarkersCreated: (cb) => emitter.on("markers-created", cb)
  }
}

function enableSyntaxForEditor (editor) {
  const languageMode = editor.getBuffer().getLanguageMode()

  if (languageMode.document) {
    const languageId = languageMode.getLanguageId()
    const relatedTokenProvider = getRelatedTokenProvider(languageId)

    if (relatedTokenProvider) {
      const manager = new RelatedTokenManager(editor, languageMode.document, relatedTokenProvider, emitter)
      const disposable = manager.start()
      disposables.add(disposable)
      editor.onDidDestroy(() => disposables.remove(disposable))
    }
  }
}

function getRelatedTokenProvider (languageName) {
  try {
    return require('../languages/' + languageName + '/related-tokens')
  } catch (e) {
    return null
  }
}
