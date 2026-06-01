import os from 'node:os';
import path from 'node:path';
import { expect } from 'chai';
import fs from 'fs-extra';
import { readBundleFiles } from '../../src/service/readBundleFiles.js';

describe('readBundleFiles', () => {

  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lwc-bundle-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('excludes the scaffolded __tests__ directory (issue #433)', async () => {
    await fs.writeFile(path.join(tmpDir, 'ccdxSample.js'), '');
    await fs.writeFile(path.join(tmpDir, 'ccdxSample.html'), '');
    await fs.writeFile(path.join(tmpDir, 'ccdxSample.js-meta.xml'), '');
    await fs.ensureDir(path.join(tmpDir, '__tests__'));
    await fs.writeFile(path.join(tmpDir, '__tests__', 'ccdxSample.test.js'), '');

    const result = await readBundleFiles(tmpDir);

    expect(result.sort()).to.deep.equal(
      ['ccdxSample.html', 'ccdxSample.js', 'ccdxSample.js-meta.xml']
    );
    expect(result).to.not.include('__tests__');
  });

  it('excludes any subdirectory, not just __tests__', async () => {
    await fs.writeFile(path.join(tmpDir, 'ccdxSample.js'), '');
    await fs.ensureDir(path.join(tmpDir, 'nested'));
    await fs.writeFile(path.join(tmpDir, 'nested', 'inner.js'), '');

    const result = await readBundleFiles(tmpDir);

    expect(result).to.deep.equal(['ccdxSample.js']);
  });

  it('returns all files when there are no subdirectories', async () => {
    await fs.writeFile(path.join(tmpDir, 'a.js'), '');
    await fs.writeFile(path.join(tmpDir, 'b.html'), '');
    await fs.writeFile(path.join(tmpDir, 'c.css'), '');

    const result = await readBundleFiles(tmpDir);

    expect(result.sort()).to.deep.equal(['a.js', 'b.html', 'c.css']);
  });

  it('returns an empty array for an empty directory', async () => {
    const result = await readBundleFiles(tmpDir);

    expect(result).to.deep.equal([]);
  });
});
