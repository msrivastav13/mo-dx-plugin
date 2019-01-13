import {Connection} from '@salesforce/core';
import {QueryResult} from '../models/queryResult';
import {SobjectResult} from '../models/sObjectResult';
import {createDeployRequest} from '../service/containerasyncRequest';
import {createMetadataContainer} from '../service/createmetadataContainer';
import {createMetadataMember} from '../service/createmetadataMember';

export interface DeployResult {
  success: boolean;
  queryResult: QueryResult;
  error: string;
}

export class Deploy {

  public containerType: string;
  public classMember: string;
  public componentId: string;
  public conn: Connection;
  public componentBody: string;

  constructor(containerType: string, classMember: string, componentId: string, componentBody: string, conn: Connection) {
    this.containerType = containerType;
    this.classMember = classMember;
    this.componentId = componentId;
    this.componentBody = componentBody;
    this.conn = conn;
  }

  public async deployMetadata() {

    const deployMsg = {} as DeployResult;

    // Create MetadataContainer request
    const metadataContainerResult = await createMetadataContainer(this.containerType, this.conn) as SobjectResult;
    // console.log('Metadata Container' + JSON.stringify(metadataContainerResult.id));
    if (metadataContainerResult.success) {
      // Create ApexClassMember request
      const apexClassMemberResult = await createMetadataMember(this.classMember, metadataContainerResult.id, this.componentBody, this.componentId, this.conn) as SobjectResult;
      // console.log('Metadata Member' + JSON.stringify(apexClassMemberResult));
      if (apexClassMemberResult.success) {
        // Create ContainerAsyncRequest request to deploy apex
        const containerAsyncResult = await createDeployRequest(metadataContainerResult.id, false, this.conn) as QueryResult;
        if ( containerAsyncResult.records[0].State === 'Completed' ) {
          deployMsg.success = true;
          deployMsg.queryResult = containerAsyncResult;
        } else {
          deployMsg.success = false;
        }
      } else {
        deployMsg.success = false;
        deployMsg.error = JSON.stringify(apexClassMemberResult.errors);
      }
    } else {
      deployMsg.success = false;
      deployMsg.error = 'Metadata Container Creation Failed';
    }

    return deployMsg;

  }

}
