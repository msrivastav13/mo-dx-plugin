import { SfCommand, Flags, requiredOrgFlagWithDeprecations, orgApiVersionFlagWithDeprecations, loglevel } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import chalk from 'chalk';
import fs from 'fs-extra';
import {Deploy, DeployResult} from '../../service/deploy.js';
import {display, displaylog} from '../../service/displayError.js';
import {getFileName} from '../../service/getFileName.js';
import {getNameSpacePrefix} from '../../service/getNamespacePrefix.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

const messages = Messages.loadMessages('mo-dx-plugin', 'org');

interface ApexComponent {
  Name: string;
  Markup: string;
  NamespacePrefix: string;
  Id: string;
  Masterlabel: string;
}

export default class ApexComponentDeploy extends SfCommand<any> {

  public static description = messages.getMessage('vfComponentDeploy');

  public static examples = [
  '$ sfdx deploy:vfcomponent -p filepath'
  ];

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    // flag with a value (-n, --name=VALUE)
    filepath: Flags.string({ char: 'p', description: 'file path', required: true })
  };

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  public static readonly requiresProject = true;

  private startTime: number ;

  private endTime: number;

  public async run(): Promise<any> {
    const { flags } = await this.parse(ApexComponentDeploy);

    this.spinner.start(chalk.bold.yellowBright('Saving'));
    this.startTime = new Date().getTime();

    const conn = flags['target-org'].getConnection(flags['api-version']);

    const namespacePrefix = await getNameSpacePrefix(conn);

    const filebody = await fs.readFile(flags.filepath, 'utf8');

    const fileMetaXML = await fs.readFile(flags.filepath + '-meta.xml', 'utf8');

    // get the vf component name
    const vfComponentName = getFileName(flags.filepath, '.component');

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
      this.spinner.stop(chalk.bold.greenBright(`Visualforce Component Successfully ${mode} ✔. Command execution time: ${executionTime} seconds`));
      return '';
    } else {
      display(deployResult, this);
      this.spinner.stop(chalk.bold.redBright('Visualforce Component Update Failed ✖'));
      if ( typeof deployResult.error !== 'undefined' ) {
        displaylog(chalk.bold.redBright(deployResult.error), this);
      }
    }
  }
}
