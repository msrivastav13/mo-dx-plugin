import {Connection} from '@salesforce/core';

export async function executeToolingQuery(queryString: string, conn: Connection) {
  return await conn.tooling.query(queryString);
}
