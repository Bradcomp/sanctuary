'use strict';

var jsc = require('jsverify');
var Z = require('sanctuary-type-classes');

var S = require('../internal/sanctuary');

var Compose = require('../internal/Compose');
var Identity = require('../internal/Identity');
var throws = require('../internal/throws');


//  IdentityArb :: Arbitrary a -> Arbitrary (Identity a)
var IdentityArb = function(arb) {
  return arb.smap(Identity, function(i) { return i.value; });
};

//  MaybeArb :: Arbitrary a -> Arbitrary (Maybe a)
var MaybeArb = function(arb) {
  return jsc.oneof(JustArb(arb), jsc.constant(S.Nothing));
};

//  JustArb :: Arbitrary a -> Arbitrary (Maybe a)
var JustArb = function(arb) {
  return arb.smap(S.Just, function(m) { return m.value; }, Z.toString);
};

//  EitherArb :: Arbitrary a -> Arbitrary b -> Arbitrary (Either a b)
var EitherArb = function(lArb, rArb) {
  return jsc.oneof(LeftArb(lArb), RightArb(rArb));
};

//  LeftArb :: Arbitrary a -> Arbitrary (Either a b)
var LeftArb = function(arb) {
  return arb.smap(S.Left, function(e) { return e.value; }, Z.toString);
};

//  RightArb :: Arbitrary a -> Arbitrary (Either b a)
var RightArb = function(arb) {
  return arb.smap(S.Right, function(e) { return e.value; }, Z.toString);
};

describe('Maybe', function() {

  it('throws if called', function() {
    throws(function() { S.Maybe(); },
           Error,
           'Cannot instantiate Maybe');
  });

  describe('Traversable laws', function() {

    it('satisfies naturality', function() {
      jsc.assert(jsc.forall(MaybeArb(EitherArb(jsc.integer, jsc.string)), function(maybe) {
        var lhs = S.eitherToMaybe(maybe.sequence(S.Right));
        var rhs = Z.map(S.eitherToMaybe, maybe).sequence(S.Just);
        return Z.equals(lhs, rhs);
      }));
    });

    it('satisfies identity', function() {
      jsc.assert(jsc.forall(MaybeArb(jsc.integer), function(maybe) {
        var lhs = maybe.map(Identity).sequence(Identity);
        var rhs = Identity(maybe);
        return Z.equals(lhs, rhs);
      }));
    });

    it('satisfies composition', function() {
      jsc.assert(jsc.forall(MaybeArb(IdentityArb(MaybeArb(jsc.integer))), function(u) {
        var C = Compose(Identity)(S.Maybe);
        var lhs = Z.map(C, u).sequence(function(x) { return Z.of(C, x); });
        var rhs = C(Z.map(function(x) { return x.sequence(S.Just); }, u.sequence(Identity)));
        return Z.equals(lhs, rhs);
      }));
    });

  });

});
