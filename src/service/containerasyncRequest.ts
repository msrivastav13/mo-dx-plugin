import {Connection} from '@salesforce/core';
import {QueryResult} from '../models/queryResult.js';
import {SobjectResult} from '../models/sObjectResult.js';
import {delay} from './delay.js';
import {executeToolingQuery} from './toolingQuery.js';

export async function createDeployRequest(containerId: string, ischeck: boolean, conn: Connection): Promise<QueryResult> {

  interface ContainerAsyncRequest {
    IsCheckOnly: boolean;
    MetadataContainerId: string;
  }

  // Create Container AsyncRequest Object
  const containerasynRequestReq = {
    IsCheckOnly : ischeck,
    MetadataContainerId : containerId
  } as ContainerAsyncRequest;

  const containerAsyncResult = await conn.tooling.sobject('ContainerAsyncRequest').create(containerasynRequestReq) as unknown as SobjectResult;
  let containerRequestResponse = {} as QueryResult;

  if (containerAsyncResult.success) {
    const asyncResultId = containerAsyncResult.id;
    let containerRequestQuery = 'Select Id, State, ErrorMsg, DeployDetails FROM ContainerAsyncRequest where Id =\'';
    containerRequestQuery = containerRequestQuery + asyncResultId + '\'';
    containerRequestResponse = await executeToolingQuery(containerRequestQuery, conn) as QueryResult;
    if (containerRequestResponse.records.length > 0) {
      let containerAsyncRequestRes = containerRequestResponse.records[0];
      while (containerAsyncRequestRes.State.toLocaleLowerCase() === 'queued') {
        await delay(1000);
        containerRequestResponse = await executeToolingQuery(containerRequestQuery, conn) as QueryResult;
        containerAsyncRequestRes = containerRequestResponse.records[0];
      }
      switch (containerAsyncRequestRes.State) {
        case 'Invalidated':
        break;
        case 'Completed':
        break;
        case 'Failed':
        break;
        case 'Error':
        break;
        case 'Aborted':
        console.log('Request Aborted!!! Retry Saving..');
        break;
      }
    }
  }

  return containerRequestResponse;
}
