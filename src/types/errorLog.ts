export interface CompileErrors {
  lineNumber: number;
  columnNumber: number;
  problem: string;
}

export interface ConsoleError {
  errorMsg: string;
}
