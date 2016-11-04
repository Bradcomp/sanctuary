'use strict';

var Z = require('sanctuary-type-classes');


//  Compose :: (Apply f, Apply g) => { of :: b -> f b } -> { of :: c -> g c } -> f (g a) -> Compose f g a
var Compose = function(F) {
  return function(G) {
    var _Compose = function _Compose(x) {
      return {
        '@@type': 'sanctuary/Compose',
        constructor: _Compose,
        'fantasy-land/map': function(f) {
          return _Compose(Z.map(function(x) {
            return Z.map(function(x) { return f(x); }, x);
          }, x));
        },
        'fantasy-land/ap': function(y) {
          return _Compose(Z.ap(Z.map(Z.ap, x), y.value));
        },
        'fantasy-land/equals': function(other) {
          return Z.equals(x, other.value);
        },
        inspect: function() { return this.toString(); },
        toString: function() {
          return 'Compose(' + Z.toString(F) + ')' +
                        '(' + Z.toString(G) + ')' +
                        '(' + Z.toString(x) + ')';
        },
        value: x
      };
    };
    _Compose['fantasy-land/of'] = function(x) {
      return _Compose(Z.of(F, Z.of(G, x)));
    };
    return _Compose;
  };
};

module.exports = Compose;
