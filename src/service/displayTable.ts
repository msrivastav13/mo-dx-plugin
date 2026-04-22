import chalk from 'chalk';
import { DeployResult } from '../service/deploy.js';

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
