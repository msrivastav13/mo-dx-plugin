import { SfCommand, Flags, requiredOrgFlagWithDeprecations, orgApiVersionFlagWithDeprecations, loglevel } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import chalk from 'chalk';
import fs from 'fs-extra';
import {SobjectResult} from '../../models/sObjectResult.js';
import {displaylog} from '../../service/displayError.js';
import {getNameSpacePrefix} from '../../service/getNamespacePrefix.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

const messages = Messages.loadMessages('mo-dx-plugin', 'org');

export default class LWCDeploy extends SfCommand<any> {

  public static description = messages.getMessage('lwcDeploy');

  public static examples = [
  '$ sfdx deploy:lwc -p filepath'
  ];

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    // flag with a value (-n, --name=VALUE)
    filepath: Flags.string({char: 'p', description: 'file path' })
  };

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  public static readonly requiresProject = true;

  private startTime: number ;

  private endTime: number;

  public async run(): Promise<any> {
    const { flags } = await this.parse(LWCDeploy);

    this.spinner.start(chalk.bold.yellowBright('Saving'));
    this.startTime = new Date().getTime();

    const conn = flags['target-org'].getConnection(flags['api-version']);

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

    let _path = flags.filepath;
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
      lwcBundles = await getLWCDefinitionBundle(_fileOrDirName) as unknown as LightningComponentBundle[];
      if (lwcBundles.length === 0) {
        const newLWCBundle = await createLWCBundle(_fileOrDirName, fileBodyArray) as unknown as SobjectResult;
        if (newLWCBundle.success) {
          const lwcBundleVar = {} as LightningComponentBundle;
          lwcBundleVar.Id = newLWCBundle.id;
          lwcBundles.push(lwcBundleVar);
        } else {
          displaylog(chalk.bold.redBright(JSON.stringify(newLWCBundle.errors)), this);
        }
      }
      if (lwcBundles.length > 0) {
        let lwcResources = await getLWCResources(lwcBundles[0].Id) as unknown as LightningComponentResource[];
        lwcResources = lwcResources.length > 0 ? lwcResources : [];
        try {
          await upsertLWCDefinition(lwcResources, fileBodyArray, lwcBundles[0].Id);
          this.endTime = new Date().getTime();
          const executionTime = (this.endTime - this.startTime) / 1000;
          this.spinner.stop(chalk.bold.greenBright(`Lighnting Web Components Deployed Successfully ✔.Command execution time: ${executionTime} seconds`));
          // console.log(auraDefinitionsResult);
        } catch (exception) {
          this.spinner.stop(chalk.bold.redBright('Failed ✖'));
          displaylog(chalk.bold.redBright(exception), this);
        }
      }
    } catch (exception) {
      this.spinner.stop(chalk.bold.redBright('Failed ✖'));
      displaylog(chalk.bold.redBright(exception), this);
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
    // There is a bug in the JSforce for bulk inserts so executing insert/updates in loop instead of array
    async function upsertLWCDefinition(lwcResources: LightningComponentResource[] , files: string[], bundleId: string) {
        // const lwcResourcesToCreate: LightningComponentResource[] = [];
        // const lwcResourcesToUpdate: LightningComponentResource[] = [];
        const promiseArray = [];
        validFiles.forEach ( filename => {
          const lwcMatch = lwcResources.find(lwc => lwc.FilePath === getFilepath( _fileOrDirName, filename));
          if (lwcMatch) {
            const lwcResourceToUpdate = {} as LightningComponentResource;
            lwcResourceToUpdate.Id = lwcMatch.Id;
            lwcResourceToUpdate.Source = files[filePath.indexOf(lwcMatch.FilePath)];
            promiseArray.push(conn.tooling.sobject('LightningComponentResource').update(lwcResourceToUpdate));
          } else {
            const lwcResourceToInsert = {} as LightningComponentResource;
            lwcResourceToInsert.LightningComponentBundleId = bundleId;
            lwcResourceToInsert.FilePath = getFilepath( _fileOrDirName, filename);
            lwcResourceToInsert.Format = (filename.split('.'))[(filename.split('.').length - 1)];
            lwcResourceToInsert.Source = files[filePath.indexOf(getFilepath( _fileOrDirName, filename))];
            promiseArray.push(conn.tooling.sobject('LightningComponentResource').create(lwcResourceToInsert));
            // lwcResourcesToCreate.push(lwcResourceToInsert);
          }
        });
        /*if (lwcResourcesToUpdate.length > 0) {
          promiseArray.push(conn.tooling.sobject('LightningComponentResource').update(lwcResourcesToUpdate));
        }
        if (lwcResourcesToCreate.length > 0) {
          promiseArray.push(conn.tooling.sobject('LightningComponentResource').create(lwcResourcesToCreate));
        }*/
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
