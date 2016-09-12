'use strict';

var S = require('..');

var eq = require('./internal/eq');


describe('equals', function() {

  it('is a binary function', function() {
    eq(typeof S.equals, 'function');
    eq(S.equals.length, 2);
    eq(S.equals.toString(), 'equals :: a -> b -> Boolean');
  });

});
