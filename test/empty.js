'use strict';

var S = require('..');

var eq = require('./internal/eq');


describe('empty', function() {

  it('is a unary function', function() {
    eq(typeof S.empty, 'function');
    eq(S.empty.length, 1);
    eq(S.empty.toString(), 'empty :: Monoid a => TypeRep a -> a');
  });

});
