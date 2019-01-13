import {core, SfdxCommand} from '@salesforce/command';
import {AnyJson} from '@salesforce/ts-types';
import * as AdmZip from 'adm-zip';
import chalk from 'chalk';
import * as child from 'child_process';
import fs = require('fs-extra');
import * as util from 'util';

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('mo-dx-plugin', 'org');

const tmpDir = 'src';

const exec = util.promisify(child.exec);

export default class Pkgsource extends SfdxCommand {

  public static description = messages.getMessage('retrieveSource');

  public static examples = [
  '$ sfdx retrieve:pkgsource -n <package/changeset>'
  ];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    packagename: {type: 'string', required: true, char: 'n', description: 'the name of the package you want to retrieve	' }
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<AnyJson> {
    const defaultusername = this.flags.targetusername ? this.flags.targetusername : this.org.getUsername();
    let errored = false;

    this.ux.startSpinner(chalk.yellowBright('Retrieving Metadata...'));

    // Return an object to be displayed with --json
    const retrieveCommand = `sfdx force:mdapi:retrieve -s -p "${this.flags.packagename}" -u ${defaultusername}  -r ./${tmpDir} -w -1 --json`;

    try {
      await exec(retrieveCommand, { maxBuffer: 1000000 * 1024 });
    } catch (exception) {
      errored = true;
      this.ux.errorJson(exception);
      this.ux.stopSpinner(chalk.redBright('Retrieve Operation Failed.'));
    }

    if (!errored) {

      this.ux.stopSpinner(chalk.greenBright('Retrieve Completed.  Unzipping...'));
      // unzip result to a temp folder mdapi
      if (process.platform.includes('darwin')) {
        await exec(`unzip -qqo ./${tmpDir}/unpackaged.zip -d ./${tmpDir}`); // Use standard MACOSX unzip
      } else {
        // use a third party library to unzip the zipped resource
        try {
          const zip = new AdmZip('./' + tmpDir + '/unpackaged.zip');
          await zip.extractAllTo('./' + tmpDir, true);
        } catch (error) {
          console.error(chalk.redBright(error));
          return ;
        }
      }

      this.ux.startSpinner(chalk.yellowBright('Unzip Completed.'));
      await fs.unlink('./' + tmpDir + '/unpackaged.zip');
      this.ux.stopSpinner(chalk.greenBright('Finished..'));
    }

    return '';
  }
}
