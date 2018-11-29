import {core, flags, SfdxCommand} from '@salesforce/command';
import fs = require('fs-extra');

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('mo-dx-plugin', 'org');

export default class ApexDeploy extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
  '$ sfdx deploy:apex -n className',
  '$ $ sfdx deploy:apex -p filepath'
  ];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    classname: {type: 'string', required: false, char: 'n', description: 'name of the apex class' },
    filepath: {type: 'string', char: 'p', description: 'file path' }
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<core.AnyJson> {

    interface MetadataContainer {
       Name: string;
    }

    interface SobjectResult {
        id: string;
        success: boolean;
        errors: string[];
        name: string;
        message: string;
    }

    interface ApexClassMember {
      MetadataContainerId: string;
      ContentEntityId: string;
      Body: string;
    }

    interface Record {
      attributes: object;
      Id: string;
      State: string;
      ErrorMsg: string;
      DeployDetails: DeployDetails;
    }

    interface QueryResult {
      totalSize: number;
      done: boolean;
      records: Record[];
    }

    interface ContainerAsyncRequest {
      IsCheckOnly: boolean;
      MetadataContainerId: string;
    }

    interface DeployDetails {
      componentFailures: string;
    }

    const filebody = await fs.readFile(this.flags.filepath, 'utf8');
    const conn = this.org.getConnection();
    this.ux.startSpinner('Deploying....');
    // Create MetadataContainer request
    const containerReq = {
      Name: 'ApexContainer' + new Date().getTime()
    } as MetadataContainer;
    const metadataContainerResult = await conn.tooling.sobject('MetadataContainer').create(containerReq) as SobjectResult;
    // console.log(metadataContainerResult);

    if (metadataContainerResult.success) {
      // get the apex class Id using the class Name
      const className = this.flags.filepath.substring(this.flags.filepath.lastIndexOf('/') + 1, this.flags.filepath.lastIndexOf('.cls'));
      let query = 'Select Id from Apexclass where Name=\'';
      query = query + className + '\'';
      const apexclass = await conn.tooling.query(query) as QueryResult;
      if (apexclass.records.length > 0) {
        const classId = apexclass.records[0].Id ;
        // console.log(classId);
        const classMember = {
          MetadataContainerId : metadataContainerResult.id,
          ContentEntityId : classId,
          Body : filebody
        } as ApexClassMember;
        const apexClassMemberResult = await conn.tooling.sobject('ApexClassMember').create(classMember) as SobjectResult;
        if (apexClassMemberResult.success) {
          // Create Container AsyncRequest Object
          const containerasynRequestReq = {
            IsCheckOnly : false,
            MetadataContainerId : metadataContainerResult.id
          } as ContainerAsyncRequest;
          const containerAsyncResult = await conn.tooling.sobject('ContainerAsyncRequest').create(containerasynRequestReq) as SobjectResult;
          // console.log(containerAsyncResult);
          if (containerAsyncResult.success) {
            const asyncResultId = containerAsyncResult.id;
            let containerRequestQuery = 'Select Id, State, ErrorMsg, DeployDetails FROM ContainerAsyncRequest where Id =\'';
            containerRequestQuery = containerRequestQuery + asyncResultId + '\'';
            let containerRequestResponse = await conn.tooling.query(containerRequestQuery) as QueryResult;
            if (containerRequestResponse.records.length > 0) {
              let containerAsyncRequestRes = containerRequestResponse.records[0];
              while (containerAsyncRequestRes.State.toLocaleLowerCase() === 'queued') {
                await delay(1000);
                containerRequestResponse = await conn.tooling.query(containerRequestQuery) as QueryResult;
                containerAsyncRequestRes = containerRequestResponse.records[0];
              }
              switch (containerAsyncRequestRes.State) {
                case 'Invalidated':
                this.ux.stopSpinner('Invalidated..' + JSON.stringify(containerAsyncRequestRes.DeployDetails.componentFailures));
                break;
                case 'Completed':
                this.ux.stopSpinner('Deployed..');
                case 'Failed':
                this.ux.stopSpinner('Failed..' + JSON.stringify(containerAsyncRequestRes.DeployDetails.componentFailures));
                break;
                case 'Error':
                this.ux.stopSpinner('Error..' + JSON.stringify(containerAsyncRequestRes.DeployDetails.componentFailures));
                break;
                case 'Aborted':
                this.ux.stopSpinner('Aborted..');
                break;
            }
            }
          }
          return containerAsyncResult.id;
        }
      }
    }

    async function delay(ms: number) {
      return new Promise( resolve => setTimeout(resolve, ms) );
    }
  }
}
