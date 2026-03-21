# Member Invite Entry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将邀请入口收拢到会员中心内部，并让邀请码在邀请注册与普通注册流程中都可见、可提交、可追踪。

**Architecture:** 顶层工作台只保留 `会员中心`，邀请内容作为会员中心内部分区呈现。新的邀请回跳与验证回跳统一落到 `/?tab=vip&section=invite`，同时兼容旧的 `/?tab=invite`。注册接口优先消费表单邀请码，再回退到 cookie 归因。

**Tech Stack:** Next.js App Router, React 19, TypeScript, Node test runner, Better Auth, PostgreSQL via `pg`

---

### Task 1: 固定邀请导航规则

**Files:**
- Create: `lib/dashboard-navigation.ts`
- Modify: `lib/invitations.ts`
- Test: `tests/invitations.test.ts`

**Step 1: Write the failing test**

补充测试，覆盖：

- 新邀请回跳路径为 `/?tab=vip&section=invite`
- 旧的 `/?tab=invite` 仍被识别为会员中心邀请分区
- 注册流程的邀请码选择优先级是表单值优先、cookie 其次

**Step 2: Run test to verify it fails**

Run: `node --test tests/invitations.test.ts`

Expected: FAIL，因为新导航 helper 和邀请码优先级 helper 还不存在。

**Step 3: Write minimal implementation**

- 为 dashboard 查询参数解析提供纯函数 helper
- 调整邀请回跳常量为新路径
- 增加邀请码优先级解析 helper

**Step 4: Run test to verify it passes**

Run: `node --test tests/invitations.test.ts`

Expected: PASS

**Step 5: Commit**

先不单独提交，继续完成功能实现。

### Task 2: 将邀请入口合并进会员中心

**Files:**
- Modify: `components/Dashboard.tsx`
- Modify: `components/VipCenter.tsx`
- Modify: `components/InviteCenter.tsx`

**Step 1: Write the failing test**

使用 Task 1 的导航 helper 测试作为保护网，确保 dashboard URL 规范化不会回退到旧独立 tab。

**Step 2: Run test to verify it fails**

Run: `node --test tests/invitations.test.ts`

Expected: FAIL 或仍缺行为实现。

**Step 3: Write minimal implementation**

- 删除顶栏独立邀请 tab
- 会员中心接管 `邀请链接` 分区
- 兼容旧 `tab=invite` 并自动规范到会员中心邀请路径

**Step 4: Run test to verify it passes**

Run: `node --test tests/invitations.test.ts`

Expected: PASS

**Step 5: Commit**

先不单独提交，继续完成注册链路。

### Task 3: 让注册页支持可见的邀请码输入

**Files:**
- Modify: `components/auth/SignUpForm.tsx`
- Modify: `app/signup/page.tsx`
- Modify: `app/api/invitations/signup/route.ts`
- Modify: `app/i/[code]/route.ts`
- Modify: `app/verify-email/page.tsx`

**Step 1: Write the failing test**

扩展邀请码 helper 测试，锁定：

- 邀请注册 query 里的邀请码会被规范化
- 表单邀请码优先于 cookie 邀请码
- 为空时才回退 cookie

**Step 2: Run test to verify it fails**

Run: `node --test tests/invitations.test.ts`

Expected: FAIL

**Step 3: Write minimal implementation**

- 注册页增加邀请码输入框
- 邀请链接访问时将邀请码带到 query
- 注册接口消费 `inviteCode`
- 验证回跳统一落到会员中心邀请分区

**Step 4: Run test to verify it passes**

Run: `node --test tests/invitations.test.ts`

Expected: PASS

**Step 5: Commit**

先不单独提交，等全量验证后统一提交。

### Task 4: 完成回归验证与提交流程

**Files:**
- Modify: `tests/client-boundaries.test.ts`
- Verify only: affected invitation and dashboard files

**Step 1: Run targeted tests**

Run:

```bash
node --test tests/invitations.test.ts tests/invite-center-error-state.test.ts tests/client-boundaries.test.ts
```

Expected: PASS

**Step 2: Run broader verification**

Run:

```bash
node --test tests/*.test.ts tests/*.test.mjs
npx tsc --noEmit
```

Expected: PASS

**Step 3: Request review**

对最终 diff 做一次 review，优先检查：

- 旧路径兼容
- 注册邀请码优先级
- 会员中心内邀请入口是否破坏现有功能

**Step 4: Fix review findings if any**

只修复 review 中的真实问题，避免扩散改动。

**Step 5: Commit and push**

```bash
git add <affected files>
git commit -m "feat: move invite entry into vip center"
git push
```
