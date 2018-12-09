import {core, flags, SfdxCommand} from '@salesforce/command';
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
  '$ sfdx retrieve:dxsource -n <package/changeset> -p <[pathName]>',
  '$ sfdx retrieve:dxsource -u myOrg@example.com -n <package/changeset> -p <[pathName]>'
  ];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    packagename: {type: 'string', required: true, char: 'n', description: 'the name of the package you want to retrieve	' },
    pathname: {type: 'string', char: 'p', default: 'force-app', description: 'where to convert the result to...defaults to force-app' },
    targetusername : {type: 'string', char: 'u', description: 'target org alias/username to retrieve from' }
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<core.AnyJson> {
    const target = this.flags.pathname;
    const defaultusername = this.flags.targetusername ? this.flags.targetusername :this.org.getUsername();

    this.ux.startSpinner('Retrieving Metadata...');

    // Return an object to be displayed with --json
    const retrieveCommand = `sfdx force:mdapi:retrieve -s -p "${this.flags.packagename}" -u ${defaultusername}  -r ./${tmpDir} -w 30`;
    const retrieveResult = await exec(retrieveCommand, { maxBuffer: 1000000 * 1024 });
    if (retrieveResult.stderr) {
      this.ux.error(retrieveResult.stderr);
      return;
    }

    this.ux.stopSpinner('Retrieve Completed.  Unzipping...');

    const unzipResult = await exec(`unzip -qqo ./${tmpDir}/unpackaged.zip -d ./${tmpDir}`);

    this.ux.startSpinner('Unzip Completed.  Converting To DX Source Format...');

    const removeDirResult = await exec(`rm -rf ./${manifestDir}/`);

    const mkdirResult = await exec(`mkdir ./${manifestDir}`);

    const copyResult = await exec(`cp -a ./${tmpDir}/package.xml ./${manifestDir}/`);

    try {
      const convertResult = await exec(`sfdx force:mdapi:convert -r ./${tmpDir} -d ${target} --json`);
      this.ux.stopSpinner('Done Converting mdapi to DX format.....Cleaning Unused Directory..');
    } catch (err) {
      this.ux.errorJson(err);
      this.ux.error('Error from conversion');
    }
    this.ux.startSpinner('Cleaning Unused Directory Started');
    await exec(`rm -rf ./${tmpDir}`);
    this.ux.stopSpinner('Finished..');
  }
}
