import { expect, test } from '@salesforce/command/lib/test';
import { ensureJsonMap, ensureString } from '@salesforce/ts-types';
import * as childprocess from 'child_process';
import * as fs from 'fs';
import { promisify } from 'util';

const exec = promisify(childprocess.exec);
const apexclassName = 'MyClass';

describe('deploy:apex', () => {

  before(async () => {
      await exec(`sfdx force:apex:class:create -n ${apexclassName}`).then();
  });

  test
    .withOrg({ username: 'test@org.com' }, true)
    .withProject()
    .withConnectionRequest(request => {
      const requestMap = ensureJsonMap(request);
      console.log(requestMap);
      if (ensureString(requestMap.url).match(/Apexclass/)) {
        return Promise.resolve({ records: [] });
      }
      if (ensureString(requestMap.url).match(/Organization/)) {
        return Promise.resolve({ records: [] });
      }
    })
    .stdout()
    .command(['deploy:apex', '-p', 'MyClass.cls'])
    .it('runs deploy apex call with new apex file', ctx => {
      expect(ctx.stdout).to.contain('');
    });

    after(async () => {
      fs.unlinkSync(`${apexclassName}.cls`);
      fs.unlinkSync(`${apexclassName}.cls-meta.xml`);
    });

});
