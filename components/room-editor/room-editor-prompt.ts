const COMMON_FURNITURE = ['沙发', '床', '餐桌', '茶几', '椅子', '书桌', '衣柜', '电视柜'];

const RECOMMENDED_INSTRUCTIONS = [
  '请将新家具放在房间的中心位置，保持原有的光影效果。',
  '只提取参考图中的主体家具，忽略背景，替换掉房间里靠窗的旧家具。',
  '将新家具放置在空旷的地板上，并确保其大小比例与房间其他家具协调。',
  '保留房间原有的装饰品，仅替换主要的座位区域。',
  '请将家具放置在角落，调整好透视角度，使其看起来像是一个舒适的休息区。',
  '提取参考图中的家具，替换房间里的旧家具，并确保新家具的阴影方向与房间光源一致。',
  '请先清理房间里的杂物和凌乱物品，让地面和墙面干净整洁后，再放置新家具。',
  '房间地面较脏，请先修复地面使其干净，移除散落的杂物，然后将家具自然地放入空间中。',
];

const VIBE_PROMPT = `你是一位顶级的室内设计师和高级图像合成专家。
我提供了一张已经放置好家具的房间图片。
【核心任务】
为这张图片增加极致的氛围感，增加必要的软装搭配（如地毯、挂画、绿植、抱枕、窗帘等）和灯光效果（如氛围灯、落地灯、阳光洒落的光影等）。
严禁改变里面原有的家具、柜体、吊顶等核心元素！只做软装和光影的加法，让整个空间看起来极其温馨、高级、有氛围。`;

const LEGACY_VIBE_PROMPT = '增加必要的软装搭配和灯光，营造出极致的氛围感，不要改变里面原有的家具、柜体、吊顶等元素';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getDisplayInstruction(instruction: string | null | undefined): string {
  if (!instruction) {
    return '';
  }

  return instruction
    .replace(new RegExp(`\\n?\\[修正反馈\\]: ${escapeRegExp(VIBE_PROMPT)}`), '')
    .replace(new RegExp(`\\n?\\[修正反馈\\]: ${escapeRegExp(LEGACY_VIBE_PROMPT)}`), '')
    .trim();
}

export {
  COMMON_FURNITURE,
  RECOMMENDED_INSTRUCTIONS,
  VIBE_PROMPT,
  LEGACY_VIBE_PROMPT,
  getDisplayInstruction,
};
