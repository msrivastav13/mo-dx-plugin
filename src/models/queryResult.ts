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
  DeployDetails: DeployDetails;
}

interface DeployDetails {
  componentFailures: string;
}
