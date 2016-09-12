'use strict';

var S = require('..');

var eq = require('./internal/eq');


describe('extend', function() {

  it('is a binary function', function() {
    eq(typeof S.extend, 'function');
    eq(S.extend.length, 2);
    eq(S.extend.toString(), 'extend :: Extend e => (e a -> a) -> e a -> e a');
  });

});
