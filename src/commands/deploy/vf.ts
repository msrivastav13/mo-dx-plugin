import {core, flags, SfdxCommand} from '@salesforce/command';
import {AnyJson} from '@salesforce/ts-types';
import * as chalk from 'chalk';
import fs = require('fs-extra');
import {Deploy, DeployResult} from '../../service/deploy';
import {display, displaylog} from '../../service/displayError';
import {getFileName} from '../../service/getFileName';
import {getNameSpacePrefix} from '../../service/getNamespacePrefix';

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('mo-dx-plugin', 'org');

interface ApexPage {
  Name: string;
  Markup: string;
  NamespacePrefix: string;
  Id: string;
  Masterlabel: string;
}

export default class VfDeploy extends SfdxCommand {

  public static description = messages.getMessage('vfDeploy');

  public static examples = [
  '$ sfdx deploy:vf -p filepath'
  ];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    filepath: flags.string({char: 'p', description: 'file path' , required: true})
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<AnyJson> {

    this.ux.startSpinner(chalk.bold.yellowBright('Saving'));

    const conn = this.org.getConnection();

    const namespacePrefix = await getNameSpacePrefix(conn);

    const filebody = await fs.readFile(this.flags.filepath, 'utf8');

    const fileMetaXML = await fs.readFile(this.flags.filepath + '-meta.xml', 'utf8');

     // get the apex class Id using the class Name
    const pageName = getFileName(this.flags.filepath, '.page');
    const apexpages = await conn.tooling.sobject('ApexPage').find({
      Name: pageName,
      NameSpacePrefix : namespacePrefix
    }) as ApexPage [];

    let pageId = null;

    let mode = 'Created';

    if (apexpages.length > 0) {
      pageId = apexpages[0].Id ;
      mode = 'Updated';
    }
    // Compile and save visualforce page to server
    const deployAction = new Deploy('VfContainer', 'ApexPageMember' , pageName, pageId , filebody, fileMetaXML, conn);
    const deployResult = await deployAction.deployMetadata() as DeployResult;
    if (deployResult.success) {
      this.ux.stopSpinner(chalk.bold.greenBright('Visualforce Page Successfully ' + mode + ' ✔'));
      return '';
    } else {
      display(deployResult, this.ux);
      this.ux.stopSpinner(chalk.bold.redBright('Visualforce Page Update Failed ✖'));
      if ( typeof deployResult.error !== 'undefined' ) {
        displaylog(chalk.bold.redBright(deployResult.error), this.ux);
      }
    }
  }
}
