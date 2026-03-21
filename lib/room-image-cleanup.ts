type RoomCleanupRecoveryInput<T> = {
  action: () => Promise<T>;
  storagePathsToDelete: readonly string[];
  cleanup: (storagePaths: readonly string[]) => Promise<void>;
};

export async function runWithRoomCleanupRecovery<T>(
  input: RoomCleanupRecoveryInput<T>
): Promise<T> {
  try {
    return await input.action();
  } catch (error) {
    await input.cleanup(input.storagePathsToDelete).catch(() => undefined);
    throw error;
  }
}
