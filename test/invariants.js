'use strict';

var S = require('..');

var eq = require('./internal/eq');


//  exceptions :: Array String
var exceptions = ['Either', 'EitherType', 'Maybe', 'MaybeType'];

//  functions :: Array Function
var functions =
Object.keys(S)
.filter(function(k) { return exceptions.indexOf(k) < 0; })
.map(function(k) { return S[k]; })
.filter(function(x) { return typeof x === 'function'; });


describe('invariants', function() {

  it('f() is equivalent to f for every "regular" function', function() {
    functions.forEach(function(f) {
      var result = f();
      eq(typeof result, 'function');
      eq(result.length, f.length);
    });
  });

  it('f(S.__) is equivalent to f for every "regular" function', function() {
    functions.forEach(function(f) {
      var result = f(S.__);
      eq(typeof result, 'function');
      eq(result.length, f.length);
    });
  });

});
