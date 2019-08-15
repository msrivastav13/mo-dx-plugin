export interface DescribeMetadataResult {
  status: number;
  result: Result;
}

export interface Result {
  metadataObjects: MetadataObject[];
  organizationNamespace: string;
  partialSaveAllowed: boolean;
  testRequired: boolean;
}

export interface MetadataObject {
  directoryName: string;
  inFolder: boolean;
  metaFile: boolean;
  suffix?: string;
  xmlName: string;
  childXmlNames?: string[];
}
