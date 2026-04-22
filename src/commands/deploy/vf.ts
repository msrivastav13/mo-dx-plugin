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

interface ApexPage {
  Name: string;
  Markup: string;
  NamespacePrefix: string;
  Id: string;
  Masterlabel: string;
}

export default class VfDeploy extends SfCommand<any> {

  public static description = messages.getMessage('vfDeploy');

  public static examples = [
  '$ sfdx deploy:vf -p filepath'
  ];

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    // flag with a value (-n, --name=VALUE)
    filepath: Flags.string({char: 'p', description: 'file path' , required: true})
  };

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  public static readonly requiresProject = true;

  private startTime: number ;

  private endTime: number;

  public async run(): Promise<any> {
    const { flags } = await this.parse(VfDeploy);

    this.spinner.start(chalk.bold.yellowBright('Saving'));
    this.startTime = new Date().getTime();

    const conn = flags['target-org'].getConnection(flags['api-version']);

    const namespacePrefix = await getNameSpacePrefix(conn);

    const filebody = await fs.readFile(flags.filepath, 'utf8');

    const fileMetaXML = await fs.readFile(flags.filepath + '-meta.xml', 'utf8');

     // get the apex class Id using the class Name
    const pageName = getFileName(flags.filepath, '.page');
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
      this.endTime = new Date().getTime();
      const executionTime = (this.endTime - this.startTime) / 1000;
      this.spinner.stop(chalk.bold.greenBright(`Visualforce Page Successfully ${mode} ✔Command execution time: ${executionTime} seconds`));
      return '';
    } else {
      display(deployResult, this);
      this.spinner.stop(chalk.bold.redBright('Visualforce Page Update Failed ✖'));
      if ( typeof deployResult.error !== 'undefined' ) {
        displaylog(chalk.bold.redBright(deployResult.error), this);
      }
    }
  }
}
