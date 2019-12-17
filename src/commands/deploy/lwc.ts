import {core, flags, SfdxCommand} from '@salesforce/command';
import {AnyJson} from '@salesforce/ts-types';
import chalk from 'chalk';
import fs = require('fs-extra');
import {SobjectResult} from '../../models/sObjectResult';
import {displaylog} from '../../service/displayError';
import {getNameSpacePrefix} from '../../service/getNamespacePrefix';

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
    filepath: flags.string({char: 'p', description: 'file path' })
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

    interface LightningComponentBundle {
      Description: string;
      Id: string;
      NamespacePrefix: string;
      ApiVersion: number;
      FullName: string;
      IsExposed: boolean;
      Metadata: LightningComponentMetadataBundle;
    }

    interface LightningComponentMetadataBundle {
      masterLabel: string;
      description: string;
      apiVersion: number;
      lwcResources: LwcResources;
      isExposed: boolean;
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
      source: string;
    }

    let _path = this.flags.filepath;
    let _fileOrDirName = _path.substring(_path.lastIndexOf('/') + 1);
    let isDirectory: boolean = false;

    let validFiles: string[] = []; // Array of all file Names to Save to Server
    let filePath: string[] = []; // Array of file path which acts as key

    // This is when user provided the directory path
    if (_fileOrDirName === _fileOrDirName.split('.')[0]) {
      validFiles = await fs.readdir(_path);
      isDirectory = true;
      filePath = validFiles.map( file => getFilepath(_fileOrDirName, file));
    } else {
      // Below code when user provided file path and Not directory path
      const fileNameWithPath = _fileOrDirName;
      validFiles.push(_fileOrDirName);
      // Directory Name
      _fileOrDirName = _fileOrDirName.split('.')[0];
      filePath.push(getFilepath( _fileOrDirName, fileNameWithPath));
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
          displaylog(chalk.bold.redBright(JSON.stringify(newLWCBundle.errors)), this.ux);
        }
      }
      if (lwcBundles.length > 0) {
        let lwcResources = await getLWCResources(lwcBundles[0].Id) as LightningComponentResource[];
        lwcResources = lwcResources.length > 0 ? lwcResources : [];
        try {
          await upsertLWCDefinition(lwcResources, fileBodyArray, lwcBundles[0].Id);
          this.ux.stopSpinner(chalk.bold.greenBright('Lighnting Web Components Deployed Successfully ✔'));
          // console.log(auraDefinitionsResult);
        } catch (exception) {
          this.ux.stopSpinner(chalk.bold.redBright('Failed ✖'));
          displaylog(chalk.bold.redBright(exception), this.ux);
        }
      }
    } catch (exception) {
      this.ux.stopSpinner(chalk.bold.redBright('Failed ✖'));
      displaylog(chalk.bold.redBright(exception), this.ux);
    }

    // function to create LightningComponentBundle
    async function createLWCBundle(name: string, files: string[]) {
      // LWC bundles require metadata as LWCBundle with all the resources for creation
      const newLWCMetadataBundle = {} as LightningComponentMetadataBundle;
      newLWCMetadataBundle.masterLabel = name;
      newLWCMetadataBundle.description = 'A LWC Bundle';
      newLWCMetadataBundle.apiVersion = Number(apiVersion);
      newLWCMetadataBundle.isExposed = false;
      const target = [];
      const targetObject = {} as Target;
      targetObject.target = target;
      newLWCMetadataBundle.targets = targetObject;
      // Create LWC Resources
      const lstlwcResources = [] as LwcResource[];
      // For create scenario lets add all the files even if the user performs save on one of the files
      // Override the path variable
      if (!isDirectory) {
        // overrwite and get all files in the bundle
        isDirectory = true;
        _path = _path.substring(0, _path.lastIndexOf('/'));
        validFiles = await fs.readdir(_path);
        files = await getFileBodyMap(validFiles);
        _fileOrDirName = _path.substring(_path.lastIndexOf('/') + 1);
        filePath = validFiles.map( file => getFilepath(_fileOrDirName, file));
      }
      // Filter all the xml files as those are not supported yet
      validFiles = validFiles.filter( file => {
        if (file.substring(file.lastIndexOf('.') + 1) !== 'xml') {
          return file;
        }
      });

      validFiles.forEach ( filename => {
        const lwcResourceFile = {} as LwcResource;
        lwcResourceFile.filePath = getFilepath( _fileOrDirName, filename);
        // Base 64 encode as per the API Specification
        lwcResourceFile.source = Buffer.from((files[filePath.indexOf(getFilepath( _fileOrDirName, filename))])).toString('base64');
        lstlwcResources.push(lwcResourceFile);
      });
      // Create LWC Resource
      const lwcResources = {} as LwcResources;
      lwcResources.lwcResource = lstlwcResources;

      // Assign to metadata Bundle
      newLWCMetadataBundle.lwcResources = lwcResources;

      const newLWCBundle = {} as LightningComponentBundle;
      newLWCBundle.FullName = name;
      newLWCBundle.Metadata = newLWCMetadataBundle;
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
        validFiles.forEach ( filename => {
          const lwcMatch = lwcResources.find(lwc => lwc.FilePath === getFilepath( _fileOrDirName, filename));
          if (lwcMatch) {
            const lwcResourceToUpdate = {} as LightningComponentResource;
            lwcResourceToUpdate.Id = lwcMatch.Id;
            lwcResourceToUpdate.Source = files[filePath.indexOf(lwcMatch.FilePath)];
            lwcResourcesToUpdate.push(lwcResourceToUpdate);
          } else {
            const lwcResourceToInsert = {} as LightningComponentResource;
            lwcResourceToInsert.LightningComponentBundleId = bundleId;
            lwcResourceToInsert.FilePath = getFilepath( _fileOrDirName, filename);
            lwcResourceToInsert.Format = (filename.split('.'))[(filename.split('.').length - 1)];
            lwcResourceToInsert.Source = files[filePath.indexOf(getFilepath( _fileOrDirName, filename))];
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

    // function to get filepath
    function getFilepath(directory: string, fileName: string) {
      return 'lwc/' + directory + '/' + fileName;
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
