import {Connection} from '@salesforce/core';
import {QueryResult} from '../models/queryResult';
import {SobjectResult} from '../models/sObjectResult';
import {delay} from '../service/delay';
import {executeToolingQuery} from '../service/toolingQuery';

export async function createDeployRequest(containerId: string, ischeck: boolean, conn: Connection) {

  interface ContainerAsyncRequest {
    IsCheckOnly: boolean;
    MetadataContainerId: string;
  }

  // Create Container AsyncRequest Object
  const containerasynRequestReq = {
    IsCheckOnly : ischeck,
    MetadataContainerId : containerId
  } as ContainerAsyncRequest;

  const containerAsyncResult = await conn.tooling.sobject('ContainerAsyncRequest').create(containerasynRequestReq) as SobjectResult;

  if (containerAsyncResult.success) {
    const asyncResultId = containerAsyncResult.id;
    let containerRequestQuery = 'Select Id, State, ErrorMsg, DeployDetails FROM ContainerAsyncRequest where Id =\'';
    containerRequestQuery = containerRequestQuery + asyncResultId + '\'';
    let containerRequestResponse = await executeToolingQuery(containerRequestQuery, conn) as QueryResult;
    if (containerRequestResponse.records.length > 0) {
      let containerAsyncRequestRes = containerRequestResponse.records[0];
      while (containerAsyncRequestRes.State.toLocaleLowerCase() === 'queued') {
        await delay(1000);
        containerRequestResponse = await executeToolingQuery(containerRequestQuery, conn) as QueryResult;
        containerAsyncRequestRes = containerRequestResponse.records[0];
      }
      switch (containerAsyncRequestRes.State) {
        case 'Invalidated':
        console.log(containerAsyncRequestRes.DeployDetails.componentFailures);
        break;
        case 'Completed':
        console.log('Deployed..');
        break;
        case 'Failed':
        console.log('Failed..' + JSON.stringify(containerAsyncRequestRes.DeployDetails.componentFailures));
        break;
        case 'Error':
        console.log('Error..' + JSON.stringify(containerAsyncRequestRes.DeployDetails.componentFailures));
        break;
        case 'Aborted':
        console.log('Aborted..');
        break;
      }
    }
  }

  return containerAsyncResult;
}
