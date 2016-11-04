'use strict';

var Z = require('sanctuary-type-classes');

var S = require('..');

var eq = require('./internal/eq');


describe('B', function() {

  it('is a ternary function', function() {
    eq(typeof S.B, 'function');
    eq(S.B.length, 3);
    eq(S.B.toString(), 'B :: (b -> c) -> (a -> b) -> a -> c');
  });

  it('composes two functions assumed to be unary', function() {
    eq(S.B(function(xs) { return Z.map(Math.sqrt, xs); }, JSON.parse, '[1, 4, 9]'), [1, 2, 3]);
  });

});
