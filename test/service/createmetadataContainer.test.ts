import { expect } from 'chai';
import sinon from 'sinon';
import { createMetadataContainer } from '../../src/service/createmetadataContainer.js';

describe('createMetadataContainer', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('creates a MetadataContainer with a name that includes a timestamp', async () => {
    const createStub = sandbox.stub().resolves({ success: true, id: 'container001' });
    const conn = {
      tooling: {
        sobject: sandbox.stub().returns({ create: createStub })
      }
    } as any;

    const result = await createMetadataContainer('ApexContainer', conn);

    expect(result).to.deep.equal({ success: true, id: 'container001' });
    expect(conn.tooling.sobject.calledWith('MetadataContainer')).to.be.true;

    const createArg = createStub.firstCall.args[0];
    expect(createArg.Name).to.match(/^ApexContainer\d+$/);
  });

  it('passes through connection errors', async () => {
    const conn = {
      tooling: {
        sobject: sandbox.stub().returns({
          create: sandbox.stub().rejects(new Error('Connection failed'))
        })
      }
    } as any;

    try {
      await createMetadataContainer('Test', conn);
      expect.fail('should have thrown');
    } catch (e: any) {
      expect(e.message).to.equal('Connection failed');
    }
  });
});
