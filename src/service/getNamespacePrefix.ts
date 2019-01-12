import {Connection} from '@salesforce/core';
import {QueryResult} from '../models/queryResult';

export async function getNameSpacePrefix(conn: Connection) {
  const query = 'Select NamespacePrefix from Organization';
  const organization = await conn.query(query) as QueryResult;
  if (organization.totalSize > 0) {
    return organization.records[0].NamespacePrefix;
  } else {
    return '';
  }
}
