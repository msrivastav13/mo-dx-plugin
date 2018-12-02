export interface QueryResult {
  totalSize: number;
  done: boolean;
  records: Record[];
}

interface Record {
  attributes: object;
  Id: string;
  State: string;
  ErrorMsg: string;
  DeployDetails: Error[];
}

interface Error {
  columnNumber: number;
  lineNumber: number;
  fullName: number;
  problem: string;
}
