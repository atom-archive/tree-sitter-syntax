const {Point, Range} = require('atom');

module.exports =
class SelectionManager {
  constructor({editor, document}) {
    this.editor = editor
    this.document = document
    this.selectedNodeStacks = []
  }

  listen() {
    return atom.commands.add(
      this.editor.getElement(),
      {
        'tree-sitter-syntax:select-up': this.selectUp.bind(this),
        'tree-sitter-syntax:select-down': this.selectDown.bind(this),
        'tree-sitter-syntax:select-left': this.selectLeft.bind(this),
        'tree-sitter-syntax:select-right': this.selectRight.bind(this),
        'tree-sitter-syntax:print-tree': this.printTree.bind(this),
        'tree-sitter-syntax:toggle-debug': this.toggleDebug.bind(this),
        'tree-sitter-syntax:reparse': this.reparse.bind(this)
      }
    )
  }

  selectUp() {
    this.updatedSelectedNodes((node, rangeStack, currentStartIndex, currentEndIndex) => {
      let newNode = node

      while (newNode && newNode.startIndex === currentStartIndex && newNode.endIndex === currentEndIndex) {
        newNode = newNode.parent
      }

      if (newNode) {
        rangeStack.push(node)
        return newNode
      }
    })
  }

  selectDown() {
    this.updatedSelectedNodes((node, rangeStack, currentStart, currentEnd) => {
      if (rangeStack.length > 0) {
        return rangeStack.pop()
      } else {
        return node.firstChild;
      }
    })
  }

  selectLeft() {
    this.updatedSelectedNodes((node, rangeStack) => {
      rangeStack.length = 0
      let depth = 0

      while (node.parent && !node.previousSibling) {
        depth++
        node = node.parent
      }

      node = node.previousSibling

      if (node) {
        while (depth > 0 && node.children.length > 0) {
          depth--
          node = node.lastChild;
        }
      }

      return node
    })
  }

  selectRight () {
    return this.updatedSelectedNodes((node, rangeStack) => {
      rangeStack.length = 0
      let depth = 0

      while (node.parent && !node.nextSibling) {
        depth++
        node = node.parent
      }

      node = node.nextSibling

      if (node) {
        while (depth > 0 && node.children.length > 0) {
          depth--
          node = node.firstChild;
        }
      }

      return node
    })
  }

  printTree () {
    if (this.editor.getSelectedText() === "") {
      console.log(this.document.rootNode.toString())
    } else {
      const buffer = this.editor.getBuffer()
      for (let range of this.editor.getSelectedBufferRanges()) {
        const node = this.document.rootNode.descendantForPosition(range.start, range.end.traverse([0, -1]))
        console.log(node.toString())
      }
    }
  }

  toggleDebug () {
    if (this.document.getLogger()) {
      this.document.setLogger(null)
    } else {
      this.document.setLogger((msg, params, type) => {
        if (type === 'parse') {
          console.log(msg, params)
        } else {
          console.log("  ", msg, params)
        }
      })
    }
  }

  reparse() {
    this.document.invalidate().parse()

    // TODO - remove this.
    this.editor.displayLayer.clearSpatialIndex()
    this.editor.displayLayer.emitter.emit('did-reset')
  }

  updatedSelectedNodes (fn) {
    const selectedRanges = this.editor.getSelectedBufferRanges()
    if (this.selectedNodeStacks.length !== selectedRanges.length) {
      this.selectedNodeStacks = selectedRanges.map(r => [])
    }

    const buffer = this.editor.getBuffer()
    const newRanges = selectedRanges.map((range, i) => {
      const rangeStack = this.selectedNodeStacks[i]
      const currentStart = buffer.characterIndexForPosition(range.start)
      const currentEnd = buffer.characterIndexForPosition(range.end)
      let node = this.document.rootNode.descendantForIndex(currentStart, currentEnd - 1)

      if (node.startIndex < currentStart || node.endIndex > currentEnd) {
        rangeStack.length = 0
      }

      if (currentEnd > currentStart) {
        node = fn(node, rangeStack, currentStart, currentEnd)
      }

      if (node) {
        return Range(node.startPosition, node.endPosition)
      } else {
        return Range(range.start, range.end)
      }
    })

    this.editor.setSelectedBufferRanges(newRanges)
  }
};
