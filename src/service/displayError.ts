import chalk from 'chalk';
import { DeployResult } from './deploy.js';

interface CommandContext {
  log(msg: string): void;
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
