import { expect } from 'chai';
import { getFileName } from '../../src/service/getFileName.js';

describe('getFileName', () => {

  it('extracts class name from a .cls file path', () => {
    const result = getFileName('/force-app/main/default/classes/MyClass.cls', '.cls');
    expect(result).to.equal('MyClass');
  });

  it('extracts trigger name from a .trigger file path', () => {
    const result = getFileName('/force-app/main/default/triggers/AccountTrigger.trigger', '.trigger');
    expect(result).to.equal('AccountTrigger');
  });

  it('extracts page name from a .page file path', () => {
    const result = getFileName('/force-app/main/default/pages/MyPage.page', '.page');
    expect(result).to.equal('MyPage');
  });

  it('extracts component name from a .component file path', () => {
    const result = getFileName('/force-app/main/default/components/MyComp.component', '.component');
    expect(result).to.equal('MyComp');
  });

  it('handles paths without directories', () => {
    const result = getFileName('MyClass.cls', '.cls');
    expect(result).to.equal('MyClass');
  });

  it('handles deeply nested paths', () => {
    const result = getFileName('/a/b/c/d/e/MyClass.cls', '.cls');
    expect(result).to.equal('MyClass');
  });
});
