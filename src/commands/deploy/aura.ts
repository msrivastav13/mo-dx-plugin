import {core, flags, SfdxCommand} from '@salesforce/command';
import chalk from 'chalk';
import fs = require('fs-extra');
import {QueryResult} from '../../models/queryResult';
import {SobjectResult} from '../../models/sObjectResult';

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('mo-dx-plugin', 'org');

export default class TriggerDeploy extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
  '$ $ sfdx deploy:aura -p filepath'
  ];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    classname: {type: 'string', required: false, char: 'n', description: 'name of the trigger' },
    filepath: {type: 'string', char: 'p', description: 'file path' }
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<core.AnyJson> {

    this.ux.startSpinner(chalk.bold.yellowBright('Saving ....'));

    interface AuraDefinitionBundle {
      DeveloperName: string;
      MasterLabel: string;
      TableEnumOrId: string;
      Description: string;
    }

    interface AuraDefinition {
      AuraDefinitionBundleId: string;
      DefType: string;
      Format: string;
      Source: string;
    }

    const filebody = await fs.readFile(this.flags.filepath, 'utf8');
    const filefullName = this.flags.filepath.substring(this.flags.filepath.lastIndexof('/') + 1);
    const fileName = filefullName.split('.')[0];
    const fileExtension = filefullName.split('.')[1];

    // function to get file extension
    function getDefType(extension: string, filename: string) {
      switch (extension) {
        case 'app':
            // APPLICATION — Lightning Components app
            return 'APPLICATION';
        case 'cmp':
            // COMPONENT — component markup
            return 'COMPONENT';
        case 'auradoc':
            // DOCUMENTATION — documentation markup
            return 'DOCUMENTATION';
        case 'css':
            // STYLE — style (CSS) resource
            return 'STYLE';
        case 'evt':
            // EVENT — event definition
            return 'EVENT';
        case 'design':
            // DESIGN — design definition
            return 'DESIGN';
        case 'svg':
            // SVG — SVG graphic resource
            return 'SVG';
        case 'js':
            filename = fileName.toLowerCase();
            if (filename.endsWith('controller')) {
                return 'CONTROLLER';
            } else if (filename.endsWith('helper')) {
                return 'HELPER';
            } else if (filename.endsWith('renderer')) {
                // RENDERER — client-side renderer
                return 'RENDERER';
            }
            break;
        case 'tokens':
            return 'TOKENS';
        case 'intf':
            return 'INTERFACE';
      }
    }

    return fileName;
  }
}
