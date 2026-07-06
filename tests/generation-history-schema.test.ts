import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  createGenerationHistorySchemaError,
  getGenerationHistoryCountByFurnitureQuery,
  getGenerationHistoryInsertQuery,
  getGenerationHistorySelectPageQuery,
  getGenerationHistorySelectQuery,
  isGenerationHistorySchemaError,
  isMissingGenerationHistorySelectionColumnError,
} from '../lib/server/generation-history-schema.ts';

const projectRoot = process.cwd();

test('isMissingGenerationHistorySelectionColumnError only matches the optional history columns', () => {
  assert.equal(
    isMissingGenerationHistorySelectionColumnError({
      code: '42703',
      message: 'column "selected_furniture_item_ids" of relation "generation_history" does not exist',
    }),
    true
  );

  assert.equal(
    isMissingGenerationHistorySelectionColumnError({
      code: '42703',
      message: 'column "room_name_snapshot" of relation "generation_history" does not exist',
    }),
    false
  );
});

test('legacy generation history queries project null compatibility columns and omit unsupported writes', () => {
  const selectSql = getGenerationHistorySelectQuery('legacy');
  const insertSql = getGenerationHistoryInsertQuery('legacy');
  const countSql = getGenerationHistoryCountByFurnitureQuery('legacy');

  assert.match(selectSql, /null::text\[\] as selected_furniture_item_ids/i);
  assert.match(selectSql, /null::jsonb as selected_furnitures_snapshot/i);
  assert.doesNotMatch(selectSql, /\n\s*selected_furniture_item_ids,\n\s*selected_furnitures_snapshot,\n/i);

  const insertColumnsSection = insertSql.split(') values')[0] ?? '';
  assert.doesNotMatch(insertColumnsSection, /selected_furniture_item_ids/i);
  assert.doesNotMatch(insertColumnsSection, /selected_furnitures_snapshot/i);
  assert.match(insertSql, /null::text\[\] as selected_furniture_item_ids/i);
  assert.match(insertSql, /null::jsonb as selected_furnitures_snapshot/i);

  assert.doesNotMatch(countSql, /selected_furniture_item_ids/i);
  assert.match(countSql, /where user_id = \$1 and furniture_item_id = \$2/i);
});

test('history page query uses cursor pagination with a deterministic tie-breaker', () => {
  const selectSql = getGenerationHistorySelectPageQuery('modern');

  assert.match(selectSql, /where user_id = \$1/i);
  assert.match(selectSql, /created_at < \$2::timestamptz/i);
  assert.match(selectSql, /created_at = \$2::timestamptz and id < \$3::text/i);
  assert.match(selectSql, /order by created_at desc, id desc/i);
  assert.match(selectSql, /limit \$4/i);
});

test('missing history-selection columns require an explicit storage migration', () => {
  const error = createGenerationHistorySchemaError({
    code: '42703',
    message: 'column "selected_furniture_item_ids" of relation "generation_history" does not exist',
  });

  assert.equal(isGenerationHistorySchemaError(error), true);
  if (!isGenerationHistorySchemaError(error)) {
    throw new Error('Expected a generation history schema error.');
  }
  assert.match(error.message, /npm run storage:migrate/i);
});

test('request paths no longer contain runtime ALTER TABLE fallbacks for generation history', async () => {
  const source = await readFile(path.join(projectRoot, 'lib/server/assets.ts'), 'utf8');

  assert.equal(
    source.includes('alter table generation_history'),
    false,
    'lib/server/assets.ts should not issue DDL from request-time code paths'
  );

  assert.equal(
    source.includes('ensureGenerationHistorySelectionColumns'),
    false,
    'lib/server/assets.ts should not attempt runtime schema repair'
  );
});

test('storage migration includes the history pagination index', async () => {
  const source = await readFile(path.join(projectRoot, 'scripts/migrate-storage-assets.mjs'), 'utf8');

  assert.match(source, /generation_history_user_id_created_at_id_idx/i);
  assert.match(source, /on generation_history \(user_id, created_at desc, id desc\)/i);
});
