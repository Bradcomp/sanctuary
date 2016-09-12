'use strict';

var S = require('..');

var eq = require('./internal/eq');


describe('extract', function() {

  it('is a unary function', function() {
    eq(typeof S.extract, 'function');
    eq(S.extract.length, 1);
    eq(S.extract.toString(), 'extract :: Extend e => e a -> a');
  });

});
