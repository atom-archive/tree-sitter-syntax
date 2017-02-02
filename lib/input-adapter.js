module.exports =
class InputAdaptor {
  constructor(buffer) {
    this.buffer = buffer
    this.seek(0)
  }

  seek(characterIndex) {
    this.position = this.buffer.positionForCharacterIndex(characterIndex)
  }

  read() {
    const endPosition = this.buffer.clipPosition(this.position.traverse({row: 1000, column: 0}))
    const text = this.buffer.getTextInRange([this.position, endPosition])
    this.position = endPosition
    return text
  }
};
