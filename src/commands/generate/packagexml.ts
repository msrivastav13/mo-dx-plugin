import { core, flags, SfdxCommand } from '@salesforce/command';
import chalk from 'chalk';
import * as child from 'child_process';
import * as util from 'util';
import {MetadataResult} from '../../models/metadataResult';
import {PackageXmlTemplate} from '../../service/packagexmlTemplate';
// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('mo-dx-plugin', 'org');

const exec = util.promisify(child.exec);

export default class PackageXML extends SfdxCommand {

  public static description = messages.getMessage('generatePackageXML');

  public static examples = [
    '$ sfdx generate:packagexml -m ApexClass',
    '$ sfdx generate:packagexml -m CustomObject',
    '$ sfdx generate:packagexml -m ApexClass:MyApexClass1,MyApexClass2'
  ];

  protected static flagsConfig = {
    metadatatype : flags.string({
      required: true,
      char: 'm',
      description: 'the name of the metadata you want the package.xml for'
    })
  };

  protected static requiresProject = true;
  protected static requiresUsername = true;

  public async run(): Promise<string> {
    let packagexml ;
    const conn = this.org.getConnection();
    const apiVersion = conn.getApiVersion();
    const defaultusername = this.flags.targetusername
      ? this.flags.targetusername
      : this.org.getUsername();
    this.ux.startSpinner(chalk.yellowBright('Building package xml for ' + this.flags.metadatatype));
    const listMetadata = `sfdx force:mdapi:listmetadata -m ${this.flags.metadatatype} -u ${defaultusername} --json`;
    try {
      const result =  await exec(listMetadata, {
        maxBuffer: 1000000 * 1024
      });
      const jsonResult = result.stdout;
      const metadatalist = JSON.parse(jsonResult).result as MetadataResult[];
      packagexml = this.createXML(metadatalist, apiVersion);
      process.stdout.write(packagexml);
      this.ux.stopSpinner(chalk.greenBright('Package XML generated Successfully ✔'));
    } catch (exception) {

    }
    return packagexml;
  }

  private createXML(metadataResults: MetadataResult[], version: string): string {
    let xml = '' as string;
    xml = PackageXmlTemplate.createHeader();
    xml = xml + PackageXmlTemplate.startType();
    for (const componentname of metadataResults) {
        xml = xml + PackageXmlTemplate.createMember(componentname.fullName);
    }
    xml = xml + PackageXmlTemplate.nameTag(this.flags.metadatatype);
    xml = xml + PackageXmlTemplate.endType();
    xml = xml + PackageXmlTemplate.createFooter(version);
    return xml;
  }
}
