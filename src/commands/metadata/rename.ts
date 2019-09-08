import { core, flags, SfdxCommand } from '@salesforce/command';
import { AnyJson } from '@salesforce/ts-types';
import chalk from 'chalk';
import { SaveResult } from 'jsforce';

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

const messages = core.Messages.loadMessages('mo-dx-plugin', 'org');

export default class RenameMetadata extends SfdxCommand {

  public static description = messages.getMessage('renamemetadata');

  public static examples = [
    '$ sfdx metadata:rename -t <metadatatype> -n <newname> -o <oldname>',
    '$ sfdx metadata:rename -t CustomObject -n MyCustomObject1New__c -o MyCustomObject1__c'
  ];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    metadatatype: flags.string({
      required: true,
      char: 't',
      description: 'type of the metadata. Examples are CustomObject, Profile'
    }),
    newfullname: flags.string({
      char: 'n',
      required: true,
      description: 'new name of the metadata element'
    }),
    oldfullname: flags.string({
      char: 'o',
      required: true,
      description:
        'old name of the metadata element'
    })
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<AnyJson> {

    const conn = this.org.getConnection();
    let result: Promise<SaveResult>;
    try {
      result = conn.metadata.rename(this.flags.metadatatype, this.flags.oldfullname, this.flags.newfullname);
      result
        .then(
          res => {
            if (res.success) {
              console.log(chalk.bold.greenBright(this.flags.metadatatype + ' ' + this.flags.oldfullname + ' is successfully Renamed to ' + this.flags.newfullname + ' ✔'));
            }
          }
        )
        .catch(
          error => {
            console.log('ERROR--' + chalk.bold.redBright(error));
          }
        );
    } catch (ex) {
      console.log('ERROR--' + chalk.bold.redBright(ex));
    }
    return JSON.stringify(result);
  }

}
