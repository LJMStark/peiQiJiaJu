type FileInputElement = {
  value: string;
};

type FileInputChangeEventLike = {
  currentTarget: FileInputElement;
  target: {
    files: FileList | null;
  };
};

export function getFileInputSelection(event: FileInputChangeEventLike) {
  return {
    input: event.currentTarget,
    files: event.target.files ? Array.from(event.target.files) : [],
  };
}
