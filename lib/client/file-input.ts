type FileInputElement = {
  value: string;
};

type FileInputChangeEventLike = {
  currentTarget: FileInputElement | null;
  target: FileInputElement & {
    files: FileList | null;
  };
};

export function getFileInputSelection(event: FileInputChangeEventLike) {
  // React may expose a null currentTarget while the underlying input target is still available.
  const input = event.currentTarget ?? event.target;
  return {
    input,
    files: event.target.files ? Array.from(event.target.files) : [],
  };
}
