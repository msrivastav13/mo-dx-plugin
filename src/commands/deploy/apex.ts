import { SfCommand, Flags, requiredOrgFlagWithDeprecations, orgApiVersionFlagWithDeprecations, loglevel } from '@salesforce/sf-plugins-core';
import { Connection, Messages } from '@salesforce/core';
import chalk from 'chalk';
import fs from 'fs-extra';
import { Deploy, DeployResult } from '../../service/deploy.js';
import {display, displaylog} from '../../service/displayError.js';
import { getFileName } from '../../service/getFileName.js';
import { getNameSpacePrefix } from '../../service/getNamespacePrefix.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

const messages = Messages.loadMessages('mo-dx-plugin', 'org');

interface ApexClass {
  Body: string;
  NamespacePrefix: string;
  Id: string;
}

export default class ApexDeploy extends SfCommand<any> {

  public static description = messages.getMessage('apexDeploy');

  public static examples = [
  '$ sfdx deploy:apex -p filepath'
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
    const { flags } = await this.parse(ApexDeploy);

    this.spinner.start(chalk.bold.yellowBright('Saving'));
    this.startTime = new Date().getTime();

    const conn = flags['target-org'].getConnection(flags['api-version']);

    const namespacePrefix = await getNameSpacePrefix(conn);

    const filebody = await fs.readFile(flags.filepath, 'utf8');

    const fileMetaXML = await fs.readFile(flags.filepath + '-meta.xml', 'utf8');

     // get the apex class Id using the class Name
    const className = getFileName(flags.filepath, '.cls');
    const apexclass = await conn.tooling.sobject('Apexclass').find({
      Name: className,
      NameSpacePrefix : namespacePrefix
    }) as ApexClass [];

    // logic to update apex class
    if (apexclass.length > 0) {
      const updateResult = await this.updateApex(apexclass, filebody, fileMetaXML, conn, className, 'Updated') as any; // tslint:disable-line:no-any
      return  updateResult;
    } else {
      // We compile the code with null as EntityId
      const updateResult = await this.updateApex(null, filebody, fileMetaXML, conn, className, 'Created') as any; // tslint:disable-line:no-any
      return updateResult;
      }
    }

  private async updateApex(apexclass: ApexClass[], filebody: string, metadataXML: string, conn: Connection, className: string, mode: string) {
    let classId = null;
    if (apexclass ) {
      classId = apexclass[0].Id;
    }
    const deployAction = new Deploy('ApexContainer', 'ApexClassMember', className, classId, filebody, metadataXML, conn);
    const deployResult = await deployAction.deployMetadata() as DeployResult;
    if (deployResult.success) {
      this.endTime = new Date().getTime();
      const executionTime = (this.endTime - this.startTime) / 1000;
      this.spinner.stop(chalk.bold.greenBright(`Apex Class Successfully ${mode} ✔.Command execution time: ${executionTime} seconds`));
    } else {
      if (deployResult.queryResult.records.length > 0 && deployResult.queryResult.records[0].DeployDetails.componentFailures.length > 0) {
        display(deployResult, this);
      }
      if (typeof deployResult.error !== 'undefined') {
        displaylog(chalk.bold.redBright(deployResult.error), this);
      }
      this.spinner.stop(chalk.bold.redBright('Apex Class Update Failed ✖'));
    }
    return deployResult;
  }
}
