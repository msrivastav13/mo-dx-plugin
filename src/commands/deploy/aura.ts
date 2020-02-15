import {core, flags, SfdxCommand} from '@salesforce/command';
import {AnyJson} from '@salesforce/ts-types';
import * as chalk from 'chalk';
import fs = require('fs-extra');
import {SobjectResult} from '../../models/sObjectResult';
import {displaylog} from '../../service/displayError';
import {getNameSpacePrefix} from '../../service/getNamespacePrefix';

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('mo-dx-plugin', 'org');

export default class AuraDeploy extends SfdxCommand {

  public static description = messages.getMessage('auraDeploy');

  public static examples = [
  '$ sfdx deploy:aura -p filepath'
  ];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    filepath: flags.string({ char: 'p', description: 'file path', required: true })
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<AnyJson> {

    this.ux.startSpinner(chalk.bold.yellowBright('Saving'));

    const conn = this.org.getConnection();

    const namespacePrefix = await getNameSpacePrefix(conn);

    const apiVersion = conn.getApiVersion();

    interface AuraDefinitionBundle {
      DeveloperName: string;
      MasterLabel: string;
      TableEnumOrId: string;
      Description: string;
      Id: string;
      NamespacePrefix: string;
      ApiVersion: number;
    }

    interface AuraDefinition {
      AuraDefinitionBundleId: string;
      DefType: string;
      Format: string;
      Source: string;
      Id: string;
    }

    const _path = this.flags.filepath;
    const _lastindex = _path.lastIndexOf('/');
    let _fileOrDirName = _path.substring(_lastindex + 1);
    let isDirectory: boolean = false;

    let validFiles: string[] = []; // Array of all file Names to Save to Server
    let fileKey: string []; // This is equivalent to the definitionType

    // This is when user provided the directory path
    if (_fileOrDirName === _fileOrDirName.split('.')[0]) {
      const fileNames = await fs.readdir(_path);
      isDirectory = true;
      // filter all files without xml
      validFiles = fileNames.filter( file => {
        if (file.substring(file.lastIndexOf('.') + 1) !== 'xml') {
          return file;
        }
      });
    } else {
      // Below code when user provided file path and Not directory path
      validFiles.push(_fileOrDirName);
      _fileOrDirName = _fileOrDirName.split('.')[0];
      const validdefTypes = ['Controller', 'Helper', 'Renderer'];
      const filterValidTypes = validdefTypes.filter (filetype => _fileOrDirName.lastIndexOf(filetype) > -1 );
      if (filterValidTypes.length > 0) {
        _fileOrDirName = _fileOrDirName.replace(filterValidTypes[0], '');
      }
    }

    try {
      const fileBodyArray = await getFileBodyMap(validFiles);
      fileKey = getFileKey(validFiles);
      let auraDefinitionBundles = [] as AuraDefinitionBundle[];
      auraDefinitionBundles = await getAuraDefinitionBundle(_fileOrDirName) as AuraDefinitionBundle[];
      if (auraDefinitionBundles.length === 0) {
        const newauraDefinitionBundle = await createAuraDefinitionBundle(_fileOrDirName) as SobjectResult;
        if (newauraDefinitionBundle.success) {
          const auraDefinitionBundleVar = {} as AuraDefinitionBundle;
          auraDefinitionBundleVar.Id = newauraDefinitionBundle.id;
          auraDefinitionBundles.push(auraDefinitionBundleVar);
        } else {
          displaylog(JSON.stringify(newauraDefinitionBundle.errors), this.ux);
          displaylog(chalk.bold.redBright('Aura Component Save Failed'), this.ux);
        }
      }
      if (auraDefinitionBundles.length > 0) {
        let auraDefinitions = await getAuraDefinitions(auraDefinitionBundles[0].Id) as AuraDefinition[];
        auraDefinitions = auraDefinitions.length > 0 ? auraDefinitions : [];
        try {
          await upsertAuraDefinition(auraDefinitions, fileBodyArray, auraDefinitionBundles[0].Id);
          this.ux.stopSpinner(chalk.bold.greenBright('AuraBundle Deployed Successfully ✔'));
        } catch (exception) {
          this.ux.stopSpinner(chalk.bold.redBright('Aura Component Save Failed ✖'));
          displaylog(exception, this.ux);
        }
      }
    } catch (exception) {
      this.ux.stopSpinner(chalk.bold.redBright('Aura Component Save Failed ✖'));
      displaylog(exception, this.ux);
    }

    // function to create AuraDefinitionBundle
    async function createAuraDefinitionBundle(name: string) {
      const newauraDefinition = {} as AuraDefinitionBundle;
      newauraDefinition.DeveloperName = name;
      newauraDefinition.MasterLabel = name;
      newauraDefinition.Description = 'A Lightning Bundle';
      newauraDefinition.ApiVersion = Number(apiVersion);
      return conn.tooling.sobject('AuraDefinitionBundle').create(newauraDefinition);
    }

    // function to get FileKey
    function getFileKey(files: string[]) {
      return files.map( file => {
        return getDefType(file.split('.')[1], file.split('.')[0]);
      });
    }

   // function to get the file body concurrently using Promise.All
    async function getFileBodyMap(files: string[]) {
      return Promise.all(
        files.map(async file => {
          const path = isDirectory ? _path + '/' + file : _path;
          return await fs.readFile(path , 'utf8');
        })
      );
    }

     // There is a bug in the JSforce for bulk inserts so executing insert/updates in loop instead of array

    // function to update all the AuraDefinition
    async function upsertAuraDefinition(auraDefinitions: AuraDefinition[] , files: string[], bundleId: string) {
        // const auraDefinitionsToCreate: AuraDefinition[] = [];
        // const auraDefinitionsToUpdate: AuraDefinition[] = [];
        const promiseArray = [];
        fileKey.forEach ( key => {
          const auraDef = auraDefinitions.find(auraDefinition => auraDefinition.DefType === key);
          if (auraDef) {
            const definitionToUpdate = {} as AuraDefinition;
            definitionToUpdate.Id = auraDef.Id;
            definitionToUpdate.Source = files[fileKey.indexOf(auraDef.DefType)];
            // auraDefinitionsToUpdate.push(definitionToUpdate);
            promiseArray.push(conn.tooling.sobject('AuraDefinition').update(definitionToUpdate));
          } else {
            const definitionToInsert = {} as AuraDefinition;
            definitionToInsert.AuraDefinitionBundleId = bundleId;
            definitionToInsert.DefType = key;
            definitionToInsert.Format = getAuraFormat((validFiles[fileKey.indexOf(key)].split('.'))[1]);
            definitionToInsert.Source = files[fileKey.indexOf(key)];
            // auraDefinitionsToCreate.push(definitionToInsert);
            promiseArray.push(conn.tooling.sobject('AuraDefinition').create(definitionToInsert));
          }
        });
        /*if (auraDefinitionsToUpdate.length > 0) {
          promiseArray.push(conn.tooling.sobject('AuraDefinition').update(auraDefinitionsToUpdate));
        }
        if (auraDefinitionsToCreate.length > 0) {
          promiseArray.push(conn.tooling.sobject('AuraDefinition').create(auraDefinitionsToCreate));
        }*/
        return Promise.all(promiseArray);
    }

    // function to get AuraDefinitionBundleId
    async function getAuraDefinitionBundle(name: string) {
      return conn.tooling.sobject('AuraDefinitionBundle').find({
        DeveloperName: name,
        NamespacePrefix: namespacePrefix
      });
    }

    // function to get AuraDefinition
    async function getAuraDefinitions(bundleId: string) {
      return conn.tooling.sobject('AuraDefinition').find({
        AuraDefinitionBundleId: bundleId
      });
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
            const fname = filename.toLowerCase();
            if (fname.endsWith('controller')) {
                return 'CONTROLLER';
            } else if (fname.endsWith('helper')) {
                return 'HELPER';
            } else if (fname.endsWith('renderer')) {
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

    // get Auraformat
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
    return '';
  }
}
