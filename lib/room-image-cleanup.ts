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
    await input.cleanup(input.storagePathsToDelete).catch((cleanupError) => {
      console.error('[room-image-cleanup] cleanup failed', {
        storagePaths: input.storagePathsToDelete,
        error: cleanupError,
      });
    });
    throw error;
  }
}
