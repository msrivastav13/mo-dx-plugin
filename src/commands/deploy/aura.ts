import {core, flags, SfdxCommand} from '@salesforce/command';
import chalk from 'chalk';
import fs = require('fs-extra');
import promisify = require('util');
import {QueryResult} from '../../models/queryResult';
import {SobjectResult} from '../../models/sObjectResult';

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('mo-dx-plugin', 'org');

export default class AuraDeploy extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
  '$ $ sfdx deploy:aura -p filepath'
  ];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
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

    interface FileObject {
      Name: string;
      Body: string;
    }

    let isDirectory: boolean = false;
    console.log(this.flags.filepath);
    const temp = this.flags.filepath;
    const index = temp.lastIndexOf('/');
    console.log(index);
    const pathString = temp.substring(index + 1);
    console.log(pathString);
    let fileNames;
    let fileName;
    let fileExtension;

    if (pathString === pathString.split('.')[0]) {
       isDirectory = true;
    } else {
      fileName = pathString.split('.')[0];
      fileExtension = pathString.split('.')[1];
    }

    if (isDirectory) {
      fileNames = await fs.readdir(this.flags.filepath);
      const files = await getFileBodyMap(fileNames);
      console.log(files);
      console.log(fileNames);
    }

    // let fileName = filePathName.split('.')[0];
   //  const fileExtension = filePathName.split('.')[1];

   // function to get the file body concurrently using Promise.All
    async function getFileBodyMap(files: string[]) {
      return Promise.all(
        files.map(async file => {
          return await fs.readFile(temp + '/' + file , 'utf8');
        })
      );
    }

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
                fileName = fileName.replace('Controller', '');
                return 'CONTROLLER';
            } else if (filename.endsWith('helper')) {
                fileName = fileName.replace('Helper', '');
                return 'HELPER';
            } else if (filename.endsWith('renderer')) {
                // RENDERER — client-side renderer
                fileName = fileName.replace('Renderer', '');
                return 'RENDERER';
            }
            break;
        case 'tokens':
            return 'TOKENS';
        case 'intf':
            return 'INTERFACE';
      }
    }

    // get Auraformar
    function getAuraFormat(ext: string) {
      // is 'js', 'css', or 'xml'
      switch (ext) {
          case 'js':
              return 'JS';
          case 'css':
              return 'CSS';
          default:
              return 'XML';
      }
    }

    this.ux.stopSpinner('Executed Successfully');

    return '';
  }
}
