import { OperationNodeSource } from '../operation-node/operation-node-source.js'
import { CompiledQuery } from '../query-compiler/compiled-query.js'
import {
  JoinCallbackExpression,
  JoinReferenceExpression,
  parseJoin,
} from '../parser/join-parser.js'
import { TableExpression } from '../parser/table-parser.js'
import {
  parseSelectExpressionOrList,
  parseSelectAll,
  SelectExpression,
  SelectExpressionOrList,
} from '../parser/select-parser.js'
import {
  ExistsExpression,
  parseExistFilter,
  FilterOperator,
  parseReferenceFilter,
  parseWhereFilter,
  parseNotExistFilter,
  FilterValueExpressionOrList,
  WhereGrouper,
} from '../parser/filter-parser.js'
import { ReturningRow } from '../parser/returning-parser.js'
import { ReferenceExpression } from '../parser/reference-parser.js'
import { QueryNode } from '../operation-node/query-node.js'
import {
  AnyRawBuilder,
  MergePartial,
  Nullable,
  NullableValues,
  SingleResultType,
} from '../util/type-utils.js'
import { preventAwait } from '../util/prevent-await.js'
import { Compilable } from '../util/compilable.js'
import { QueryExecutor } from '../query-executor/query-executor.js'
import { QueryId } from '../util/query-id.js'
import { freeze } from '../util/object-utils.js'
import { KyselyPlugin } from '../plugin/kysely-plugin.js'
import { WhereInterface } from './where-interface.js'
import { JoinInterface } from './join-interface.js'
import { ReturningInterface } from './returning-interface.js'
import { NoResultError, NoResultErrorConstructor } from './no-result-error.js'
import { DeleteResult } from './delete-result.js'
import { DeleteQueryNode } from '../operation-node/delete-query-node.js'
import { Selectable } from '../util/column-type.js'
import { LimitNode } from '../operation-node/limit-node.js'
import {
  OrderByDirectionExpression,
  OrderByExpression,
  parseOrderBy,
} from '../parser/order-by-parser.js'
import { AliasedQueryBuilder } from './select-query-builder.js'
import { AliasedRawBuilder } from '../raw-builder/raw-builder.js'

export class DeleteQueryBuilder<DB, TB extends keyof DB, O>
  implements
    WhereInterface<DB, TB>,
    JoinInterface<DB, TB>,
    ReturningInterface<DB, TB, O>,
    OperationNodeSource,
    Compilable
{
  readonly #props: DeleteQueryBuilderProps

  constructor(props: DeleteQueryBuilderProps) {
    this.#props = freeze(props)
  }

  where<RE extends ReferenceExpression<DB, TB>>(
    lhs: RE,
    op: FilterOperator,
    rhs: FilterValueExpressionOrList<DB, TB, RE>
  ): DeleteQueryBuilder<DB, TB, O>

  where(grouper: WhereGrouper<DB, TB>): DeleteQueryBuilder<DB, TB, O>
  where(raw: AnyRawBuilder): DeleteQueryBuilder<DB, TB, O>

  where(...args: any[]): any {
    return new DeleteQueryBuilder({
      ...this.#props,
      queryNode: QueryNode.cloneWithWhere(
        this.#props.queryNode,
        parseWhereFilter(args)
      ),
    })
  }

  whereRef(
    lhs: ReferenceExpression<DB, TB>,
    op: FilterOperator,
    rhs: ReferenceExpression<DB, TB>
  ): DeleteQueryBuilder<DB, TB, O> {
    return new DeleteQueryBuilder({
      ...this.#props,
      queryNode: QueryNode.cloneWithWhere(
        this.#props.queryNode,
        parseReferenceFilter(lhs, op, rhs)
      ),
    })
  }

  orWhere<RE extends ReferenceExpression<DB, TB>>(
    lhs: RE,
    op: FilterOperator,
    rhs: FilterValueExpressionOrList<DB, TB, RE>
  ): DeleteQueryBuilder<DB, TB, O>

  orWhere(grouper: WhereGrouper<DB, TB>): DeleteQueryBuilder<DB, TB, O>
  orWhere(raw: AnyRawBuilder): DeleteQueryBuilder<DB, TB, O>

  orWhere(...args: any[]): any {
    return new DeleteQueryBuilder({
      ...this.#props,
      queryNode: QueryNode.cloneWithOrWhere(
        this.#props.queryNode,
        parseWhereFilter(args)
      ),
    })
  }

  orWhereRef(
    lhs: ReferenceExpression<DB, TB>,
    op: FilterOperator,
    rhs: ReferenceExpression<DB, TB>
  ): DeleteQueryBuilder<DB, TB, O> {
    return new DeleteQueryBuilder({
      ...this.#props,
      queryNode: QueryNode.cloneWithOrWhere(
        this.#props.queryNode,
        parseReferenceFilter(lhs, op, rhs)
      ),
    })
  }

  whereExists(arg: ExistsExpression<DB, TB>): DeleteQueryBuilder<DB, TB, O> {
    return new DeleteQueryBuilder({
      ...this.#props,
      queryNode: QueryNode.cloneWithWhere(
        this.#props.queryNode,
        parseExistFilter(arg)
      ),
    })
  }

  whereNotExists(arg: ExistsExpression<DB, TB>): DeleteQueryBuilder<DB, TB, O> {
    return new DeleteQueryBuilder({
      ...this.#props,
      queryNode: QueryNode.cloneWithWhere(
        this.#props.queryNode,
        parseNotExistFilter(arg)
      ),
    })
  }

  orWhereExists(arg: ExistsExpression<DB, TB>): DeleteQueryBuilder<DB, TB, O> {
    return new DeleteQueryBuilder({
      ...this.#props,
      queryNode: QueryNode.cloneWithOrWhere(
        this.#props.queryNode,
        parseExistFilter(arg)
      ),
    })
  }

  orWhereNotExists(
    arg: ExistsExpression<DB, TB>
  ): DeleteQueryBuilder<DB, TB, O> {
    return new DeleteQueryBuilder({
      ...this.#props,
      queryNode: QueryNode.cloneWithOrWhere(
        this.#props.queryNode,
        parseNotExistFilter(arg)
      ),
    })
  }

  innerJoin<
    TE extends TableExpression<DB, TB>,
    K1 extends JoinReferenceExpression<DB, TB, TE>,
    K2 extends JoinReferenceExpression<DB, TB, TE>
  >(table: TE, k1: K1, k2: K2): DeleteQueryBuilderWithInnerJoin<DB, TB, O, TE>

  innerJoin<
    TE extends TableExpression<DB, TB>,
    FN extends JoinCallbackExpression<DB, TB, TE>
  >(table: TE, callback: FN): DeleteQueryBuilderWithInnerJoin<DB, TB, O, TE>

  innerJoin(...args: any): any {
    return new DeleteQueryBuilder({
      ...this.#props,
      queryNode: QueryNode.cloneWithJoin(
        this.#props.queryNode,
        parseJoin('InnerJoin', args)
      ),
    })
  }

  leftJoin<
    TE extends TableExpression<DB, TB>,
    K1 extends JoinReferenceExpression<DB, TB, TE>,
    K2 extends JoinReferenceExpression<DB, TB, TE>
  >(table: TE, k1: K1, k2: K2): DeleteQueryBuilderWithLeftJoin<DB, TB, O, TE>

  leftJoin<
    TE extends TableExpression<DB, TB>,
    FN extends JoinCallbackExpression<DB, TB, TE>
  >(table: TE, callback: FN): DeleteQueryBuilderWithLeftJoin<DB, TB, O, TE>

  leftJoin(...args: any): any {
    return new DeleteQueryBuilder({
      ...this.#props,
      queryNode: QueryNode.cloneWithJoin(
        this.#props.queryNode,
        parseJoin('LeftJoin', args)
      ),
    })
  }

  rightJoin<
    TE extends TableExpression<DB, TB>,
    K1 extends JoinReferenceExpression<DB, TB, TE>,
    K2 extends JoinReferenceExpression<DB, TB, TE>
  >(table: TE, k1: K1, k2: K2): DeleteQueryBuilderWithRightJoin<DB, TB, O, TE>

  rightJoin<
    TE extends TableExpression<DB, TB>,
    FN extends JoinCallbackExpression<DB, TB, TE>
  >(table: TE, callback: FN): DeleteQueryBuilderWithRightJoin<DB, TB, O, TE>

  rightJoin(...args: any): any {
    return new DeleteQueryBuilder({
      ...this.#props,
      queryNode: QueryNode.cloneWithJoin(
        this.#props.queryNode,
        parseJoin('RightJoin', args)
      ),
    })
  }

  fullJoin<
    TE extends TableExpression<DB, TB>,
    K1 extends JoinReferenceExpression<DB, TB, TE>,
    K2 extends JoinReferenceExpression<DB, TB, TE>
  >(table: TE, k1: K1, k2: K2): DeleteQueryBuilderWithFullJoin<DB, TB, O, TE>

  fullJoin<
    TE extends TableExpression<DB, TB>,
    FN extends JoinCallbackExpression<DB, TB, TE>
  >(table: TE, callback: FN): DeleteQueryBuilderWithFullJoin<DB, TB, O, TE>

  fullJoin(...args: any): any {
    return new DeleteQueryBuilder({
      ...this.#props,
      queryNode: QueryNode.cloneWithJoin(
        this.#props.queryNode,
        parseJoin('FullJoin', args)
      ),
    })
  }

  returning<SE extends SelectExpression<DB, TB>>(
    selections: ReadonlyArray<SE>
  ): DeleteQueryBuilder<DB, TB, ReturningRow<DB, TB, O, SE>>

  returning<SE extends SelectExpression<DB, TB>>(
    selection: SE
  ): DeleteQueryBuilder<DB, TB, ReturningRow<DB, TB, O, SE>>

  returning(selection: SelectExpressionOrList<DB, TB>): any {
    return new DeleteQueryBuilder({
      ...this.#props,
      queryNode: QueryNode.cloneWithReturning(
        this.#props.queryNode,
        parseSelectExpressionOrList(selection)
      ),
    })
  }

  returningAll(): DeleteQueryBuilder<DB, TB, Selectable<DB[TB]>> {
    return new DeleteQueryBuilder({
      ...this.#props,
      queryNode: QueryNode.cloneWithReturning(
        this.#props.queryNode,
        parseSelectAll()
      ),
    })
  }

  /**
   * Adds an `order by` clause to the query.
   *
   * `orderBy` calls are additive. To order by multiple columns, call `orderBy`
   * multiple times.
   *
   * The first argument is the expression to order by and the second is the
   * order (`asc` or `desc`).
   *
   * An `order by` clause in a delete query is only supported by some dialects
   * like MySQL.
   *
   * See {@link SelectQueryBuilder.orderBy} for more examples.
   *
   * ### Examples
   *
   * Delete 5 oldest items in a table:
   *
   * ```ts
   * await db
   *   .deleteFrom('pet')
   *   .orderBy('created_at')
   *   .limit(5)
   *   .execute()
   * ```
   *
   * The generated SQL (MySQL):
   *
   * ```sql
   * delete from `pet`
   * order by `created_at`
   * limit ?
   * ```
   */
  orderBy(
    orderBy: OrderByExpression<DB, TB, O>,
    direction?: OrderByDirectionExpression
  ): DeleteQueryBuilder<DB, TB, O> {
    return new DeleteQueryBuilder({
      ...this.#props,
      queryNode: DeleteQueryNode.cloneWithOrderByItem(
        this.#props.queryNode,
        parseOrderBy(orderBy, direction)
      ),
    })
  }

  /**
   * Adds a limit clause to the query.
   *
   * A limit clause in a delete query is only supported by some dialects
   * like MySQL.
   *
   * ### Examples
   *
   * Delete 5 oldest items in a table:
   *
   * ```ts
   * await db
   *   .deleteFrom('pet')
   *   .orderBy('created_at')
   *   .limit(5)
   *   .execute()
   * ```
   */
  limit(limit: number): DeleteQueryBuilder<DB, TB, O> {
    return new DeleteQueryBuilder({
      ...this.#props,
      queryNode: DeleteQueryNode.cloneWithLimit(
        this.#props.queryNode,
        LimitNode.create(limit)
      ),
    })
  }

  /**
   * Simply calls the given function passing `this` as the only argument.
   *
   * If you want to conditionally call a method on `this`, see
   * the {@link if} method.
   *
   * ### Examples
   *
   * The next example uses a helper funtion `log` to log a query:
   *
   * ```ts
   * function log<T extends Compilable>(qb: T): T {
   *   console.log(qb.compile())
   *   return qb
   * }
   *
   * db.deleteFrom('person')
   *   .call(log)
   *   .execute()
   * ```
   */
  call<T>(func: (qb: this) => T): T {
    return func(this)
  }

  /**
   * Call `func(this)` if `condition` is true.
   *
   * This method is especially handy with optional selects. Any `returning` or `returningAll`
   * method calls add columns as optional fields to the output type when called inside
   * the `func` callback. This is because we can't know if those selections were actually
   * made before running the code.
   *
   * You can also call any other methods inside the callback.
   *
   * ### Examples
   *
   * ```ts
   * async function deletePerson(id: number, returnLastName: boolean) {
   *   return await db
   *     .deleteFrom('person')
   *     .where('id', '=', id)
   *     .returning(['id', 'first_name'])
   *     .if(returnLastName, (qb) => qb.returning('last_name'))
   *     .executeTakeFirstOrThrow()
   * }
   * ```
   *
   * Any selections added inside the `if` callback will be added as optional fields to the
   * output type since we can't know if the selections were actually made before running
   * the code. In the example above the return type of the `deletePerson` function is:
   *
   * ```ts
   * {
   *   id: number
   *   first_name: string
   *   last_name?: string
   * }
   * ```
   */
  if<O2>(
    condition: boolean,
    func: (qb: this) => DeleteQueryBuilder<DB, TB, O2>
  ): DeleteQueryBuilder<
    DB,
    TB,
    O2 extends DeleteResult
      ? DeleteResult
      : O extends DeleteResult
      ? Partial<O2>
      : MergePartial<O, O2>
  > {
    if (condition) {
      return func(this) as any
    }

    return new DeleteQueryBuilder({
      ...this.#props,
    })
  }

  /**
   * Change the output type of the query.
   *
   * You should only use this method as the last resort if the types
   * don't support your use case.
   */
  castTo<T>(): DeleteQueryBuilder<DB, TB, T> {
    return new DeleteQueryBuilder(this.#props)
  }

  /**
   * Returns a copy of this DeleteQueryBuilder instance with the given plugin installed.
   */
  withPlugin(plugin: KyselyPlugin): DeleteQueryBuilder<DB, TB, O> {
    return new DeleteQueryBuilder({
      ...this.#props,
      executor: this.#props.executor.withPlugin(plugin),
    })
  }

  toOperationNode(): DeleteQueryNode {
    return this.#props.executor.transformQuery(
      this.#props.queryNode,
      this.#props.queryId
    )
  }

  compile(): CompiledQuery {
    return this.#props.executor.compileQuery(
      this.toOperationNode(),
      this.#props.queryId
    )
  }

  /**
   * Executes the query and returns an array of rows.
   *
   * Also see the {@link executeTakeFirst} and {@link executeTakeFirstOrThrow} methods.
   */
  async execute(): Promise<O[]> {
    const compildQuery = this.compile()
    const query = compildQuery.query as DeleteQueryNode

    const result = await this.#props.executor.executeQuery<O>(
      compildQuery,
      this.#props.queryId
    )

    if (this.#props.executor.adapter.supportsReturning && query.returning) {
      return result.rows
    } else {
      return [new DeleteResult(result.numUpdatedOrDeletedRows!) as unknown as O]
    }
  }

  /**
   * Executes the query and returns the first result or undefined if
   * the query returned no result.
   */
  async executeTakeFirst(): Promise<SingleResultType<O>> {
    const [result] = await this.execute()
    return result as SingleResultType<O>
  }

  /**
   * Executes the query and returns the first result or throws if
   * the query returned no result.
   *
   * By default an instance of {@link NoResultError} is thrown, but you can
   * provide a custom error class as the only argument to throw a different
   * error.
   */
  async executeTakeFirstOrThrow(
    errorConstructor: NoResultErrorConstructor = NoResultError
  ): Promise<O> {
    const result = await this.executeTakeFirst()

    if (result === undefined) {
      throw new errorConstructor(this.toOperationNode())
    }

    return result as O
  }
}

preventAwait(
  DeleteQueryBuilder,
  "don't await DeleteQueryBuilder instances directly. To execute the query you need to call `execute` or `executeTakeFirst`."
)

export interface DeleteQueryBuilderProps {
  readonly queryId: QueryId
  readonly queryNode: DeleteQueryNode
  readonly executor: QueryExecutor
}

type DeleteQueryBuilderWithInnerJoin<
  DB,
  TB extends keyof DB,
  O,
  TE extends TableExpression<DB, TB>
> = TE extends `${infer T} as ${infer A}`
  ? T extends keyof DB
    ? DeleteQueryBuilder<Omit<DB, A> & Record<A, DB[T]>, Exclude<TB, A> | A, O>
    : never
  : TE extends keyof DB
  ? DeleteQueryBuilder<DB, TB | TE, O>
  : TE extends AliasedQueryBuilder<any, any, infer QO, infer QA>
  ? DeleteQueryBuilder<Omit<DB, QA> & Record<QA, QO>, Exclude<TB, QA> | QA, O>
  : TE extends (qb: any) => AliasedQueryBuilder<any, any, infer QO, infer QA>
  ? DeleteQueryBuilder<Omit<DB, QA> & Record<QA, QO>, Exclude<TB, QA> | QA, O>
  : TE extends AliasedRawBuilder<infer RO, infer RA>
  ? DeleteQueryBuilder<Omit<DB, RA> & Record<RA, RO>, Exclude<TB, RA> | RA, O>
  : TE extends (qb: any) => AliasedRawBuilder<infer RO, infer RA>
  ? DeleteQueryBuilder<Omit<DB, RA> & Record<RA, RO>, Exclude<TB, RA> | RA, O>
  : never

export type DeleteQueryBuilderWithLeftJoin<
  DB,
  TB extends keyof DB,
  O,
  TE extends TableExpression<DB, TB>
> = TE extends `${infer T} as ${infer A}`
  ? T extends keyof DB
    ? DeleteQueryBuilder<
        Omit<DB, A> & Record<A, Nullable<DB[T]>>,
        Exclude<TB, A> | A,
        O
      >
    : never
  : TE extends keyof DB
  ? DeleteQueryBuilder<
      Omit<DB, TE> & Record<TE, Nullable<DB[TE]>>,
      Exclude<TB, TE> | TE,
      O
    >
  : TE extends AliasedQueryBuilder<any, any, infer QO, infer QA>
  ? DeleteQueryBuilder<
      Omit<DB, QA> & Record<QA, Nullable<QO>>,
      Exclude<TB, QA> | QA,
      O
    >
  : TE extends (qb: any) => AliasedQueryBuilder<any, any, infer QO, infer QA>
  ? DeleteQueryBuilder<
      Omit<DB, QA> & Record<QA, Nullable<QO>>,
      Exclude<TB, QA> | QA,
      O
    >
  : TE extends AliasedRawBuilder<infer RO, infer RA>
  ? DeleteQueryBuilder<
      Omit<DB, RA> & Record<RA, Nullable<RO>>,
      Exclude<TB, RA> | RA,
      O
    >
  : TE extends (qb: any) => AliasedRawBuilder<infer RO, infer RA>
  ? DeleteQueryBuilder<
      Omit<DB, RA> & Record<RA, Nullable<RO>>,
      Exclude<TB, RA> | RA,
      O
    >
  : never

export type DeleteQueryBuilderWithRightJoin<
  DB,
  TB extends keyof DB,
  O,
  TE extends TableExpression<DB, TB>
> = TE extends `${infer T} as ${infer A}`
  ? T extends keyof DB
    ? DeleteQueryBuilder<
        Omit<DB, TB | A> & NullableValues<Pick<DB, TB>> & Record<A, DB[T]>,
        TB | A,
        O
      >
    : never
  : TE extends keyof DB
  ? DeleteQueryBuilder<
      Omit<DB, TB | TE> & NullableValues<Pick<DB, TB>> & Pick<DB, TE>,
      TB | TE,
      O
    >
  : TE extends AliasedQueryBuilder<any, any, infer QO, infer QA>
  ? DeleteQueryBuilder<
      Omit<DB, TB | QA> & NullableValues<Pick<DB, TB>> & Record<QA, QO>,
      TB | QA,
      O
    >
  : TE extends (qb: any) => AliasedQueryBuilder<any, any, infer QO, infer QA>
  ? DeleteQueryBuilder<
      Omit<DB, TB | QA> & NullableValues<Pick<DB, TB>> & Record<QA, QO>,
      TB | QA,
      O
    >
  : TE extends AliasedRawBuilder<infer RO, infer RA>
  ? DeleteQueryBuilder<
      Omit<DB, TB | RA> & NullableValues<Pick<DB, TB>> & Record<RA, RO>,
      TB | RA,
      O
    >
  : TE extends (qb: any) => AliasedRawBuilder<infer RO, infer RA>
  ? DeleteQueryBuilder<
      Omit<DB, TB | RA> & NullableValues<Pick<DB, TB>> & Record<RA, RO>,
      TB | RA,
      O
    >
  : never

export type DeleteQueryBuilderWithFullJoin<
  DB,
  TB extends keyof DB,
  O,
  TE extends TableExpression<DB, TB>
> = TE extends `${infer T} as ${infer A}`
  ? T extends keyof DB
    ? DeleteQueryBuilder<
        Omit<DB, TB | A> &
          NullableValues<Pick<DB, TB>> &
          Record<A, Nullable<DB[T]>>,
        TB | A,
        O
      >
    : never
  : TE extends keyof DB
  ? DeleteQueryBuilder<
      Omit<DB, TB | TE> &
        NullableValues<Pick<DB, TB>> &
        NullableValues<Pick<DB, TE>>,
      TB | TE,
      O
    >
  : TE extends AliasedQueryBuilder<any, any, infer QO, infer QA>
  ? DeleteQueryBuilder<
      Omit<DB, TB | QA> &
        NullableValues<Pick<DB, TB>> &
        Record<QA, Nullable<QO>>,
      TB | QA,
      O
    >
  : TE extends (qb: any) => AliasedQueryBuilder<any, any, infer QO, infer QA>
  ? DeleteQueryBuilder<
      Omit<DB, TB | QA> &
        NullableValues<Pick<DB, TB>> &
        Record<QA, Nullable<QO>>,
      TB | QA,
      O
    >
  : TE extends AliasedRawBuilder<infer RO, infer RA>
  ? DeleteQueryBuilder<
      Omit<DB, TB | RA> &
        NullableValues<Pick<DB, TB>> &
        Record<RA, Nullable<RO>>,
      TB | RA,
      O
    >
  : TE extends (qb: any) => AliasedRawBuilder<infer RO, infer RA>
  ? DeleteQueryBuilder<
      Omit<DB, TB | RA> &
        NullableValues<Pick<DB, TB>> &
        Record<RA, Nullable<RO>>,
      TB | RA,
      O
    >
  : never
