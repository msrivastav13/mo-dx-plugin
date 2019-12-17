import {core} from '@salesforce/command';

export async function createMetadataMember(name: string, containerId: string, body: string, entityId: string, conn: core.Connection): Promise<object> {

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
