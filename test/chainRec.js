'use strict';

var S = require('..');

var eq = require('./internal/eq');


describe('chainRec', function() {

  it('is a binary function', function() {
    eq(typeof S.chainRec, 'function');
    eq(S.chainRec.length, 2);
    eq(S.chainRec.toString(), 'chainRec :: (a -> Either a b) -> a -> b');
  });

  it('defines "recursive" functions which do not grow the stack', function() {
    var pow = function(n, p) {
      var go = function(pair) {
        var acc = pair[0], p = pair[1];
        return p === 0 ? S.Right(acc) : S.Left([acc * n, p - 1]);
      };
      return S.chainRec(go, [1, p]);
    };

    eq(pow(2, 10), 1024);
  });

});
