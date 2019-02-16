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

export default class VfDeploy extends SfdxCommand {

  public static description = messages.getMessage('vfDeploy');

  public static examples = [
  '$ sfdx deploy:vf -p filepath'
  ];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    filepath: flags.directory({char: 'p', description: 'file path' , required: true})
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<AnyJson> {

    this.ux.startSpinner(chalk.bold.yellowBright('Saving ....'));

    interface ApexPage {
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
    const pageName = getFileName(this.flags.filepath, '.page');
    const apexpages = await conn.tooling.sobject('ApexPage').find({
      Name: pageName,
      NameSpacePrefix : namespacePrefix
    }) as ApexPage [];

    // logic to update visualforce page
    if (apexpages.length > 0) {
      const pageId = apexpages[0].Id ;
      const deployAction = new Deploy('VfContainer', 'ApexPageMember' , pageId , filebody, conn);
      const deployResult = await deployAction.deployMetadata() as DeployResult;
      if (deployResult.success) {
        this.ux.stopSpinner(chalk.bold.greenBright('Visualforce Page Successfully Updated'));
        return '';
      } else {
        display(deployResult, this.ux);
        this.ux.stopSpinner(chalk.bold.redBright('Visualforce Page Update Failed'));
        if ( typeof deployResult.error !== 'undefined' ) {
          displaylog(chalk.bold.redBright(deployResult.error), this.ux);
        }
      }
    } else {
        // logic to create an VF page
          // Create Container AsyncRequest Object
        const vfPage = {
          Name: pageName,
          Markup: filebody,
          Masterlabel: pageName + 'Label'
        } as ApexPage;

        try {
          const vfSaveResult = await conn.tooling.sobject('ApexPage').create(vfPage) as SobjectResult;
          if ( vfSaveResult.success) {
            this.ux.stopSpinner(chalk.bold.green('Visualforce Page Successfully Created'));
            return '';
          } else {
            for (const error of vfSaveResult.errors) {
              displaylog(chalk.redBright(error), this.ux);
            }
            this.ux.stopSpinner(chalk.bold.red('Visualforce Page Creation Failed'));
          }
        } catch (ex) {
          displaylog(chalk.redBright(ex), this.ux);
          this.ux.stopSpinner(chalk.bold.red('Visualforce Page Creation Failed'));
        }
      }
    }
}
