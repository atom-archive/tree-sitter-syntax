/** @babel */

export function isEqual(a, b) {
  return a.row === b.row && a.column === b.column
}

export function isGreater(a, b) {
  return (a.row > b.row) || (a.row === b.row && a.column > b.column)
}
