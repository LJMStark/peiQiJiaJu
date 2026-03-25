import type { FurnitureItem, HistoryItem, PlacedFurniture } from '@/lib/dashboard-types';
import type { RestoredHistoryRoomImage } from '@/lib/room-editor-history-state';

export type EmptyRoomEditorWorkspaceState = {
  roomImages: RestoredHistoryRoomImage[];
  pendingRoomImage: RestoredHistoryRoomImage | null;
  activeRoomId: string | null;
  selectedFurnitures: FurnitureItem[];
  customInstruction: string;
  currentGeneratedImage: HistoryItem['generatedImage'] | null;
  placedFurnitures: PlacedFurniture[];
  generationSessionId: string | null;
  currentResultIndex: number;
  error: string | null;
  errorDetails: string[];
};

export function createEmptyRoomEditorWorkspaceState(): EmptyRoomEditorWorkspaceState {
  return {
    roomImages: [],
    pendingRoomImage: null,
    activeRoomId: null,
    selectedFurnitures: [],
    customInstruction: '',
    currentGeneratedImage: null,
    placedFurnitures: [],
    generationSessionId: null,
    currentResultIndex: 0,
    error: null,
    errorDetails: [],
  };
}
