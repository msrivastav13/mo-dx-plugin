import { SfCommand, Flags, requiredOrgFlagWithDeprecations, orgApiVersionFlagWithDeprecations, loglevel } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import chalk from 'chalk';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

const messages = Messages.loadMessages('mo-dx-plugin', 'org');

export default class RenameMetadata extends SfCommand<any> {

  public static description = messages.getMessage('renamemetadata');

  public static examples = [
    '$ sfdx metadata:rename -t <metadatatype> -n <newname> -o <oldname>',
    '$ sfdx metadata:rename -t CustomObject -n MyCustomObject1New__c -o MyCustomObject1__c'
  ];

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    // flag with a value (-n, --name=VALUE)
    metadatatype: Flags.string({
      required: true,
      char: 't',
      description: 'type of the metadata. Examples are CustomObject, Profile'
    }),
    newfullname: Flags.string({
      char: 'n',
      required: true,
      description: 'new name of the metadata element'
    }),
    oldfullname: Flags.string({
      char: 'o',
      required: true,
      description:
        'old name of the metadata element'
    })
  };

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  public static readonly requiresProject = true;

  public async run(): Promise<any> {
    const { flags } = await this.parse(RenameMetadata);

    const conn = flags['target-org'].getConnection(flags['api-version']);
    let result: Promise<any>; // tslint:disable-line:no-any
    try {
      result = conn.metadata.rename(flags.metadatatype, flags.oldfullname, flags.newfullname) as any; // tslint:disable-line:no-any
      result
        .then(
          res => {
            if (res.success) {
              this.log(chalk.bold.greenBright(flags.metadatatype + ' ' + flags.oldfullname + ' is successfully Renamed to ' + flags.newfullname + ' ✔'));
            }
          }
        )
        .catch(
          error => {
            this.log('ERROR--' + chalk.bold.redBright(error));
          }
        );
    } catch (ex) {
      this.log('ERROR--' + chalk.bold.redBright(ex));
    }
    return JSON.stringify(result);
  }

}
