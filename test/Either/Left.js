'use strict';

var FL = require('fantasy-land');
var Z = require('sanctuary-type-classes');

var S = require('../..');

var eq = require('../internal/eq');
var parseHex = require('../internal/parseHex');
var squareRoot = require('../internal/squareRoot');


describe('Left', function() {

  it('is a data constructor', function() {
    eq(typeof S.Left, 'function');
    eq(S.Left.length, 1);
    eq(S.Left(42)['@@type'], 'sanctuary/Either');
    eq(S.Left(42).isLeft, true);
    eq(S.Left(42).isRight, false);
  });

  it('provides a "fantasy-land/alt" method', function() {
    eq(S.Left(1)[FL.alt].length, 1);
    eq(S.Left(1)[FL.alt](S.Left(2)), S.Left(2));
    eq(S.Left(1)[FL.alt](S.Right(2)), S.Right(2));
  });

  it('provides a "fantasy-land/ap" method', function() {
    eq(S.Left('abc')[FL.ap].length, 1);
    eq(S.Left('abc')[FL.ap](S.Left('xyz')), S.Left('xyz'));
    eq(S.Left('abc')[FL.ap](S.Right(S.inc)), S.Left('abc'));
  });

  it('provides a "fantasy-land/chain" method', function() {
    eq(S.Left('abc')[FL.chain].length, 1);
    eq(S.Left('abc')[FL.chain](squareRoot), S.Left('abc'));
  });

  it('provides a "fantasy-land/concat" method', function() {
    eq(S.Left('abc')[FL.concat].length, 1);
    eq(S.Left('abc')[FL.concat](S.Left('def')), S.Left('abcdef'));
    eq(S.Left('abc')[FL.concat](S.Right('xyz')), S.Right('xyz'));
  });

  it('provides a "fantasy-land/equals" method', function() {
    eq(S.Left(42)[FL.equals].length, 1);
    eq(S.Left(42)[FL.equals](S.Left(42)), true);
    eq(S.Left(42)[FL.equals](S.Left('42')), false);
    eq(S.Left(42)[FL.equals](S.Right(42)), false);

    // Value-based equality:
    eq(S.Left(0)[FL.equals](S.Left(-0)), false);
    eq(S.Left(-0)[FL.equals](S.Left(0)), false);
    eq(S.Left(NaN)[FL.equals](S.Left(NaN)), true);
    eq(S.Left([1, 2, 3])[FL.equals](S.Left([1, 2, 3])), true);
    eq(S.Left(new Number(42))[FL.equals](S.Left(new Number(42))), true);
  });

  it('provides a "fantasy-land/extend" method', function() {
    eq(S.Left('abc')[FL.extend].length, 1);
    eq(S.Left('abc')[FL.extend](function(x) { return x / 2; }), S.Left('abc'));

    // associativity
    var w = S.Left('abc');
    var f = function(x) { return x.value + 1; };
    var g = function(x) { return x.value * x.value; };
    eq(w[FL.extend](g)[FL.extend](f), w[FL.extend](function(_w) { return f(_w[FL.extend](g)); }));
  });

  it('provides a "fantasy-land/map" method', function() {
    eq(S.Left('abc')[FL.map].length, 1);
    eq(S.Left('abc')[FL.map](Math.sqrt), S.Left('abc'));
  });

  it('provides a "fantasy-land/reduce" method', function() {
    eq(S.Left('abc')[FL.reduce].length, 2);
    eq(S.Left('abc')[FL.reduce](function(x, y) { return x - y; }, 42), 42);
  });

  it('provides a "toString" method', function() {
    eq(S.Left('abc').toString.length, 0);
    eq(S.Left('abc').toString(), 'Left("abc")');
  });

  it('provides an "inspect" method', function() {
    eq(S.Left('abc').inspect.length, 0);
    eq(S.Left('abc').inspect(), 'Left("abc")');
  });

  it('provides aliases for unprefixed Fantasy Land methods', function() {
    //  Only methods exposed in releases prior to v0.12.0 are aliased.
    ['ap', 'chain', 'concat', 'equals', 'extend', 'map', 'reduce']
    .forEach(function(name) {
      var x = S.Left('abc')[name];
      eq(typeof x, 'function');
      eq(x, S.Left('abc')['fantasy-land/' + name]);
    });
  });

  it('implements Semigroup', function() {
    var a = S.Left('foo');
    var b = S.Left('bar');
    var c = S.Left('baz');

    // associativity
    eq(Z.concat(Z.concat(a, b), c), Z.concat(a, Z.concat(b, c)));
  });

  it('implements Functor', function() {
    var a = S.Left('Cannot divide by zero');
    var f = S.inc;
    var g = Math.sqrt;

    // identity
    eq(a.map(S.I).equals(a), true);

    // composition
    eq(a.map(function(x) { return f(g(x)); }).equals(a.map(g).map(f)), true);
  });

  it('implements Apply', function() {
    var a = S.Left('Cannot divide by zero');
    var b = S.Left('Cannot divide by zero');
    var c = S.Left('Cannot divide by zero');

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
    var a = S.Left('Cannot divide by zero');
    var b = S.Left('Cannot divide by zero');
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
    var a = S.Left('Cannot divide by zero');
    var f = parseHex;
    var g = squareRoot;

    // associativity
    eq(a.chain(f).chain(g).equals(a.chain(function(x) { return f(x).chain(g); })), true);
  });

  it('implements Monad', function() {
    var a = S.Left('Cannot divide by zero');
    var f = squareRoot;
    var x = 25;

    // left identity
    eq(Z.of(a.constructor, x).chain(f).equals(f(x)), true);

    // right identity
    eq(a.chain(function(x) { return Z.of(a.constructor, x); }).equals(a), true);
  });

});
