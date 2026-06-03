import AdmZip from 'adm-zip';
import { PackageXmlTemplate } from './packagexmlbuilder/packagexmlTemplate.js';
import { delay } from './delay.js';

export const METADATA_DEPLOY_TIMEOUT_MS = 120_000;
export const METADATA_DEPLOY_POLL_INTERVAL_MS = 3_000;

export function isToolingSchemaRefBug(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('FIELD_INTEGRITY_EXCEPTION') ||
    /Invalid reference .+ of type sobjectField/.test(msg) ||
    (err != null && typeof (err as any).errorCode === 'string' && (err as any).errorCode === 'FIELD_INTEGRITY_EXCEPTION')
  );
}

export function buildLwcPackageXml(bundleName: string, version: string): string {
  return (
    PackageXmlTemplate.createHeader() +
    PackageXmlTemplate.startType() +
    PackageXmlTemplate.createMember(bundleName) +
    PackageXmlTemplate.nameTag('LightningComponentBundle') +
    PackageXmlTemplate.endType() +
    PackageXmlTemplate.createFooter(version)
  );
}

export interface FallbackOptions {
  conn: any;
  isDirectory: boolean;
  validFiles: string[];
  filePath: string[];
  fileBodyArray: string[];
  lwcBundleId: string;
  bundleName: string;
  apiVersion: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

export interface FallbackResult {
  success: boolean;
  message: string;
  timedOut?: boolean;
}

export async function metadataFallbackDeploy(options: FallbackOptions): Promise<FallbackResult> {
  const {
    conn,
    isDirectory,
    validFiles,
    filePath,
    fileBodyArray,
    lwcBundleId,
    bundleName,
    apiVersion,
    timeoutMs = METADATA_DEPLOY_TIMEOUT_MS,
    pollIntervalMs = METADATA_DEPLOY_POLL_INTERVAL_MS,
  } = options;

  const fileMap = new Map<string, string>();

  if (isDirectory) {
    for (let i = 0; i < validFiles.length; i++) {
      fileMap.set(filePath[i], fileBodyArray[i]);
    }
  } else {
    const orgResources = await conn.tooling
      .sobject('LightningComponentResource')
      .find({ LightningComponentBundleId: lwcBundleId }, ['FilePath', 'Source']) as Array<{ FilePath: string; Source: string }>;
    for (const r of orgResources) {
      fileMap.set(r.FilePath, r.Source);
    }
    fileMap.set(filePath[0], fileBodyArray[0]);
  }

  const zip = new AdmZip();
  for (const [fp, source] of fileMap.entries()) {
    if (!fp.startsWith('lwc/') || fp.includes('..')) {
      throw new Error(`Unsafe file path in bundle: ${fp}`);
    }
    zip.addFile(fp, Buffer.from(source, 'utf8'));
  }
  zip.addFile('package.xml', Buffer.from(buildLwcPackageXml(bundleName, apiVersion), 'utf8'));
  const zipBuffer = zip.toBuffer();

  const asyncResult = await conn.metadata.deploy(zipBuffer, { singlePackage: true, rollbackOnError: true }) as any;
  const jobId = asyncResult.id;

  let status: any;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    status = await conn.metadata.checkDeployStatus(jobId, true);
    if (['Succeeded', 'Failed', 'Canceled'].includes(status.status)) break;
    await delay(pollIntervalMs);
  }

  if (!status || !['Succeeded', 'Failed', 'Canceled'].includes(status.status)) {
    return {
      success: false,
      // The job may still be running server-side; avoid re-deploying without checking org state.
      message: `Metadata API deploy did not complete within ${timeoutMs / 1000}s — it may still be in progress on the server. Re-check org state before re-deploying.`,
      timedOut: true,
    };
  }

  if (status.success) {
    return { success: true, message: '' };
  }

  const failures = status.details?.componentFailures ?? [];
  const failList = Array.isArray(failures) ? failures : [failures];
  let msg = failList.map((f: any) => `${f.fileName}: ${f.problem}`).join('\n');
  if (!msg) msg = 'Metadata API deploy failed';
  if (isDirectory) {
    msg += '\nNote: The Tooling API may have partially updated some bundle resources before the error. Re-deploying the full bundle is recommended.';
  }

  return { success: false, message: msg };
}
