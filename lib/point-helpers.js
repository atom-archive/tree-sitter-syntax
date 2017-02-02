exports.isEqual = function(a, b) {
  return a.row === b.row && a.column === b.column
};

exports.isGreater = function(a, b) {
  return (a.row > b.row) || (a.row === b.row && a.column > b.column)
};

exports.isLessThan = function(a, b) {
  return (a.row < b.row) || (a.row === b.row && a.column < b.column)
};
