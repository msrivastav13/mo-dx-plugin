import { expect } from 'chai';
import sinon from 'sinon';
import { createMetadataMember } from '../../src/service/createmetadataMember.js';

describe('createMetadataMember', () => {
  let sandbox: sinon.SinonSandbox;

  const sampleMetaXml = `<?xml version="1.0" encoding="UTF-8"?>
<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>55.0</apiVersion>
    <status>Active</status>
</ApexClass>`;

  const sampleMetaXmlMinimal = `<?xml version="1.0" encoding="UTF-8"?>
<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>55.0</apiVersion>
</ApexClass>`;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('creates a metadata member with correct fields including entityId', async () => {
    const createStub = sandbox.stub().resolves({ success: true, id: 'member001' });
    const conn = {
      tooling: {
        sobject: sandbox.stub().returns({ create: createStub })
      }
    } as any;

    const result = await createMetadataMember(
      'ApexClassMember', 'container123', 'public class Foo {}',
      sampleMetaXml, 'entity456', 'Foo', conn
    );

    expect(result).to.deep.equal({ success: true, id: 'member001' });
    expect(conn.tooling.sobject.calledWith('ApexClassMember')).to.be.true;

    const createArg = createStub.firstCall.args[0];
    expect(createArg.MetadataContainerId).to.equal('container123');
    expect(createArg.Body).to.equal('public class Foo {}');
    expect(createArg.FullName).to.equal('Foo');
    expect(createArg.ContentEntityId).to.equal('entity456');
    expect(createArg.Metadata.apiVersion).to.equal('55.0');
    expect(createArg.Metadata.status).to.equal('Active');
  });

  it('omits ContentEntityId when entityId is null', async () => {
    const createStub = sandbox.stub().resolves({ success: true, id: 'member002' });
    const conn = {
      tooling: {
        sobject: sandbox.stub().returns({ create: createStub })
      }
    } as any;

    await createMetadataMember(
      'ApexClassMember', 'container123', 'public class Bar {}',
      sampleMetaXmlMinimal, null, 'Bar', conn
    );

    const createArg = createStub.firstCall.args[0];
    expect(createArg).to.not.have.property('ContentEntityId');
  });

  it('parses metadata XML with only apiVersion', async () => {
    const createStub = sandbox.stub().resolves({ success: true, id: 'member003' });
    const conn = {
      tooling: {
        sobject: sandbox.stub().returns({ create: createStub })
      }
    } as any;

    await createMetadataMember(
      'ApexClassMember', 'container123', 'code',
      sampleMetaXmlMinimal, null, 'Test', conn
    );

    const createArg = createStub.firstCall.args[0];
    expect(createArg.Metadata.apiVersion).to.equal('55.0');
    expect(createArg.Metadata).to.not.have.property('status');
  });

  it('throws an error for invalid XML', async () => {
    const conn = {
      tooling: {
        sobject: sandbox.stub().returns({ create: sandbox.stub() })
      }
    } as any;

    try {
      await createMetadataMember(
        'ApexClassMember', 'c1', 'code', 'not xml at all', null, 'Bad', conn
      );
      expect.fail('should have thrown');
    } catch (e: any) {
      expect(e.message).to.equal('Error parsing Metadata xml');
    }
  });
});
