/**
 * @since 2.2.7
 */
import { Alt1 } from 'fp-ts/lib/Alt'
import * as E from 'fp-ts/lib/Either'
import { Functor1 } from 'fp-ts/lib/Functor'
import * as NEA from 'fp-ts/lib/NonEmptyArray'
import { pipe } from 'fp-ts/lib/pipeable'
import * as T from 'fp-ts/lib/Tree'
import * as DE from './DecodeError'
import * as FS from './FreeSemigroup'
import * as G from './Guard'
import * as K2 from './Kleisli2'
import { Literal, Schemable1, WithRefine1, WithUnion1, WithUnknownContainers1 } from './Schemable'

// -------------------------------------------------------------------------------------
// Kleisli2 config
// -------------------------------------------------------------------------------------

const M =
  /*#__PURE__*/
  E.getValidation(DE.getSemigroup<string>())

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @category model
 * @since 2.2.7
 */
export interface Decoder<A> {
  readonly decode: (u: unknown) => E.Either<DecodeError, A>
}

// -------------------------------------------------------------------------------------
// DecodeError
// -------------------------------------------------------------------------------------

/**
 * @category DecodeError
 * @since 2.2.7
 */
export type DecodeError = FS.FreeSemigroup<DE.DecodeError<string>>

/**
 * @category DecodeError
 * @since 2.2.7
 */
export const error = (actual: unknown, message: string): DecodeError => FS.of(DE.leaf(actual, message))

/**
 * @category DecodeError
 * @since 2.2.7
 */
export const success: <A>(a: A) => E.Either<DecodeError, A> = E.right

/**
 * @category DecodeError
 * @since 2.2.7
 */
export const failure = <A = never>(actual: unknown, message: string): E.Either<DecodeError, A> =>
  E.left(error(actual, message))

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 2.2.7
 */
export const fromGuard = <A>(guard: G.Guard<A>, expected: string): Decoder<A> =>
  K2.fromGuard(M)(guard, (u) => FS.of(DE.leaf(u, expected)))

/**
 * @category constructors
 * @since 2.2.7
 */
export const literal: <A extends readonly [Literal, ...Array<Literal>]>(...values: A) => Decoder<A[number]> =
  /*#__PURE__*/
  K2.literal(M)((u, values) => FS.of(DE.leaf(u, values.map((value) => JSON.stringify(value)).join(' | '))))

// -------------------------------------------------------------------------------------
// primitives
// -------------------------------------------------------------------------------------

/**
 * @category primitives
 * @since 2.2.7
 */
export const string: Decoder<string> =
  /*#__PURE__*/
  fromGuard(G.string, 'string')

/**
 * @category primitives
 * @since 2.2.7
 */
export const number: Decoder<number> =
  /*#__PURE__*/
  fromGuard(G.number, 'number')

/**
 * @category primitives
 * @since 2.2.7
 */
export const boolean: Decoder<boolean> =
  /*#__PURE__*/
  fromGuard(G.boolean, 'boolean')

/**
 * @category primitives
 * @since 2.2.7
 */
export const UnknownArray: Decoder<Array<unknown>> =
  /*#__PURE__*/
  fromGuard(G.UnknownArray, 'Array<unknown>')

/**
 * @category primitives
 * @since 2.2.7
 */
export const UnknownRecord: Decoder<Record<string, unknown>> =
  /*#__PURE__*/
  fromGuard(G.UnknownRecord, 'Record<string, unknown>')

// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------

/**
 * @category combinators
 * @since 2.2.7
 */
export const mapLeftWithInput: <A>(
  f: (actual: unknown, e: DecodeError) => DecodeError
) => (decoder: Decoder<A>) => Decoder<A> =
  /*#__PURE__*/
  K2.mapLeftWithInput(M)

/**
 * @category combinators
 * @since 2.2.7
 */
export const refine = <A, B extends A>(refinement: (a: A) => a is B, id: string): ((from: Decoder<A>) => Decoder<B>) =>
  K2.refine(M)(refinement, (a) => FS.of(DE.leaf(a, id)))

/**
 * @category combinators
 * @since 2.2.7
 */
export const parse: <A, B>(parser: (a: A) => E.Either<DecodeError, B>) => (from: Decoder<A>) => Decoder<B> =
  /*#__PURE__*/
  K2.parse(M)

/**
 * @category combinators
 * @since 2.2.7
 */
export const nullable: <A>(or: Decoder<A>) => Decoder<null | A> =
  /*#__PURE__*/
  K2.nullable(M)((u, e) => FS.concat(FS.of(DE.member(0, FS.of(DE.leaf(u, 'null')))), FS.of(DE.member(1, e))))

/**
 * @category combinators
 * @since 2.2.7
 */
export const type = <A>(properties: { [K in keyof A]: Decoder<A[K]> }): Decoder<{ [K in keyof A]: A[K] }> =>
  K2.pipe(M)(UnknownRecord, K2.type(M)((k, e) => FS.of(DE.key(k, DE.required, e)))(properties))

/**
 * @category combinators
 * @since 2.2.7
 */
export const partial = <A>(properties: { [K in keyof A]: Decoder<A[K]> }): Decoder<Partial<{ [K in keyof A]: A[K] }>> =>
  K2.pipe(M)(UnknownRecord, K2.partial(M)((k, e) => FS.of(DE.key(k, DE.optional, e)))(properties))

/**
 * @category combinators
 * @since 2.2.7
 */
export const array = <A>(items: Decoder<A>): Decoder<Array<A>> =>
  K2.pipe(M)(UnknownArray, K2.array(M)((i, e) => FS.of(DE.index(i, DE.optional, e)))(items))

/**
 * @category combinators
 * @since 2.2.7
 */
export const record = <A>(codomain: Decoder<A>): Decoder<Record<string, A>> =>
  K2.pipe(M)(UnknownRecord, K2.record(M)((k, e) => FS.of(DE.key(k, DE.optional, e)))(codomain))

/**
 * @category combinators
 * @since 2.2.7
 */
export const tuple = <A extends ReadonlyArray<unknown>>(...components: { [K in keyof A]: Decoder<A[K]> }): Decoder<A> =>
  K2.pipe(M)(UnknownArray, K2.tuple(M)((i, e) => FS.of(DE.index(i, DE.required, e)))(...(components as any)))

/**
 * @category combinators
 * @since 2.2.7
 */
export const union: <A extends readonly [unknown, ...Array<unknown>]>(
  ...members: { [K in keyof A]: Decoder<A[K]> }
) => Decoder<A[number]> =
  /*#__PURE__*/
  K2.union(M)((i, e) => FS.of(DE.member(i, e))) as any

/**
 * @category combinators
 * @since 2.2.7
 */
export const intersect: <B>(right: Decoder<B>) => <A>(left: Decoder<A>) => Decoder<A & B> =
  /*#__PURE__*/
  K2.intersect(M)

/**
 * @category combinators
 * @since 2.2.7
 */
export const sum = <T extends string>(tag: T) => <A>(members: { [K in keyof A]: Decoder<A[K]> }): Decoder<A[keyof A]> =>
  K2.pipe(M)(
    UnknownRecord,
    K2.sum(M)((tag, value, keys) =>
      FS.of(
        DE.key(
          tag,
          DE.required,
          FS.of(DE.leaf(value, keys.length === 0 ? 'never' : keys.map((k) => JSON.stringify(k)).join(' | ')))
        )
      )
    )(tag)(members)
  )

/**
 * @category combinators
 * @since 2.2.7
 */
export const lazy: <A>(id: string, f: () => Decoder<A>) => Decoder<A> =
  /*#__PURE__*/
  K2.lazy(M)((id, e) => FS.of(DE.lazy(id, e)))

// -------------------------------------------------------------------------------------
// non-pipeables
// -------------------------------------------------------------------------------------

const map_: <A, B>(fa: Decoder<A>, f: (a: A) => B) => Decoder<B> = (fa, f) => ({
  decode: (u) => pipe(fa.decode(u), E.map(f))
})

const alt_: <A>(me: Decoder<A>, that: () => Decoder<A>) => Decoder<A> = (me, that) => ({
  decode: (u) =>
    pipe(
      me.decode(u),
      E.alt(() => that().decode(u))
    )
})

// -------------------------------------------------------------------------------------
// pipeables
// -------------------------------------------------------------------------------------

/**
 * @category Functor
 * @since 2.2.7
 */
export const map: <A, B>(f: (a: A) => B) => (fa: Decoder<A>) => Decoder<B> = (f) => (fa) => map_(fa, f)

/**
 * @category Alt
 * @since 2.2.7
 */
export const alt: <A>(that: () => Decoder<A>) => (me: Decoder<A>) => Decoder<A> = (that) => (fa) => alt_(fa, that)

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

/**
 * @category instances
 * @since 2.2.7
 */
export const URI = 'io-ts/Decoder2'

/**
 * @category instances
 * @since 2.2.7
 */
export type URI = typeof URI

declare module 'fp-ts/lib/HKT' {
  interface URItoKind<A> {
    readonly [URI]: Decoder<A>
  }
}

/**
 * @category instances
 * @since 2.2.7
 */
export const functorDecoder: Functor1<URI> = {
  URI,
  map: map_
}

/**
 * @category instances
 * @since 2.2.7
 */
export const altDecoder: Alt1<URI> = {
  URI,
  map: map_,
  alt: alt_
}

/**
 * @category instances
 * @since 2.2.7
 */
export const schemableDecoder: Schemable1<URI> & WithUnknownContainers1<URI> & WithUnion1<URI> & WithRefine1<URI> = {
  URI,
  literal,
  string,
  number,
  boolean,
  nullable,
  type,
  partial,
  record,
  array,
  tuple: tuple as Schemable1<URI>['tuple'],
  intersect,
  sum,
  lazy,
  UnknownArray,
  UnknownRecord,
  union: union as WithUnion1<URI>['union'],
  refine: refine as WithRefine1<URI>['refine']
}

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

const toForest = (e: DecodeError): NEA.NonEmptyArray<T.Tree<string>> => {
  const toTree: (e: DE.DecodeError<string>) => T.Tree<string> = DE.fold({
    Leaf: (input, error) => T.make(`cannot decode ${JSON.stringify(input)}, should be ${error}`),
    Key: (key, kind, errors) => T.make(`${kind} property ${JSON.stringify(key)}`, toForest(errors)),
    Index: (index, kind, errors) => T.make(`${kind} index ${index}`, toForest(errors)),
    Member: (index, errors) => T.make(`member ${index}`, toForest(errors)),
    Lazy: (id, errors) => T.make(`lazy type ${id}`, toForest(errors))
  })
  const toForest: (f: DecodeError) => NEA.NonEmptyArray<T.Tree<string>> = FS.fold(
    (value) => [toTree(value)],
    (left, right) => NEA.concat(toForest(left), toForest(right))
  )
  return toForest(e)
}

/**
 * @since 2.2.7
 */
export const draw = (e: DecodeError): string => toForest(e).map(T.drawTree).join('\n')

/**
 * @internal
 */
export const stringify: <A>(e: E.Either<DecodeError, A>) => string = E.fold(
  (e) => draw(e),
  (a) => JSON.stringify(a, null, 2)
)
