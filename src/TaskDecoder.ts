/**
 * @since 2.2.7
 */
import { Alt1 } from 'fp-ts/lib/Alt'
import { Functor1 } from 'fp-ts/lib/Functor'
import { pipe } from 'fp-ts/lib/pipeable'
import * as T from 'fp-ts/lib/Task'
import * as TE from 'fp-ts/lib/TaskEither'
import * as FS from '../src/FreeSemigroup'
import * as DE from './DecodeError'
import * as D from './Decoder'
import * as G from './Guard'
import * as K2 from './Kleisli2'
import { Literal, Schemable1, WithRefine1, WithUnion1, WithUnknownContainers1 } from './Schemable'

// -------------------------------------------------------------------------------------
// Kleisli2 config
// -------------------------------------------------------------------------------------

const M =
  /*#__PURE__*/
  TE.getTaskValidation(DE.getSemigroup<string>())

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @category model
 * @since 2.2.7
 */
export interface TaskDecoder<A> {
  readonly decode: (u: unknown) => TE.TaskEither<DecodeError, A>
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
export const success: <A>(a: A) => TE.TaskEither<DecodeError, A> = TE.right

/**
 * @category DecodeError
 * @since 2.2.7
 */
export const failure = <A = never>(actual: unknown, message: string): TE.TaskEither<DecodeError, A> =>
  TE.left(error(actual, message))

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 2.2.7
 */
export const fromDecoder = <A>(decoder: D.Decoder<A>): TaskDecoder<A> => ({
  decode: TE.fromEitherK(decoder.decode)
})

/**
 * @category constructors
 * @since 2.2.7
 */
export const fromGuard = <A>(guard: G.Guard<A>, expected: string): TaskDecoder<A> =>
  K2.fromGuard(M)(guard, (u) => FS.of(DE.leaf(u, expected)))

/**
 * @category constructors
 * @since 2.2.7
 */
export const literal: <A extends readonly [Literal, ...Array<Literal>]>(...values: A) => TaskDecoder<A[number]> =
  /*#__PURE__*/
  K2.literal(M)((u, values) => FS.of(DE.leaf(u, values.map((value) => JSON.stringify(value)).join(' | '))))

// -------------------------------------------------------------------------------------
// primitives
// -------------------------------------------------------------------------------------

/**
 * @category primitives
 * @since 2.2.7
 */
export const string: TaskDecoder<string> =
  /*#__PURE__*/
  fromDecoder(D.string)

/**
 * @category primitives
 * @since 2.2.7
 */
export const number: TaskDecoder<number> =
  /*#__PURE__*/
  fromDecoder(D.number)

/**
 * @category primitives
 * @since 2.2.7
 */
export const boolean: TaskDecoder<boolean> =
  /*#__PURE__*/
  fromDecoder(D.boolean)

/**
 * @category primitives
 * @since 2.2.7
 */
export const UnknownArray: TaskDecoder<Array<unknown>> =
  /*#__PURE__*/
  fromDecoder(D.UnknownArray)

/**
 * @category primitives
 * @since 2.2.7
 */
export const UnknownRecord: TaskDecoder<Record<string, unknown>> =
  /*#__PURE__*/
  fromDecoder(D.UnknownRecord)

// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------

/**
 * @category combinators
 * @since 2.2.7
 */
export const mapLeftWithInput: <A>(
  f: (actual: unknown, e: DecodeError) => DecodeError
) => (decoder: TaskDecoder<A>) => TaskDecoder<A> =
  /*#__PURE__*/
  K2.mapLeftWithInput(M)

/**
 * @category combinators
 * @since 2.2.7
 */
export const refine = <A, B extends A>(
  refinement: (a: A) => a is B,
  id: string
): ((from: TaskDecoder<A>) => TaskDecoder<B>) => K2.refine(M)(refinement, (a) => FS.of(DE.leaf(a, id)))

/**
 * @category combinators
 * @since 2.2.7
 */
export const parse: <A, B>(
  parser: (a: A) => TE.TaskEither<DecodeError, B>
) => (from: TaskDecoder<A>) => TaskDecoder<B> =
  /*#__PURE__*/
  K2.parse(M)

/**
 * @category combinators
 * @since 2.2.7
 */
export const nullable: <A>(or: TaskDecoder<A>) => TaskDecoder<null | A> =
  /*#__PURE__*/
  K2.nullable(M)((u, e) => FS.concat(FS.of(DE.member(0, FS.of(DE.leaf(u, 'null')))), FS.of(DE.member(1, e))))

/**
 * @category combinators
 * @since 2.2.7
 */
export const type = <A>(properties: { [K in keyof A]: TaskDecoder<A[K]> }): TaskDecoder<{ [K in keyof A]: A[K] }> =>
  K2.pipe(M)(UnknownRecord, K2.type(M)((k, e) => FS.of(DE.key(k, DE.required, e)))(properties))

/**
 * @category combinators
 * @since 2.2.7
 */
export const partial = <A>(
  properties: { [K in keyof A]: TaskDecoder<A[K]> }
): TaskDecoder<Partial<{ [K in keyof A]: A[K] }>> =>
  K2.pipe(M)(UnknownRecord, K2.partial(M)((k, e) => FS.of(DE.key(k, DE.optional, e)))(properties))

/**
 * @category combinators
 * @since 2.2.7
 */
export const array = <A>(items: TaskDecoder<A>): TaskDecoder<Array<A>> =>
  K2.pipe(M)(UnknownArray, K2.array(M)((i, e) => FS.of(DE.index(i, DE.optional, e)))(items))

/**
 * @category combinators
 * @since 2.2.7
 */
export const record = <A>(codomain: TaskDecoder<A>): TaskDecoder<Record<string, A>> =>
  K2.pipe(M)(UnknownRecord, K2.record(M)((k, e) => FS.of(DE.key(k, DE.optional, e)))(codomain))

/**
 * @category combinators
 * @since 2.2.7
 */
export const tuple = <A extends ReadonlyArray<unknown>>(
  ...components: { [K in keyof A]: TaskDecoder<A[K]> }
): TaskDecoder<A> =>
  K2.pipe(M)(UnknownArray, K2.tuple(M)((i, e) => FS.of(DE.index(i, DE.required, e)))(...(components as any)))

/**
 * @category combinators
 * @since 2.2.7
 */
export const union: <A extends readonly [unknown, ...Array<unknown>]>(
  ...members: { [K in keyof A]: TaskDecoder<A[K]> }
) => TaskDecoder<A[number]> =
  /*#__PURE__*/
  K2.union(M)((i, e) => FS.of(DE.member(i, e))) as any

/**
 * @category combinators
 * @since 2.2.7
 */
export const intersect: <B>(right: TaskDecoder<B>) => <A>(left: TaskDecoder<A>) => TaskDecoder<A & B> =
  /*#__PURE__*/
  K2.intersect(M)

/**
 * @category combinators
 * @since 2.2.7
 */
export const sum = <T extends string>(tag: T) => <A>(
  members: { [K in keyof A]: TaskDecoder<A[K]> }
): TaskDecoder<A[keyof A]> =>
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
export const lazy: <A>(id: string, f: () => TaskDecoder<A>) => TaskDecoder<A> =
  /*#__PURE__*/
  K2.lazy(M)((id, e) => FS.of(DE.lazy(id, e)))

// -------------------------------------------------------------------------------------
// non-pipeables
// -------------------------------------------------------------------------------------

const map_: <A, B>(fa: TaskDecoder<A>, f: (a: A) => B) => TaskDecoder<B> = (fa, f) => pipe(fa, map(f))

const alt_: <A>(me: TaskDecoder<A>, that: () => TaskDecoder<A>) => TaskDecoder<A> = (me, that) => pipe(me, alt(that))

// -------------------------------------------------------------------------------------
// pipeables
// -------------------------------------------------------------------------------------

/**
 * @category Functor
 * @since 2.2.7
 */
export const map: <A, B>(f: (a: A) => B) => (fa: TaskDecoder<A>) => TaskDecoder<B> =
  /*#__PURE__*/
  K2.map(M)

/**
 * @category Alt
 * @since 2.2.7
 */
export const alt: <A>(that: () => TaskDecoder<A>) => (me: TaskDecoder<A>) => TaskDecoder<A> =
  /*#__PURE__*/
  K2.alt(M)

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

/**
 * @category instances
 * @since 2.2.7
 */
export const URI = 'io-ts/TaskDecoder'

/**
 * @category instances
 * @since 2.2.7
 */
export type URI = typeof URI

declare module 'fp-ts/lib/HKT' {
  interface URItoKind<A> {
    readonly [URI]: TaskDecoder<A>
  }
}

/**
 * @category instances
 * @since 2.2.7
 */
export const functorTaskDecoder: Functor1<URI> = {
  URI,
  map: map_
}

/**
 * @category instances
 * @since 2.2.7
 */
export const altTaskDecoder: Alt1<URI> = {
  URI,
  map: map_,
  alt: alt_
}

/**
 * @category instances
 * @since 2.2.7
 */
export const schemableTaskDecoder: Schemable1<URI> &
  WithUnknownContainers1<URI> &
  WithUnion1<URI> &
  WithRefine1<URI> = {
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

/**
 * @since 2.2.7
 */
export const draw: (e: DecodeError) => string = D.draw

/**
 * @internal
 */
export const stringify: <A>(e: TE.TaskEither<DecodeError, A>) => T.Task<string> = TE.fold(
  (e) => T.of(draw(e)),
  (a) => T.of(JSON.stringify(a, null, 2))
)
