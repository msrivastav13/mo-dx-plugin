import { SfCommand, Flags, requiredOrgFlagWithDeprecations, orgApiVersionFlagWithDeprecations, loglevel } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import chalk from 'chalk';
import { markFailed } from '../../service/displayError.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

const messages = Messages.loadMessages('mo-dx-plugin', 'org');

export default class RenameMetadata extends SfCommand<any> {

  public static description = messages.getMessage('renamemetadata');

  public static examples = [
    '$ sf metadata:rename -t <metadatatype> -n <newname> -d <oldname>',
    '$ sf metadata:rename -t CustomObject -n MyCustomObject1New__c -d MyCustomObject1__c'
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
      char: 'd',
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
    try {
      const result = await conn.metadata.rename(flags.metadatatype, flags.oldfullname, flags.newfullname);
      if (result.success) {
        this.log(chalk.bold.greenBright(flags.metadatatype + ' ' + flags.oldfullname + ' is successfully Renamed to ' + flags.newfullname + ' ✔'));
      } else {
        this.log('ERROR--' + chalk.bold.redBright(JSON.stringify(result.errors)));
        markFailed();
      }
      return result;
    } catch (ex) {
      this.log('ERROR--' + chalk.bold.redBright(ex));
      markFailed();
    }
  }

}
