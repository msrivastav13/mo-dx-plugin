import AdmZip from 'adm-zip';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  isToolingSchemaRefBug,
  buildLwcPackageXml,
  metadataFallbackDeploy,
} from '../../../src/service/metadataDeployLwc.js';

describe('isToolingSchemaRefBug', () => {
  it('returns false for a genuine compile error (LWC1099)', () => {
    expect(isToolingSchemaRefBug(new Error('LWC1099: Unknown prop "foo"'))).to.be.false;
  });

  it('returns true when errorCode is FIELD_INTEGRITY_EXCEPTION', () => {
    const err = Object.assign(new Error('some message'), { errorCode: 'FIELD_INTEGRITY_EXCEPTION' });
    expect(isToolingSchemaRefBug(err)).to.be.true;
  });

  it('returns true when message contains FIELD_INTEGRITY_EXCEPTION', () => {
    expect(isToolingSchemaRefBug(new Error('FIELD_INTEGRITY_EXCEPTION: bad reference'))).to.be.true;
  });

  it('returns true when message matches Invalid reference … of type sobjectField pattern', () => {
    expect(
      isToolingSchemaRefBug(new Error('Invalid reference CustomObject__c.CustomField__c of type sobjectField in file ccdxSample.js: Source'))
    ).to.be.true;
  });

  // Observed against a real org (API 66): the jsforce path surfaces the schema-ref bug
  // as AURA_COMPILE_ERROR, NOT FIELD_INTEGRITY_EXCEPTION (which is the raw-REST form). The
  // message regex — not the errorCode — is what distinguishes it.
  it('returns true for the real AURA_COMPILE_ERROR schema-ref bug shape', () => {
    const err = Object.assign(
      new Error('Invalid reference CustomObject__c.CustomField__c of type sobjectField in file ccdxSample.js'),
      { errorCode: 'AURA_COMPILE_ERROR', name: 'AURA_COMPILE_ERROR' }
    );
    expect(isToolingSchemaRefBug(err)).to.be.true;
  });

  // Same errorCode as the bug, but a genuine compile error — must NOT trigger the fallback.
  it('returns false for a genuine AURA_COMPILE_ERROR parse error (LWC1503)', () => {
    const err = Object.assign(
      new Error('ccdxSample.js [Line: 5, Col: 2] (markup://c:ccdxSample) -- LWC1503: Parsing error: Missing semicolon. (5:2)'),
      { errorCode: 'AURA_COMPILE_ERROR', name: 'AURA_COMPILE_ERROR' }
    );
    expect(isToolingSchemaRefBug(err)).to.be.false;
  });

  it('returns false for unrelated non-Error values', () => {
    expect(isToolingSchemaRefBug('Something went wrong')).to.be.false;
    expect(isToolingSchemaRefBug(null)).to.be.false;
  });
});

describe('buildLwcPackageXml', () => {
  it('generates well-formed package.xml with LightningComponentBundle member', () => {
    const xml = buildLwcPackageXml('myBundle', '60.0');
    expect(xml).to.include('<members>myBundle</members>');
    expect(xml).to.include('<name>LightningComponentBundle</name>');
    expect(xml).to.include('<version>60.0</version>');
    expect(xml).to.include('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).to.include('<Package xmlns="http://soap.sforce.com/2006/04/metadata">');
  });
});

describe('metadataFallbackDeploy', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  function buildConn({
    deployResult = { id: 'deployId001', done: false } as any,
    checkStatusResult = { status: 'Succeeded', success: true, details: { componentFailures: [] } } as any,
    findResult = [] as Array<{ FilePath: string; Source: string }>,
  } = {}) {
    const findStub = sandbox.stub().resolves(findResult);
    const sobjectStub = sandbox.stub().returns({ find: findStub });
    const deployStub = sandbox.stub().resolves(deployResult);
    const checkDeployStatusStub = sandbox.stub().resolves(checkStatusResult);
    return {
      conn: {
        tooling: { sobject: sobjectStub },
        metadata: { deploy: deployStub, checkDeployStatus: checkDeployStatusStub },
      } as any,
      deployStub,
      checkDeployStatusStub,
      findStub,
      sobjectStub,
    };
  }

  it('test 4 — directory path: fallback succeeds, zip contains all bundle files and valid package.xml', async () => {
    const { conn, deployStub, checkDeployStatusStub } = buildConn();

    const result = await metadataFallbackDeploy({
      conn,
      isDirectory: true,
      validFiles: ['ccdxSample.js', 'ccdxSample.html', 'ccdxSample.js-meta.xml'],
      filePath: ['lwc/ccdxSample/ccdxSample.js', 'lwc/ccdxSample/ccdxSample.html', 'lwc/ccdxSample/ccdxSample.js-meta.xml'],
      fileBodyArray: ['js content', '<template></template>', '<LightningComponentBundle/>'],
      lwcBundleId: 'bundleId001',
      bundleName: 'ccdxSample',
      apiVersion: '60.0',
      timeoutMs: 5_000,
      pollIntervalMs: 0,
    });

    expect(result.success).to.be.true;

    // Verify zip contents
    const [zipBuffer] = deployStub.firstCall.args;
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries().map(e => e.entryName);
    expect(entries).to.include('lwc/ccdxSample/ccdxSample.js');
    expect(entries).to.include('lwc/ccdxSample/ccdxSample.html');
    expect(entries).to.include('lwc/ccdxSample/ccdxSample.js-meta.xml');
    expect(entries).to.include('package.xml');

    const pkgXmlEntry = zip.getEntry('package.xml');
    const pkgXml = pkgXmlEntry.getData().toString('utf8');
    expect(pkgXml).to.include('<members>ccdxSample</members>');
    expect(pkgXml).to.include('<name>LightningComponentBundle</name>');
    expect(pkgXml).to.include('<version>60.0</version>');

    const [, deployOptions] = deployStub.firstCall.args;
    expect(deployOptions).to.deep.include({ singlePackage: true, rollbackOnError: true });

    sinon.assert.calledWith(checkDeployStatusStub, 'deployId001', true);
  });

  it('test 4b — incomplete bundle: bails with re-run guidance when js-meta.xml is absent, never deploys', async () => {
    const { conn, deployStub } = buildConn();

    // Simulates the create-then-fallback path, where createLWCBundle has
    // filtered *.xml (including js-meta.xml) out of validFiles.
    const result = await metadataFallbackDeploy({
      conn,
      isDirectory: true,
      validFiles: ['ccdxSample.js', 'ccdxSample.html'],
      filePath: ['lwc/ccdxSample/ccdxSample.js', 'lwc/ccdxSample/ccdxSample.html'],
      fileBodyArray: ['js content', '<template></template>'],
      lwcBundleId: 'bundleId001',
      bundleName: 'ccdxSample',
      apiVersion: '60.0',
      timeoutMs: 5_000,
      pollIntervalMs: 0,
    });

    expect(result.success).to.be.false;
    expect(result.message).to.include('missing ccdxSample.js-meta.xml');
    expect(result.message).to.include('full bundle directory');
    // Guard must short-circuit before any deploy is attempted.
    sinon.assert.notCalled(deployStub);
  });

  it('test 4c — creation: directory deploy with no bundle Id creates the bundle (no org query)', async () => {
    const { conn, deployStub, findStub } = buildConn();

    // Mirrors the create-fallback: full bundle re-read from disk (incl. meta), empty lwcBundleId.
    const result = await metadataFallbackDeploy({
      conn,
      isDirectory: true,
      validFiles: ['ccdxSample.js', 'ccdxSample.html', 'ccdxSample.js-meta.xml'],
      filePath: ['lwc/ccdxSample/ccdxSample.js', 'lwc/ccdxSample/ccdxSample.html', 'lwc/ccdxSample/ccdxSample.js-meta.xml'],
      fileBodyArray: ['js content', '<template></template>', '<LightningComponentBundle/>'],
      lwcBundleId: '',
      bundleName: 'ccdxSample',
      apiVersion: '60.0',
      timeoutMs: 5_000,
      pollIntervalMs: 0,
    });

    expect(result.success).to.be.true;
    // Directory mode must not query org resources (that branch is single-file only).
    sinon.assert.notCalled(findStub);
    // The deployed zip is a complete, valid bundle.
    const [zipBuffer] = deployStub.firstCall.args;
    const entries = new AdmZip(zipBuffer).getEntries().map(e => e.entryName);
    expect(entries).to.include('lwc/ccdxSample/ccdxSample.js-meta.xml');
    expect(entries).to.include('package.xml');
  });

  it('test 5 — single file: fetches org resources and overlays changed file', async () => {
    const orgResources = [
      { FilePath: 'lwc/ccdxSample/ccdxSample.js', Source: 'original js' },
      { FilePath: 'lwc/ccdxSample/ccdxSample.html', Source: '<template/>' },
      { FilePath: 'lwc/ccdxSample/ccdxSample.js-meta.xml', Source: '<LightningComponentBundle/>' },
    ];
    const { conn, deployStub, findStub } = buildConn({ findResult: orgResources });

    const result = await metadataFallbackDeploy({
      conn,
      isDirectory: false,
      validFiles: ['ccdxSample.js'],
      filePath: ['lwc/ccdxSample/ccdxSample.js'],
      fileBodyArray: ['updated js content'],
      lwcBundleId: 'bundleId001',
      bundleName: 'ccdxSample',
      apiVersion: '60.0',
      timeoutMs: 5_000,
      pollIntervalMs: 0,
    });

    expect(result.success).to.be.true;

    sinon.assert.calledWith(findStub, { LightningComponentBundleId: 'bundleId001' }, ['FilePath', 'Source']);

    const [zipBuffer] = deployStub.firstCall.args;
    const zip = new AdmZip(zipBuffer);
    const jsEntry = zip.getEntry('lwc/ccdxSample/ccdxSample.js');
    expect(jsEntry.getData().toString('utf8')).to.equal('updated js content');
    const htmlEntry = zip.getEntry('lwc/ccdxSample/ccdxSample.html');
    expect(htmlEntry.getData().toString('utf8')).to.equal('<template/>');
  });

  it('test 5b — single file: null org resource Source is coalesced, no Buffer TypeError', async () => {
    const orgResources = [
      { FilePath: 'lwc/ccdxSample/ccdxSample.js', Source: 'original js' },
      // e.g. an empty/binary resource row that comes back with a null Source
      { FilePath: 'lwc/ccdxSample/ccdxSample.css', Source: null as unknown as string },
      { FilePath: 'lwc/ccdxSample/ccdxSample.js-meta.xml', Source: '<LightningComponentBundle/>' },
    ];
    const { conn, deployStub } = buildConn({ findResult: orgResources });

    const result = await metadataFallbackDeploy({
      conn,
      isDirectory: false,
      validFiles: ['ccdxSample.js'],
      filePath: ['lwc/ccdxSample/ccdxSample.js'],
      fileBodyArray: ['updated js content'],
      lwcBundleId: 'bundleId001',
      bundleName: 'ccdxSample',
      apiVersion: '60.0',
      timeoutMs: 5_000,
      pollIntervalMs: 0,
    });

    expect(result.success).to.be.true;
    const [zipBuffer] = deployStub.firstCall.args;
    const zip = new AdmZip(zipBuffer);
    const cssEntry = zip.getEntry('lwc/ccdxSample/ccdxSample.css');
    expect(cssEntry.getData().toString('utf8')).to.equal('');
  });

  it('test 6 — both fail: returns Metadata failure message (not original Tooling message)', async () => {
    const { conn } = buildConn({
      checkStatusResult: {
        status: 'Failed',
        success: false,
        details: {
          componentFailures: [{ fileName: 'lwc/ccdxSample/ccdxSample.js', problem: 'Compile error' }],
        },
      },
    });

    const result = await metadataFallbackDeploy({
      conn,
      isDirectory: true,
      validFiles: ['ccdxSample.js', 'ccdxSample.js-meta.xml'],
      filePath: ['lwc/ccdxSample/ccdxSample.js', 'lwc/ccdxSample/ccdxSample.js-meta.xml'],
      fileBodyArray: ['bad content', '<LightningComponentBundle/>'],
      lwcBundleId: 'bundleId001',
      bundleName: 'ccdxSample',
      apiVersion: '60.0',
      timeoutMs: 5_000,
      pollIntervalMs: 0,
    });

    expect(result.success).to.be.false;
    expect(result.message).to.include('lwc/ccdxSample/ccdxSample.js: Compile error');
    expect(result.message).to.include('Tooling API may have partially updated');
  });

  it('test 6b — single-file failure has no partial-success note', async () => {
    const { conn } = buildConn({
      checkStatusResult: {
        status: 'Failed',
        success: false,
        details: {
          componentFailures: { fileName: 'lwc/ccdxSample/ccdxSample.js', problem: 'Error' },
        },
      },
      findResult: [
        { FilePath: 'lwc/ccdxSample/ccdxSample.js', Source: 'content' },
        { FilePath: 'lwc/ccdxSample/ccdxSample.js-meta.xml', Source: '<LightningComponentBundle/>' },
      ],
    });

    const result = await metadataFallbackDeploy({
      conn,
      isDirectory: false,
      validFiles: ['ccdxSample.js'],
      filePath: ['lwc/ccdxSample/ccdxSample.js'],
      fileBodyArray: ['updated content'],
      lwcBundleId: 'bundleId001',
      bundleName: 'ccdxSample',
      apiVersion: '60.0',
      timeoutMs: 5_000,
      pollIntervalMs: 0,
    });

    expect(result.success).to.be.false;
    expect(result.message).to.not.include('Tooling API may have partially updated');
  });

  it('test 7 — timeout: returns timed-out failure when deploy never completes', async () => {
    const checkStatusStub = sandbox.stub().resolves({ status: 'InProgress', success: false });
    const conn = {
      tooling: { sobject: sandbox.stub().returns({ find: sandbox.stub() }) },
      metadata: {
        deploy: sandbox.stub().resolves({ id: 'deployId001' }),
        checkDeployStatus: checkStatusStub,
      },
    } as any;

    const result = await metadataFallbackDeploy({
      conn,
      isDirectory: true,
      validFiles: ['ccdxSample.js', 'ccdxSample.js-meta.xml'],
      filePath: ['lwc/ccdxSample/ccdxSample.js', 'lwc/ccdxSample/ccdxSample.js-meta.xml'],
      fileBodyArray: ['content', '<LightningComponentBundle/>'],
      lwcBundleId: 'bundleId001',
      bundleName: 'ccdxSample',
      apiVersion: '60.0',
      timeoutMs: 0,
      pollIntervalMs: 0,
    });

    expect(result.success).to.be.false;
    expect(result.timedOut).to.be.true;
    expect(result.message).to.include('did not complete within 0s');
    expect(result.message).to.include('may still be in progress');
    sinon.assert.notCalled(checkStatusStub);
  });

  it('test 8 — path safety: throws on FilePath containing ".."', async () => {
    const orgResources = [
      { FilePath: 'lwc/../../../etc/passwd', Source: 'evil' },
    ];
    const { conn } = buildConn({ findResult: orgResources });

    try {
      await metadataFallbackDeploy({
        conn,
        isDirectory: false,
        validFiles: ['ccdxSample.js'],
        filePath: ['lwc/ccdxSample/ccdxSample.js'],
        fileBodyArray: ['content'],
        lwcBundleId: 'bundleId001',
        bundleName: 'ccdxSample',
        apiVersion: '60.0',
        timeoutMs: 5_000,
        pollIntervalMs: 0,
      });
      expect.fail('Expected an error to be thrown');
    } catch (err: any) {
      expect(err.message).to.include('Unsafe file path in bundle');
    }
  });

  it('test 8b — path safety: throws on FilePath not starting with "lwc/"', async () => {
    const orgResources = [
      { FilePath: '/etc/passwd', Source: 'evil' },
    ];
    const { conn } = buildConn({ findResult: orgResources });

    try {
      await metadataFallbackDeploy({
        conn,
        isDirectory: false,
        validFiles: ['ccdxSample.js'],
        filePath: ['lwc/ccdxSample/ccdxSample.js'],
        fileBodyArray: ['content'],
        lwcBundleId: 'bundleId001',
        bundleName: 'ccdxSample',
        apiVersion: '60.0',
        timeoutMs: 5_000,
        pollIntervalMs: 0,
      });
      expect.fail('Expected an error to be thrown');
    } catch (err: any) {
      expect(err.message).to.include('Unsafe file path in bundle');
    }
  });

  it('test 9 — regression guard: metadata.deploy is never called when isToolingSchemaRefBug returns false', () => {
    expect(isToolingSchemaRefBug(new Error('LWC1099: Unknown property "foo"'))).to.be.false;
    expect(isToolingSchemaRefBug(new Error('NetworkError: timeout'))).to.be.false;
    expect(isToolingSchemaRefBug(null)).to.be.false;
  });
});
