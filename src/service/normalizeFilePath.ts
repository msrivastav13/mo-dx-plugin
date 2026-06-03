
// Removes any trailing path separators so the bundle/file name can be derived
// reliably. A path like `lwc/ccdxSample/` would otherwise yield an empty name
// (issue #433), producing `FIELD_INTEGRITY_EXCEPTION: Invalid fullName:`.
// A lone separator (e.g. `/`) is preserved so the path never becomes empty.
export function normalizeFilePath(filepath: string): string {
  if (!filepath) {
    return filepath;
  }
  let normalized = filepath;
  while (normalized.length > 1 && (normalized.endsWith('/') || normalized.endsWith('\\'))) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}
