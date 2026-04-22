import {Connection} from '@salesforce/core';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const DOMParser = require('xmldom-sfdx-encoding').DOMParser;

export async function createMetadataMember(name: string, containerId: string, body: string, xmlMetadata: string, entityId: string, className: string, conn: Connection): Promise<object> {

  interface MetadataMember {
    MetadataContainerId: string;
    ContentEntityId: string;
    Body: string;
    FullName: string;
    Metadata: Metadata;
  }

  interface Metadata {
    label?: string;
    packageVersions?: string;
    status?: string;
    apiVersion: string;
  }

  const classMember = {
      MetadataContainerId : containerId,
      Body : body,
      FullName : className,
      Metadata : createMetadataField(xmlMetadata) as Metadata,
      ...(entityId ? { ContentEntityId: entityId } : {})
  } as MetadataMember;

  return await conn.tooling.sobject(name).create(classMember);
}

function createMetadataField(xmlMetadata: string) {
  try {
    const parser = new DOMParser();
    const document = parser.parseFromString(xmlMetadata, 'text/xml');
    const apiVersion = document.getElementsByTagName('apiVersion')[0]
      .textContent;
    const statusNode = document.getElementsByTagName('status')[0];
    // const packageNode = document.getElementsByTagName('packageVersions')[0];
    const descriptionNode = document.getElementsByTagName('description')[0];
    const labelNode = document.getElementsByTagName('label')[0];

    const metadataField = {
      apiVersion,
      ...(statusNode ? { status: statusNode.textContent } : {}),
      // ...(packageNode ? { packageVersions: packageNode.textContent } : {}),
      ...(descriptionNode
        ? { description: descriptionNode.textContent }
        : {}),
      ...(labelNode ? { label: labelNode.textContent } : {})
    };
    return metadataField;
  } catch (e) {
    throw new Error('Error parsing Metadata xml');
  }
}
