
export function getFileName(filepath: string, fileType: string) {
  return filepath.substring(filepath.lastIndexOf('/') + 1, filepath.lastIndexOf(fileType));
}
