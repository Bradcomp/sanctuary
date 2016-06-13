'use strict';

var FL = require('fantasy-land');
var Z = require('sanctuary-type-classes');

var S = require('../..');

var eq = require('../internal/eq');


describe('Nothing', function() {

  it('is a member of the "Maybe a" type', function() {
    eq(S.Nothing['@@type'], 'sanctuary/Maybe');
    eq(S.Nothing.isNothing, true);
    eq(S.Nothing.isJust, false);
  });

  it('provides a "fantasy-land/alt" method', function() {
    eq(S.Nothing[FL.alt].length, 1);
    eq(S.Nothing[FL.alt](S.Nothing), S.Nothing);
    eq(S.Nothing[FL.alt](S.Just(1)), S.Just(1));
  });

  it('provides a "fantasy-land/ap" method', function() {
    eq(S.Nothing[FL.ap].length, 1);
    eq(S.Nothing[FL.ap](S.Nothing), S.Nothing);
    eq(S.Nothing[FL.ap](S.Just(S.inc)), S.Nothing);
  });

  it('provides a "fantasy-land/chain" method', function() {
    eq(S.Nothing[FL.chain].length, 1);
    eq(S.Nothing[FL.chain](S.head), S.Nothing);
  });

  it('provides a "fantasy-land/concat" method', function() {
    eq(S.Nothing[FL.concat].length, 1);
    eq(S.Nothing[FL.concat](S.Nothing), S.Nothing);
    eq(S.Nothing[FL.concat](S.Just('foo')), S.Just('foo'));
  });

  it('provides a "fantasy-land/equals" method', function() {
    eq(S.Nothing[FL.equals].length, 1);
    eq(S.Nothing[FL.equals](S.Nothing), true);
    eq(S.Nothing[FL.equals](S.Just(42)), false);
  });

  it('provides a "fantasy-land/extend" method', function() {
    eq(S.Nothing[FL.extend].length, 1);
    eq(S.Nothing[FL.extend](function(x) { return x.value / 2; }), S.Nothing);

    // associativity
    var w = S.Nothing;
    var f = function(x) { return x.value + 1; };
    var g = function(x) { return x.value * x.value; };
    eq(w[FL.extend](g)[FL.extend](f), w[FL.extend](function(_w) { return f(_w[FL.extend](g)); }));
  });

  it('provides a "fantasy-land/map" method', function() {
    eq(S.Nothing[FL.map].length, 1);
    eq(S.Nothing[FL.map](function() { return 42; }), S.Nothing);
  });

  it('provides a "fantasy-land/reduce" method', function() {
    eq(S.Nothing[FL.reduce].length, 2);
    eq(S.Nothing[FL.reduce](function(x, y) { return x - y; }, 42), 42);
  });

  it('provides a "toString" method', function() {
    eq(S.Nothing.toString.length, 0);
    eq(S.Nothing.toString(), 'Nothing');
  });

  it('provides an "inspect" method', function() {
    eq(S.Nothing.inspect.length, 0);
    eq(S.Nothing.inspect(), 'Nothing');
  });

  it('provides aliases for unprefixed Fantasy Land methods', function() {
    //  Only methods exposed in releases prior to v0.12.0 are aliased.
    ['ap', 'chain', 'concat', 'equals', 'extend', 'map', 'reduce']
    .forEach(function(name) {
      var x = S.Nothing[name];
      eq(typeof x, 'function');
      eq(x, S.Nothing['fantasy-land/' + name]);
    });
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
    var g = Math.sqrt;

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
