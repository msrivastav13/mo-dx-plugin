import chalk from 'chalk';
import { DeployResult } from './deploy.js';

interface CommandContext {
  log(msg: string): void;
}

interface SpinnerCommandContext extends CommandContext {
  spinner: { stop(msg?: string): void };
}

export function display(deployResult: DeployResult, cmd: CommandContext) {
    for (const error of deployResult.queryResult.records[0].DeployDetails.componentFailures) {
      cmd.log(
        `${chalk.redBright.bold('Line')}: ${error.lineNumber}  ` +
        `${chalk.redBright.bold('Column')}: ${error.columnNumber}  ` +
        `${chalk.redBright.bold('Error')}: ${chalk.bold(error.problem)}`
      );
    }
}

export function displaylog(error: string, cmd: CommandContext) {
  cmd.log(chalk.redBright(error));
}

// Marks the running command as failed. The command keeps printing its usual
// output, then exits 1, and SfCommand reports `"status": 1` under --json.
export function markFailed() {
  process.exitCode = 1;
}

export function stopWithFailure(cmd: SpinnerCommandContext, message: string) {
  cmd.spinner.stop(chalk.bold.redBright(message));
  markFailed();
}

// Failure reporting shared by the Tooling API container deploys (apex, trigger,
// vf, vfcomponent). A failure can come from container/member creation, in which
// case there is no queryResult, only an error.
export function reportDeployFailure(deployResult: DeployResult, cmd: SpinnerCommandContext, message: string) {
  stopWithFailure(cmd, message);
  const request = deployResult.queryResult?.records?.[0];
  if (request?.DeployDetails?.componentFailures?.length > 0) {
    display(deployResult, cmd);
  } else if (request?.ErrorMsg) {
    displaylog(chalk.bold.redBright(request.ErrorMsg), cmd);
  }
  if (typeof deployResult.error !== 'undefined') {
    displaylog(chalk.bold.redBright(deployResult.error), cmd);
  }
}
