import { expect } from 'chai';
import sinon from 'sinon';
import { Deploy } from '../../src/service/deploy.js';

describe('Deploy', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('sets all properties from constructor', () => {
    const conn = {} as any;
    const deploy = new Deploy('ApexContainer', 'ApexClassMember', 'MyClass', 'id1', 'body', '<xml/>', conn);

    expect(deploy.containerType).to.equal('ApexContainer');
    expect(deploy.classMember).to.equal('ApexClassMember');
    expect(deploy.className).to.equal('MyClass');
    expect(deploy.componentId).to.equal('id1');
    expect(deploy.componentBody).to.equal('body');
    expect(deploy.content).to.equal('<xml/>');
    expect(deploy.conn).to.equal(conn);
  });

  it('returns success when all three steps succeed with Completed state', async () => {
    const createStub = sandbox.stub();
    createStub.onFirstCall().resolves({ success: true, id: 'container001' });
    createStub.onSecondCall().resolves({ success: true, id: 'member001' });
    createStub.onThirdCall().resolves({ success: true, id: 'async001' });

    const queryStub = sandbox.stub().resolves({
      totalSize: 1, done: true,
      records: [{ Id: 'async001', State: 'Completed', ErrorMsg: '', DeployDetails: { componentFailures: [] }, attributes: {}, NamespacePrefix: '' }]
    });

    const conn = {
      tooling: {
        sobject: sandbox.stub().returns({ create: createStub }),
        query: queryStub
      }
    } as any;

    const deploy = new Deploy(
      'ApexContainer', 'ApexClassMember', 'MyClass', 'id1',
      'public class MyClass {}',
      '<?xml version="1.0" encoding="UTF-8"?><ApexClass xmlns="http://soap.sforce.com/2006/04/metadata"><apiVersion>55.0</apiVersion></ApexClass>',
      conn
    );
    const result = await deploy.deployMetadata();

    expect(result.success).to.be.true;
    expect(result.queryResult.records[0].State).to.equal('Completed');
  });

  it('returns failure when metadata container creation fails', async () => {
    const createStub = sandbox.stub().resolves({ success: false, id: '', errors: ['duplicate'] });

    const conn = {
      tooling: {
        sobject: sandbox.stub().returns({ create: createStub })
      }
    } as any;

    const deploy = new Deploy('ApexContainer', 'ApexClassMember', 'MyClass', 'id1', 'body', '<xml/>', conn);
    const result = await deploy.deployMetadata();

    expect(result.success).to.be.false;
    expect(result.error).to.equal('Metadata Container Creation Failed');
  });

  it('returns failure when metadata member creation fails', async () => {
    const createStub = sandbox.stub();
    createStub.onFirstCall().resolves({ success: true, id: 'container001' });
    createStub.onSecondCall().resolves({ success: false, id: '', errors: ['Invalid body'] });

    const conn = {
      tooling: {
        sobject: sandbox.stub().returns({ create: createStub })
      }
    } as any;

    const deploy = new Deploy(
      'ApexContainer', 'ApexClassMember', 'MyClass', 'id1',
      'code',
      '<?xml version="1.0" encoding="UTF-8"?><ApexClass xmlns="http://soap.sforce.com/2006/04/metadata"><apiVersion>55.0</apiVersion></ApexClass>',
      conn
    );
    const result = await deploy.deployMetadata();

    expect(result.success).to.be.false;
    expect(result.error).to.contain('Invalid body');
  });
});
