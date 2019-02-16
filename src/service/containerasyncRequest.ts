import {Connection} from '@salesforce/core';
import chalk from 'chalk';
import {QueryResult} from '../models/queryResult';
import {SobjectResult} from '../models/sObjectResult';
import {delay} from './delay';
import {executeToolingQuery} from './toolingQuery';

export async function createDeployRequest(containerId: string, ischeck: boolean, conn: Connection) {

  interface ContainerAsyncRequest {
    IsCheckOnly: boolean;
    MetadataContainerId: string;
  }

  interface CompileErrors {
    lineNumber: string;
    columnNumber: string;
    problem: string;
  }

  // Create Container AsyncRequest Object
  const containerasynRequestReq = {
    IsCheckOnly : ischeck,
    MetadataContainerId : containerId
  } as ContainerAsyncRequest;

  const containerAsyncResult = await conn.tooling.sobject('ContainerAsyncRequest').create(containerasynRequestReq) as SobjectResult;
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
        console.log(chalk.redBright(JSON.stringify(containerAsyncRequestRes.DeployDetails.componentFailures)));
        break;
        case 'Completed':
        break;
        case 'Failed':
        // this.ux.table(containerAsyncRequestRes.DeployDetails.componentFailures);
        console.table(containerAsyncRequestRes.DeployDetails.componentFailures);
        const errors = [] as CompileErrors[];
        const tableColumnData = {
          columns: [
              { key: 'lineNumber', label: 'Line' },
              { key: 'columnNumber', label: 'Column' },
              { key: 'problem', label: 'Error Description' }
          ]
        };
        for (const error of containerAsyncRequestRes.DeployDetails.componentFailures) {
          const errorLog = {} as CompileErrors;
          error.columnNumber = error.columnNumber;
          error.lineNumber = error.lineNumber ;
          error.problem = error.problem;
          errors.push(errorLog);
          // console.table(chalk.redBright('Line:' + error.lineNumber + ' Column:' + error.columnNumber + ' Error Description:' + error.problem + '\r\n'));
        }
        this.ux.table(errors, tableColumnData);
        break;
        case 'Error':
        console.log(chalk.redBright(JSON.stringify(containerAsyncRequestRes.DeployDetails.componentFailures)));
        break;
        case 'Aborted':
        console.log('Aborted..');
        break;
      }
    }
  }

  return containerRequestResponse;
}
