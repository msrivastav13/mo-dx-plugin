import { expect } from 'chai';
import sinon from 'sinon';
import { executeToolingQuery } from '../../src/service/toolingQuery.js';

describe('executeToolingQuery', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('delegates the query string to conn.tooling.query', async () => {
    const mockResult = { totalSize: 1, done: true, records: [{ Id: '001xx' }] };
    const conn = {
      tooling: {
        query: sandbox.stub().resolves(mockResult)
      }
    } as any;

    const result = await executeToolingQuery('SELECT Id FROM ApexClass', conn);
    expect(result).to.deep.equal(mockResult);
    expect(conn.tooling.query.calledWith('SELECT Id FROM ApexClass')).to.be.true;
  });

  it('propagates errors from the connection', async () => {
    const conn = {
      tooling: {
        query: sandbox.stub().rejects(new Error('INVALID_QUERY'))
      }
    } as any;

    try {
      await executeToolingQuery('SELECT Bad FROM Nothing', conn);
      expect.fail('should have thrown');
    } catch (e: any) {
      expect(e.message).to.equal('INVALID_QUERY');
    }
  });
});
