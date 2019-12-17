import {core} from '@salesforce/command';

export async function executeToolingQuery(queryString: string, conn: core.Connection): Promise<object> {
  return await conn.tooling.query(queryString);
}
