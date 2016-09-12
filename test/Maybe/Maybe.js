'use strict';

var FL = require('fantasy-land');
var jsc = require('jsverify');
var Z = require('sanctuary-type-classes');

var S = require('../internal/sanctuary');

var Compose = require('../internal/Compose');
var Identity = require('../internal/Identity');
var eq = require('../internal/eq');
var forall = require('../internal/forall');
var throws = require('../internal/throws');


//  IdentityArb :: Arbitrary a -> Arbitrary (Identity a)
var IdentityArb = function(arb) {
  return arb.smap(Identity, function(i) { return i.value; });
};

//  MaybeArb :: Arbitrary a -> Arbitrary (Maybe a)
var MaybeArb = function(arb) {
  var f = function(maybe) { return maybe.value; };
  return jsc.oneof(arb.smap(S.Just, f, Z.toString),
                   jsc.constant(S.Nothing));
};


describe('Maybe', function() {

  it('throws if called', function() {
    throws(function() { S.Maybe(); },
           Error,
           'Cannot instantiate Maybe');
  });

  it('has a "nullary" data constructor named Nothing', function() {
    eq(S.Nothing['@@type'], 'sanctuary/Maybe');
    eq(S.Nothing.isNothing, true);
    eq(S.Nothing.isJust, false);
  });

  it('has a unary data constructor named Just', function() {
    eq(typeof S.Just, 'function');
    eq(S.Just.length, 1);
    eq(S.Just.toString(), 'Just :: a -> Maybe a');
    eq(S.Just(9)['@@type'], 'sanctuary/Maybe');
    eq(S.Just(9).isNothing, false);
    eq(S.Just(9).isJust, true);
  });

  it('provides a "toString" method', function() {
    eq(S.Nothing.toString.length, 0);
    eq(S.Nothing.toString(), 'Nothing');

    eq(S.Just([1, 2, 3]).toString.length, 0);
    eq(S.Just([1, 2, 3]).toString(), 'Just([1, 2, 3])');
  });

  it('provides an "inspect" method', function() {
    eq(S.Nothing.inspect.length, 0);
    eq(S.Nothing.inspect(), 'Nothing');

    eq(S.Just([1, 2, 3]).inspect.length, 0);
    eq(S.Just([1, 2, 3]).inspect(), 'Just([1, 2, 3])');
  });

  it('provides a "fantasy-land/equals" method', function() {
    eq(S.Nothing[FL.equals], S.Nothing.equals);
    eq(S.Nothing[FL.equals].length, 1);
    eq(S.Nothing[FL.equals](S.Nothing), true);
    eq(S.Nothing[FL.equals](S.Just(9)), false);

    eq(S.Just(9)[FL.equals], S.Just(9).equals);
    eq(S.Just(9)[FL.equals].length, 1);
    eq(S.Just(9)[FL.equals](S.Just(9)), true);
    eq(S.Just(9)[FL.equals](S.Just(0)), false);
    eq(S.Just(9)[FL.equals](S.Nothing), false);

    // Value-based equality:
    eq(S.Just(0)[FL.equals](S.Just(-0)), false);
    eq(S.Just(-0)[FL.equals](S.Just(0)), false);
    eq(S.Just(NaN)[FL.equals](S.Just(NaN)), true);
    eq(S.Just([1, 2, 3])[FL.equals](S.Just([1, 2, 3])), true);
    eq(S.Just(new Number(42))[FL.equals](S.Just(new Number(42))), true);
  });

  it('provides a "fantasy-land/concat" method', function() {
    eq(S.Nothing[FL.concat], S.Nothing.concat);
    eq(S.Nothing[FL.concat].length, 1);
    eq(S.Nothing[FL.concat](S.Nothing), S.Nothing);
    eq(S.Nothing[FL.concat](S.Just('foo')), S.Just('foo'));

    eq(S.Just('foo')[FL.concat], S.Just('foo').concat);
    eq(S.Just('foo')[FL.concat].length, 1);
    eq(S.Just('foo')[FL.concat](S.Nothing), S.Just('foo'));
    eq(S.Just('foo')[FL.concat](S.Just('bar')), S.Just('foobar'));
  });

  it('provides a "fantasy-land/map" method', function() {
    eq(S.Nothing[FL.map], S.Nothing.map);
    eq(S.Nothing[FL.map].length, 1);
    eq(S.Nothing[FL.map](Math.sqrt), S.Nothing);

    eq(S.Just(9)[FL.map], S.Just(9).map);
    eq(S.Just(9)[FL.map].length, 1);
    eq(S.Just(9)[FL.map](Math.sqrt), S.Just(3));
  });

  it('provides a "fantasy-land/ap" method', function() {
    eq(S.Nothing[FL.ap], S.Nothing.ap);
    eq(S.Nothing[FL.ap].length, 1);
    eq(S.Nothing[FL.ap](S.Nothing), S.Nothing);
    eq(S.Nothing[FL.ap](S.Just(S.inc)), S.Nothing);

    eq(S.Just(42)[FL.ap], S.Just(42).ap);
    eq(S.Just(42)[FL.ap].length, 1);
    eq(S.Just(42)[FL.ap](S.Nothing), S.Nothing);
    eq(S.Just(42)[FL.ap](S.Just(S.inc)), S.Just(43));
  });

  it('provides a "fantasy-land/chain" method', function() {
    eq(S.Nothing[FL.chain], S.Nothing.chain);
    eq(S.Nothing[FL.chain].length, 1);
    eq(S.Nothing[FL.chain](S.head), S.Nothing);

    eq(S.Just([1, 2, 3])[FL.chain], S.Just([1, 2, 3]).chain);
    eq(S.Just([1, 2, 3])[FL.chain].length, 1);
    eq(S.Just([1, 2, 3])[FL.chain](S.head), S.Just(1));
  });

  it('provides a "fantasy-land/alt" method', function() {
    eq(S.Nothing[FL.alt].length, 1);
    eq(S.Nothing[FL.alt](S.Nothing), S.Nothing);
    eq(S.Nothing[FL.alt](S.Just(1)), S.Just(1));

    eq(S.Just(1)[FL.alt].length, 1);
    eq(S.Just(1)[FL.alt](S.Nothing), S.Just(1));
    eq(S.Just(1)[FL.alt](S.Just(2)), S.Just(1));
  });

  it('provides a "fantasy-land/reduce" method', function() {
    var add = function(x, y) { return x + y; };

    eq(S.Nothing[FL.reduce], S.Nothing.reduce);
    eq(S.Nothing[FL.reduce].length, 2);
    eq(S.Nothing[FL.reduce](add, 0), 0);

    eq(S.Just(9)[FL.reduce], S.Just(9).reduce);
    eq(S.Just(9)[FL.reduce].length, 2);
    eq(S.Just(9)[FL.reduce](add, 0), 9);
  });

  it('provides a "fantasy-land/traverse" method', function() {
    var Array$of = function(x) { return [x]; };
    var duplicate = function(x) { return [x, x]; };

    eq(S.Nothing[FL.traverse].length, 2);
    eq(S.Nothing[FL.traverse](duplicate, Array$of), [S.Nothing]);

    eq(S.Just(9)[FL.traverse].length, 2);
    eq(S.Just(9)[FL.traverse](duplicate, Array$of), [S.Just(9), S.Just(9)]);
  });

  it('provides a "fantasy-land/extend" method', function() {
    var sqrt = function(maybe) { return Math.sqrt(maybe.value); };

    eq(S.Nothing[FL.extend], S.Nothing.extend);
    eq(S.Nothing[FL.extend].length, 1);
    eq(S.Nothing[FL.extend](sqrt), S.Nothing);

    eq(S.Just(9)[FL.extend], S.Just(9).extend);
    eq(S.Just(9)[FL.extend].length, 1);
    eq(S.Just(9)[FL.extend](sqrt), S.Just(3));
  });

  describe('Setoid', function() {

    it('satisfies reflexivity', function() {
      forall(MaybeArb(jsc.integer),
             function(a) {
               return Z.equals(a, a);
             });
    });

    it('satisfies symmetry', function() {
      forall(MaybeArb(jsc.integer),
             MaybeArb(jsc.integer),
             function(a, b) {
               return Z.equals(a, b) === Z.equals(b, a);
             });
    });

    it('satisfies transitivity', function() {
      forall(MaybeArb(jsc.integer(1)),
             MaybeArb(jsc.integer(1)),
             MaybeArb(jsc.integer(1)),
             function(a, b, c) {
               return !(Z.equals(a, b) && Z.equals(b, c)) || Z.equals(a, c);
             });
    });

  });

  describe('Semigroup', function() {

    it('satisfies associativity', function() {
      forall(MaybeArb(jsc.string),
             MaybeArb(jsc.string),
             MaybeArb(jsc.string),
             function(a, b, c) {
               var lhs = S.concat(S.concat(a, b), c);
               var rhs = S.concat(a, S.concat(b, c));
               return Z.equals(lhs, rhs);
             });
    });

  });

  describe('Monoid', function() {

    it('satisfies left identity', function() {
      forall(MaybeArb(jsc.string),
             function(m) {
               var lhs = S.concat(S.empty(m.constructor), m);
               var rhs = m;
               return Z.equals(lhs, rhs);
             });
    });

    it('satisfies right identity', function() {
      forall(MaybeArb(jsc.string),
             function(m) {
               var lhs = S.concat(m, S.empty(m.constructor));
               var rhs = m;
               return Z.equals(lhs, rhs);
             });
    });

  });

  describe('Functor', function() {

    it('satisfies identity', function() {
      forall(MaybeArb(jsc.integer),
             function(u) {
               var lhs = S.map(S.I, u);
               var rhs = u;
               return Z.equals(lhs, rhs);
             });
    });

    it('satisfies composition', function() {
      var f = function(x) { return x + 1; };
      var g = function(x) { return x * 2; };
      forall(MaybeArb(jsc.integer),
             function(u) {
               var lhs = S.map(S.compose(f, g), u);
               var rhs = S.map(f, S.map(g, u));
               return Z.equals(lhs, rhs);
             });
    });

  });

  describe('Apply', function() {

    it('satisfies composition', function() {
      forall(MaybeArb(jsc.integer),
             MaybeArb(jsc.constant(function(x) { return x + 1; })),
             MaybeArb(jsc.constant(function(x) { return x * 2; })),
             function(a, mf, mg) {
               var lhs = S.ap(S.ap(S.map(S.compose, mf), mg), a);
               var rhs = S.ap(mf, S.ap(mg, a));
               return Z.equals(lhs, rhs);
             });
    });

  });

  describe('Applicative', function() {

    it('satisfies identity', function() {
      forall(MaybeArb(jsc.constant(null)),
             MaybeArb(jsc.integer),
             function(a, v) {
               var lhs = S.ap(S.of(a.constructor, S.I), v);
               var rhs = v;
               return Z.equals(lhs, rhs);
             });
    });

    it('satisfies homomorphism', function() {
      var f = function(x) { return x + 1; };
      forall(MaybeArb(jsc.constant(null)),
             jsc.integer,
             function(a, x) {
               var lhs = S.ap(S.of(a.constructor, f), S.of(a.constructor, x));
               var rhs = S.of(a.constructor, f(x));
               return Z.equals(lhs, rhs);
             });
    });

    it('satisfies interchange', function() {
      forall(MaybeArb(jsc.constant(null)),
             MaybeArb(jsc.constant(function(x) { return x + 1; })),
             jsc.integer,
             function(a, u, x) {
               var lhs = S.ap(u, S.of(a.constructor, x));
               var rhs = S.ap(S.of(a.constructor, S.T(x)), u);
               return Z.equals(lhs, rhs);
             });
    });

  });

  describe('Chain', function() {

    it('satisfies associativity', function() {
      var f = function(x) { return x < 0 ? S.Nothing : S.Just(Math.sqrt(x)); };
      var g = function(x) { return S.Just(Math.abs(x)); };
      forall(MaybeArb(jsc.integer),
             function(m) {
               var lhs = S.chain(g, S.chain(f, m));
               var rhs = S.chain(function(x) { return S.chain(g, f(x)); }, m);
               return Z.equals(lhs, rhs);
             });
    });

  });

  describe('Monad', function() {

    it('satisfies left identity', function() {
      var f = function(x) { return x < 0 ? S.Nothing : S.Just(Math.sqrt(x)); };
      forall(MaybeArb(jsc.constant(null)),
             jsc.integer,
             function(m, x) {
               var lhs = S.chain(f, S.of(m.constructor, x));
               var rhs = f(x);
               return Z.equals(lhs, rhs);
             });
    });

    it('satisfies right identity', function() {
      forall(MaybeArb(jsc.integer),
             function(m) {
               var lhs = S.chain(S.of(m.constructor), m);
               var rhs = m;
               return Z.equals(lhs, rhs);
             });
    });

  });

  describe('Foldable', function() {

    it('satisfies associativity', function() {
      var f = function(x, y) { return x + y; };
      forall(MaybeArb(jsc.integer),
             function(u) {
               var lhs = S.reduce_(f, 0, u);
               var rhs = S.reduce_(f, 0, S.reduce_(function(xs, x) { return S.concat(xs, [x]); }, [], u));
               return Z.equals(lhs, rhs);
             });
    });

  });

  describe('Traversable', function() {

    it('satisfies naturality', function() {
      var F = Identity;
      var G = S.Maybe;
      var t = function(identity) { return S.Just(identity.value); };
      forall(MaybeArb(IdentityArb(jsc.integer, jsc.string)),
             function(u) {
               var lhs = t(S.traverse(S.of(F), S.I, u));
               var rhs = S.traverse(S.of(G), t, u);
               return Z.equals(lhs, rhs);
             });
    });

    it('satisfies identity', function() {
      forall(MaybeArb(jsc.integer),
             function(u) {
               var lhs = S.traverse(S.of(Array), S.of(Array), u);
               var rhs = S.of(Array, u);
               return Z.equals(lhs, rhs);
             });
    });

    it('satisfies composition', function() {
      var F = Identity;
      var G = S.Maybe;
      var C = Compose(F)(G);
      forall(MaybeArb(IdentityArb(MaybeArb(jsc.integer))),
             function(u) {
               var lhs = S.traverse(S.of(C), C, u);
               var rhs = C(S.map(S.traverse(S.of(G), S.I), S.traverse(S.of(F), S.I, u)));
               return Z.equals(lhs, rhs);
             });
    });

  });

  describe('Extend', function() {

    it('satisfies associativity', function() {
      var f = function(maybe) { return (maybe.isJust ? maybe.value : 0) + 1; };
      var g = function(maybe) { return (maybe.isJust ? maybe.value : 0) * 2; };
      forall(MaybeArb(jsc.integer),
             function(w) {
               var lhs = S.extend(f, S.extend(g, w));
               var rhs = S.extend(function(_w) { return f(S.extend(g, _w)); }, w);
               return Z.equals(lhs, rhs);
             });
    });

  });

});
