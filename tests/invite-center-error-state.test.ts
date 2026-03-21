import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveInviteCenterErrorState } from '../lib/invite-center-error-state.ts';

test('resolveInviteCenterErrorState maps missing invite tables to a setup message', () => {
  const state = resolveInviteCenterErrorState(new Error('relation "invite_links" does not exist'));

  assert.equal(state.title, '邀请功能还在准备中');
  assert.equal(state.message, '当前环境还没完成邀请数据初始化，请联系管理员完成配置后再试。');
  assert.equal(state.details, 'relation "invite_links" does not exist');
});

test('resolveInviteCenterErrorState preserves generic details behind a friendly fallback', () => {
  const state = resolveInviteCenterErrorState(new Error('network timeout'));

  assert.equal(state.title, '邀请中心暂时不可用');
  assert.equal(state.message, '邀请数据暂时无法加载，请稍后重试；如果问题持续存在，请联系管理员协助排查。');
  assert.equal(state.details, 'network timeout');
});
