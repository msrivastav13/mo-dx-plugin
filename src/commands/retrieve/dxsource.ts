import { SfCommand, Flags, requiredOrgFlagWithDeprecations, orgApiVersionFlagWithDeprecations, loglevel } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import AdmZip from 'adm-zip';
import chalk from 'chalk';
import * as child from 'child_process';
import fs from 'fs-extra';
import * as util from 'util';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

const messages = Messages.loadMessages('mo-dx-plugin', 'org');

const tmpDir = 'mdapiout';

const manifestDir = 'manifest';

const exec = util.promisify(child.exec);

export default class DxSource extends SfCommand<any> {
  public static description = messages.getMessage('retrieveDxSource');

  public static examples = [
    '$ sfdx retrieve:dxsource -n <package/changeset>',
    '$ sfdx retrieve:dxsource -n <package/changeset> -m "true"',
    '$ sfdx retrieve:dxsource -n <package/changeset> -p <[pathName]>',
    '$ sfdx retrieve:dxsource -u myOrg@example.com -n <package/changeset> -p <[pathName]>'
  ];

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    // flag with a value (-n, --name=VALUE)
    packagename: Flags.string({
      required: true,
      char: 'n',
      description: 'the name of the package you want to retrieve'
    }),
    pathname: Flags.string({
      char: 'p',
      default: 'force-app',
      description: 'where to convert the result to.defaults to force-app'
    }),
    retainmetadata: Flags.string({
      char: 'm',
      description:
        'If set retain the metadata folder in mdapiout directory and do not clean'
    })
  };

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  public static readonly requiresProject = true;

  public async run(): Promise<any> {
    const { flags } = await this.parse(DxSource);

    const target = flags.pathname;
    const defaultusername = flags['target-org'].getUsername();
    let errored = false;

    this.spinner.start(chalk.yellowBright('Retrieving Metadata...'));

    const retrieveCommand = `sfdx force:mdapi:retrieve -s -p "${
      flags.packagename
    }" -u ${defaultusername}  -r ./${tmpDir} -w 30 --json`;
    try {
      await exec(retrieveCommand, {
        maxBuffer: 1000000 * 1024
      });
    } catch (exception) {
      errored = true;
      this.logJson(exception as object);
      this.spinner.stop(chalk.redBright('Retrieve Operation Failed.'));
    }

    if (!errored) {
      this.spinner.stop(
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
      this.spinner.start(
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
        this.spinner.stop(
          chalk.greenBright('Done Converting mdapi to DX format ✔')
        );
      } catch (err) {
        this.logJson(err as object);
        this.error(chalk.redBright('Error from conversion ✖'));
      }
      if (!flags.retainmetadata) {
        this.spinner.start(
          chalk.blueBright('Cleaning Unused Directory Started ✔')
        );
        if (process.platform.includes('darwin')) {
          await exec(`rm -rf ./${tmpDir}`);
        } else {
          fs.removeSync(`./${tmpDir}`);
        }
      }
      this.spinner.stop(chalk.greenBright('Finished ✔'));
    }

    return '';
  }
}
