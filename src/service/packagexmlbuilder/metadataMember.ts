import * as child from 'child_process';
import * as util from 'util';
import {MetadataResult} from '../../models/metadataResult';
import {PackageXmlTemplate} from './packagexmlTemplate';

const exec = util.promisify(child.exec);

export class MetadataMember {

  public metadatatype: string;
  public username: string;

  constructor(metadatatype: string, username: string) {
    this.metadatatype = metadatatype;
    this.username = username;
  }

  public async createMemberXml(): Promise<string> {
    let metadataxml = '';
    metadataxml = metadataxml + PackageXmlTemplate.startType();
    for (const componentname of await this.getMembers()) {
      metadataxml = metadataxml + PackageXmlTemplate.createMember(componentname.fullName);
    }
    metadataxml = metadataxml + PackageXmlTemplate.nameTag(this.metadatatype);
    metadataxml = metadataxml + PackageXmlTemplate.endType();
    return metadataxml;
  }

  private async getMembers(): Promise<MetadataResult[]> {
      const listMetadata = `sfdx force:mdapi:listmetadata -m ${this.metadatatype} -u ${this.username} --json`;
      try {
        const result =  await exec(listMetadata, {
          maxBuffer: 1000000 * 1024
        });
        const jsonResult = result.stdout;
        const metadatalist = JSON.parse(jsonResult).result as MetadataResult[];
        return metadatalist;
      } catch (exception) {
        process.stdout.write(exception);
      }
  }
}
