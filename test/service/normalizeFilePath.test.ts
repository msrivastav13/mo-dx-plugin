import { expect } from 'chai';
import { normalizeFilePath } from '../../src/service/normalizeFilePath.js';

describe('normalizeFilePath', () => {

  it('strips a single trailing slash from a directory path (issue #433)', () => {
    expect(normalizeFilePath('force-app/main/default/lwc/ccdxSample/')).to.equal('force-app/main/default/lwc/ccdxSample');
  });

  it('strips multiple trailing slashes', () => {
    expect(normalizeFilePath('force-app/main/default/lwc/ccdxSample///')).to.equal('force-app/main/default/lwc/ccdxSample');
  });

  it('strips a trailing backslash (Windows path)', () => {
    expect(normalizeFilePath('c:\\ccdx-lwc-error\\force-app\\main\\default\\lwc\\ccdxSample\\')).to.equal('c:\\ccdx-lwc-error\\force-app\\main\\default\\lwc\\ccdxSample');
  });

  it('leaves a path without a trailing slash unchanged', () => {
    expect(normalizeFilePath('force-app/main/default/lwc/ccdxSample')).to.equal('force-app/main/default/lwc/ccdxSample');
  });

  it('leaves a file path unchanged', () => {
    expect(normalizeFilePath('force-app/main/default/lwc/ccdxSample/ccdxSample.js')).to.equal('force-app/main/default/lwc/ccdxSample/ccdxSample.js');
  });

  it('preserves a lone separator so the path never becomes empty', () => {
    expect(normalizeFilePath('/')).to.equal('/');
  });

  it('returns an empty string unchanged', () => {
    expect(normalizeFilePath('')).to.equal('');
  });
});
