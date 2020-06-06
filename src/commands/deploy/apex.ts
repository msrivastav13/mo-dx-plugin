import { core, flags, SfdxCommand } from '@salesforce/command';
import { AnyJson } from '@salesforce/ts-types';
import * as chalk from 'chalk';
import fs = require('fs-extra');
import { Deploy, DeployResult } from '../../service/deploy';
import {display, displaylog} from '../../service/displayError';
import { getFileName } from '../../service/getFileName';
import { getNameSpacePrefix } from '../../service/getNamespacePrefix';

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('mo-dx-plugin', 'org');

interface ApexClass {
  Body: string;
  NamespacePrefix: string;
  Id: string;
}

export default class ApexDeploy extends SfdxCommand {

  public static description = messages.getMessage('apexDeploy');

  public static examples = [
  '$ sfdx deploy:apex -p filepath'
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
    const className = getFileName(this.flags.filepath, '.cls');
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

  private async updateApex(apexclass: ApexClass[], filebody: string, metadataXML: string, conn: core.Connection, className: string, mode: string) {
    let classId = null;
    if (apexclass ) {
      classId = apexclass[0].Id;
    }
    const deployAction = new Deploy('ApexContainer', 'ApexClassMember', className, classId, filebody, metadataXML, conn);
    const deployResult = await deployAction.deployMetadata() as DeployResult;
    if (deployResult.success) {
      this.ux.stopSpinner(chalk.bold.greenBright('Apex Class Successfully ' + mode + ' ✔'));
    } else {
      if (deployResult.queryResult.records.length > 0 && deployResult.queryResult.records[0].DeployDetails.componentFailures.length > 0) {
        display(deployResult, this.ux);
      }
      if (typeof deployResult.error !== 'undefined') {
        displaylog(chalk.bold.redBright(deployResult.error), this.ux);
      }
      this.ux.stopSpinner(chalk.bold.redBright('Apex Class Update Failed ✖'));
    }
    return deployResult;
  }
}
