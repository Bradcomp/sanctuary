'use strict';

var Z = require('sanctuary-type-classes');


//  Identity :: a -> Identity a
var Identity = function Identity(x) {
  return {
    '@@type': 'sanctuary/Identity',
    'fantasy-land/of': Identity,
    'fantasy-land/map': function(fn) {
      return Identity(fn(x));
    },
    'fantasy-land/ap': function(y) {
      return Identity(x(y));
    },
    'fantasy-land/equals': function(other) {
      return Z.equals(x, other.value);
    },
    constructor: Identity,
    inspect: function() { return this.toString(); },
    toString: function() { return 'Identity(' + Z.toString(x) + ')'; },
    value: x
  };
};

Identity['fantasy-land/of'] = Identity;

module.exports = Identity;
