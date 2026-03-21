export type GenerationHistoryQueryMode = 'modern' | 'legacy';

const OPTIONAL_GENERATION_HISTORY_COLUMNS = [
  'selected_furniture_item_ids',
  'selected_furnitures_snapshot',
] as const;

type PgLikeError = {
  code?: string;
  message?: string;
};

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as PgLikeError).message;
    return typeof message === 'string' ? message : '';
  }

  return '';
}

function getErrorCode(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as PgLikeError).code;
    return typeof code === 'string' ? code : '';
  }

  return '';
}

function getSelectionProjection(mode: GenerationHistoryQueryMode) {
  if (mode === 'legacy') {
    return `null::text[] as selected_furniture_item_ids,
        null::jsonb as selected_furnitures_snapshot,`;
  }

  return `selected_furniture_item_ids,
        selected_furnitures_snapshot,`;
}

function getReturningProjection(mode: GenerationHistoryQueryMode) {
  return `id,
        room_image_id,
        furniture_item_id,
        ${getSelectionProjection(mode)}
        room_name_snapshot,
        room_storage_path_snapshot,
        room_mime_type_snapshot,
        room_file_size_snapshot,
        room_aspect_ratio_snapshot,
        furniture_name_snapshot,
        furniture_storage_path_snapshot,
        furniture_mime_type_snapshot,
        furniture_file_size_snapshot,
        furniture_category_snapshot,
        generated_name,
        generated_storage_path,
        generated_mime_type,
        generated_file_size,
        custom_instruction,
        created_at`;
}

export function isMissingGenerationHistorySelectionColumnError(error: unknown) {
  if (getErrorCode(error) !== '42703') {
    return false;
  }

  const message = getErrorMessage(error);
  return OPTIONAL_GENERATION_HISTORY_COLUMNS.some((column) => message.includes(`"${column}"`));
}

export function getGenerationHistorySelectQuery(mode: GenerationHistoryQueryMode = 'modern') {
  return `select
        ${getReturningProjection(mode)}
      from generation_history
      where user_id = $1
      order by created_at desc`;
}

export function getGenerationHistoryCountByFurnitureQuery(mode: GenerationHistoryQueryMode = 'modern') {
  if (mode === 'legacy') {
    return `select count(*)::text as count
     from generation_history
     where user_id = $1 and furniture_item_id = $2`;
  }

  return `select count(*)::text as count
     from generation_history
     where user_id = $1
       and (
         furniture_item_id = $2
         or $2 = any(coalesce(selected_furniture_item_ids, ARRAY[]::text[]))
       )`;
}

export function getGenerationHistoryInsertQuery(mode: GenerationHistoryQueryMode = 'modern') {
  if (mode === 'legacy') {
    return `insert into generation_history (
        id,
        user_id,
        room_image_id,
        furniture_item_id,
        room_name_snapshot,
        room_storage_path_snapshot,
        room_mime_type_snapshot,
        room_file_size_snapshot,
        room_aspect_ratio_snapshot,
        furniture_name_snapshot,
        furniture_storage_path_snapshot,
        furniture_mime_type_snapshot,
        furniture_file_size_snapshot,
        furniture_category_snapshot,
        generated_name,
        generated_storage_path,
        generated_mime_type,
        generated_file_size,
        custom_instruction
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19
      )
      returning
        ${getReturningProjection('legacy')}`;
  }

  return `insert into generation_history (
        id,
        user_id,
        room_image_id,
        furniture_item_id,
        selected_furniture_item_ids,
        selected_furnitures_snapshot,
        room_name_snapshot,
        room_storage_path_snapshot,
        room_mime_type_snapshot,
        room_file_size_snapshot,
        room_aspect_ratio_snapshot,
        furniture_name_snapshot,
        furniture_storage_path_snapshot,
        furniture_mime_type_snapshot,
        furniture_file_size_snapshot,
        furniture_category_snapshot,
        generated_name,
        generated_storage_path,
        generated_mime_type,
        generated_file_size,
        custom_instruction
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )
      returning
        ${getReturningProjection('modern')}`;
}
