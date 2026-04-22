import { expect } from 'chai';
import { delay } from '../../src/service/delay.js';

describe('delay', () => {

  it('returns a promise that resolves after the specified time', async () => {
    const start = Date.now();
    await delay(50);
    const elapsed = Date.now() - start;
    expect(elapsed).to.be.at.least(40);
  });

  it('resolves with undefined', async () => {
    const result = await delay(10);
    expect(result).to.be.undefined;
  });
});
