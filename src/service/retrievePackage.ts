import { Connection } from '@salesforce/core';
import AdmZip from 'adm-zip';
import { delay } from './delay.js';

export const RETRIEVE_TIMEOUT_MS = 30 * 60_000;
export const RETRIEVE_POLL_INTERVAL_MS = 3_000;

export interface RetrievePackageOptions {
  conn: Connection;
  packageName: string;
  targetDir: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

export interface RetrievePackageResult {
  // Non-fatal messages from the Metadata API, e.g. components it could not retrieve.
  messages: string[];
}

// Retrieves a package or change set through the Metadata API and extracts it
// (package.xml at the root) into targetDir. The API is called directly rather
// than shelling out to the CLI so user-supplied names and paths never reach a
// shell (command injection), and extraction goes through adm-zip on every
// platform, which rejects entries that escape targetDir.
export async function retrievePackage(options: RetrievePackageOptions): Promise<RetrievePackageResult> {
  const {
    conn,
    packageName,
    targetDir,
    timeoutMs = RETRIEVE_TIMEOUT_MS,
    pollIntervalMs = RETRIEVE_POLL_INTERVAL_MS,
  } = options;

  const asyncResult = await conn.metadata.retrieve({
    apiVersion: Number(conn.getApiVersion()),
    packageNames: [packageName],
    singlePackage: true,
  });
  const jobId = asyncResult.id;

  let status = await conn.metadata.checkRetrieveStatus(jobId);
  const deadline = Date.now() + timeoutMs;
  while (!status.done && Date.now() < deadline) {
    await delay(pollIntervalMs);
    status = await conn.metadata.checkRetrieveStatus(jobId);
  }

  if (!status.done) {
    throw new Error(`Metadata API retrieve ${jobId} did not complete within ${timeoutMs / 60_000} minutes.`);
  }
  if (!status.success) {
    throw new Error(status.errorMessage ?? `Metadata API retrieve ${jobId} finished with status ${status.status}.`);
  }

  const retrieveMessages = status.messages ?? [];
  const messageList = Array.isArray(retrieveMessages) ? retrieveMessages : [retrieveMessages];

  const zip = new AdmZip(Buffer.from(status.zipFile, 'base64'));
  zip.extractAllTo(targetDir, true);

  return { messages: messageList.map(m => `${m.fileName}: ${m.problem}`) };
}
