import {core, flags, SfdxCommand} from '@salesforce/command';
import chalk from 'chalk';
import fs = require('fs-extra');
import {QueryResult} from '../../models/queryResult';
import {SobjectResult} from '../../models/sObjectResult';
import {createDeployRequest} from '../../service/containerAsyncRequest';
import {createMetadataContainer} from '../../service/createMetadataContainer';
import {createMetadataMember} from '../../service/createMetadataMember';
import {getFileName} from '../../service/getFileName';
import {executeToolingQuery} from '../../service/toolingQuery';

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('mo-dx-plugin', 'org');

export default class ApexDeploy extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
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

    interface ApexClass {
      Body: string;
    }

    const filebody = await fs.readFile(this.flags.filepath, 'utf8');
    const conn = this.org.getConnection();
    this.ux.startSpinner(chalk.bold.yellow('Deploying....'));
     // get the apex class Id using the class Name
    const className = getFileName(this.flags.filepath, '.cls');
    let query = 'Select Id from Apexclass where Name=\'';
    query = query + className + '\'';
    const apexclass = await executeToolingQuery(query, conn) as QueryResult;
    // logic to update apex class
    if (apexclass.records.length > 0) {
      const classId = apexclass.records[0].Id ;
      // Create MetadataContainer request
      const metadataContainerResult = await createMetadataContainer('ApexContainer', conn) as SobjectResult;
      if (metadataContainerResult.success) {
        // Create ApexClassMember request
        const apexClassMemberResult = await createMetadataMember('ApexClassMember', metadataContainerResult.id, filebody, classId, conn) as SobjectResult;
        if (apexClassMemberResult.success) {
          // Create ContainerAsyncRequest request to deploy apex
          const containerAsyncResult = await createDeployRequest(metadataContainerResult.id, false, conn) as QueryResult;
          if ( containerAsyncResult.records[0].State === 'Completed' ) {
            this.ux.stopSpinner(chalk.bold.green('Apex Class Updated....'));
          } else {
            this.ux.stopSpinner(chalk.bold.red('Failed to save..'));
          }
        } else {
          console.table(apexClassMemberResult.errors);
          this.ux.stopSpinner(chalk.bold.red('Failed to save..'));
        }
      } else {
          console.table(metadataContainerResult.errors);
          this.ux.stopSpinner(chalk.bold.red('Failed to save..'));
        }
      return 'success';
    } else {
        // logic to create an apex class
          // Create Container AsyncRequest Object
        const apexClass = {
          Body: filebody
        } as ApexClass;

        const apexSaveResult = await conn.tooling.sobject('ApexClass').create(apexClass) as SobjectResult;
        if ( apexSaveResult.success) {
          this.ux.stopSpinner(chalk.bold.green('Apex Class Created....'));
        }
      }
    }
}
