import assert from 'node:assert/strict';
import test from 'node:test';

import { getFileInputSelection } from '../lib/client/file-input.ts';

function createFileList(files: File[]): FileList {
  return {
    ...files,
    length: files.length,
    item(index: number) {
      return files[index] ?? null;
    },
    [Symbol.iterator]: files[Symbol.iterator].bind(files),
  } as FileList;
}

test('getFileInputSelection keeps the original input reference even if the event currentTarget becomes null later', () => {
  const file = new File(['room'], 'room.png', { type: 'image/png' });
  const input = { value: 'room.png' };
  const event = {
    currentTarget: input,
    target: {
      files: createFileList([file]),
    },
  };

  const selection = getFileInputSelection(event);
  event.currentTarget = null as never;

  assert.deepEqual(selection.files.map((selectedFile) => selectedFile.name), ['room.png']);
  selection.input.value = '';
  assert.equal(input.value, '');
});

test('getFileInputSelection returns an empty file list when nothing is selected', () => {
  const input = { value: '' };
  const selection = getFileInputSelection({
    currentTarget: input,
    target: {
      files: null,
    },
  });

  assert.deepEqual(selection.files, []);
  assert.equal(selection.input, input);
});
