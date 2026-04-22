import { SfCommand, Flags, requiredOrgFlagWithDeprecations, orgApiVersionFlagWithDeprecations, loglevel } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import AdmZip from 'adm-zip';
import chalk from 'chalk';
import * as child from 'child_process';
import fs from 'fs-extra';
import * as util from 'util';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

const messages = Messages.loadMessages('mo-dx-plugin', 'org');

const exec = util.promisify(child.exec);

export default class Pkgsource extends SfCommand<any> {
  public static description = messages.getMessage('retrieveSource');

  public static examples = [
    '$ sfdx retrieve:pkgsource -n <package/changeset>',
    '$ sfdx retrieve:pkgsource -n <package/changeset> -r <relative path where source is retrieved and unzipped>',
    '$ sfdx retrieve:pkgsource -n <package/changeset> -r /changesets/src'
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

    retrievedir : Flags.string({
      required: false,
      char: 'r',
      description: 'directory path to retrieve'
    })
  };

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  public static readonly requiresProject = true;

  public async run(): Promise<any> {
    const { flags } = await this.parse(Pkgsource);

    const defaultusername = flags['target-org'].getUsername();
    const tmpDir = flags.retrievedir ? flags.retrievedir : 'src' ;
    let errored = false;

    this.spinner.start(chalk.yellowBright('Retrieving Metadata...'));

    const retrieveCommand = `sfdx force:mdapi:retrieve -s -p "${
      flags.packagename
    }" -u ${defaultusername}  -r ./${tmpDir} -w -1 --json`;

    try {
      await exec(retrieveCommand, { maxBuffer: 1000000 * 1024 });
    } catch (exception) {
      errored = true;
      this.logJson(exception as object);
      this.spinner.stop(chalk.redBright('Retrieve Operation Failed ✖'));
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
          const zip = new AdmZip('./' + tmpDir + '/unpackaged.zip');
          await zip.extractAllTo('./' + tmpDir, true);
        } catch (error) {
          console.error(chalk.redBright(error + '✖'));
          return;
        }
      }

      this.spinner.start(chalk.yellowBright('Unzip Completed ✔'));
      await fs.unlink('./' + tmpDir + '/unpackaged.zip');
      this.spinner.stop(chalk.greenBright('Finished ✔'));
    }

    return '';
  }
}
