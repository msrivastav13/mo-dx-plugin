import { SfCommand, Flags, requiredOrgFlagWithDeprecations, orgApiVersionFlagWithDeprecations, loglevel } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import chalk from 'chalk';
import { retrievePackage } from '../../service/retrievePackage.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

const messages = Messages.loadMessages('mo-dx-plugin', 'org');

export default class Pkgsource extends SfCommand<any> {
  public static description = messages.getMessage('retrieveSource');

  public static examples = [
    '$ sf retrieve:pkgsource -n <package/changeset>',
    '$ sf retrieve:pkgsource -n <package/changeset> -r <relative path where source is retrieved and unzipped>',
    '$ sf retrieve:pkgsource -n <package/changeset> -r /changesets/src'
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

    const conn = flags['target-org'].getConnection(flags['api-version']);
    const tmpDir = flags.retrievedir ? flags.retrievedir : 'src' ;

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

    return '';
  }
}
