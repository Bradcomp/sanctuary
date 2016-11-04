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

//  identityToMaybe :: Identity a -> Maybe a
var identityToMaybe = function(i) {
  return S.Just(i.value);
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

describe('Either', function() {

  it('throws if called', function() {
    throws(function() { S.Either(); },
           Error,
           'Cannot instantiate Either');
  });

  describe('Traversable laws', function() {

    it('satisfies naturality', function() {
      jsc.assert(jsc.forall(EitherArb(jsc.integer, IdentityArb(jsc.string)), function(either) {
        var lhs = identityToMaybe(either.sequence(Identity));
        var rhs = Z.map(identityToMaybe, either).sequence(S.Just);
        return Z.equals(lhs, rhs);
      }));
    });

    it('satisfies identity', function() {
      jsc.assert(jsc.forall(EitherArb(jsc.integer, jsc.string), function(either) {
        var lhs = Z.map(Identity, either).sequence(Identity);
        var rhs = Identity(either);
        return Z.equals(lhs, rhs);
      }));
    });

    it('satisfies composition', function() {
      jsc.assert(jsc.forall(EitherArb(jsc.string, IdentityArb(EitherArb(jsc.string, jsc.integer))), function(u) {
        var C = Compose(Identity)(S.Either);
        var lhs = Z.map(C, u).sequence(function(x) { return Z.of(C, x); });
        var rhs = C(Z.map(function(x) { return x.sequence(S.Right); }, u.sequence(Identity)));
        return Z.equals(lhs, rhs);
      }));
    });

  });

});
