'use strict';

var Z = require('sanctuary-type-classes');

var S = require('../..');

var eq = require('../internal/eq');
var square = require('../internal/square');


describe('Nothing', function() {

  it('is a member of the "Maybe a" type', function() {
    eq(S.Nothing['@@type'], 'sanctuary/Maybe');
    eq(S.Nothing.isNothing, true);
    eq(S.Nothing.isJust, false);
  });

  it('provides an "ap" method', function() {
    eq(S.Nothing.ap.length, 1);
    eq(S.Nothing.ap(S.Nothing), S.Nothing);
    eq(S.Nothing.ap(S.Just(S.inc)), S.Nothing);
  });

  it('provides a "chain" method', function() {
    eq(S.Nothing.chain.length, 1);
    eq(S.Nothing.chain(S.head), S.Nothing);
  });

  it('provides a "concat" method', function() {
    eq(S.Nothing.concat.length, 1);
    eq(S.Nothing.concat(S.Nothing), S.Nothing);
    eq(S.Nothing.concat(S.Just('foo')), S.Just('foo'));
  });

  it('provides an "equals" method', function() {
    eq(S.Nothing.equals.length, 1);
    eq(S.Nothing.equals(S.Nothing), true);
    eq(S.Nothing.equals(S.Just(42)), false);
    eq(S.Nothing.equals(null), false);
  });

  it('provides an "extend" method', function() {
    eq(S.Nothing.extend.length, 1);
    eq(S.Nothing.extend(function(x) { return x.value / 2; }), S.Nothing);

    // associativity
    var w = S.Nothing;
    var f = function(x) { return x.value + 1; };
    var g = function(x) { return x.value * x.value; };
    eq(w.extend(g).extend(f), w.extend(function(_w) { return f(_w.extend(g)); }));
  });

  it('provides a "filter" method', function() {
    eq(S.Nothing.filter.length, 1);
    eq(S.Nothing.filter(S.K(true)), S.Nothing);
    eq(S.Nothing.filter(S.K(false)), S.Nothing);

    var m = S.Nothing;
    var f = function(n) { return n * n; };
    var p = function(n) { return n < 0; };
    var q = function(n) { return n > 0; };

    eq(m.map(f).filter(p).equals(m.filter(function(x) { return p(f(x)); }).map(f)), true);
    eq(m.map(f).filter(q).equals(m.filter(function(x) { return q(f(x)); }).map(f)), true);
  });

  it('provides a "map" method', function() {
    eq(S.Nothing.map.length, 1);
    eq(S.Nothing.map(function() { return 42; }), S.Nothing);
  });

  it('provides a "reduce" method', function() {
    eq(S.Nothing.reduce.length, 2);
    eq(S.Nothing.reduce(function(x, y) { return x - y; }, 42), 42);
  });

  it('provides a "sequence" method', function() {
    eq(S.Nothing.sequence.length, 1);
    eq(S.Nothing.sequence(S.Right), S.Right(S.Nothing));
  });

  it('provides a "toBoolean" method', function() {
    eq(S.Nothing.toBoolean.length, 0);
    eq(S.Nothing.toBoolean(), false);
  });

  it('provides a "toString" method', function() {
    eq(S.Nothing.toString.length, 0);
    eq(S.Nothing.toString(), 'Nothing');
  });

  it('provides an "inspect" method', function() {
    eq(S.Nothing.inspect.length, 0);
    eq(S.Nothing.inspect(), 'Nothing');
  });

  it('implements Semigroup', function() {
    var a = S.Nothing;
    var b = S.Nothing;
    var c = S.Nothing;

    // associativity
    eq(a.concat(b).concat(c).equals(a.concat(b.concat(c))), true);
  });

  it('implements Monoid', function() {
    var a = S.Nothing;

    // left identity
    eq(Z.empty(a.constructor).concat(a).equals(a), true);

    // right identity
    eq(a.concat(Z.empty(a.constructor)).equals(a), true);
  });

  it('implements Functor', function() {
    var a = S.Nothing;
    var f = S.inc;
    var g = square;

    // identity
    eq(a.map(S.I).equals(a), true);

    // composition
    eq(a.map(function(x) { return f(g(x)); }).equals(a.map(g).map(f)), true);
  });

  it('implements Apply', function() {
    var a = S.Nothing;
    var b = S.Nothing;
    var c = S.Nothing;

    // composition
    eq(a.map(function(f) {
      return function(g) {
        return function(x) {
          return f(g(x));
        };
      };
    }).ap(b).ap(c).equals(a.ap(b.ap(c))), true);
  });

  it('implements Applicative', function() {
    var a = S.Nothing;
    var b = S.Nothing;
    var f = S.inc;
    var x = 7;

    // identity
    eq(b.ap(Z.of(a.constructor, S.I)).equals(b), true);

    // homomorphism
    eq(Z.of(a.constructor, x).ap(Z.of(a.constructor, f)).equals(Z.of(a.constructor, f(x))), true);

    // interchange
    eq(b.ap(Z.of(a.constructor, function(f) { return f(x); })).equals(Z.of(a.constructor, x).ap(b)), true);
  });

  it('implements Chain', function() {
    var a = S.Nothing;
    var f = S.head;
    var g = S.last;

    // associativity
    eq(a.chain(f).chain(g).equals(a.chain(function(x) { return f(x).chain(g); })), true);
  });

  it('implements Monad', function() {
    var a = S.Nothing;
    var f = S.head;
    var x = [1, 2, 3];

    // left identity
    eq(Z.of(a.constructor, x).chain(f).equals(f(x)), true);

    // right identity
    eq(a.chain(function(x) { return Z.of(a.constructor, x); }).equals(a), true);
  });

});
