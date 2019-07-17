import { core, flags, SfdxCommand } from '@salesforce/command';
import chalk from 'chalk';
import {MetadataMember} from '../../service/packagexmlbuilder/metadataMember';
import {PackageXmlTemplate} from '../../service/packagexmlbuilder/packagexmlTemplate';
// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('mo-dx-plugin', 'org');

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
    let packagexml: string ;
    const conn = this.org.getConnection();
    const apiVersion = conn.getApiVersion();
    const defaultusername = this.flags.targetusername
      ? this.flags.targetusername
      : this.org.getUsername();
    this.ux.startSpinner(chalk.yellowBright('Building package xml for ' + this.flags.metadatatype));
    packagexml = await this.createXML(this.flags.metadatatype, apiVersion, defaultusername);
    process.stdout.write(packagexml);
    this.ux.stopSpinner(chalk.greenBright('Package XML generated Successfully ✔'));
    return packagexml;
  }

  private async createXML(metadatatype: string, version: string, defaultusername: string): Promise<string> {
    let xml = '' as string;
    xml = PackageXmlTemplate.createHeader();
    const metadataMember = new MetadataMember(metadatatype, defaultusername);
    xml = xml + await metadataMember.createMemberXml();
    xml = xml + PackageXmlTemplate.createFooter(version);
    return xml;
  }
}
