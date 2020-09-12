import { core, flags, SfdxCommand } from '@salesforce/command';
import { AnyJson } from '@salesforce/ts-types';
import * as chalk from 'chalk';
import fs = require('fs-extra');
import { Deploy, DeployResult } from '../../service/deploy';
import { display } from '../../service/displayError';
import { getFileName } from '../../service/getFileName';
import { getNameSpacePrefix } from '../../service/getNamespacePrefix';

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('mo-dx-plugin', 'org');

interface ApexTrigger {
  Body: string;
  Name: string;
  TableEnumOrId: string;
  NamespacePrefix: string;
  Id?: string;
}

export default class TriggerDeploy extends SfdxCommand {

  public static description = messages.getMessage('triggerDeploy');

  public static examples = [
  '$ sfdx deploy:trigger -p filepath'
  ];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    filepath: flags.string({char: 'p', description: 'file path' , required: true})
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
     // get the trigger Id using the trigger Name
    const triggerName = getFileName(this.flags.filepath, '.trigger');

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
        this.ux.stopSpinner(chalk.bold.greenBright(`Trigger Successfully ${mode} ✔.Command execution time: ${executionTime} seconds`));
        return '';
    } else {
        if (deployResult.queryResult.records.length > 0 && deployResult.queryResult.records[0].DeployDetails.componentFailures.length > 0) {
          display(deployResult, this.ux);
        }
        this.ux.stopSpinner(chalk.bold.redBright('Trigger Update Failed ✖'));
        if ( typeof deployResult.error !== 'undefined' ) {
          console.log(chalk.bold.redBright(deployResult.error));
        }
    }
  }
}
