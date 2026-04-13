'use client';

import { buildAssetDownloadPath } from '@/lib/asset-download';
import { type FurnitureItem } from '@/lib/dashboard-types';
import { MAX_SELECTED_FURNITURES } from '@/lib/room-editor-limits';
import { FurnitureDrawer } from './room-editor/FurnitureDrawer';
import { FurniturePreviewModal } from './room-editor/FurniturePreviewModal';
import { FeedbackModal } from './room-editor/FeedbackModal';
import { ImageLightbox } from './room-editor/ImageLightbox';
import { NewProjectConfirmModal } from './room-editor/NewProjectConfirmModal';
import { RoomEditorHistorySection } from './room-editor/RoomEditorHistorySection';
import { RoomEditorInputPanel } from './room-editor/RoomEditorInputPanel';
import { RoomEditorResultPanel } from './room-editor/RoomEditorResultPanel';
import { useRoomEditorController, type RoomEditorUser } from './room-editor/use-room-editor-controller';
import { UsageLimitModal } from './UsageLimitModal';

type RoomEditorProps = {
  catalog: FurnitureItem[];
  onUploadFiles: (files: File[]) => Promise<FurnitureItem[]>;
  user: RoomEditorUser;
};

export function RoomEditor({ catalog, onUploadFiles, user }: RoomEditorProps) {
  const controller = useRoomEditorController({
    onUploadFiles,
    user,
  });

  const {
    activeCategory,
    feedbackText,
    furnitureUploadInputId,
    isDrawerOpen,
    isFeedbackModalOpen,
    isNewProjectModalOpen,
    isStartingNewProject,
    isUploadingFurniture,
    currentGeneratedImage,
    lightboxImageUrl,
    limitModalType,
    previewFurniture,
    roomImages,
    selectedFurnitures,
    setActiveCategory,
    setFeedbackText,
    setIsDrawerOpen,
    setIsFeedbackModalOpen,
    setIsNewProjectModalOpen,
    setLimitModalType,
    setLightboxImageUrl,
    setPreviewFurniture,
    toggleFurniture,
    handleFeedbackSubmit,
    handleStartNewProject,
  } = controller;

  const lightboxDownloadUrl = (() => {
    if (!lightboxImageUrl) {
      return null;
    }

    if (currentGeneratedImage?.imageUrl === lightboxImageUrl) {
      return buildAssetDownloadPath('generated', currentGeneratedImage);
    }

    const roomAsset = roomImages.find((item) => item.imageUrl === lightboxImageUrl);
    if (roomAsset) {
      return buildAssetDownloadPath('room', roomAsset);
    }

    const furnitureAsset = selectedFurnitures.find((item) => item.imageUrl === lightboxImageUrl);
    if (furnitureAsset) {
      return buildAssetDownloadPath('furniture', furnitureAsset);
    }

    return null;
  })();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 mb-1">室内编辑器</h2>
        <p className="text-zinc-500">选择当前室内图，并将已选家具一次性融合到同一张效果图中。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-8 lg:h-[calc(100vh-180px)]">
        <RoomEditorInputPanel controller={controller} />
        <RoomEditorResultPanel catalog={catalog} controller={controller} />
      </div>

      <RoomEditorHistorySection controller={controller} />

      {previewFurniture && (
        <FurniturePreviewModal
          furniture={previewFurniture}
          onClose={() => setPreviewFurniture(null)}
        />
      )}

      <FurnitureDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        catalog={catalog}
        selectedFurnitures={selectedFurnitures}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        onToggleFurniture={toggleFurniture}
        onPreview={setPreviewFurniture}
        uploadInputId={furnitureUploadInputId}
        isUploading={isUploadingFurniture}
        maxSelections={MAX_SELECTED_FURNITURES}
      />

      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        feedbackText={feedbackText}
        onFeedbackChange={setFeedbackText}
        onSubmit={handleFeedbackSubmit}
      />

      {lightboxImageUrl && (
        <ImageLightbox
          imageUrl={lightboxImageUrl}
          downloadUrl={lightboxDownloadUrl}
          onClose={() => setLightboxImageUrl(null)}
        />
      )}

      <UsageLimitModal
        type={limitModalType ?? 'free_limit'}
        isOpen={limitModalType !== null}
        onClose={() => setLimitModalType(null)}
      />

      <NewProjectConfirmModal
        isOpen={isNewProjectModalOpen}
        isSubmitting={isStartingNewProject}
        onClose={() => setIsNewProjectModalOpen(false)}
        onConfirm={handleStartNewProject}
      />
    </div>
  );
}
