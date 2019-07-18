import * as child from 'child_process';
import * as util from 'util';
import {DescribeMetadataResult} from '../../models/describemetadataResult';

const exec = util.promisify(child.exec);

export class DescribeMetadata {

  private username: string;

  constructor(username: string) {
    this.username = username;
  }

  public async describeMetadata(): Promise<DescribeMetadataResult> {
    const describeMetadata = `sfdx force:mdapi:describemetadata -u ${this.username} --json`;
    try {
      const result =  await exec(describeMetadata, {
        maxBuffer: 1000000 * 1024
      });
      const jsonResult = result.stdout;
      const metadatalist = JSON.parse(jsonResult).result as DescribeMetadataResult;
      return metadatalist;
    } catch (exception) {
      process.stdout.write(exception);
    }
  }

}
