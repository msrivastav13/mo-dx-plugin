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

interface ApexComponent {
  Name: string;
  Markup: string;
  NamespacePrefix: string;
  Id: string;
  Masterlabel: string;
}

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

  private startTime: number ;

  private endTime: number;

  public async run(): Promise<AnyJson> {

    this.ux.startSpinner(chalk.bold.yellowBright('Saving'));
    this.startTime = new Date().getTime();

    const conn = this.org.getConnection();

    const namespacePrefix = await getNameSpacePrefix(conn);

    const filebody = await fs.readFile(this.flags.filepath, 'utf8');

    const fileMetaXML = await fs.readFile(this.flags.filepath + '-meta.xml', 'utf8');

    // get the vf component name
    const vfComponentName = getFileName(this.flags.filepath, '.component');

    const apexVFComponents = await conn.tooling.sobject('ApexComponent').find({
      Name: vfComponentName,
      NameSpacePrefix : namespacePrefix
    }) as ApexComponent [];

    let apexPageComponentId = null;

    let mode = 'Created';

    if (apexVFComponents.length > 0) {
      apexPageComponentId = apexVFComponents[0].Id;
      mode = 'Updated';
    }
    // logic to compile and save  visualforce component
    const deployAction = new Deploy('VfComponent', 'ApexComponentMember' , vfComponentName, apexPageComponentId , filebody, fileMetaXML, conn);
    const deployResult = await deployAction.deployMetadata() as DeployResult;
    if (deployResult.success) {
      this.endTime = new Date().getTime();
      const executionTime = (this.endTime - this.startTime) / 1000;
      this.ux.stopSpinner(chalk.bold.greenBright(`Visualforce Component Successfully ${mode} ✔. Command execution time: ${executionTime} seconds`));
      return '';
    } else {
      display(deployResult, this.ux);
      this.ux.stopSpinner(chalk.bold.redBright('Visualforce Component Update Failed ✖'));
      if ( typeof deployResult.error !== 'undefined' ) {
        displaylog(chalk.bold.redBright(deployResult.error), this.ux);
      }
    }
  }
}
