import {Connection} from '@salesforce/core';

export async function createMetadataMember(name: string, containerId: string, body: string, entityId: string, conn: Connection) {

  interface MetadataMember {
    MetadataContainerId: string;
    ContentEntityId: string;
    Body: string;
  }

  const classMember = {
      MetadataContainerId : containerId,
      ContentEntityId : entityId,
      Body : body
  } as MetadataMember;

  return await conn.tooling.sobject(name).create(classMember);
}
