import {core} from '@salesforce/command';

export async function createMetadataContainer(name: string, conn: core.Connection): Promise<object> {

  interface MetadataContainer {
    Name: string;
  }

  const containerReq = { Name: name + new Date().getTime()}  as MetadataContainer;

  return await conn.tooling.sobject('MetadataContainer').create(containerReq);
}
