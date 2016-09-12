'use strict';

var S = require('..');

var eq = require('./internal/eq');


describe('promap', function() {

  it('is a ternary function', function() {
    eq(typeof S.promap, 'function');
    eq(S.promap.length, 3);
    eq(S.promap.toString(), 'promap :: Profunctor p => (a -> b) -> (c -> d) -> p b c -> p a d');
  });

});
