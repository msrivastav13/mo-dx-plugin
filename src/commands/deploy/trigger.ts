import { SfCommand, Flags, requiredOrgFlagWithDeprecations, orgApiVersionFlagWithDeprecations, loglevel } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import chalk from 'chalk';
import fs from 'fs-extra';
import { Deploy, DeployResult } from '../../service/deploy.js';
import { display } from '../../service/displayError.js';
import { getFileName } from '../../service/getFileName.js';
import { getNameSpacePrefix } from '../../service/getNamespacePrefix.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

const messages = Messages.loadMessages('mo-dx-plugin', 'org');

interface ApexTrigger {
  Body: string;
  Name: string;
  TableEnumOrId: string;
  NamespacePrefix: string;
  Id?: string;
}

export default class TriggerDeploy extends SfCommand<any> {

  public static description = messages.getMessage('triggerDeploy');

  public static examples = [
  '$ sfdx deploy:trigger -p filepath'
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
    const { flags } = await this.parse(TriggerDeploy);

    this.spinner.start(chalk.bold.yellowBright('Saving'));
    this.startTime = new Date().getTime();

    const conn = flags['target-org'].getConnection(flags['api-version']);

    const namespacePrefix = await getNameSpacePrefix(conn);

    const filebody = await fs.readFile(flags.filepath, 'utf8');

    const fileMetaXML = await fs.readFile(flags.filepath + '-meta.xml', 'utf8');
     // get the trigger Id using the trigger Name
    const triggerName = getFileName(flags.filepath, '.trigger');

    const apextrigger = await conn.tooling.sobject('Apextrigger').find({
      Name: triggerName,
      NameSpacePrefix : namespacePrefix
    }) as ApexTrigger [];

    let triggerId = null;

    let mode = 'Created';

    if (apextrigger.length > 0) {
      triggerId = apextrigger[0].Id ;
      mode = 'Updated';
    }

    // logic to compile trigger
    const deployAction = new Deploy('TriggerContainer', 'ApexTriggerMember' , triggerName, triggerId , filebody, fileMetaXML, conn);
    const deployResult = await deployAction.deployMetadata() as DeployResult;
    if (deployResult.success) {
        this.endTime = new Date().getTime();
        const executionTime = (this.endTime - this.startTime) / 1000;
        this.spinner.stop(chalk.bold.greenBright(`Trigger Successfully ${mode} ✔.Command execution time: ${executionTime} seconds`));
        return '';
    } else {
        if (deployResult.queryResult.records.length > 0 && deployResult.queryResult.records[0].DeployDetails.componentFailures.length > 0) {
          display(deployResult, this);
        }
        this.spinner.stop(chalk.bold.redBright('Trigger Update Failed ✖'));
        if ( typeof deployResult.error !== 'undefined' ) {
          console.log(chalk.bold.redBright(deployResult.error));
        }
    }
  }
}
