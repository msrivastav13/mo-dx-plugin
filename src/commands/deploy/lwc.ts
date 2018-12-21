import {core, flags, SfdxCommand} from '@salesforce/command';
import chalk from 'chalk';
import fs = require('fs-extra');
import {SobjectResult} from '../../models/sObjectResult';
import {getNameSpacePrefix} from '../../service/getNameSpacePrefix';

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('mo-dx-plugin', 'org');

export default class LWCDeploy extends SfdxCommand {

  public static description = messages.getMessage('lwcDeploy');

  public static examples = [
  '$ sfdx deploy:lwc -p filepath'
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

    const conn = this.org.getConnection();

    const namespacePrefix = await getNameSpacePrefix(conn);

    const apiVersion = conn.getApiVersion();

    interface LightningComponentBundle {
      DeveloperName: string;
      MasterLabel: string;
      Description: string;
      Id: string;
      NamespacePrefix: string;
      ApiVersion: number;
      FullName: string;
      IsExplicitImport: boolean;
      IsExposed: boolean;
      Metadata: LightningComponentMetadataBundle;
    }

    interface LightningComponentMetadataBundle {
      masterLabel: string;
      description: string;
      apiVersion: number;
      lwcResources: LwcResources;
      isExposed: boolean;
      isExplicitImport: boolean;
      targets: Target;
    }

    interface Target {
      target: string[];
    }

    interface LightningComponentResource {
      LightningComponentBundleId: string;
      FilePath: string;
      Format: string;
      Source: string;
      Id: string;
      Metadata: string;
    }

    interface LwcResources {
      lwcResource: LwcResource[];
    }

    interface LwcResource {
      filePath: string;
      source: Source;
    }

    interface Source {
      asByteArray: string;
    }

    const _path = this.flags.filepath;
    const _lastindex = _path.lastIndexOf('/');
    let _fileOrDirName = _path.substring(_lastindex + 1);
    let isDirectory: boolean = false;

    let validFiles: string[] = []; // Array of all file Names to Save to Server
    let filePath: string[] = []; // Array of file path which acts as key

    // This is when user provided the directory path
    if (_fileOrDirName === _fileOrDirName.split('.')[0]) {
      validFiles = await fs.readdir(_path);
      isDirectory = true;
      filePath = validFiles.map( file => 'lwc/' + _fileOrDirName.split('.')[0] + '/' + file);
    } else {
      // Below code when user provided file path and Not directory path
      const fileNameWithPath = _fileOrDirName;
      validFiles.push(_fileOrDirName);
      _fileOrDirName = _fileOrDirName.split('.')[0];
      filePath.push('lwc/' + _fileOrDirName + '/' + fileNameWithPath);
    }

    try {
      const fileBodyArray = await getFileBodyMap(validFiles);
      let lwcBundles = [] as LightningComponentBundle[];
      lwcBundles = await getLWCDefinitionBundle(_fileOrDirName) as LightningComponentBundle[];
      if (lwcBundles.length === 0) {
        const newLWCBundle = await createLWCBundle(_fileOrDirName, fileBodyArray) as SobjectResult;
        if (newLWCBundle.success) {
          const lwcBundleVar = {} as LightningComponentBundle;
          lwcBundleVar.Id = newLWCBundle.id;
          lwcBundles.push(lwcBundleVar);
        } else {
          console.log(chalk.bold.redBright(JSON.stringify(newLWCBundle.errors)));
        }
      }
      if (lwcBundles.length > 0) {
        // console.log(JSON.stringify(lwcBundles[0], null, 2));
        let lwcResources = await getLWCResources(lwcBundles[0].Id) as LightningComponentResource[];
        lwcResources = lwcResources.length > 0 ? lwcResources : [];
        try {
          const lwcResourcesResult = await upsertLWCDefinition(lwcResources, fileBodyArray, lwcBundles[0].Id) as SobjectResult[];
          this.ux.stopSpinner(chalk.bold.greenBright('Lighnting Web Components Deployed SuccessFully..'));
          // console.log(auraDefinitionsResult);
        } catch (exception) {
          this.ux.stopSpinner(chalk.bold.redBright('Failed'));
          console.log(chalk.bold.redBright(exception));
        }
      }
    } catch (exception) {
      this.ux.stopSpinner(chalk.bold.redBright('Failed'));
      console.log(chalk.bold.redBright(exception));
    }

    // function to create LightningComponentBundle
    async function createLWCBundle(name: string, files: string[]) {
      // LWC bundles require metadata as LWCBundle with all the resources for creation
      const newLWCMetadataBundle = {} as LightningComponentMetadataBundle;
      newLWCMetadataBundle.masterLabel = name;
      newLWCMetadataBundle.description = 'A LWC Bundle';
      newLWCMetadataBundle.apiVersion = Number(apiVersion);
      newLWCMetadataBundle.isExposed = false;
      newLWCMetadataBundle.isExplicitImport = false;
      const target = ['lightning__HomePage'];
      const targetObject = {} as Target;
      targetObject.target = target;
      newLWCMetadataBundle.targets = targetObject;
      // Create LWC Resources
      const lstlwcResources = [] as LwcResource[];
      validFiles.forEach ( key => {
        const lwcResourceFile = {} as LwcResource;
        lwcResourceFile.filePath = 'lwc/' + _fileOrDirName + '/' + key;
        const source = {} as Source;
        source.asByteArray = Buffer.from((files[filePath.indexOf('lwc/' + _fileOrDirName + '/' + key)])).toString('base64');
        lwcResourceFile.source = source;
        lstlwcResources.push(lwcResourceFile);
      });
      // Create LWC Resource
      const lwcResources = {} as LwcResources;
      lwcResources.lwcResource = lstlwcResources;

      // Assign to metadata Bundle
      newLWCMetadataBundle.lwcResources = lwcResources;

      const newLWCBundle = {} as LightningComponentBundle;
      newLWCBundle.DeveloperName = name;
      newLWCBundle.MasterLabel = name;
      newLWCBundle.Description = 'A LWC Bundle';
      newLWCBundle.ApiVersion = Number(apiVersion);
      newLWCBundle.FullName = name;
      newLWCBundle.Metadata = newLWCMetadataBundle;
      newLWCBundle.IsExposed = false;
      // console.log(JSON.stringify(newLWCBundle, null, 2));
      return conn.tooling.sobject('LightningComponentBundle').create(newLWCBundle);
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

    // function to update all the LightningComponentResource
    async function upsertLWCDefinition(lwcResources: LightningComponentResource[] , files: string[], bundleId: string) {
        const lwcResourcesToCreate: LightningComponentResource[] = [];
        const lwcResourcesToUpdate: LightningComponentResource[] = [];
        const promiseArray = [];
        validFiles.forEach ( key => {
          const lwcMatch = lwcResources.find(lwc => lwc.FilePath === ('lwc/' + _fileOrDirName + '/' + key));
          if (lwcMatch) {
            const lwcResourceToUpdate = {} as LightningComponentResource;
            lwcResourceToUpdate.Id = lwcMatch.Id;
            lwcResourceToUpdate.Source = files[filePath.indexOf(lwcMatch.FilePath)];
            lwcResourcesToUpdate.push(lwcResourceToUpdate);
          } else {
            const lwcResourceToInsert = {} as LightningComponentResource;
            lwcResourceToInsert.LightningComponentBundleId = bundleId;
            lwcResourceToInsert.FilePath = 'lwc/' + _fileOrDirName + '/' + key;
            lwcResourceToInsert.Format = (key.split('.'))[(key.split('.').length - 1)];
            lwcResourceToInsert.Source = files[filePath.indexOf(lwcMatch.FilePath)];
            lwcResourcesToCreate.push(lwcResourceToInsert);
          }
        });
        if (lwcResourcesToUpdate.length > 0) {
          promiseArray.push(conn.tooling.sobject('LightningComponentResource').update(lwcResourcesToUpdate));
        }
        if (lwcResourcesToCreate.length > 0) {
          promiseArray.push(conn.tooling.sobject('LightningComponentResource').create(lwcResourcesToCreate));
        }
        return Promise.all(promiseArray);
    }

    // function to get LWCDefinitionBundleId
    async function getLWCDefinitionBundle(name: string) {
      return conn.tooling.sobject('LightningComponentBundle').find({
        DeveloperName: name,
        NamespacePrefix: namespacePrefix
      });
    }

    // function to get LightningComponentResource
    async function getLWCResources(bundleId: string) {
      return conn.tooling.sobject('LightningComponentResource').find({
        LightningComponentBundleId: bundleId
      });
    }

    return '';
  }
}
