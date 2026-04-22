import {Connection} from '@salesforce/core';

export async function executeToolingQuery(queryString: string, conn: Connection): Promise<object> {
  return await conn.tooling.query(queryString);
}
