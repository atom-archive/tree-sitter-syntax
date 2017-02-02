const dedent = require('dedent');
const {assert} = require('chai');
const FoldManager = require('../lib/fold-manager');
const {TextEditor, TextBuffer} = require('atom');
const javascriptLanguage = require('tree-sitter-javascript');
const {Document} = require('tree-sitter');
const InputAdaptor = require('../lib/input-adapter');

describe('FoldManager', () => {
  let buffer, editor, document, foldManager;

  beforeEach(() => {
    buffer = new TextBuffer();
    editor = new TextEditor({buffer});
    editor.displayLayer.reset({foldCharacter: '…'});

    document = new Document()
      .setLanguage(javascriptLanguage)
      .setInput(new InputAdaptor(buffer));

    foldManager = new FoldManager(editor, document, {
      delimiters: [
        ['{', '}'],
        ['(', ')'],
        ['[', ']']
      ],
      tokens: [
        ['comment', 2, 2],
        ['template_string', 1, 1]
      ]
    });
  });

  it('can fold a brace-delimited block', () => {
    buffer.setText(dedent`
      module.exports =
      class A {
        getB() {
          return this.b;
        }
      };
    `);

    document.parse();

    assert.notOk(foldManager.isFoldableAtBufferRow(0));
    assert.ok(foldManager.isFoldableAtBufferRow(1));
    assert.ok(foldManager.isFoldableAtBufferRow(2));
    assert.notOk(foldManager.isFoldableAtBufferRow(3));

    foldManager.foldBufferRow(2);
    assert.equal(editor.lineTextForScreenRow(2), '  getB() {…}');
  })

  it('can fold a multiline comment', () => {
    buffer.setText(dedent`
      a();

      /*
       * this is a comment.
       * it is really important.
       */

      b();
    `);

    document.parse();

    assert.notOk(foldManager.isFoldableAtBufferRow(1));
    assert.ok(foldManager.isFoldableAtBufferRow(2));
    assert.notOk(foldManager.isFoldableAtBufferRow(3));

    foldManager.foldBufferRow(2);
    assert.equal(editor.lineTextForScreenRow(2), '/*…*/');
    assert.notOk(foldManager.isFoldableAtBufferRow(3));
  })
});
