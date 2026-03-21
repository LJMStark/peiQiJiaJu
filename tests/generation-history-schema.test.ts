import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getGenerationHistoryCountByFurnitureQuery,
  getGenerationHistoryInsertQuery,
  getGenerationHistorySelectQuery,
  isMissingGenerationHistorySelectionColumnError,
} from '../lib/server/generation-history-schema.ts';

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
