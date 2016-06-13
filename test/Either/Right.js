'use strict';

var FL = require('fantasy-land');
var Z = require('sanctuary-type-classes');

var S = require('../..');

var eq = require('../internal/eq');
var parseHex = require('../internal/parseHex');
var squareRoot = require('../internal/squareRoot');


describe('Right', function() {

  it('is a data constructor', function() {
    eq(typeof S.Right, 'function');
    eq(S.Right.length, 1);
    eq(S.Right(42)['@@type'], 'sanctuary/Either');
    eq(S.Right(42).isLeft, false);
    eq(S.Right(42).isRight, true);
  });

  it('provides a "fantasy-land/alt" method', function() {
    eq(S.Right(1)[FL.alt].length, 1);
    eq(S.Right(1)[FL.alt](S.Left(2)), S.Right(1));
    eq(S.Right(1)[FL.alt](S.Right(2)), S.Right(1));
  });

  it('provides a "fantasy-land/ap" method', function() {
    eq(S.Right(42)[FL.ap].length, 1);
    eq(S.Right(42)[FL.ap](S.Left('abc')), S.Left('abc'));
    eq(S.Right(42)[FL.ap](S.Right(S.inc)), S.Right(43));
  });

  it('provides a "fantasy-land/chain" method', function() {
    eq(S.Right(25)[FL.chain].length, 1);
    eq(S.Right(25)[FL.chain](squareRoot), S.Right(5));
  });

  it('provides a "fantasy-land/concat" method', function() {
    eq(S.Right('abc')[FL.concat].length, 1);
    eq(S.Right('abc')[FL.concat](S.Left('xyz')), S.Right('abc'));
    eq(S.Right('abc')[FL.concat](S.Right('def')), S.Right('abcdef'));
  });

  it('provides a "fantasy-land/equals" method', function() {
    eq(S.Right(42)[FL.equals].length, 1);
    eq(S.Right(42)[FL.equals](S.Right(42)), true);
    eq(S.Right(42)[FL.equals](S.Right('42')), false);
    eq(S.Right(42)[FL.equals](S.Left(42)), false);

    // Value-based equality:
    eq(S.Right(0)[FL.equals](S.Right(-0)), false);
    eq(S.Right(-0)[FL.equals](S.Right(0)), false);
    eq(S.Right(NaN)[FL.equals](S.Right(NaN)), true);
    eq(S.Right([1, 2, 3])[FL.equals](S.Right([1, 2, 3])), true);
    eq(S.Right(new Number(42))[FL.equals](S.Right(new Number(42))), true);
  });

  it('provides a "fantasy-land/extend" method', function() {
    eq(S.Right(42)[FL.extend].length, 1);
    eq(S.Right(42)[FL.extend](function(x) { return x.value / 2; }), S.Right(21));

    // associativity
    var w = S.Right(42);
    var f = function(x) { return x.value + 1; };
    var g = function(x) { return x.value * x.value; };
    eq(w[FL.extend](g)[FL.extend](f), w[FL.extend](function(_w) { return f(_w[FL.extend](g)); }));
  });

  it('provides a "fantasy-land/map" method', function() {
    eq(S.Right(9)[FL.map].length, 1);
    eq(S.Right(9)[FL.map](Math.sqrt), S.Right(3));
  });

  it('provides a "fantasy-land/reduce" method', function() {
    eq(S.Right(5)[FL.reduce].length, 2);
    eq(S.Right(5)[FL.reduce](function(x, y) { return x - y; }, 42), 37);
  });

  it('provides a "toString" method', function() {
    eq(S.Right([1, 2, 3]).toString.length, 0);
    eq(S.Right([1, 2, 3]).toString(), 'Right([1, 2, 3])');
  });

  it('provides an "inspect" method', function() {
    eq(S.Right([1, 2, 3]).inspect.length, 0);
    eq(S.Right([1, 2, 3]).inspect(), 'Right([1, 2, 3])');
  });

  it('provides aliases for unprefixed Fantasy Land methods', function() {
    //  Only methods exposed in releases prior to v0.12.0 are aliased.
    ['ap', 'chain', 'concat', 'equals', 'extend', 'map', 'reduce']
    .forEach(function(name) {
      var x = S.Right(42)[name];
      eq(typeof x, 'function');
      eq(x, S.Right(42)['fantasy-land/' + name]);
    });
  });

  it('implements Semigroup', function() {
    var a = S.Right('foo');
    var b = S.Right('bar');
    var c = S.Right('baz');

    // associativity
    eq(a.concat(b).concat(c).equals(a.concat(b.concat(c))), true);
  });

  it('implements Functor', function() {
    var a = S.Right(9);
    var f = S.inc;
    var g = Math.sqrt;

    // identity
    eq(a.map(S.I).equals(a), true);

    // composition
    eq(a.map(function(x) { return f(g(x)); }).equals(a.map(g).map(f)), true);
  });

  it('implements Apply', function() {
    var a = S.Right(S.inc);
    var b = S.Right(Math.sqrt);
    var c = S.Right(9);

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
    var a = S.Right(null);
    var b = S.Right(S.inc);
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
    var a = S.Right('0x0100');
    var f = parseHex;
    var g = squareRoot;

    // associativity
    eq(a.chain(f).chain(g).equals(a.chain(function(x) { return f(x).chain(g); })), true);
  });

  it('implements Monad', function() {
    var a = S.Right(null);
    var f = squareRoot;
    var x = 25;

    // left identity
    eq(Z.of(a.constructor, x).chain(f).equals(f(x)), true);

    // right identity
    eq(a.chain(function(x) { return Z.of(a.constructor, x); }).equals(a), true);
  });

});
