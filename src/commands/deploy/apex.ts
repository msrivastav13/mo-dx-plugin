import {core, flags, SfdxCommand} from '@salesforce/command';
import chalk from 'chalk';
import fs = require('fs-extra');
import {SobjectResult} from '../../models/sObjectResult';
import {Deploy, DeployResult} from '../../service/deploy';
import {getFileName} from '../../service/getFileName';
import {getNameSpacePrefix} from '../../service/getNameSpacePrefix';

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('mo-dx-plugin', 'org');

export default class ApexDeploy extends SfdxCommand {

  public static description = messages.getMessage('apexDeploy');

  public static examples = [
  '$ sfdx deploy:apex -p filepath'
  ];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    filepath: {type: 'string', char: 'p', description: 'file path' }
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<core.AnyJson> {

    this.ux.startSpinner(chalk.bold.yellowBright('Saving ....'));

    interface ApexClass {
      Body: string;
      NamespacePrefix: string;
      Id: string;
    }

    const conn = this.org.getConnection();

    const namespacePrefix = await getNameSpacePrefix(conn);

    const filebody = await fs.readFile(this.flags.filepath, 'utf8');

     // get the apex class Id using the class Name
    const className = getFileName(this.flags.filepath, '.cls');
    const apexclass = await conn.tooling.sobject('Apexclass').find({
      Name: className,
      NameSpacePrefix : namespacePrefix
    }) as ApexClass [];

    // logic to update apex class
    if (apexclass.length > 0) {
      const classId = apexclass[0].Id ;
      const deployAction = new Deploy('ApexContainer', 'ApexClassMember' , classId , filebody, conn);
      const deployResult = await deployAction.deployMetadata() as DeployResult;
      if (deployResult.success) {
        this.ux.stopSpinner(chalk.bold.greenBright('Apex Class Successfully Updated'));
        return '';
      } else {
        this.ux.stopSpinner(chalk.bold.redBright('Apex Class Update Failed'));
        if ( typeof deployResult.error !== 'undefined' ) {
          console.log(chalk.bold.redBright(deployResult.error));
        }
      }
    } else {
        // logic to create an apex class
          // Create Container AsyncRequest Object
        const apexClass = {
          Body: filebody,
          NamespacePrefix: namespacePrefix
        } as ApexClass;

        try {
          const apexSaveResult = await conn.tooling.sobject('ApexClass').create(apexClass) as SobjectResult;
          if ( apexSaveResult.success) {
            this.ux.stopSpinner(chalk.bold.green('Apex Class Successfully Created'));
            return '';
          } else {
            for (const error of apexSaveResult.errors) {
              console.log(chalk.redBright(error));
            }
            this.ux.stopSpinner(chalk.bold.red('Apex Class Creation Failed'));
          }
        } catch (ex) {
          this.ux.stopSpinner(chalk.bold.red(ex));
        }
      }
    }
}
