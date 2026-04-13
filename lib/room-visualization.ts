export type FurnitureReference = {
  id: string;
  name: string;
  category?: string | null;
};

export type DuplicateFurnitureItem = FurnitureReference & {
  index: number;
  category: string;
};

export type DuplicateFurnitureGroup = {
  category: string;
  items: DuplicateFurnitureItem[];
};

export type HistoryFurnitureSnapshot = {
  id: string | null;
  name: string;
  category: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
};

type PersistedHistoryFurniture = {
  id: string;
  name: string;
  category?: string | null;
  storagePath: string;
  mimeType: string;
  fileSize: number;
};

type HistoryFurnitureFallbackInput = {
  name?: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  category?: string | null;
};

type ResolvedHistoryFurnitureEntry = {
  historyReferenceId: string | null;
  snapshot: HistoryFurnitureSnapshot;
};

const DEFAULT_CATEGORY = '其他';

function normalizeFurnitureCategory(category: string | null | undefined) {
  const value = category?.trim();
  return value || DEFAULT_CATEGORY;
}

function isHistoryFurnitureSnapshot(value: unknown): value is HistoryFurnitureSnapshot {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<HistoryFurnitureSnapshot>;
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.storagePath === 'string' &&
    typeof candidate.mimeType === 'string' &&
    typeof candidate.fileSize === 'number'
  );
}

export function findDuplicateFurnitureGroups(
  furnitures: FurnitureReference[]
): DuplicateFurnitureGroup[] {
  const groups = new Map<string, DuplicateFurnitureItem[]>();

  furnitures.forEach((furniture, index) => {
    const category = normalizeFurnitureCategory(furniture.category);
    const existing = groups.get(category) ?? [];

    existing.push({
      id: furniture.id,
      name: furniture.name,
      category,
      index,
    });

    groups.set(category, existing);
  });

  return Array.from(groups.entries())
    .filter(([, items]) => items.length > 1)
    .map(([category, items]) => ({ category, items }));
}

export function buildVisualizationPrompt(
  furnitures: FurnitureReference[],
  customInstruction: string | null | undefined
) {
  const imageLines = furnitures
    .map(
      (furniture, index) =>
        `[图片 ${index + 2}]：第${index + 1}件目标家具参考图（${furniture.name}，当前分类：${normalizeFurnitureCategory(furniture.category)}）。`
    )
    .join('\n');

  let prompt = `你是一位顶级的室内设计师和高级图像合成专家。
我按顺序提供了多张图片：
[图片 1]：基础场景（室内房间实景图）。
${imageLines}

【核心任务】
以 [图片 1] 为绝对的基础背景，将 [图片 2] 到最后一张参考图中的所有家具主体完美、无痕地合成到同一张输出图中。
所有已选家具必须同时出现在同一张输出图中，禁止拆分成多张图，禁止遗漏任何一件家具，禁止只保留其中一件家具。
严禁改变 [图片 1] 的房间结构、墙壁、地板和其他不相关的背景元素！

【高级合成规范】
1. 空间透视与比例 (Perspective & Scale)：
   - 严格遵循 [图片 1] 的空间透视灭点（Vanishing Points）。
   - 确保所有新家具的三维透视形变与房间的地板、墙面完全吻合。
   - 准确评估房间的物理尺度，使所有新家具的比例（长宽高）与周围环境（如门、窗、其他家具）保持协调。
2. 光影与材质 (Lighting & Shadows)：
   - 深度分析 [图片 1] 的主光源方向、色温和环境光。
   - 为每件新家具重新生成符合房间光源的受光面、背光面和高光。
   - 必须在家具底部和接触面生成准确的接触阴影和投射阴影，阴影软硬程度需与房间现有阴影一致。
   - 如果地板是反光材质，必须生成对应家具的真实倒影。
3. 遮挡与融合 (Occlusion & Blending)：
   - 妥善处理所有新家具与房间原有物品之间的前后遮挡关系。
   - 边缘融合必须自然，无明显抠图白边或生硬过渡。
4. 智能摆放 (Placement)：
   - 优先将多件家具布置成合理的同一空间方案，保持动线自然、间距真实。
   - 如果用户补充了更精确的家具类型或摆放要求，严格按用户指示区分并执行。
5. 空间清洁预处理 (Scene Cleanup)：
   - 在放置新家具之前，先清洁房间场景：移除画面中明显的杂物、垃圾、散落物品和凌乱的个人物品。
   - 修复明显脏污的地面和墙面，使其呈现干净整洁的状态。
   - 保留房间的固有结构（门、窗、墙面颜色、地板材质、天花板）完全不变，仅清除杂乱和脏污元素。`;

  const normalizedInstruction = customInstruction?.trim();
  if (normalizedInstruction) {
    prompt += `\n\n【用户的特别指示与反馈】\n${normalizedInstruction}`;
  }

  return prompt;
}

export function normalizeHistoryFurnitureSnapshots(input: {
  legacyFurniture?: HistoryFurnitureSnapshot | null;
  selectedFurnituresSnapshot?: unknown;
}) {
  if (Array.isArray(input.selectedFurnituresSnapshot)) {
    const snapshots = input.selectedFurnituresSnapshot.filter(isHistoryFurnitureSnapshot);
    if (snapshots.length > 0) {
      return snapshots.map((snapshot) => ({
        ...snapshot,
        category: normalizeFurnitureCategory(snapshot.category),
      }));
    }
  }

  if (input.legacyFurniture && isHistoryFurnitureSnapshot(input.legacyFurniture)) {
    return [
      {
        ...input.legacyFurniture,
        category: normalizeFurnitureCategory(input.legacyFurniture.category),
      },
    ];
  }

  return [];
}

export function resolveHistoryFurnitureSelection(input: {
  furnitureItemIds: string[];
  persistedFurnitures: PersistedHistoryFurniture[];
  furnitureFallbacks?: HistoryFurnitureFallbackInput[];
}) {
  const persistedById = new Map(
    input.persistedFurnitures.map((furniture) => [furniture.id, furniture] as const)
  );
  const fallbackById = new Map(
    (input.furnitureFallbacks ?? []).map(
      (fallback, index) => [input.furnitureItemIds[index], fallback] as const
    )
  );

  const resolvedEntries: Array<ResolvedHistoryFurnitureEntry | null> = input.furnitureItemIds.map((furnitureItemId) => {
    const persisted = persistedById.get(furnitureItemId);
    if (persisted) {
      return {
        historyReferenceId: persisted.id,
        snapshot: {
          id: persisted.id,
          name: persisted.name,
          category: normalizeFurnitureCategory(persisted.category),
          storagePath: persisted.storagePath,
          mimeType: persisted.mimeType,
          fileSize: persisted.fileSize,
        },
      };
    }

    const fallback = fallbackById.get(furnitureItemId);
    if (!fallback) {
      return null;
    }

    return {
      historyReferenceId: null,
      snapshot: {
        id: furnitureItemId,
        name: fallback.name ?? 'furniture',
        category: normalizeFurnitureCategory(fallback.category),
        storagePath: fallback.storagePath,
        mimeType: fallback.mimeType,
        fileSize: fallback.fileSize,
      },
    };
  });

  if (resolvedEntries.length === 0 || resolvedEntries.some((entry) => !entry)) {
    return null;
  }

  const entries = resolvedEntries.filter(
    (entry): entry is ResolvedHistoryFurnitureEntry => entry !== null
  );

  return {
    primaryHistoryFurnitureId: entries[0]?.historyReferenceId ?? null,
    snapshots: entries.map((entry) => entry.snapshot),
  };
}
