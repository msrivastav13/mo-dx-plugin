import AdmZip from 'adm-zip';
import { expect } from 'chai';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import sinon from 'sinon';
import { retrievePackage } from '../../src/service/retrievePackage.js';

function zipBase64(entries: Record<string, string>): string {
  const zip = new AdmZip();
  for (const [name, content] of Object.entries(entries)) {
    zip.addFile(name, Buffer.from(content, 'utf8'));
  }
  return zip.toBuffer().toString('base64');
}

function makeConn(sandbox: sinon.SinonSandbox, statuses: object[]) {
  const checkRetrieveStatus = sandbox.stub();
  statuses.forEach((status, i) => checkRetrieveStatus.onCall(i).resolves(status));
  return {
    getApiVersion: () => '62.0',
    metadata: {
      retrieve: sandbox.stub().resolves({ id: '09Sxx0000000001' }),
      checkRetrieveStatus
    }
  } as any;
}

describe('retrievePackage', () => {
  let sandbox: sinon.SinonSandbox;
  let workDir: string;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'retrieve-pkg-'));
  });

  afterEach(async () => {
    sandbox.restore();
    await fs.remove(workDir);
  });

  it('requests a single package and extracts the zip into the target dir', async () => {
    const conn = makeConn(sandbox, [
      { done: false, status: 'InProgress' },
      {
        done: true,
        success: true,
        status: 'Succeeded',
        zipFile: zipBase64({ 'package.xml': '<Package/>', 'classes/Foo.cls': 'public class Foo {}' })
      }
    ]);
    const targetDir = path.join(workDir, 'src');

    const result = await retrievePackage({ conn, packageName: 'My "Pkg"; rm -rf ~', targetDir, pollIntervalMs: 0 });

    expect(conn.metadata.retrieve.firstCall.args[0]).to.deep.equal({
      apiVersion: 62,
      packageNames: ['My "Pkg"; rm -rf ~'],
      singlePackage: true
    });
    expect(conn.metadata.checkRetrieveStatus.callCount).to.equal(2);
    expect(await fs.readFile(path.join(targetDir, 'package.xml'), 'utf8')).to.equal('<Package/>');
    expect(await fs.readFile(path.join(targetDir, 'classes/Foo.cls'), 'utf8')).to.equal('public class Foo {}');
    expect(result.messages).to.deep.equal([]);
  });

  it('returns non-fatal retrieve messages, normalising a single message object', async () => {
    const conn = makeConn(sandbox, [
      {
        done: true,
        success: true,
        status: 'Succeeded',
        messages: { fileName: 'unpackaged/package.xml', problem: 'No package named Foo found' },
        zipFile: zipBase64({ 'package.xml': '<Package/>' })
      }
    ]);

    const result = await retrievePackage({ conn, packageName: 'Foo', targetDir: workDir, pollIntervalMs: 0 });

    expect(result.messages).to.deep.equal(['unpackaged/package.xml: No package named Foo found']);
  });

  it('throws the API error message when the retrieve fails', async () => {
    const conn = makeConn(sandbox, [
      { done: true, success: false, status: 'Failed', errorMessage: 'INVALID_CROSS_REFERENCE_KEY' }
    ]);

    try {
      await retrievePackage({ conn, packageName: 'Foo', targetDir: workDir, pollIntervalMs: 0 });
      expect.fail('should have thrown');
    } catch (e: any) {
      expect(e.message).to.equal('INVALID_CROSS_REFERENCE_KEY');
    }
  });

  it('throws when the retrieve does not complete before the timeout', async () => {
    const conn = makeConn(sandbox, [{ done: false, status: 'InProgress' }]);
    conn.metadata.checkRetrieveStatus.resolves({ done: false, status: 'InProgress' });

    try {
      await retrievePackage({ conn, packageName: 'Foo', targetDir: workDir, timeoutMs: 0, pollIntervalMs: 0 });
      expect.fail('should have thrown');
    } catch (e: any) {
      expect(e.message).to.include('did not complete');
    }
  });

  it('does not write zip entries outside the target dir (zip slip)', async () => {
    const zip = new AdmZip();
    zip.addFile('package.xml', Buffer.from('<Package/>', 'utf8'));
    zip.addFile('placeholder.txt', Buffer.from('owned', 'utf8'));
    // addFile normalises names, so rewrite the entry name to a traversal path directly.
    zip.getEntry('placeholder.txt').entryName = '../escaped.txt';
    const conn = makeConn(sandbox, [
      { done: true, success: true, status: 'Succeeded', zipFile: zip.toBuffer().toString('base64') }
    ]);
    const targetDir = path.join(workDir, 'src');

    try {
      await retrievePackage({ conn, packageName: 'Foo', targetDir, pollIntervalMs: 0 });
    } catch {
      // adm-zip may reject the archive outright; either way nothing may escape.
    }

    expect(await fs.pathExists(path.join(workDir, 'escaped.txt'))).to.be.false;
  });
});
