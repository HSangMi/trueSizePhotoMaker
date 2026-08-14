/**
 * Snapshot files from a file input, then reset the input so the same path
 * can be chosen again. Must copy before clearing — FileList is live and
 * `input.value = ''` empties it immediately in browsers.
 */
export function takeFilesFromFileInput(input: HTMLInputElement): File[] {
  const list = input.files;
  const files = list && list.length > 0 ? Array.from(list) : [];
  input.value = '';
  return files;
}
