import {Connection} from '@salesforce/core';

export async function createMetadataContainer(name: string, conn: Connection) {

  interface MetadataContainer {
    Name: string;
  }

  const containerReq = { Name: name + new Date().getTime()}  as MetadataContainer;

  return await conn.tooling.sobject('MetadataContainer').create(containerReq);
}
