import { expect } from 'chai';
import sinon from 'sinon';
import { markFailed, reportDeployFailure, stopWithFailure } from '../../src/service/displayError.js';

function makeCmd() {
  return {
    log: sinon.stub(),
    spinner: { stop: sinon.stub() }
  };
}

function logged(cmd: ReturnType<typeof makeCmd>): string {
  return cmd.log.getCalls().map(c => c.args[0]).join('\n');
}

describe('displayError failure helpers', () => {
  afterEach(() => {
    // These helpers set the real process exit code; never leak it into mocha's own exit.
    process.exitCode = undefined;
  });

  it('markFailed sets a non-zero exit code', () => {
    markFailed();
    expect(process.exitCode).to.equal(1);
  });

  it('stopWithFailure stops the spinner with the message and marks the command failed', () => {
    const cmd = makeCmd();
    stopWithFailure(cmd, 'Static Resource Save Failed ✖');
    expect(cmd.spinner.stop.firstCall.args[0]).to.include('Static Resource Save Failed ✖');
    expect(process.exitCode).to.equal(1);
  });

  describe('reportDeployFailure', () => {
    it('prints each component failure line', () => {
      const cmd = makeCmd();
      reportDeployFailure({
        success: false,
        error: undefined,
        queryResult: {
          totalSize: 1,
          done: true,
          records: [{
            State: 'Failed',
            DeployDetails: { componentFailures: [{ lineNumber: 2, columnNumber: 1, problem: "Unexpected token '<EOF>'." }] }
          }]
        }
      } as any, cmd, 'Apex Class Update Failed ✖');

      expect(cmd.spinner.stop.firstCall.args[0]).to.include('Apex Class Update Failed ✖');
      expect(logged(cmd)).to.include("Unexpected token '<EOF>'.");
      expect(process.exitCode).to.equal(1);
    });

    it('reports the error when there is no queryResult (member creation failed)', () => {
      const cmd = makeCmd();
      reportDeployFailure({ success: false, error: 'Metadata Container Creation Failed' } as any, cmd, 'Trigger Update Failed ✖');

      expect(logged(cmd)).to.include('Metadata Container Creation Failed');
      expect(process.exitCode).to.equal(1);
    });

    it('falls back to the request ErrorMsg when there are no component failures', () => {
      const cmd = makeCmd();
      reportDeployFailure({
        success: false,
        queryResult: { totalSize: 1, done: true, records: [{ State: 'Error', ErrorMsg: 'Container was aborted', DeployDetails: null }] }
      } as any, cmd, 'Visualforce Page Update Failed ✖');

      expect(logged(cmd)).to.include('Container was aborted');
      expect(process.exitCode).to.equal(1);
    });
  });
});
