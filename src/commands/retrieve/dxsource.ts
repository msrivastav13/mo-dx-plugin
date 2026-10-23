import { SfCommand, Flags, requiredOrgFlagWithDeprecations, orgApiVersionFlagWithDeprecations, loglevel } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import chalk from 'chalk';
import fs from 'fs-extra';
import { retrievePackage } from '../../service/retrievePackage.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

const messages = Messages.loadMessages('mo-dx-plugin', 'org');

const tmpDir = 'mdapiout';

const manifestDir = 'manifest';

export default class DxSource extends SfCommand<any> {
  public static description = messages.getMessage('retrieveDxSource');

  public static examples = [
    '$ sf retrieve:dxsource -n <package/changeset>',
    '$ sf retrieve:dxsource -n <package/changeset> -m "true"',
    '$ sf retrieve:dxsource -n <package/changeset> -p <[pathName]>',
    '$ sf retrieve:dxsource -o myOrg@example.com -n <package/changeset> -p <[pathName]>'
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
    const conn = flags['target-org'].getConnection(flags['api-version']);

    this.spinner.start(chalk.yellowBright('Retrieving Metadata...'));

    try {
      const { messages: retrieveMessages } = await retrievePackage({
        conn,
        packageName: flags.packagename,
        targetDir: tmpDir
      });
      this.spinner.stop(chalk.greenBright('Retrieve and Unzip Completed ✔'));
      retrieveMessages.forEach(message => this.warn(message));
    } catch (error) {
      this.spinner.stop(chalk.redBright('Retrieve Operation Failed ✖'));
      this.error(error instanceof Error ? error.message : String(error));
    }

    // Prepare folder and directory for DX Conversion
    this.spinner.start(chalk.yellowBright('Converting To DX Source Format...'));
    fs.removeSync(manifestDir);
    fs.mkdirsSync(manifestDir);
    fs.copyFileSync(`${tmpDir}/package.xml`, `${manifestDir}/package.xml`);
    this.spinner.stop();

    // DX Conversion runs the CLI's own convert command in-process (no shell),
    // so the user-supplied target path is passed as a plain argument.
    try {
      await this.config.runCommand('project:convert:mdapi', ['--root-dir', tmpDir, '--output-dir', target]);
      this.log(chalk.greenBright('Done Converting mdapi to DX format ✔'));
    } catch (err) {
      this.error(chalk.redBright(`Error from conversion ✖ ${err instanceof Error ? err.message : String(err)}`));
    }

    if (!flags.retainmetadata) {
      this.spinner.start(chalk.blueBright('Cleaning Unused Directory Started ✔'));
      fs.removeSync(tmpDir);
      this.spinner.stop(chalk.greenBright('Finished ✔'));
    }

    return '';
  }
}
