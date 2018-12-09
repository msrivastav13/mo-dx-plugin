import {core, flags, SfdxCommand} from '@salesforce/command';
import chalk from 'chalk';
import * as child from 'child_process';
import * as util from 'util';

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('mo-dx-plugin', 'org');

const tmpDir = 'mdapiout';

const manifestDir = 'manifest';

const exec = util.promisify(child.exec);

export default class DxSource extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
  '$ sfdx retrieve:dxsource -n <package/changeset>',
  '$ sfdx retrieve:dxsource -n <package/changeset> -m "true"',
  '$ sfdx retrieve:dxsource -n <package/changeset> -p <[pathName]>',
  '$ sfdx retrieve:dxsource -u myOrg@example.com -n <package/changeset> -p <[pathName]>'
  ];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    packagename: {type: 'string', required: true, char: 'n', description: 'the name of the package you want to retrieve	' },
    pathname: {type: 'string', char: 'p', default: 'force-app', description: 'where to convert the result to...defaults to force-app' },
    targetusername : {type: 'string', char: 'u', description: 'target org alias/username to retrieve from' },
    retainmetadata : {type: 'string', char: 'm', description: 'If set retain the metadata folder in mdapiout directory and do not clean'}
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<core.AnyJson> {
    const target = this.flags.pathname;
    const defaultusername = this.flags.targetusername ? this.flags.targetusername : this.org.getUsername();
    let errored = false;

    this.ux.startSpinner(chalk.yellowBright('Retrieving Metadata...'));

    // Return an object to be displayed with --json
    const retrieveCommand = `sfdx force:mdapi:retrieve -s -p "${this.flags.packagename}" -u ${defaultusername}  -r ./${tmpDir} -w 30 --json`;
    try {
      const retrieveResult = await exec(retrieveCommand, { maxBuffer: 1000000 * 1024 });
    } catch (exception) {
      errored = true;
      this.ux.errorJson(exception);
      this.ux.stopSpinner(chalk.redBright('Retrieve Operation Failed.'));
    }

    if (!errored) {

      this.ux.stopSpinner(chalk.greenBright('Retrieve Completed.  Unzipping...'));
      // unzip result to a temp folder mdapi
      const unzipResult = await exec(`unzip -qqo ./${tmpDir}/unpackaged.zip -d ./${tmpDir}`);
      // Prepare folder and directory for DX Conversion
      this.ux.startSpinner(chalk.yellowBright('Unzip Completed.  Converting To DX Source Format...'));

      const removeDirResult = await exec(`rm -rf ./${manifestDir}/`);

      const mkdirResult = await exec(`mkdir ./${manifestDir}`);

      const copyResult = await exec(`cp -a ./${tmpDir}/package.xml ./${manifestDir}/`);
      // DX Conversion
      try {
        const convertResult = await exec(`sfdx force:mdapi:convert -r ./${tmpDir} -d ${target} --json`);
        this.ux.stopSpinner(chalk.greenBright('Done Converting mdapi to DX format.....'));
      } catch (err) {
        this.ux.errorJson(err);
        this.ux.error(chalk.redBright('Error from conversion'));
      }
      if (!this.flags.retainmetadata) {
        this.ux.startSpinner(chalk.blueBright('Cleaning Unused Directory Started'));
        await exec(`rm -rf ./${tmpDir}`);
      }
      this.ux.stopSpinner(chalk.greenBright('Finished..'));
    }

    return '';
  }
}
