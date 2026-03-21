import type { FurnitureItem } from '@/lib/dashboard-types';

type StartCatalogDeleteResult = {
  didStart: boolean;
  deletingItemId: string | null;
  nextCatalog: FurnitureItem[];
};

export function startCatalogDelete(
  currentCatalog: readonly FurnitureItem[],
  deletingItemId: string | null,
  requestedItemId: string
): StartCatalogDeleteResult {
  if (deletingItemId) {
    return {
      didStart: false,
      deletingItemId,
      nextCatalog: [...currentCatalog],
    };
  }

  const nextCatalog = currentCatalog.filter((item) => item.id !== requestedItemId);
  if (nextCatalog.length === currentCatalog.length) {
    return {
      didStart: false,
      deletingItemId: null,
      nextCatalog: [...currentCatalog],
    };
  }

  return {
    didStart: true,
    deletingItemId: requestedItemId,
    nextCatalog,
  };
}
