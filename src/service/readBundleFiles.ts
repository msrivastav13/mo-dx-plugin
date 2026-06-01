import fs from 'fs-extra';

// Returns the names of the regular files directly inside a bundle directory.
// Subdirectories (e.g. the scaffolded `__tests__` folder that holds local Jest
// tests) are skipped so callers never attempt to read a directory as a file,
// which would throw `EISDIR: illegal operation on a directory, read`.
export async function readBundleFiles(dirPath: string): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries.filter(entry => entry.isFile()).map(entry => entry.name);
}
