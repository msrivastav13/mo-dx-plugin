import {core, flags, SfdxCommand} from '@salesforce/command';
import {AnyJson} from '@salesforce/ts-types';
import chalk from 'chalk';
import fs = require('fs-extra');
import {SobjectResult} from '../../models/sObjectResult';
import {Deploy, DeployResult} from '../../service/deploy';
import {display, displaylog} from '../../service/displayError';
import {getFileName} from '../../service/getFileName';
import {getNameSpacePrefix} from '../../service/getNamespacePrefix';

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('mo-dx-plugin', 'org');

export default class ApexComponentDeploy extends SfdxCommand {

  public static description = messages.getMessage('vfComponentDeploy');

  public static examples = [
  '$ sfdx deploy:vfcomponent -p filepath'
  ];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    filepath: flags.string({ char: 'p', description: 'file path', required: true })
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<AnyJson> {

    this.ux.startSpinner(chalk.bold.yellowBright('Saving'));

    interface ApexComponent {
      Name: string;
      Markup: string;
      NamespacePrefix: string;
      Id: string;
      Masterlabel: string;
    }

    const conn = this.org.getConnection();

    const namespacePrefix = await getNameSpacePrefix(conn);

    const filebody = await fs.readFile(this.flags.filepath, 'utf8');

     // get the apex class Id using the class Name
    const vfComponentName = getFileName(this.flags.filepath, '.component');
    const apexVFComponents = await conn.tooling.sobject('ApexComponent').find({
      Name: vfComponentName,
      NameSpacePrefix : namespacePrefix
    }) as ApexComponent [];

    // logic to update visualforce page
    if (apexVFComponents.length > 0) {
      const apexPageComponentId = apexVFComponents[0].Id ;
      const deployAction = new Deploy('VfComponent', 'ApexComponentMember' , apexPageComponentId , filebody, conn);
      const deployResult = await deployAction.deployMetadata() as DeployResult;
      if (deployResult.success) {
        this.ux.stopSpinner(chalk.bold.greenBright('Visualforce Component Successfully Updated ✔'));
        return '';
      } else {
        display(deployResult, this.ux);
        this.ux.stopSpinner(chalk.bold.redBright('Visualforce Component Update Failed ✖'));
        if ( typeof deployResult.error !== 'undefined' ) {
          displaylog(chalk.bold.redBright(deployResult.error), this.ux);
        }
      }
    } else {
        // logic to create an VF page
          // Create Container AsyncRequest Object
        const vfComponent = {
          Name: vfComponentName,
          Markup: filebody,
          Masterlabel: vfComponentName + 'Label'
        } as ApexComponent;

        try {
          const vfComponentSaveResult = await conn.tooling.sobject('ApexComponent').create(vfComponent) as SobjectResult;
          if ( vfComponentSaveResult.success) {
            this.ux.stopSpinner(chalk.bold.green('Visualforce Component Successfully Created ✔'));
            return '';
          } else {
            for (const error of vfComponentSaveResult.errors) {
              displaylog(chalk.redBright(error), this.ux);
            }
            this.ux.stopSpinner(chalk.bold.red('Visualforce Component Creation Failed ✖'));
          }
        } catch (ex) {
          displaylog(ex, this.ux);
          this.ux.stopSpinner(chalk.bold.red('Vf Component Save Failed ✖'));
        }
      }
    }
}
