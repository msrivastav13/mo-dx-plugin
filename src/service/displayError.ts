import {UX} from '@salesforce/command';
import chalk from 'chalk';
import { CompileErrors, ConsoleError } from '../types/errorLog';
import { DeployResult } from './deploy';

export function display(deployResult: DeployResult, ux: UX) {
    const errors = [] as CompileErrors[];
    const tableColumnData = {
      columns: [
        { key: 'lineNumber', label: chalk.redBright.bold('Line')},
        { key: 'columnNumber', label: chalk.redBright.bold('Column') },
        { key: 'problem', label: chalk.redBright.bold('Error Description') }
      ]
    };
    for (const error of deployResult.queryResult.records[0].DeployDetails.componentFailures) {
      const errorLog = {} as CompileErrors;
      errorLog.columnNumber = error.columnNumber;
      errorLog.lineNumber = (error.lineNumber);
      errorLog.problem = chalk.bold(error.problem);
      errors.push(errorLog);
    }
    ux.table(errors, tableColumnData);
}

export function displaylog(error: string, ux: UX) {
  const consoleErrors = [] as ConsoleError[];
  const tableColumnData = {
    columns: [
      { key: 'errorMsg', label: chalk.redBright.bold('Error Description')}
    ]
  };
  const consoleError = {} as ConsoleError;
  consoleError.errorMsg = chalk.redBright(error);
  consoleErrors.push(consoleError);
  ux.table(consoleErrors, tableColumnData);
}
