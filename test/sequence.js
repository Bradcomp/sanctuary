'use strict';

var S = require('..');

var eq = require('./internal/eq');


describe('sequence', function() {

  it('is a binary function', function() {
    eq(typeof S.sequence, 'function');
    eq(S.sequence.length, 2);
    eq(S.sequence.toString(), 'sequence :: (Applicative f, Traversable t) => (a -> f a) -> t (f b) -> f (t b)');
  });

});
