'use strict';

var S = require('..');

var eq = require('./internal/eq');


describe('chain', function() {

  it('is a binary function', function() {
    eq(typeof S.chain, 'function');
    eq(S.chain.length, 2);
    eq(S.chain.toString(), 'chain :: Chain m => (a -> m b) -> m a -> m b');
  });

});
