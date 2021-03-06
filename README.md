# Sanctuary

Sanctuary is a functional programming library inspired by Haskell and
PureScript. It depends on and works nicely with [Ramda][]. Sanctuary
makes it possible to write safe code without null checks.

In JavaScript it's trivial to introduce a possible run-time type error:

    words[0].toUpperCase()

If `words` is `[]` we'll get a familiar error at run-time:

    TypeError: Cannot read property 'toUpperCase' of undefined

Sanctuary gives us a fighting chance of avoiding such errors. We might
write:

    R.map(S.toUpper, S.head(words))

Sanctuary is designed to work in Node.js and in ES5-compatible browsers.

## Types

Sanctuary uses Haskell-like type signatures to describe the types of
values, including functions. `'foo'`, for example, has type `String`;
`[1, 2, 3]` has type `Array Number`. The arrow (`->`) is used to express
a function's type. `Math.abs`, for example, has type `Number -> Number`.
That is, it takes an argument of type `Number` and returns a value of
type `Number`.

[`R.map`][R.map] has type `(a -> b) -> Array a -> Array b`. That is,
it takes an argument of type `a -> b` and returns a value of type
`Array a -> Array b`. `a` and `b` are type variables: applying `R.map`
to a value of type `String -> Number` will result in a value of type
`Array String -> Array Number`.

Sanctuary embraces types. JavaScript doesn't support algebraic data types,
but these can be simulated by providing a group of data constructors which
return values with the same set of methods. A value of the Maybe type, for
example, is created via the Nothing constructor or the Just constructor.

It's necessary to extend Haskell's notation to describe implicit arguments
to the *methods* provided by Sanctuary's types. In `x.map(y)`, for example,
the `map` method takes an implicit argument `x` in addition to the explicit
argument `y`. The type of the value upon which a method is invoked appears
at the beginning of the signature, separated from the arguments and return
value by a squiggly arrow (`~>`). The type of the `map` method of the Maybe
type is written `Maybe a ~> (a -> b) -> Maybe b`. One could read this as:

_When the `map` method is invoked on a value of type `Maybe a`
(for any type `a`) with an argument of type `a -> b` (for any type `b`),
it returns a value of type `Maybe b`._

Sanctuary supports type classes: constraints on type variables. Whereas
`a -> a` implicitly supports every type, `Functor f => (a -> b) -> f a ->
f b` requires that `f` be a type which satisfies the requirements of the
Functor type class. Type-class constraints appear at the beginning of a
type signature, separated from the rest of the signature by a fat arrow
(`=>`).

### Accessible pseudotype

What is the type of values which support property access? In other words,
what is the type of which every value except `null` and `undefined` is a
member? Object is close, but `Object.create(null)` produces a value which
supports property access but which is not a member of the Object type.

Sanctuary uses the Accessible pseudotype to represent the set of values
which support property access.

### Integer pseudotype

The Integer pseudotype represents integers in the range (-2^53 .. 2^53).
It is a pseudotype because each Integer is represented by a Number value.
Sanctuary's run-time type checking asserts that a valid Number value is
provided wherever an Integer value is required.

### Type representatives

What is the type of `Number`? One answer is `a -> Number`, since it's a
function which takes an argument of any type and returns a Number value.
When provided as the first argument to [`is`](#is), though, `Number` is
really the value-level representative of the Number type.

Sanctuary uses the TypeRep pseudotype to describe type representatives.
For example:

    Number :: TypeRep Number

`Number` is the sole inhabitant of the TypeRep Number type.

## Type checking

Sanctuary functions are defined via [sanctuary-def][] to provide run-time
type checking. This is tremendously useful during development: type errors
are reported immediately, avoiding circuitous stack traces (at best) and
silent failures due to type coercion (at worst). For example:

```javascript
S.inc('XXX');
// ! TypeError: Invalid value
//
//   inc :: FiniteNumber -> FiniteNumber
//          ^^^^^^^^^^^^
//               1
//
//   1)  "XXX" :: String
//
//   The value at position 1 is not a member of ‘FiniteNumber’.
```

Compare this to the behaviour of Ramda's unchecked equivalent:

```javascript
R.inc('XXX');
// => NaN
```

There is a performance cost to run-time type checking. One may wish to
disable type checking in certain contexts to avoid paying this cost.
[`create`](#create) facilitates the creation of a Sanctuary module which
does not perform type checking.

In Node, one could use an environment variable to determine whether to
perform type checking:

```javascript
const {create, env} = require('sanctuary');

const checkTypes = process.env.NODE_ENV !== 'production';
const S = create({checkTypes: checkTypes, env: env});
```

## API

<h4 name="create"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L342">create :: { checkTypes :: Boolean, env :: Array Type } -> Module</a></code></h4>

Takes an options record and returns a Sanctuary module. `checkTypes`
specifies whether to enable type checking. The module's polymorphic
functions (such as [`I`](#I)) require each value associated with a
type variable to be a member of at least one type in the environment.

A well-typed application of a Sanctuary function will produce the same
result regardless of whether type checking is enabled. If type checking
is enabled, a badly typed application will produce an exception with a
descriptive error message.

The following snippet demonstrates defining a custom type and using
`create` to produce a Sanctuary module which is aware of that type:

```javascript
const {create, env} = require('sanctuary');
const $ = require('sanctuary-def');

//    identityTypeName :: String
const identityTypeName = 'my-package/Identity';

//    Identity :: a -> Identity a
const Identity = function Identity(x) {
  return {
    '@@type': identityTypeName,
    map: f => Identity(f(x)),
    chain: f => f(x),
    // ...
    value: x,
  };
};

//    isIdentity :: a -> Boolean
const isIdentity = x => x != null && x['@@type'] === identityTypeName;

//    identityToArray :: Identity a -> Array a
const identityToArray = identity => [identity.value];

//    IdentityType :: Type
const IdentityType =
$.UnaryType(identityTypeName, isIdentity, identityToArray);

const S = create({
  checkTypes: process.env.NODE_ENV !== 'production',
  env: env.concat([IdentityType]),
});
```

See also [`env`](#env).

<h4 name="env"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L398">env :: Array Type</a></code></h4>

The default environment, which may be used as is or as the basis of a
custom environment in conjunction with [`create`](#create).

### Classify

<h4 name="type"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L441">type :: a -> String</a></code></h4>

Takes a value, `x`, of any type and returns its type identifier. If
`x` has a `'@@type'` property whose value is a string, `x['@@type']`
is the type identifier. Otherwise, the type identifier is the result
of applying [`R.type`][R.type] to `x`.

`'@@type'` properties should use the form `'<package-name>/<type-name>'`,
where `<package-name>` is the name of the npm package in which the type
is defined.

```javascript
> S.type(S.Just(42))
'sanctuary/Maybe'

> S.type([1, 2, 3])
'Array'
```

<h4 name="is"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L465">is :: TypeRep a -> b -> Boolean</a></code></h4>

Takes a [type representative](#type-representatives) and a value of
any type and returns `true` if the given value is of the specified
type; `false` otherwise. Subtyping is not respected.

```javascript
> S.is(Number, 42)
true

> S.is(Object, 42)
false

> S.is(String, 42)
false
```

### Combinator

<h4 name="I"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L495">I :: a -> a</a></code></h4>

The I combinator. Returns its argument. Equivalent to Haskell's `id`
function.

```javascript
> S.I('foo')
'foo'
```

<h4 name="K"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L510">K :: a -> b -> a</a></code></h4>

The K combinator. Takes two values and returns the first. Equivalent to
Haskell's `const` function.

```javascript
> S.K('foo', 'bar')
'foo'

> R.map(S.K(42), R.range(0, 5))
[42, 42, 42, 42, 42]
```

<h4 name="A"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L528">A :: (a -> b) -> a -> b</a></code></h4>

The A combinator. Takes a function and a value, and returns the result
of applying the function to the value. Equivalent to Haskell's `($)`
function.

```javascript
> S.A(S.inc, 42)
43

> R.map(S.A(R.__, 100), [S.inc, Math.sqrt])
[101, 10]
```

<h4 name="T"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L547">T :: a -> (a -> b) -> b</a></code></h4>

The T ([thrush][]) combinator. Takes a value and a function, and returns
the result of applying the function to the value. Equivalent to Haskell's
`(&)` function.

```javascript
> S.T(42, S.inc)
43

> R.map(S.T(100), [S.inc, Math.sqrt])
[101, 10]
```

<h4 name="C"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L566">C :: (a -> b -> c) -> b -> a -> c</a></code></h4>

The C combinator. Takes a curried binary function and two values, and
returns the result of applying the function to the values in reverse.
Equivalent to Haskell's `flip` function.

This function is very similar to [`flip`](#flip), except that its first
argument must be curried. This allows it to work with manually curried
functions.

```javascript
> S.C(S.concat, 'foo', 'bar')
'barfoo'

> R.filter(S.C(R.gt, 0), [-1, -2, 3, -4, 4, 2])
[3, 4, 2]
```

<h4 name="B"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L589">B :: (b -> c) -> (a -> b) -> a -> c</a></code></h4>

The B combinator. Takes two functions and a value, and returns the
result of applying the first function to the result of applying the
second to the value. Equivalent to [`compose`](#compose) and Haskell's
`(.)` function.

```javascript
> S.B(Math.sqrt, S.inc, 99)
10
```

<h4 name="S"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L606">S :: (a -> b -> c) -> (a -> b) -> a -> c</a></code></h4>

The S combinator. Takes a curried binary function, a unary function,
and a value, and returns the result of applying the binary function to:

  - the value; and
  - the result of applying the unary function to the value.

```javascript
> S.S(S.add, Math.sqrt, 100)
110
```

### Function

<h4 name="flip"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L626">flip :: ((a, b) -> c) -> b -> a -> c</a></code></h4>

Takes a binary function and two values and returns the result of
applying the function - with its argument order reversed - to the
values. `flip` may also be applied to a Ramda-style curried
function with arity greater than two.

See also [`C`](#C).

```javascript
> R.map(S.flip(Math.pow)(2), [1, 2, 3, 4, 5])
[1, 4, 9, 16, 25]
```

<h4 name="lift"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L645">lift :: Functor f => (a -> b) -> f a -> f b</a></code></h4>

Promotes a unary function to a function which operates on a [Functor][].

```javascript
> S.lift(S.inc, S.Just(2))
Just(3)

> S.lift(S.inc, S.Nothing())
Nothing()
```

<h4 name="lift2"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L662">lift2 :: Apply f => (a -> b -> c) -> f a -> f b -> f c</a></code></h4>

Promotes a binary function to a function which operates on two
[Apply][]s.

```javascript
> S.lift2(S.add, S.Just(2), S.Just(3))
Just(5)

> S.lift2(S.add, S.Just(2), S.Nothing())
Nothing()

> S.lift2(S.and, S.Just(true), S.Just(true))
Just(true)

> S.lift2(S.and, S.Just(true), S.Just(false))
Just(false)
```

<h4 name="lift3"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L686">lift3 :: Apply f => (a -> b -> c -> d) -> f a -> f b -> f c -> f d</a></code></h4>

Promotes a ternary function to a function which operates on three
[Apply][]s.

```javascript
> S.lift3(S.reduce, S.Just(S.add), S.Just(0), S.Just([1, 2, 3]))
Just(6)

> S.lift3(S.reduce, S.Just(S.add), S.Just(0), S.Nothing())
Nothing()
```

### Composition

<h4 name="compose"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L706">compose :: (b -> c) -> (a -> b) -> a -> c</a></code></h4>

Takes two functions assumed to be unary and a value of any type,
and returns the result of applying the first function to the result
of applying the second function to the given value.

In general terms, `compose` performs right-to-left composition of two
unary functions.

See also [`B`](#B) and [`pipe`](#pipe).

```javascript
> S.compose(Math.sqrt, S.inc)(99)
10
```

<h4 name="pipe"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L727">pipe :: [(a -> b), (b -> c), ..., (m -> n)] -> a -> n</a></code></h4>

Takes an array of functions assumed to be unary and a value of any type,
and returns the result of applying the sequence of transformations to
the initial value.

In general terms, `pipe` performs left-to-right composition of an array
of functions. `pipe([f, g, h], x)` is equivalent to `h(g(f(x)))`.

See also [`meld`](#meld).

```javascript
> S.pipe([S.inc, Math.sqrt, S.dec])(99)
9
```

<h4 name="meld"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L748">meld :: [** -> *] -> (* -> * -> ... -> *)</a></code></h4>

Takes an array of non-nullary functions and returns a curried function
whose arity is one greater than the sum of the arities of the given
functions less the number of functions.

The behaviour of `meld` is best conveyed diagrammatically. The following
diagram depicts the "melding" of binary functions `f` and `g`:

              +-------+
    --- a --->|       |
              |   f   |                +-------+
    --- b --->|       |--- f(a, b) --->|       |
              +-------+                |   g   |
    --- c ---------------------------->|       |--- g(f(a, b), c) --->
                                       +-------+

See also [`pipe`](#pipe).

```javascript
> S.meld([Math.pow, S.sub])(3, 4, 5)
76

> S.meld([Math.pow, S.sub])(3)(4)(5)
76
```

### Maybe type

The Maybe type represents optional values: a value of type `Maybe a` is
either a Just whose value is of type `a` or a Nothing (with no value).

The Maybe type satisfies the [Monoid][], [Monad][], [Traversable][],
and [Extend][] specifications.

<h4 name="MaybeType"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L797">MaybeType :: Type -> Type</a></code></h4>

A [`UnaryType`][UnaryType] for use with [sanctuary-def][].

<h4 name="Maybe"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L801">Maybe :: TypeRep Maybe</a></code></h4>

The [type representative](#type-representatives) for the Maybe type.

<h4 name="Maybe.empty"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L810">Maybe.empty :: -> Maybe a</a></code></h4>

Returns a Nothing.

```javascript
> S.Maybe.empty()
Nothing()
```

<h4 name="Maybe.of"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L824">Maybe.of :: a -> Maybe a</a></code></h4>

Takes a value of any type and returns a Just with the given value.

```javascript
> S.Maybe.of(42)
Just(42)
```

<h4 name="Maybe.prototype.@@type"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L838">Maybe#@@type :: String</a></code></h4>

Maybe type identifier, `'sanctuary/Maybe'`.

<h4 name="Maybe.prototype.isNothing"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L843">Maybe#isNothing :: Boolean</a></code></h4>

`true` if `this` is a Nothing; `false` if `this` is a Just.

```javascript
> S.Nothing().isNothing
true

> S.Just(42).isNothing
false
```

<h4 name="Maybe.prototype.isJust"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L855">Maybe#isJust :: Boolean</a></code></h4>

`true` if `this` is a Just; `false` if `this` is a Nothing.

```javascript
> S.Just(42).isJust
true

> S.Nothing().isJust
false
```

<h4 name="Maybe.prototype.ap"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L867">Maybe#ap :: Maybe (a -> b) ~> Maybe a -> Maybe b</a></code></h4>

Takes a value of type `Maybe a` and returns a Nothing unless `this`
is a Just *and* the argument is a Just, in which case it returns a
Just whose value is the result of of applying this Just's value to
the given Just's value.

```javascript
> S.Nothing().ap(S.Just(42))
Nothing()

> S.Just(S.inc).ap(S.Nothing())
Nothing()

> S.Just(S.inc).ap(S.Just(42))
Just(43)
```

<h4 name="Maybe.prototype.chain"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L890">Maybe#chain :: Maybe a ~> (a -> Maybe b) -> Maybe b</a></code></h4>

Takes a function and returns `this` if `this` is a Nothing; otherwise
it returns the result of applying the function to this Just's value.

```javascript
> S.Nothing().chain(S.parseFloat)
Nothing()

> S.Just('xxx').chain(S.parseFloat)
Nothing()

> S.Just('12.34').chain(S.parseFloat)
Just(12.34)
```

<h4 name="Maybe.prototype.concat"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L911">Maybe#concat :: Semigroup a => Maybe a ~> Maybe a -> Maybe a</a></code></h4>

Returns the result of concatenating two Maybe values of the same type.
`a` must have a [Semigroup][] (indicated by the presence of a `concat`
method).

If `this` is a Nothing and the argument is a Nothing, this method returns
a Nothing.

If `this` is a Just and the argument is a Just, this method returns a
Just whose value is the result of concatenating this Just's value and
the given Just's value.

Otherwise, this method returns the Just.

```javascript
> S.Nothing().concat(S.Nothing())
Nothing()

> S.Just([1, 2, 3]).concat(S.Just([4, 5, 6]))
Just([1, 2, 3, 4, 5, 6])

> S.Nothing().concat(S.Just([1, 2, 3]))
Just([1, 2, 3])

> S.Just([1, 2, 3]).concat(S.Nothing())
Just([1, 2, 3])
```

<h4 name="Maybe.prototype.empty"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L948">Maybe#empty :: Maybe a ~> Maybe a</a></code></h4>

Returns a Nothing.

```javascript
> S.Just(42).empty()
Nothing()
```

<h4 name="Maybe.prototype.equals"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L962">Maybe#equals :: Maybe a ~> b -> Boolean</a></code></h4>

Takes a value of any type and returns `true` if:

  - it is a Nothing and `this` is a Nothing; or

  - it is a Just and `this` is a Just, and their values are equal
    according to [`R.equals`][R.equals].

```javascript
> S.Nothing().equals(S.Nothing())
true

> S.Nothing().equals(null)
false

> S.Just([1, 2, 3]).equals(S.Just([1, 2, 3]))
true

> S.Just([1, 2, 3]).equals(S.Just([3, 2, 1]))
false

> S.Just([1, 2, 3]).equals(S.Nothing())
false
```

<h4 name="Maybe.prototype.extend"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L997">Maybe#extend :: Maybe a ~> (Maybe a -> a) -> Maybe a</a></code></h4>

Takes a function and returns `this` if `this` is a Nothing; otherwise
it returns a Just whose value is the result of applying the function to
`this`.

```javascript
> S.Nothing().extend(x => x.value + 1)
Nothing()

> S.Just(42).extend(x => x.value + 1)
Just(43)
```

<h4 name="Maybe.prototype.filter"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1016">Maybe#filter :: Maybe a ~> (a -> Boolean) -> Maybe a</a></code></h4>

Takes a predicate and returns `this` if `this` is a Just whose value
satisfies the predicate; Nothing otherwise.

```javascript
> S.Just(42).filter(n => n % 2 === 0)
Just(42)

> S.Just(43).filter(n => n % 2 === 0)
Nothing()
```

<h4 name="Maybe.prototype.map"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1034">Maybe#map :: Maybe a ~> (a -> b) -> Maybe b</a></code></h4>

Takes a function and returns `this` if `this` is a Nothing; otherwise
it returns a Just whose value is the result of applying the function to
this Just's value.

```javascript
> S.Nothing().map(S.inc)
Nothing()

> S.Just([1, 2, 3]).map(S.sum)
Just(6)
```

<h4 name="Maybe.prototype.of"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1055">Maybe#of :: Maybe a ~> b -> Maybe b</a></code></h4>

Takes a value of any type and returns a Just with the given value.

```javascript
> S.Nothing().of(42)
Just(42)
```

<h4 name="Maybe.prototype.reduce"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1069">Maybe#reduce :: Maybe a ~> ((b, a) -> b) -> b -> b</a></code></h4>

Takes a function and an initial value of any type, and returns:

  - the initial value if `this` is a Nothing; otherwise

  - the result of applying the function to the initial value and this
    Just's value.

```javascript
> S.Nothing().reduce(S.add, 10)
10

> S.Just(5).reduce(S.add, 10)
15
```

<h4 name="Maybe.prototype.sequence"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1093">Maybe#sequence :: Applicative f => Maybe (f a) ~> (a -> f a) -> f (Maybe a)</a></code></h4>

Evaluates an applicative action contained within the Maybe, resulting in:

  - a pure applicative of a Nothing if `this` is a Nothing; otherwise

  - an applicative of Just the value of the evaluated action.

```javascript
> S.Nothing().sequence(S.Either.of)
Right(Nothing())

> S.Just(S.Right(42)).sequence(S.Either.of)
Right(Just(42))

> S.Just(S.Left('Cannot divide by zero')).sequence(S.Either.of)
Left('Cannot divide by zero')
```

<h4 name="Maybe.prototype.toBoolean"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1119">Maybe#toBoolean :: Maybe a ~> Boolean</a></code></h4>

Returns `false` if `this` is a Nothing; `true` if `this` is a Just.

```javascript
> S.Nothing().toBoolean()
false

> S.Just(42).toBoolean()
true
```

<h4 name="Maybe.prototype.toString"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1136">Maybe#toString :: Maybe a ~> String</a></code></h4>

Returns the string representation of the Maybe.

```javascript
> S.Nothing().toString()
'Nothing()'

> S.Just([1, 2, 3]).toString()
'Just([1, 2, 3])'
```

<h4 name="Maybe.prototype.inspect"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1156">Maybe#inspect :: Maybe a ~> String</a></code></h4>

Returns the string representation of the Maybe. This method is used by
`util.inspect` and the REPL to format a Maybe for display.

See also [`Maybe#toString`](#Maybe.prototype.toString).

```javascript
> S.Nothing().inspect()
'Nothing()'

> S.Just([1, 2, 3]).inspect()
'Just([1, 2, 3])'
```

<h4 name="Nothing"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1172">Nothing :: -> Maybe a</a></code></h4>

Returns a Nothing.

```javascript
> S.Nothing()
Nothing()
```

<h4 name="Just"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1187">Just :: a -> Maybe a</a></code></h4>

Takes a value of any type and returns a Just with the given value.

```javascript
> S.Just(42)
Just(42)
```

<h4 name="isNothing"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1203">isNothing :: Maybe a -> Boolean</a></code></h4>

Returns `true` if the given Maybe is a Nothing; `false` if it is a Just.

```javascript
> S.isNothing(S.Nothing())
true

> S.isNothing(S.Just(42))
false
```

<h4 name="isJust"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1220">isJust :: Maybe a -> Boolean</a></code></h4>

Returns `true` if the given Maybe is a Just; `false` if it is a Nothing.

```javascript
> S.isJust(S.Just(42))
true

> S.isJust(S.Nothing())
false
```

<h4 name="fromMaybe"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1237">fromMaybe :: a -> Maybe a -> a</a></code></h4>

Takes a default value and a Maybe, and returns the Maybe's value
if the Maybe is a Just; the default value otherwise.

See also [`maybeToNullable`](#maybeToNullable).

```javascript
> S.fromMaybe(0, S.Just(42))
42

> S.fromMaybe(0, S.Nothing())
0
```

<h4 name="maybeToNullable"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1257">maybeToNullable :: Maybe a -> Nullable a</a></code></h4>

Returns the given Maybe's value if the Maybe is a Just; `null` otherwise.
[Nullable][] is defined in sanctuary-def.

See also [`fromMaybe`](#fromMaybe).

```javascript
> S.maybeToNullable(S.Just(42))
42

> S.maybeToNullable(S.Nothing())
null
```

<h4 name="toMaybe"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1277">toMaybe :: a? -> Maybe a</a></code></h4>

Takes a value and returns Nothing if the value is null or undefined;
Just the value otherwise.

```javascript
> S.toMaybe(null)
Nothing()

> S.toMaybe(42)
Just(42)
```

<h4 name="maybe"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1295">maybe :: b -> (a -> b) -> Maybe a -> b</a></code></h4>

Takes a value of any type, a function, and a Maybe. If the Maybe is
a Just, the return value is the result of applying the function to
the Just's value. Otherwise, the first argument is returned.

```javascript
> S.maybe(0, R.length, S.Just('refuge'))
6

> S.maybe(0, R.length, S.Nothing())
0
```

<h4 name="justs"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1314">justs :: Array (Maybe a) -> Array a</a></code></h4>

Takes an array of Maybes and returns an array containing each Just's
value. Equivalent to Haskell's `catMaybes` function.

See also [`lefts`](#lefts) and [`rights`](#rights).

```javascript
> S.justs([S.Just('foo'), S.Nothing(), S.Just('baz')])
['foo', 'baz']
```

<h4 name="mapMaybe"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1331">mapMaybe :: (a -> Maybe b) -> Array a -> Array b</a></code></h4>

Takes a function and an array, applies the function to each element of
the array, and returns an array of "successful" results. If the result of
applying the function to an element of the array is a Nothing, the result
is discarded; if the result is a Just, the Just's value is included in
the output array.

In general terms, `mapMaybe` filters an array while mapping over it.

```javascript
> S.mapMaybe(S.head, [[], [1, 2, 3], [], [4, 5, 6], []])
[1, 4]
```

<h4 name="encase"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1351">encase :: (a -> b) -> a -> Maybe b</a></code></h4>

Takes a unary function `f` which may throw and a value `x` of any type,
and applies `f` to `x` inside a `try` block. If an exception is caught,
the return value is a Nothing; otherwise the return value is Just the
result of applying `f` to `x`.

See also [`encaseEither`](#encaseEither).

```javascript
> S.encase(eval, '1 + 1')
Just(2)

> S.encase(eval, '1 +')
Nothing()
```

<h4 name="encase2"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1379">encase2 :: (a -> b -> c) -> a -> b -> Maybe c</a></code></h4>

Binary version of [`encase`](#encase).

See also [`encase2_`](#encase2_).

<h4 name="encase2_"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1396">encase2_ :: ((a, b) -> c) -> a -> b -> Maybe c</a></code></h4>

Version of [`encase2`](#encase2) accepting uncurried functions.

<h4 name="encase3"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1412">encase3 :: (a -> b -> c -> d) -> a -> b -> c -> Maybe d</a></code></h4>

Ternary version of [`encase`](#encase).

See also [`encase3_`](#encase3_).

<h4 name="encase3_"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1429">encase3_ :: ((a, b, c) -> d) -> a -> b -> c -> Maybe d</a></code></h4>

Version of [`encase3`](#encase3) accepting uncurried functions.

<h4 name="maybeToEither"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1447">maybeToEither :: a -> Maybe b -> Either a b</a></code></h4>

Converts a Maybe to an Either. A Nothing becomes a Left (containing the
first argument); a Just becomes a Right.

See also [`eitherToMaybe`](#eitherToMaybe).

```javascript
> S.maybeToEither('Expecting an integer', S.parseInt(10, 'xyz'))
Left('Expecting an integer')

> S.maybeToEither('Expecting an integer', S.parseInt(10, '42'))
Right(42)
```

### Either type

The Either type represents values with two possibilities: a value of type
`Either a b` is either a Left whose value is of type `a` or a Right whose
value is of type `b`.

The Either type satisfies the [Semigroup][], [Monad][], [Traversable][],
and [Extend][] specifications.

<h4 name="EitherType"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1478">EitherType :: Type -> Type -> Type</a></code></h4>

A [`BinaryType`][BinaryType] for use with [sanctuary-def][].

<h4 name="Either"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1482">Either :: TypeRep Either</a></code></h4>

The [type representative](#type-representatives) for the Either type.

<h4 name="Either.of"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1491">Either.of :: b -> Either a b</a></code></h4>

Takes a value of any type and returns a Right with the given value.

```javascript
> S.Either.of(42)
Right(42)
```

<h4 name="Either.prototype.@@type"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1505">Either#@@type :: String</a></code></h4>

Either type identifier, `'sanctuary/Either'`.

<h4 name="Either.prototype.isLeft"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1510">Either#isLeft :: Boolean</a></code></h4>

`true` if `this` is a Left; `false` if `this` is a Right.

```javascript
> S.Left('Cannot divide by zero').isLeft
true

> S.Right(42).isLeft
false
```

<h4 name="Either.prototype.isRight"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1522">Either#isRight :: Boolean</a></code></h4>

`true` if `this` is a Right; `false` if `this` is a Left.

```javascript
> S.Right(42).isRight
true

> S.Left('Cannot divide by zero').isRight
false
```

<h4 name="Either.prototype.ap"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1534">Either#ap :: Either a (b -> c) ~> Either a b -> Either a c</a></code></h4>

Takes a value of type `Either a b` and returns a Left unless `this`
is a Right *and* the argument is a Right, in which case it returns
a Right whose value is the result of applying this Right's value to
the given Right's value.

```javascript
> S.Left('Cannot divide by zero').ap(S.Right(42))
Left('Cannot divide by zero')

> S.Right(S.inc).ap(S.Left('Cannot divide by zero'))
Left('Cannot divide by zero')

> S.Right(S.inc).ap(S.Right(42))
Right(43)
```

<h4 name="Either.prototype.chain"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1557">Either#chain :: Either a b ~> (b -> Either a c) -> Either a c</a></code></h4>

Takes a function and returns `this` if `this` is a Left; otherwise
it returns the result of applying the function to this Right's value.

```javascript
> global.sqrt = n =>
.   n < 0 ? S.Left('Cannot represent square root of negative number')
.         : S.Right(Math.sqrt(n))
sqrt

> S.Left('Cannot divide by zero').chain(sqrt)
Left('Cannot divide by zero')

> S.Right(-1).chain(sqrt)
Left('Cannot represent square root of negative number')

> S.Right(25).chain(sqrt)
Right(5)
```

<h4 name="Either.prototype.concat"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1585">Either#concat :: (Semigroup a, Semigroup b) => Either a b ~> Either a b -> Either a b</a></code></h4>

Returns the result of concatenating two Either values of the same type.
`a` must have a [Semigroup][] (indicated by the presence of a `concat`
method), as must `b`.

If `this` is a Left and the argument is a Left, this method returns a
Left whose value is the result of concatenating this Left's value and
the given Left's value.

If `this` is a Right and the argument is a Right, this method returns a
Right whose value is the result of concatenating this Right's value and
the given Right's value.

Otherwise, this method returns the Right.

```javascript
> S.Left('abc').concat(S.Left('def'))
Left('abcdef')

> S.Right([1, 2, 3]).concat(S.Right([4, 5, 6]))
Right([1, 2, 3, 4, 5, 6])

> S.Left('abc').concat(S.Right([1, 2, 3]))
Right([1, 2, 3])

> S.Right([1, 2, 3]).concat(S.Left('abc'))
Right([1, 2, 3])
```

<h4 name="Either.prototype.equals"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1624">Either#equals :: Either a b ~> c -> Boolean</a></code></h4>

Takes a value of any type and returns `true` if:

  - it is a Left and `this` is a Left, and their values are equal
    according to [`R.equals`][R.equals]; or

  - it is a Right and `this` is a Right, and their values are equal
    according to [`R.equals`][R.equals].

```javascript
> S.Right([1, 2, 3]).equals(S.Right([1, 2, 3]))
true

> S.Right([1, 2, 3]).equals(S.Left([1, 2, 3]))
false

> S.Right(42).equals(42)
false
```

<h4 name="Either.prototype.extend"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1653">Either#extend :: Either a b ~> (Either a b -> b) -> Either a b</a></code></h4>

Takes a function and returns `this` if `this` is a Left; otherwise it
returns a Right whose value is the result of applying the function to
`this`.

```javascript
> S.Left('Cannot divide by zero').extend(x => x.value + 1)
Left('Cannot divide by zero')

> S.Right(42).extend(x => x.value + 1)
Right(43)
```

<h4 name="Either.prototype.map"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1674">Either#map :: Either a b ~> (b -> c) -> Either a c</a></code></h4>

Takes a function and returns `this` if `this` is a Left; otherwise it
returns a Right whose value is the result of applying the function to
this Right's value.

```javascript
> S.Left('Cannot divide by zero').map(S.inc)
Left('Cannot divide by zero')

> S.Right([1, 2, 3]).map(S.sum)
Right(6)
```

<h4 name="Either.prototype.of"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1695">Either#of :: Either a b ~> c -> Either a c</a></code></h4>

Takes a value of any type and returns a Right with the given value.

```javascript
> S.Left('Cannot divide by zero').of(42)
Right(42)
```

<h4 name="Either.prototype.reduce"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1709">Either#reduce :: Either a b ~> ((c, b) -> c) -> c -> c</a></code></h4>

Takes a function and an initial value of any type, and returns:

  - the initial value if `this` is a Left; otherwise

  - the result of applying the function to the initial value and this
    Right's value.

```javascript
> S.Left('Cannot divide by zero').reduce((xs, x) => xs.concat([x]), [42])
[42]

> S.Right(5).reduce((xs, x) => xs.concat([x]), [42])
[42, 5]
```

<h4 name="Either.prototype.sequence"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1733">Either#sequence :: Applicative f => Either a (f b) ~> (b -> f b) -> f (Either a b)</a></code></h4>

Evaluates an applicative action contained within the Either,
resulting in:

  - a pure applicative of a Left if `this` is a Left; otherwise

  - an applicative of a Right of the evaluated action.

```javascript
> S.Left('Cannot divide by zero').sequence(S.Maybe.of)
Just(Left('Cannot divide by zero'))

> S.Right(S.Just(42)).sequence(S.Maybe.of)
Just(Right(42))

> S.Right(S.Nothing()).sequence(S.Maybe.of)
Nothing()
```

<h4 name="Either.prototype.toBoolean"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1760">Either#toBoolean :: Either a b ~> Boolean</a></code></h4>

Returns `false` if `this` is a Left; `true` if `this` is a Right.

```javascript
> S.Left(42).toBoolean()
false

> S.Right(42).toBoolean()
true
```

<h4 name="Either.prototype.toString"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1777">Either#toString :: Either a b ~> String</a></code></h4>

Returns the string representation of the Either.

```javascript
> S.Left('Cannot divide by zero').toString()
'Left("Cannot divide by zero")'

> S.Right([1, 2, 3]).toString()
'Right([1, 2, 3])'
```

<h4 name="Either.prototype.inspect"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1797">Either#inspect :: Either a b ~> String</a></code></h4>

Returns the string representation of the Either. This method is used by
`util.inspect` and the REPL to format a Either for display.

See also [`Either#toString`](#Either.prototype.toString).

```javascript
> S.Left('Cannot divide by zero').inspect()
'Left("Cannot divide by zero")'

> S.Right([1, 2, 3]).inspect()
'Right([1, 2, 3])'
```

<h4 name="Left"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1813">Left :: a -> Either a b</a></code></h4>

Takes a value of any type and returns a Left with the given value.

```javascript
> S.Left('Cannot divide by zero')
Left('Cannot divide by zero')
```

<h4 name="Right"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1829">Right :: b -> Either a b</a></code></h4>

Takes a value of any type and returns a Right with the given value.

```javascript
> S.Right(42)
Right(42)
```

<h4 name="isLeft"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1845">isLeft :: Either a b -> Boolean</a></code></h4>

Returns `true` if the given Either is a Left; `false` if it is a Right.

```javascript
> S.isLeft(S.Left('Cannot divide by zero'))
true

> S.isLeft(S.Right(42))
false
```

<h4 name="isRight"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1862">isRight :: Either a b -> Boolean</a></code></h4>

Returns `true` if the given Either is a Right; `false` if it is a Left.

```javascript
> S.isRight(S.Right(42))
true

> S.isRight(S.Left('Cannot divide by zero'))
false
```

<h4 name="either"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1879">either :: (a -> c) -> (b -> c) -> Either a b -> c</a></code></h4>

Takes two functions and an Either, and returns the result of
applying the first function to the Left's value, if the Either
is a Left, or the result of applying the second function to the
Right's value, if the Either is a Right.

```javascript
> S.either(S.toUpper, R.toString, S.Left('Cannot divide by zero'))
'CANNOT DIVIDE BY ZERO'

> S.either(S.toUpper, R.toString, S.Right(42))
'42'
```

<h4 name="lefts"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1901">lefts :: Array (Either a b) -> Array a</a></code></h4>

Takes an array of Eithers and returns an array containing each Left's
value.

See also [`rights`](#rights).

```javascript
> S.lefts([S.Right(20), S.Left('foo'), S.Right(10), S.Left('bar')])
['foo', 'bar']
```

<h4 name="rights"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1920">rights :: Array (Either a b) -> Array b</a></code></h4>

Takes an array of Eithers and returns an array containing each Right's
value.

See also [`lefts`](#lefts).

```javascript
> S.rights([S.Right(20), S.Left('foo'), S.Right(10), S.Left('bar')])
[20, 10]
```

<h4 name="encaseEither"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1939">encaseEither :: (Error -> l) -> (a -> r) -> a -> Either l r</a></code></h4>

Takes two unary functions, `f` and `g`, the second of which may throw,
and a value `x` of any type. Applies `g` to `x` inside a `try` block.
If an exception is caught, the return value is a Left containing the
result of applying `f` to the caught Error object; otherwise the return
value is a Right containing the result of applying `g` to `x`.

See also [`encase`](#encase).

```javascript
> S.encaseEither(S.I, JSON.parse, '["foo","bar","baz"]')
Right(['foo', 'bar', 'baz'])

> S.encaseEither(S.I, JSON.parse, '[')
Left(new SyntaxError('Unexpected end of input'))

> S.encaseEither(S.prop('message'), JSON.parse, '[')
Left('Unexpected end of input')
```

<h4 name="encaseEither2"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1971">encaseEither2 :: (Error -> l) -> (a -> b -> r) -> a -> b -> Either l r</a></code></h4>

Binary version of [`encaseEither`](#encaseEither).

See also [`encaseEither2_`](#encaseEither2_).

<h4 name="encaseEither2_"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L1988">encaseEither2_ :: (Error -> l) -> ((a, b) -> r) -> a -> b -> Either l r</a></code></h4>

Version of [`encaseEither2`](#encaseEither2) accepting uncurried
functions.

<h4 name="encaseEither3"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2005">encaseEither3 :: (Error -> l) -> (a -> b -> c -> r) -> a -> b -> c -> Either l r</a></code></h4>

Ternary version of [`encaseEither`](#encaseEither).

See also [`encaseEither3_`](#encaseEither3_).

<h4 name="encaseEither3_"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2022">encaseEither3_ :: (Error -> l) -> ((a, b, c) -> r) -> a -> b -> c -> Either l r</a></code></h4>

Version of [`encaseEither3`](#encaseEither3) accepting uncurried
functions.

<h4 name="eitherToMaybe"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2041">eitherToMaybe :: Either a b -> Maybe b</a></code></h4>

Converts an Either to a Maybe. A Left becomes a Nothing; a Right becomes
a Just.

See also [`maybeToEither`](#maybeToEither).

```javascript
> S.eitherToMaybe(S.Left('Cannot divide by zero'))
Nothing()

> S.eitherToMaybe(S.Right(42))
Just(42)
```

### Alternative

<h4 name="and"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2092">and :: Alternative a => a -> a -> a</a></code></h4>

Takes two values of the same type and returns the second value
if the first is "true"; the first value otherwise. An array is
considered "true" if its length is greater than zero. The Boolean
value `true` is also considered "true". Other types must provide
a `toBoolean` method.

```javascript
> S.and(S.Just(1), S.Just(2))
Just(2)

> S.and(S.Nothing(), S.Just(3))
Nothing()
```

<h4 name="or"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2113">or :: Alternative a => a -> a -> a</a></code></h4>

Takes two values of the same type and returns the first value if it
is "true"; the second value otherwise. An array is considered "true"
if its length is greater than zero. The Boolean value `true` is also
considered "true". Other types must provide a `toBoolean` method.

```javascript
> S.or(S.Just(1), S.Just(2))
Just(1)

> S.or(S.Nothing(), S.Just(3))
Just(3)
```

<h4 name="xor"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2133">xor :: (Alternative a, Monoid a) => a -> a -> a</a></code></h4>

Takes two values of the same type and returns the "true" value
if one value is "true" and the other is "false"; otherwise it
returns the type's "false" value. An array is considered "true"
if its length is greater than zero. The Boolean value `true` is
also considered "true". Other types must provide `toBoolean` and
`empty` methods.

```javascript
> S.xor(S.Nothing(), S.Just(1))
Just(1)

> S.xor(S.Just(2), S.Just(3))
Nothing()
```

### Logic

<h4 name="not"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2159">not :: Boolean -> Boolean</a></code></h4>

Takes a Boolean and returns the negation of that value
(`false` for `true`; `true` for `false`).

```javascript
> S.not(true)
false

> S.not(false)
true
```

<h4 name="ifElse"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2177">ifElse :: (a -> Boolean) -> (a -> b) -> (a -> b) -> a -> b</a></code></h4>

Takes a unary predicate, a unary "if" function, a unary "else"
function, and a value of any type, and returns the result of
applying the "if" function to the value if the value satisfies
the predicate; the result of applying the "else" function to the
value otherwise.

```javascript
> S.ifElse(x => x < 0, Math.abs, Math.sqrt, -1)
1

> S.ifElse(x => x < 0, Math.abs, Math.sqrt, 16)
4
```

<h4 name="allPass"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2198">allPass :: Array (a -> Boolean) -> a -> Boolean</a></code></h4>

Takes an array of unary predicates and a value of any type
and returns `true` if all the predicates pass; `false` otherwise.
None of the subsequent predicates will be evaluated after the
first failed predicate.

```javascript
> S.allPass([S.test(/q/), S.test(/u/), S.test(/i/)], 'quiessence')
true

> S.allPass([S.test(/q/), S.test(/u/), S.test(/i/)], 'fissiparous')
false
```

<h4 name="anyPass"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2223">anyPass :: Array (a -> Boolean) -> a -> Boolean</a></code></h4>

Takes an array of unary predicates and a value of any type
and returns `true` if any of the predicates pass; `false` otherwise.
None of the subsequent predicates will be evaluated after the
first passed predicate.

```javascript
> S.anyPass([S.test(/q/), S.test(/u/), S.test(/i/)], 'incandescent')
true

> S.anyPass([S.test(/q/), S.test(/u/), S.test(/i/)], 'empathy')
false
```

### List

The List type represents non-Function values with integer `length`
properties greater than or equal to zero, such as `[1, 2, 3]` and
`'foo'`.

`[a]` is the notation used to represent a List of values of type `a`.

<h4 name="concat"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2256">concat :: Semigroup a => a -> a -> a</a></code></h4>

Concatenates two (homogeneous) arrays, two strings, or two values of any
other type which satisfies the [Semigroup][] specification.

```javascript
> S.concat([1, 2, 3], [4, 5, 6])
[1, 2, 3, 4, 5, 6]

> S.concat('foo', 'bar')
'foobar'

> S.concat(S.Just('foo'), S.Just('bar'))
S.Just('foobar')
```

<h4 name="slice"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2277">slice :: Integer -> Integer -> [a] -> Maybe [a]</a></code></h4>

Returns Just a list containing the elements from the supplied list
from a beginning index (inclusive) to an end index (exclusive).
Returns Nothing unless the start interval is less than or equal to
the end interval, and the list contains both (half-open) intervals.
Accepts negative indices, which indicate an offset from the end of
the list.

Dispatches to its third argument's `slice` method if present. As a
result, one may replace `[a]` with `String` in the type signature.

```javascript
> S.slice(1, 3, ['a', 'b', 'c', 'd', 'e'])
Just(['b', 'c'])

> S.slice(-2, -0, ['a', 'b', 'c', 'd', 'e'])
Just(['d', 'e'])

> S.slice(2, -0, ['a', 'b', 'c', 'd', 'e'])
Just(['c', 'd', 'e'])

> S.slice(1, 6, ['a', 'b', 'c', 'd', 'e'])
Nothing()

> S.slice(2, 6, 'banana')
Just('nana')
```

<h4 name="at"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2319">at :: Integer -> [a] -> Maybe a</a></code></h4>

Takes an index and a list and returns Just the element of the list at
the index if the index is within the list's bounds; Nothing otherwise.
A negative index represents an offset from the length of the list.

```javascript
> S.at(2, ['a', 'b', 'c', 'd', 'e'])
Just('c')

> S.at(5, ['a', 'b', 'c', 'd', 'e'])
Nothing()

> S.at(-2, ['a', 'b', 'c', 'd', 'e'])
Just('d')
```

<h4 name="head"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2343">head :: [a] -> Maybe a</a></code></h4>

Takes a list and returns Just the first element of the list if the
list contains at least one element; Nothing if the list is empty.

```javascript
> S.head([1, 2, 3])
Just(1)

> S.head([])
Nothing()
```

<h4 name="last"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2361">last :: [a] -> Maybe a</a></code></h4>

Takes a list and returns Just the last element of the list if the
list contains at least one element; Nothing if the list is empty.

```javascript
> S.last([1, 2, 3])
Just(3)

> S.last([])
Nothing()
```

<h4 name="tail"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2379">tail :: [a] -> Maybe [a]</a></code></h4>

Takes a list and returns Just a list containing all but the first
of the list's elements if the list contains at least one element;
Nothing if the list is empty.

```javascript
> S.tail([1, 2, 3])
Just([2, 3])

> S.tail([])
Nothing()
```

<h4 name="init"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2398">init :: [a] -> Maybe [a]</a></code></h4>

Takes a list and returns Just a list containing all but the last
of the list's elements if the list contains at least one element;
Nothing if the list is empty.

```javascript
> S.init([1, 2, 3])
Just([1, 2])

> S.init([])
Nothing()
```

<h4 name="take"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2417">take :: Integer -> [a] -> Maybe [a]</a></code></h4>

Returns Just the first N elements of the given collection if N is
greater than or equal to zero and less than or equal to the length
of the collection; Nothing otherwise. Supports Array, String, and
any other collection type which provides a `slice` method.

```javascript
> S.take(2, ['a', 'b', 'c', 'd', 'e'])
Just(['a', 'b'])

> S.take(4, 'abcdefg')
Just('abcd')

> S.take(4, ['a', 'b', 'c'])
Nothing()
```

<h4 name="takeLast"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2442">takeLast :: Integer -> [a] -> Maybe [a]</a></code></h4>

Returns Just the last N elements of the given collection if N is
greater than or equal to zero and less than or equal to the length
of the collection; Nothing otherwise. Supports Array, String, and
any other collection type which provides a `slice` method.

```javascript
> S.takeLast(2, ['a', 'b', 'c', 'd', 'e'])
Just(['d', 'e'])

> S.takeLast(4, 'abcdefg')
Just('defg')

> S.takeLast(4, ['a', 'b', 'c'])
Nothing()
```

<h4 name="drop"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2467">drop :: Integer -> [a] -> Maybe [a]</a></code></h4>

Returns Just all but the first N elements of the given collection
if N is greater than or equal to zero and less than or equal to the
length of the collection; Nothing otherwise. Supports Array, String,
and any other collection type which provides a `slice` method.

```javascript
> S.drop(2, ['a', 'b', 'c', 'd', 'e'])
Just(['c', 'd', 'e'])

> S.drop(4, 'abcdefg')
Just('efg')

> S.drop(4, 'abc')
Nothing()
```

<h4 name="dropLast"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2492">dropLast :: Integer -> [a] -> Maybe [a]</a></code></h4>

Returns Just all but the last N elements of the given collection
if N is greater than or equal to zero and less than or equal to the
length of the collection; Nothing otherwise. Supports Array, String,
and any other collection type which provides a `slice` method.

```javascript
> S.dropLast(2, ['a', 'b', 'c', 'd', 'e'])
Just(['a', 'b', 'c'])

> S.dropLast(4, 'abcdefg')
Just('abc')

> S.dropLast(4, 'abc')
Nothing()
```

<h4 name="reverse"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2517">reverse :: [a] -> [a]</a></code></h4>

Returns the elements of the given list in reverse order.

```javascript
> S.reverse([1, 2, 3])
[3, 2, 1]

> S.reverse('abc')
'cba'
```

<h4 name="indexOf"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2557">indexOf :: a -> [a] -> Maybe Integer</a></code></h4>

Takes a value of any type and a list, and returns Just the index
of the first occurrence of the value in the list, if applicable;
Nothing otherwise.

Dispatches to its second argument's `indexOf` method if present.
As a result, `String -> String -> Maybe Integer` is an alternative
type signature.

```javascript
> S.indexOf('a', ['b', 'a', 'n', 'a', 'n', 'a'])
Just(1)

> S.indexOf('x', ['b', 'a', 'n', 'a', 'n', 'a'])
Nothing()

> S.indexOf('an', 'banana')
Just(1)

> S.indexOf('ax', 'banana')
Nothing()
```

<h4 name="lastIndexOf"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2582">lastIndexOf :: a -> [a] -> Maybe Integer</a></code></h4>

Takes a value of any type and a list, and returns Just the index
of the last occurrence of the value in the list, if applicable;
Nothing otherwise.

Dispatches to its second argument's `lastIndexOf` method if present.
As a result, `String -> String -> Maybe Integer` is an alternative
type signature.

```javascript
> S.lastIndexOf('a', ['b', 'a', 'n', 'a', 'n', 'a'])
Just(5)

> S.lastIndexOf('x', ['b', 'a', 'n', 'a', 'n', 'a'])
Nothing()

> S.lastIndexOf('an', 'banana')
Just(3)

> S.lastIndexOf('ax', 'banana')
Nothing()
```

### Array

<h4 name="append"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2609">append :: a -> Array a -> Array a</a></code></h4>

Takes a value of any type and an array of values of that type, and
returns the result of appending the value to the array.

See also [`prepend`](#prepend).

```javascript
> S.append(3, [1, 2])
[1, 2, 3]
```

<h4 name="prepend"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2626">prepend :: a -> Array a -> Array a</a></code></h4>

Takes a value of any type and an array of values of that type, and
returns the result of prepending the value to the array.

See also [`append`](#append).

```javascript
> S.prepend(1, [2, 3])
[1, 2, 3]
```

<h4 name="find"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2643">find :: (a -> Boolean) -> Array a -> Maybe a</a></code></h4>

Takes a predicate and an array and returns Just the leftmost element of
the array which satisfies the predicate; Nothing if none of the array's
elements satisfies the predicate.

```javascript
> S.find(n => n < 0, [1, -2, 3, -4, 5])
Just(-2)

> S.find(n => n < 0, [1, 2, 3, 4, 5])
Nothing()
```

<h4 name="pluck"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2669">pluck :: Accessible a => TypeRep b -> String -> Array a -> Array (Maybe b)</a></code></h4>

Takes a [type representative](#type-representatives), a property name,
and an array of objects and returns an array of equal length. Each
element of the output array is Just the value of the specified property
of the corresponding object if the value is of the specified type
(according to [`is`](#is)); Nothing otherwise.

See also [`get`](#get).

```javascript
> S.pluck(Number, 'x', [{x: 1}, {x: 2}, {x: '3'}, {x: null}, {}])
[Just(1), Just(2), Nothing(), Nothing(), Nothing()]
```

<h4 name="reduce"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2689">reduce :: Foldable f => (a -> b -> a) -> a -> f b -> a</a></code></h4>

Takes a curried binary function, an initial value, and a [Foldable][],
and applies the function to the initial value and the Foldable's first
value, then applies the function to the result of the previous
application and the Foldable's second value. Repeats this process
until each of the Foldable's values has been used. Returns the initial
value if the Foldable is empty; the result of the final application
otherwise.

See also [`reduce_`](#reduce_).

```javascript
> S.reduce(S.add, 0, [1, 2, 3, 4, 5])
15

> S.reduce(xs => x => [x].concat(xs), [], [1, 2, 3, 4, 5])
[5, 4, 3, 2, 1]
```

<h4 name="reduce_"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2719">reduce_ :: Foldable f => ((a, b) -> a) -> a -> f b -> a</a></code></h4>

Version of [`reduce`](#reduce) accepting uncurried functions.

<h4 name="unfoldr"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2738">unfoldr :: (b -> Maybe (Pair a b)) -> b -> Array a</a></code></h4>

Takes a function and a seed value, and returns an array generated by
applying the function repeatedly. The array is initially empty. The
function is initially applied to the seed value. Each application
of the function should result in either:

  - a Nothing, in which case the array is returned; or

  - Just a pair, in which case the first element is appended to
    the array and the function is applied to the second element.

```javascript
> S.unfoldr(n => n < 5 ? S.Just([n, n + 1]) : S.Nothing(), 1)
[1, 2, 3, 4]
```

<h4 name="range"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2768">range :: Integer -> Integer -> Array Integer</a></code></h4>

Returns an array of consecutive integers starting with the first argument
and ending with the second argument minus one. Returns `[]` if the second
argument is less than or equal to the first argument.

```javascript
> S.range(0, 10)
[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

> S.range(-5, 0)
[-5, -4, -3, -2, -1]

> S.range(0, -5)
[]
```

### Object

<h4 name="prop"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2796">prop :: Accessible a => String -> a -> b</a></code></h4>

Takes a property name and an object with known properties and returns
the value of the specified property. If for some reason the object
lacks the specified property, a type error is thrown.

For accessing properties of uncertain objects, use [`get`](#get) instead.

```javascript
> S.prop('a', {a: 1, b: 2})
1
```

<h4 name="get"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2810">get :: Accessible a => TypeRep b -> String -> a -> Maybe b</a></code></h4>

Takes a [type representative](#type-representatives), a property
name, and an object and returns Just the value of the specified object
property if it is of the specified type (according to [`is`](#is));
Nothing otherwise.

The `Object` type representative may be used as a catch-all since most
values have `Object.prototype` in their prototype chains.

See also [`gets`](#gets) and [`prop`](#prop).

```javascript
> S.get(Number, 'x', {x: 1, y: 2})
Just(1)

> S.get(Number, 'x', {x: '1', y: '2'})
Nothing()

> S.get(Number, 'x', {})
Nothing()
```

<h4 name="gets"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2838">gets :: Accessible a => TypeRep b -> Array String -> a -> Maybe b</a></code></h4>

Takes a [type representative](#type-representatives), an array of
property names, and an object and returns Just the value at the path
specified by the array of property names if such a path exists and
the value is of the specified type; Nothing otherwise.

See also [`get`](#get).

```javascript
> S.gets(Number, ['a', 'b', 'c'], {a: {b: {c: 42}}})
Just(42)

> S.gets(Number, ['a', 'b', 'c'], {a: {b: {c: '42'}}})
Nothing()

> S.gets(Number, ['a', 'b', 'c'], {})
Nothing()
```

<h4 name="keys"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2872">keys :: StrMap a -> Array String</a></code></h4>

Returns the keys of the given string map, in arbitrary order.

```javascript
> S.keys({b: 2, c: 3, a: 1}).sort()
['a', 'b', 'c']
```

<h4 name="values"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2886">values :: StrMap a -> Array a</a></code></h4>

Returns the values of the given string map, in arbitrary order.

```javascript
> S.values({a: 1, c: 3, b: 2}).sort()
[1, 2, 3]
```

<h4 name="pairs"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2902">pairs :: StrMap a -> Array (Pair String a)</a></code></h4>

Returns the key–value pairs of the given string map, in arbitrary order.

```javascript
> S.pairs({b: 2, a: 1, c: 3}).sort()
[['a', 1], ['b', 2], ['c', 3]]
```

### Number

<h4 name="negate"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2920">negate :: ValidNumber -> ValidNumber</a></code></h4>

Negates its argument.

```javascript
> S.negate(12.5)
-12.5

> S.negate(-42)
42
```

<h4 name="add"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2937">add :: FiniteNumber -> FiniteNumber -> FiniteNumber</a></code></h4>

Returns the sum of two (finite) numbers.

```javascript
> S.add(1, 1)
2
```

<h4 name="sum"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2951">sum :: Foldable f => f FiniteNumber -> FiniteNumber</a></code></h4>

Returns the sum of the given array of (finite) numbers.

```javascript
> S.sum([1, 2, 3, 4, 5])
15

> S.sum([])
0

> S.sum(S.Just(42))
42

> S.sum(S.Nothing())
0
```

<h4 name="sub"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2974">sub :: FiniteNumber -> FiniteNumber -> FiniteNumber</a></code></h4>

Returns the difference between two (finite) numbers.

```javascript
> S.sub(4, 2)
2
```

<h4 name="inc"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L2988">inc :: FiniteNumber -> FiniteNumber</a></code></h4>

Increments a (finite) number by one.

```javascript
> S.inc(1)
2
```

<h4 name="dec"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L3002">dec :: FiniteNumber -> FiniteNumber</a></code></h4>

Decrements a (finite) number by one.

```javascript
> S.dec(2)
1
```

<h4 name="mult"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L3016">mult :: FiniteNumber -> FiniteNumber -> FiniteNumber</a></code></h4>

Returns the product of two (finite) numbers.

```javascript
> S.mult(4, 2)
8
```

<h4 name="product"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L3030">product :: Foldable f => f FiniteNumber -> FiniteNumber</a></code></h4>

Returns the product of the given array of (finite) numbers.

```javascript
> S.product([1, 2, 3, 4, 5])
120

> S.product([])
1

> S.product(S.Just(42))
42

> S.product(S.Nothing())
1
```

<h4 name="div"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L3053">div :: FiniteNumber -> NonZeroFiniteNumber -> FiniteNumber</a></code></h4>

Returns the result of dividing its first argument (a finite number) by
its second argument (a non-zero finite number).

```javascript
> S.div(7, 2)
3.5
```

<h4 name="min"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L3068">min :: Ord a => a -> a -> a</a></code></h4>

Returns the smaller of its two arguments.

Strings are compared lexicographically. Specifically, the Unicode
code point value of each character in the first string is compared
to the value of the corresponding character in the second string.

See also [`max`](#max).

```javascript
> S.min(10, 2)
2

> S.min(new Date('1999-12-31'), new Date('2000-01-01'))
new Date('1999-12-31')

> S.min('10', '2')
'10'
```

<h4 name="max"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L3094">max :: Ord a => a -> a -> a</a></code></h4>

Returns the larger of its two arguments.

Strings are compared lexicographically. Specifically, the Unicode
code point value of each character in the first string is compared
to the value of the corresponding character in the second string.

See also [`min`](#min).

```javascript
> S.max(10, 2)
10

> S.max(new Date('1999-12-31'), new Date('2000-01-01'))
new Date('2000-01-01')

> S.max('10', '2')
'2'
```

### Integer

<h4 name="even"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L3122">even :: Integer -> Boolean</a></code></h4>

Returns `true` if the given integer is even; `false` if it is odd.

```javascript
> S.even(42)
true

> S.even(99)
false
```

<h4 name="odd"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L3139">odd :: Integer -> Boolean</a></code></h4>

Returns `true` if the given integer is odd; `false` if it is even.

```javascript
> S.odd(99)
true

> S.odd(42)
false
```

### Parse

<h4 name="parseDate"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L3158">parseDate :: String -> Maybe Date</a></code></h4>

Takes a string and returns Just the date represented by the string
if it does in fact represent a date; Nothing otherwise.

```javascript
> S.parseDate('2011-01-19T17:40:00Z')
Just(new Date('2011-01-19T17:40:00.000Z'))

> S.parseDate('today')
Nothing()
```

<h4 name="parseFloat"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L3213">parseFloat :: String -> Maybe Number</a></code></h4>

Takes a string and returns Just the number represented by the string
if it does in fact represent a number; Nothing otherwise.

```javascript
> S.parseFloat('-123.45')
Just(-123.45)

> S.parseFloat('foo.bar')
Nothing()
```

<h4 name="parseInt"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L3231">parseInt :: Integer -> String -> Maybe Integer</a></code></h4>

Takes a radix (an integer between 2 and 36 inclusive) and a string,
and returns Just the number represented by the string if it does in
fact represent a number in the base specified by the radix; Nothing
otherwise.

This function is stricter than [`parseInt`][parseInt]: a string
is considered to represent an integer only if all its non-prefix
characters are members of the character set specified by the radix.

```javascript
> S.parseInt(10, '-42')
Just(-42)

> S.parseInt(16, '0xFF')
Just(255)

> S.parseInt(16, '0xGG')
Nothing()
```

<h4 name="parseJson"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L3276">parseJson :: TypeRep a -> String -> Maybe a</a></code></h4>

Takes a [type representative](#type-representatives) and a string which
may or may not be valid JSON, and returns Just the result of applying
`JSON.parse` to the string *if* the result is of the specified type
(according to [`is`](#is)); Nothing otherwise.

```javascript
> S.parseJson(Array, '["foo","bar","baz"]')
Just(['foo', 'bar', 'baz'])

> S.parseJson(Array, '[')
Nothing()

> S.parseJson(Object, '["foo","bar","baz"]')
Nothing()
```

### RegExp

<h4 name="regex"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L3301">regex :: RegexFlags -> String -> RegExp</a></code></h4>

Takes a [RegexFlags][] and a pattern, and returns a RegExp.

```javascript
> S.regex('g', ':\\d+:')
/:\d+:/g
```

<h4 name="regexEscape"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L3315">regexEscape :: String -> String</a></code></h4>

Takes a string which may contain regular expression metacharacters,
and returns a string with those metacharacters escaped.

Properties:

  - `forall s :: String. S.test(S.regex('', S.regexEscape(s)), s) = true`

```javascript
> S.regexEscape('-=*{XYZ}*=-')
'\\-=\\*\\{XYZ\\}\\*=\\-'
```

<h4 name="test"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L3334">test :: RegExp -> String -> Boolean</a></code></h4>

Takes a pattern and a string, and returns `true` if the pattern
matches the string; `false` otherwise.

```javascript
> S.test(/^a/, 'abacus')
true

> S.test(/^a/, 'banana')
false
```

<h4 name="match"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L3357">match :: RegExp -> String -> Maybe (Array (Maybe String))</a></code></h4>

Takes a pattern and a string, and returns Just an array of matches
if the pattern matches the string; Nothing otherwise. Each match has
type `Maybe String`, where a Nothing represents an unmatched optional
capturing group.

```javascript
> S.match(/(good)?bye/, 'goodbye')
Just([Just('goodbye'), Just('good')])

> S.match(/(good)?bye/, 'bye')
Just([Just('bye'), Nothing()])
```

### String

<h4 name="toUpper"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L3382">toUpper :: String -> String</a></code></h4>

Returns the upper-case equivalent of its argument.

See also [`toLower`](#toLower).

```javascript
> S.toUpper('ABC def 123')
'ABC DEF 123'
```

<h4 name="toLower"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L3398">toLower :: String -> String</a></code></h4>

Returns the lower-case equivalent of its argument.

See also [`toUpper`](#toUpper).

```javascript
> S.toLower('ABC def 123')
'abc def 123'
```

<h4 name="trim"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L3414">trim :: String -> String</a></code></h4>

Strips leading and trailing whitespace characters.

```javascript
> S.trim('\t\t foo bar \n')
'foo bar'
```

<h4 name="words"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L3428">words :: String -> Array String</a></code></h4>

Takes a string and returns the array of words the string contains
(words are delimited by whitespace characters).

See also [`unwords`](#unwords).

```javascript
> S.words(' foo bar baz ')
['foo', 'bar', 'baz']
```

<h4 name="unwords"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L3445">unwords :: Array String -> String</a></code></h4>

Takes an array of words and returns the result of joining the words
with separating spaces.

See also [`words`](#words).

```javascript
> S.unwords(['foo', 'bar', 'baz'])
'foo bar baz'
```

<h4 name="lines"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L3462">lines :: String -> Array String</a></code></h4>

Takes a string and returns the array of lines the string contains
(lines are delimited by newlines: `'\n'` or `'\r\n'` or `'\r'`).
The resulting strings do not contain newlines.

See also [`unlines`](#unlines).

```javascript
> S.lines('foo\nbar\nbaz\n')
['foo', 'bar', 'baz']
```

<h4 name="unlines"><code><a href="https://github.com/sanctuary-js/sanctuary/blob/v0.11.1/index.js#L3480">unlines :: Array String -> String</a></code></h4>

Takes an array of lines and returns the result of joining the lines
after appending a terminating line feed (`'\n'`) to each.

See also [`lines`](#lines).

```javascript
> S.unlines(['foo', 'bar', 'baz'])
'foo\nbar\nbaz\n'
```

[Apply]:          https://github.com/fantasyland/fantasy-land#apply
[BinaryType]:     https://github.com/sanctuary-js/sanctuary-def#binarytype
[Extend]:         https://github.com/fantasyland/fantasy-land#extend
[Foldable]:       https://github.com/fantasyland/fantasy-land#foldable
[Functor]:        https://github.com/fantasyland/fantasy-land#functor
[Monad]:          https://github.com/fantasyland/fantasy-land#monad
[Monoid]:         https://github.com/fantasyland/fantasy-land#monoid
[Nullable]:       https://github.com/sanctuary-js/sanctuary-def#nullable
[R.equals]:       http://ramdajs.com/docs/#equals
[R.map]:          http://ramdajs.com/docs/#map
[R.type]:         http://ramdajs.com/docs/#type
[Ramda]:          http://ramdajs.com/
[RegExp]:         https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp
[RegexFlags]:     https://github.com/sanctuary-js/sanctuary-def#regexflags
[Semigroup]:      https://github.com/fantasyland/fantasy-land#semigroup
[Traversable]:    https://github.com/fantasyland/fantasy-land#traversable
[UnaryType]:      https://github.com/sanctuary-js/sanctuary-def#unarytype
[parseInt]:       https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt
[sanctuary-def]:  https://github.com/sanctuary-js/sanctuary-def
[thrush]:         https://github.com/raganwald-deprecated/homoiconic/blob/master/2008-10-30/thrush.markdown
