'use strict';

var FL = require('fantasy-land');
var Z = require('sanctuary-type-classes');

var S = require('../..');

var eq = require('../internal/eq');


describe('Just', function() {

  it('is a data constructor', function() {
    eq(typeof S.Just, 'function');
    eq(S.Just.length, 1);
    eq(S.Just(42)['@@type'], 'sanctuary/Maybe');
    eq(S.Just(42).isNothing, false);
    eq(S.Just(42).isJust, true);
  });

  it('provides a "fantasy-land/alt" method', function() {
    eq(S.Just(1)[FL.alt].length, 1);
    eq(S.Just(1)[FL.alt](S.Nothing), S.Just(1));
    eq(S.Just(1)[FL.alt](S.Just(2)), S.Just(1));
  });

  it('provides a "fantasy-land/ap" method', function() {
    eq(S.Just(42)[FL.ap].length, 1);
    eq(S.Just(42)[FL.ap](S.Nothing), S.Nothing);
    eq(S.Just(42)[FL.ap](S.Just(S.inc)), S.Just(43));
  });

  it('provides a "fantasy-land/chain" method', function() {
    eq(S.Just([1, 2, 3])[FL.chain].length, 1);
    eq(S.Just([1, 2, 3])[FL.chain](S.head), S.Just(1));
  });

  it('provides a "fantasy-land/concat" method', function() {
    eq(S.Just('foo')[FL.concat].length, 1);
    eq(S.Just('foo')[FL.concat](S.Nothing), S.Just('foo'));
    eq(S.Just('foo')[FL.concat](S.Just('bar')), S.Just('foobar'));
  });

  it('provides a "fantasy-land/equals" method', function() {
    eq(S.Just(42)[FL.equals].length, 1);
    eq(S.Just(42)[FL.equals](S.Just(42)), true);
    eq(S.Just(42)[FL.equals](S.Just(43)), false);
    eq(S.Just(42)[FL.equals](S.Nothing), false);

    // Value-based equality:
    eq(S.Just(0)[FL.equals](S.Just(-0)), false);
    eq(S.Just(-0)[FL.equals](S.Just(0)), false);
    eq(S.Just(NaN)[FL.equals](S.Just(NaN)), true);
    eq(S.Just([1, 2, 3])[FL.equals](S.Just([1, 2, 3])), true);
    eq(S.Just(new Number(42))[FL.equals](S.Just(new Number(42))), true);
  });

  it('provides a "fantasy-land/extend" method', function() {
    eq(S.Just(42)[FL.extend].length, 1);
    eq(S.Just(42)[FL.extend](function(x) { return x.value / 2; }), S.Just(21));

    // associativity
    var w = S.Just(42);
    var f = function(x) { return x.value + 1; };
    var g = function(x) { return x.value * x.value; };
    eq(w[FL.extend](g)[FL.extend](f), w[FL.extend](function(_w) { return f(_w[FL.extend](g)); }));
  });

  it('provides a "fantasy-land/map" method', function() {
    eq(S.Just(42)[FL.map].length, 1);
    eq(S.Just(42)[FL.map](function(x) { return x / 2; }), S.Just(21));
  });

  it('provides a "fantasy-land/reduce" method', function() {
    eq(S.Just(5)[FL.reduce].length, 2);
    eq(S.Just(5)[FL.reduce](function(x, y) { return x - y; }, 42), 37);
  });

  it('provides a "toString" method', function() {
    eq(S.Just([1, 2, 3]).toString.length, 0);
    eq(S.Just([1, 2, 3]).toString(), 'Just([1, 2, 3])');
  });

  it('provides an "inspect" method', function() {
    eq(S.Just([1, 2, 3]).inspect.length, 0);
    eq(S.Just([1, 2, 3]).inspect(), 'Just([1, 2, 3])');
  });

  it('provides aliases for unprefixed Fantasy Land methods', function() {
    //  Only methods exposed in releases prior to v0.12.0 are aliased.
    ['ap', 'chain', 'concat', 'equals', 'extend', 'map', 'reduce']
    .forEach(function(name) {
      var x = S.Just(42)[name];
      eq(typeof x, 'function');
      eq(x, S.Just(42)['fantasy-land/' + name]);
    });
  });

  it('implements Semigroup', function() {
    var a = S.Just('foo');
    var b = S.Just('bar');
    var c = S.Just('baz');

    // associativity
    eq(a.concat(b).concat(c).equals(a.concat(b.concat(c))), true);
  });

  it('implements Monoid', function() {
    var a = S.Just([1, 2, 3]);

    // left identity
    eq(Z.empty(a.constructor).concat(a).equals(a), true);

    // right identity
    eq(a.concat(Z.empty(a.constructor)).equals(a), true);
  });

  it('implements Functor', function() {
    var a = S.Just(9);
    var f = S.inc;
    var g = Math.sqrt;

    // identity
    eq(a.map(S.I).equals(a), true);

    // composition
    eq(a.map(function(x) { return f(g(x)); }).equals(a.map(g).map(f)), true);
  });

  it('implements Apply', function() {
    var a = S.Just(S.inc);
    var b = S.Just(Math.sqrt);
    var c = S.Just(9);

    // composition
    eq(c.ap(b.ap(a.map(function(f) {
      return function(g) {
        return function(x) {
          return f(g(x));
        };
      };
    }))).equals(c.ap(b).ap(a)), true);
  });

  it('implements Applicative', function() {
    var a = S.Just(null);
    var b = S.Just(S.inc);
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
    var a = S.Just([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
    var f = S.head;
    var g = S.last;

    // associativity
    eq(a.chain(f).chain(g).equals(a.chain(function(x) { return f(x).chain(g); })), true);
  });

  it('implements Monad', function() {
    var a = S.Just(null);
    var f = S.head;
    var x = [1, 2, 3];

    // left identity
    eq(Z.of(a.constructor, x).chain(f).equals(f(x)), true);

    // right identity
    eq(a.chain(function(x) { return Z.of(a.constructor, x); }).equals(a), true);
  });

});
