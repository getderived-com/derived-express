import { PgTransaction } from "drizzle-orm/pg-core";
import { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import { ExtractTablesWithRelations } from "drizzle-orm";

/**
 * Type of the drizzle/postgre-js transaction.
 *
 * Type of context provided to the repository operation when the operation needs to be performed as a transaction.
 */
export type DrizzleTransactionScope = PgTransaction<
  PostgresJsQueryResultHKT,
  Record<string, any>,
  ExtractTablesWithRelations<any>
>;
