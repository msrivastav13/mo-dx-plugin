import { core, flags, SfdxCommand } from '@salesforce/command';
import { AnyJson } from '@salesforce/ts-types';
import * as AdmZip from 'adm-zip';
import * as chalk from 'chalk';
import * as child from 'child_process';
import fs = require('fs-extra');
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
  public static description = messages.getMessage('retrieveDxSource');

  public static examples = [
    '$ sfdx retrieve:dxsource -n <package/changeset>',
    '$ sfdx retrieve:dxsource -n <package/changeset> -m "true"',
    '$ sfdx retrieve:dxsource -n <package/changeset> -p <[pathName]>',
    '$ sfdx retrieve:dxsource -u myOrg@example.com -n <package/changeset> -p <[pathName]>'
  ];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    packagename: flags.string({
      required: true,
      char: 'n',
      description: 'the name of the package you want to retrieve'
    }),
    pathname: flags.string({
      char: 'p',
      default: 'force-app',
      description: 'where to convert the result to.defaults to force-app'
    }),
    retainmetadata: flags.string({
      char: 'm',
      description:
        'If set retain the metadata folder in mdapiout directory and do not clean'
    })
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<AnyJson> {
    const target = this.flags.pathname;
    const defaultusername = this.flags.targetusername
      ? this.flags.targetusername
      : this.org.getUsername();
    let errored = false;

    this.ux.startSpinner(chalk.yellowBright('Retrieving Metadata...'));

    const retrieveCommand = `sfdx force:mdapi:retrieve -s -p "${
      this.flags.packagename
    }" -u ${defaultusername}  -r ./${tmpDir} -w 30 --json`;
    try {
      await exec(retrieveCommand, {
        maxBuffer: 1000000 * 1024
      });
    } catch (exception) {
      errored = true;
      this.ux.errorJson(exception);
      this.ux.stopSpinner(chalk.redBright('Retrieve Operation Failed.'));
    }

    if (!errored) {
      this.ux.stopSpinner(
        chalk.greenBright('Retrieve Completed ✔.  Unzipping...')
      );
      // unzip result to a temp folder mdapi
      if (process.platform.includes('darwin')) {
        await exec(`unzip -qqo ./${tmpDir}/unpackaged.zip -d ./${tmpDir}`); // Use standard MACOSX unzip
      } else {
        // use a third party library to unzip the zipped resource
        try {
          const tempPath = './' + tmpDir + '/unpackaged.zip';
          const zip = new AdmZip(tempPath);
          zip.extractAllTo('./' + tmpDir, true);
        } catch (error) {
          console.error(chalk.redBright(error));
          return;
        }
      }

      // Prepare folder and directory for DX Conversion
      this.ux.startSpinner(
        chalk.yellowBright(
          'Unzip Completed ✔.  Converting To DX Source Format...'
        )
      );
      if (process.platform.includes('darwin')) {
        await exec(`rm -rf ./${manifestDir}/`);
        await exec(`mkdir ./${manifestDir}`);
        await exec(`cp -a ./${tmpDir}/package.xml ./${manifestDir}/`);
      } else {
        try {
          fs.removeSync(`./${manifestDir}/`);
          fs.mkdirsSync(`./${manifestDir}`);
          fs.copyFileSync(
            `./${tmpDir}/package.xml`,
            `./${manifestDir}/package.xml`
          );
        } catch (error) {
          console.error(chalk.redBright(error));
        }
      }
      // DX Conversion
      try {
        await exec(
          `sfdx force:mdapi:convert -r ./${tmpDir} -d ${target} --json`
        );
        this.ux.stopSpinner(
          chalk.greenBright('Done Converting mdapi to DX format ✔')
        );
      } catch (err) {
        this.ux.errorJson(err);
        this.ux.error(chalk.redBright('Error from conversion ✖'));
      }
      if (!this.flags.retainmetadata) {
        this.ux.startSpinner(
          chalk.blueBright('Cleaning Unused Directory Started ✔')
        );
        if (process.platform.includes('darwin')) {
          await exec(`rm -rf ./${tmpDir}`);
        } else {
          fs.removeSync(`./${tmpDir}`);
        }
      }
      this.ux.stopSpinner(chalk.greenBright('Finished ✔'));
    }

    return '';
  }
}
