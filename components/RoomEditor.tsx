'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, Sparkles, Image as ImageIcon, CheckCircle2, Loader2, Download, History, Clock, X, Layers, MessageSquareText, Maximize2, Lightbulb, Sofa, ThumbsUp, ThumbsDown } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { FURNITURE_CATEGORIES, type FurnitureItem, type HistoryItem, type PlacedFurniture, type RoomImage } from '@/lib/dashboard-types';
import { imageUrlToBase64, inferAspectRatio } from '@/lib/client/image-utils';
import { GEMINI_IMAGE_MODEL } from '@/lib/gemini-config';

const COMMON_FURNITURE = ['沙发', '床', '餐桌', '茶几', '椅子', '书桌', '衣柜', '电视柜'];
const RECOMMENDED_INSTRUCTIONS = [
  "请将新家具放在房间的中心位置，保持原有的光影效果。",
  "只提取参考图中的主体家具，忽略背景，替换掉房间里靠窗的旧家具。",
  "将新家具放置在空旷的地板上，并确保其大小比例与房间其他家具协调。",
  "保留房间原有的装饰品，仅替换主要的座位区域。",
  "请将家具放置在角落，调整好透视角度，使其看起来像是一个舒适的休息区。",
  "提取参考图中的家具，替换房间里的旧家具，并确保新家具的阴影方向与房间光源一致。"
];

type RoomEditorProps = {
  catalog: FurnitureItem[];
  onUploadFiles: (files: File[]) => Promise<FurnitureItem[]>;
};

type RoomsResponse = {
  items: RoomImage[];
  error?: string;
};

type RoomMutationResponse = {
  item: RoomImage;
  error?: string;
};

type HistoryResponse = {
  items: HistoryItem[];
  error?: string;
};

type HistoryMutationResponse = {
  item: HistoryItem;
  error?: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? 'Request failed.');
  }

  return payload;
}

export function RoomEditor({ catalog, onUploadFiles }: RoomEditorProps) {
  const [roomImages, setRoomImages] = useState<RoomImage[]>([]);
  const [selectedFurnitures, setSelectedFurnitures] = useState<FurnitureItem[]>([]);
  const [customInstruction, setCustomInstruction] = useState('');
  const [currentGeneratedImage, setCurrentGeneratedImage] = useState<HistoryItem['generatedImage'] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number, total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [previewFurniture, setPreviewFurniture] = useState<FurnitureItem | null>(null);
  const [placedFurnitures, setPlacedFurnitures] = useState<PlacedFurniture[]>([]);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [isUploadingFurniture, setIsUploadingFurniture] = useState(false);
  const [isUploadingRooms, setIsUploadingRooms] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const furnitureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadPersistedAssets = async () => {
      try {
        const [roomsResponse, historyResponse] = await Promise.all([
          fetch('/api/rooms', { cache: 'no-store' }),
          fetch('/api/history', { cache: 'no-store' }),
        ]);

        const roomsPayload = await readJson<RoomsResponse>(roomsResponse);
        const historyPayload = await readJson<HistoryResponse>(historyResponse);

        setRoomImages(roomsPayload.items);
        setHistory(historyPayload.items);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load editor assets.');
      } finally {
        setIsBootstrapping(false);
      }
    };

    void loadPersistedAssets();
  }, []);

  const handleFurnitureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploadingFurniture(true);
      const uploadedItems = await onUploadFiles(Array.from(e.target.files));
      if (uploadedItems && uploadedItems.length > 0) {
        setSelectedFurnitures(prev => [...prev, ...uploadedItems]);
      }
      if (furnitureInputRef.current) furnitureInputRef.current.value = '';
      setIsUploadingFurniture(false);
    }
  };

  const handleRoomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploadingRooms(true);

      try {
        const files = Array.from(e.target.files);
        const newRooms: RoomImage[] = [];

        for (const file of files) {
          if (!file.type.startsWith('image/')) {
            continue;
          }

          const formData = new FormData();
          formData.append('file', file);
          formData.append('name', file.name.replace(/\.[^/.]+$/, ''));
          formData.append('aspectRatio', await inferAspectRatio(file));

          const response = await fetch('/api/rooms', {
            method: 'POST',
            body: formData,
          });
          const payload = await readJson<RoomMutationResponse>(response);
          newRooms.push(payload.item);
        }

        if (newRooms.length > 0) {
          setRoomImages((current) => [...newRooms, ...current]);
        }
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setIsUploadingRooms(false);
      }
    }
  };

  const removeRoom = async (id: string) => {
    const response = await fetch(`/api/rooms/${id}`, {
      method: 'DELETE',
    });

    await readJson<{ success: true }>(response);
    setRoomImages((current) => current.filter((room) => room.id !== id));
  };

  const toggleFurniture = (item: FurnitureItem) => {
    setSelectedFurnitures(prev => 
      prev.some(f => f.id === item.id) 
        ? prev.filter(f => f.id !== item.id) 
        : [...prev, item]
    );
  };

  const handleGenerate = async () => {
    if (roomImages.length === 0 || selectedFurnitures.length === 0) return;
    
    setIsGenerating(true);
    setError(null);
    setPlacedFurnitures([]);
    setCurrentGeneratedImage(null);
    
    const total = roomImages.length * selectedFurnitures.length;
    let current = 0;
    setBatchProgress({ current, total });
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      
      let prompt = `你是一位顶级的室内设计师和高级图像合成专家。
我按顺序提供了两张图片：
[图片 1]：基础场景（室内房间实景图）。
[图片 2]：目标物体（需要放入房间的家具参考图）。

【核心任务】
以 [图片 1] 为绝对的基础背景，将 [图片 2] 中的主体家具完美、无痕地合成到 [图片 1] 中。
严禁改变 [图片 1] 的房间结构、墙壁、地板和其他不相关的背景元素！

【高级合成规范】
1. 空间透视与比例 (Perspective & Scale)：
   - 严格遵循 [图片 1] 的空间透视灭点（Vanishing Points）。
   - 确保新家具的三维透视形变与房间的地板、墙面完全吻合。
   - 准确评估房间的物理尺度，使新家具的比例（长宽高）与周围环境（如门、窗、其他家具）保持绝对协调。
2. 光影与材质 (Lighting & Shadows)：
   - 深度分析 [图片 1] 的主光源方向、色温和环境光（Ambient Light）。
   - 为新家具重新生成符合房间光源的受光面、背光面和高光。
   - 必须在家具底部和接触面生成准确的接触阴影（Contact Shadows）和投射阴影（Cast Shadows），阴影的软硬程度需与房间现有阴影一致。
   - 如果地板是反光材质（如瓷砖、抛光木地板），必须生成新家具的真实倒影。
3. 遮挡与融合 (Occlusion & Blending)：
   - 妥善处理新家具与房间原有物品的前后遮挡关系。
   - 边缘融合必须自然，无明显的抠图白边或生硬过渡。
4. 智能替换与摆放 (Placement)：
   - 优先识别并替换 [图片 1] 中与 [图片 2] 功能相似的旧家具。
   - 如果是新增家具，请选择符合室内设计美学和动线逻辑的合理位置。`;

      if (customInstruction.trim()) {
        prompt += `\n\n【用户的特别指示与反馈】\n${customInstruction}`;
      }

      for (const room of roomImages) {
        for (const furniture of selectedFurnitures) {
          current++;
          setBatchProgress({ current, total });
          
          try {
            const [roomBase64, furnitureBase64] = await Promise.all([
              imageUrlToBase64(room.imageUrl),
              imageUrlToBase64(furniture.imageUrl),
            ]);

            const response = await ai.models.generateContent({
              model: GEMINI_IMAGE_MODEL,
              contents: {
                parts: [
                  {
                    inlineData: {
                      data: roomBase64,
                      mimeType: room.mimeType,
                    },
                  },
                  {
                    inlineData: {
                      data: furnitureBase64,
                      mimeType: furniture.mimeType,
                    },
                  },
                  {
                    text: prompt,
                  },
                ],
              },
              config: {
                imageConfig: {
                  aspectRatio: room.aspectRatio || "1:1",
                  imageSize: "2K"
                }
              }
            });

            let foundImage = false;
            for (const part of response.candidates?.[0]?.content?.parts || []) {
              if (part.inlineData) {
                const finalImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                const saveResponse = await fetch('/api/history', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    roomImageId: room.id,
                    furnitureItemId: furniture.id,
                    generatedDataUrl: finalImage,
                    customInstruction: customInstruction.trim() ? customInstruction : null,
                  }),
                });
                const payload = await readJson<HistoryMutationResponse>(saveResponse);

                setCurrentGeneratedImage(payload.item.generatedImage);
                foundImage = true;
                setHistory((previous) => [payload.item, ...previous]);
                break;
              }
            }

            if (!foundImage) {
              console.warn(`组合生成失败: 房间 ${room.id}, 家具 ${furniture.id}`);
            }
          } catch (err: any) {
            console.error("单个组合生成错误:", err);
            if (err.message && err.message.includes("Requested entity was not found")) {
              throw err;
            }
          }
        }
      }

    } catch (err: any) {
      console.error("批量生成错误:", err);
      if (err.message && err.message.includes("Requested entity was not found")) {
        setError("当前 AI 服务暂不可用，请联系管理员检查 Gemini API 配置。");
      } else {
        setError(err.message || "生成过程中发生错误。");
      }
    } finally {
      setIsGenerating(false);
      setBatchProgress(null);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setRoomImages([item.roomImage]);
    setSelectedFurnitures([item.furniture]);
    setCurrentGeneratedImage(item.generatedImage);
    setCustomInstruction(item.customInstruction || '');
    setPlacedFurnitures([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRecommendInstruction = () => {
    const random = RECOMMENDED_INSTRUCTIONS[Math.floor(Math.random() * RECOMMENDED_INSTRUCTIONS.length)];
    setCustomInstruction(random);
  };

  const handleAddFurnitureTag = (furniture: string) => {
    const textToAdd = `替换房间里的${furniture}`;
    if (!customInstruction.includes(textToAdd)) {
      setCustomInstruction(prev => prev ? `${prev} ${textToAdd}。` : `${textToAdd}。`);
    }
  };

  const totalCombos = roomImages.length * selectedFurnitures.length;
  const filteredCatalog = activeCategory === '全部' 
    ? catalog 
    : catalog.filter(item => item.category === activeCategory || (!item.category && activeCategory === '其他'));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 mb-1">室内编辑器 (批量处理)</h2>
        <p className="text-zinc-500">上传多张室内照片，选择多件家具，一次性生成所有组合的可视化效果。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-8">
        {/* Left Column: Inputs */}
        <div className="space-y-5 lg:space-y-6 lg:col-span-1">
          {/* Step 1: Room Images */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-900 font-bold flex items-center justify-center text-sm">1</div>
                <h3 className="font-medium text-zinc-900">上传室内图</h3>
              </div>
              <span className="text-xs font-medium bg-zinc-100 text-zinc-600 px-2 py-1 rounded-md">
                {isBootstrapping ? '同步中...' : `已选 ${roomImages.length} 张`}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-3">
              {roomImages.map(room => (
                <div key={room.id} className="relative aspect-video rounded-xl overflow-hidden border border-zinc-200 group">
                  <Image src={room.imageUrl} alt={room.name} fill className="object-cover" unoptimized />
                  <button 
                    onClick={() => removeRoom(room.id)}
                    className="absolute top-1 right-1 bg-white/90 text-red-500 p-1 rounded-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-50 shadow-sm"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => !isUploadingRooms && fileInputRef.current?.click()}
                disabled={isUploadingRooms}
                className={`aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors ${
                  isUploadingRooms
                    ? 'border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed'
                    : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300'
                }`}
              >
                {isUploadingRooms ? (
                  <>
                    <Loader2 size={20} className="mb-1 text-indigo-500 animate-spin" />
                    <span className="text-xs font-medium text-indigo-500">上传中...</span>
                  </>
                ) : (
                  <>
                    <Upload size={20} className="mb-1 text-zinc-400" />
                    <span className="text-xs font-medium">添加图片</span>
                  </>
                )}
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleRoomUpload} 
              className="hidden" 
              accept="image/*"
              multiple
            />
          </div>

          {/* Step 2: Select Furniture */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-900 font-bold flex items-center justify-center text-sm">2</div>
                <h3 className="font-medium text-zinc-900">选择家具</h3>
              </div>
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Layers size={16} />
                打开图册
              </button>
            </div>

            {selectedFurnitures.length === 0 ? (
              <div className="text-sm text-zinc-500 bg-zinc-50 p-6 rounded-xl border border-dashed border-zinc-200 text-center flex flex-col items-center gap-2">
                <Sofa size={24} className="text-zinc-300" />
                <p>尚未选择家具</p>
                <button
                  onClick={() => setIsDrawerOpen(true)}
                  className="mt-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
                >
                  从图册选择
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedFurnitures.map((item) => (
                  <div key={item.id} className="relative w-20 h-20 rounded-lg border border-zinc-200 overflow-hidden group">
                    <Image src={item.imageUrl} alt={item.name} fill className="object-contain bg-zinc-50 p-1" unoptimized />
                    <button
                      onClick={() => toggleFurniture(item)}
                      className="absolute top-1 right-1 bg-white/90 text-red-500 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 shadow-sm"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setIsDrawerOpen(true)}
                  className="w-20 h-20 border-2 border-dashed border-zinc-200 rounded-lg flex flex-col items-center justify-center text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
                >
                  <Upload size={16} className="mb-1 text-zinc-400" />
                  <span className="text-[10px] font-medium">继续添加</span>
                </button>
              </div>
            )}
            <input 
              type="file" 
              ref={furnitureInputRef} 
              onChange={handleFurnitureUpload} 
              className="hidden" 
              accept="image/*"
              multiple
            />
          </div>

          {/* Step 3: Custom Instructions */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-900 font-bold flex items-center justify-center text-sm">3</div>
                <h3 className="font-medium text-zinc-900">附加指令 <span className="text-zinc-400 text-sm font-normal">(可选)</span></h3>
              </div>
              <button
                onClick={handleRecommendInstruction}
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors"
                title="随机填入一条实用指令"
              >
                <Lightbulb size={14} />
                推荐指令
              </button>
            </div>
            
            <div className="mb-3">
              <div className="text-xs text-zinc-500 mb-2">快捷选择要替换的家具：</div>
              <div className="flex flex-wrap gap-2">
                {COMMON_FURNITURE.map(item => (
                  <button
                    key={item}
                    onClick={() => handleAddFurnitureTag(item)}
                    className="text-xs px-3 py-1.5 bg-zinc-50 border border-zinc-200 text-zinc-600 rounded-full hover:bg-zinc-100 hover:border-zinc-300 transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="例如：只提取图中的单人沙发，并替换房间里的木椅子..."
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition-all resize-none h-24 text-sm"
            />
          </div>

          {/* Step 4: Generate */}
          <button
            onClick={handleGenerate}
            disabled={totalCombos === 0 || isGenerating}
            className={`w-full py-4 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all ${
              totalCombos === 0
                ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                : isGenerating
                ? 'bg-indigo-500 text-white cursor-wait'
                : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-md hover:shadow-lg'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                正在生成 ({batchProgress?.current}/{batchProgress?.total})...
              </>
            ) : (
              <>
                {totalCombos > 1 ? <Layers size={20} /> : <Sparkles size={20} />}
                {totalCombos > 1 ? `批量生成 (${totalCombos} 个组合)` : '在房间中可视化'}
              </>
            )}
          </button>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-200">
              {error}
            </div>
          )}
        </div>

        {/* Right Column: Result */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
            <h3 className="font-medium text-zinc-900 flex items-center gap-2">
              <ImageIcon size={18} className="text-zinc-400" />
              生成结果 {isGenerating && batchProgress && <span className="text-indigo-600 text-sm ml-2">({batchProgress.current}/{batchProgress.total})</span>}
            </h3>
            {currentGeneratedImage && !isGenerating && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-1 rounded-md hidden sm:inline-block">
                  💡 提示：您可以将左侧家具直接拖拽到此图片上进行手动摆放
                </span>
                <a 
                  href={currentGeneratedImage.imageUrl} 
                  download="furniture-visualization.png"
                  className="text-sm flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Download size={16} />
                  下载当前
                </a>
              </div>
            )}
          </div>
          
          <div className="flex-1 p-4 sm:p-6 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] bg-zinc-50/30 relative">
            {/* Prominent Progress Overlay */}
            <AnimatePresence>
              {isGenerating && batchProgress && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-40 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-6"
                >
                  <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-3xl shadow-2xl border border-zinc-100 text-center">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                      <Loader2 size={32} className="text-indigo-600 animate-spin" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 mb-2">AI 正在批量处理</h3>
                    <p className="text-zinc-500 text-sm mb-8">
                      正在生成第 <span className="font-bold text-indigo-600 text-lg mx-1">{batchProgress.current}</span> 个组合，共 <span className="font-bold text-zinc-900 text-lg mx-1">{batchProgress.total}</span> 个
                    </p>
                    
                    {/* Thick Progress Bar */}
                    <div className="w-full h-4 bg-zinc-100 rounded-full overflow-hidden mb-3 shadow-inner">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500 font-medium">
                      <span>进度 {Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                      <span>请耐心等待...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {currentGeneratedImage ? (
              <div 
                className="relative w-full h-full min-h-[300px] sm:min-h-[400px] rounded-xl overflow-hidden shadow-lg border border-zinc-200"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dataStr = e.dataTransfer.getData('application/json');
                  if (!dataStr) return;
                  try {
                    const data = JSON.parse(dataStr);
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    if (data.type === 'NEW') {
                      const furniture = catalog.find(f => f.id === data.furnitureId);
                      if (furniture) {
                        setPlacedFurnitures(prev => [...prev, {
                          instanceId: Math.random().toString(36).substring(2, 9),
                          furniture,
                          x: x - 64,
                          y: y - 64,
                          scale: 1
                        }]);
                      }
                    } else if (data.type === 'MOVE') {
                      setPlacedFurnitures(prev => prev.map(pf => 
                        pf.instanceId === data.instanceId 
                          ? { ...pf, x: x - data.offsetX, y: y - data.offsetY }
                          : pf
                      ));
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
              >
                <Image src={currentGeneratedImage.imageUrl} alt="Generated visualization" fill className="object-contain bg-zinc-100" unoptimized />
                
                {/* Placed Furnitures */}
                {placedFurnitures.map(pf => (
                  <div
                    key={pf.instanceId}
                    draggable
                    onDragStart={(e) => {
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      const offsetX = e.clientX - rect.left;
                      const offsetY = e.clientY - rect.top;
                      e.dataTransfer.setData('application/json', JSON.stringify({ 
                        type: 'MOVE', 
                        instanceId: pf.instanceId,
                        offsetX,
                        offsetY
                      }));
                      setTimeout(() => {
                        (e.target as HTMLElement).style.opacity = '0.5';
                      }, 0);
                    }}
                    onDragEnd={(e) => {
                      (e.target as HTMLElement).style.opacity = '1';
                    }}
                    style={{
                      position: 'absolute',
                      left: pf.x,
                      top: pf.y,
                      width: 128 * pf.scale,
                      height: 128 * pf.scale,
                      cursor: 'move',
                      zIndex: 20
                    }}
                    className="group"
                  >
                    <Image src={pf.furniture.imageUrl} alt={pf.furniture.name} fill className="object-contain drop-shadow-2xl" unoptimized />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlacedFurnitures(prev => prev.filter(p => p.instanceId !== pf.instanceId));
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-30"
                    >
                      <X size={14} />
                    </button>
                    
                    {/* Simple resize buttons */}
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlacedFurnitures(prev => prev.map(p => p.instanceId === pf.instanceId ? { ...p, scale: Math.max(0.5, p.scale - 0.2) } : p));
                        }}
                        className="bg-zinc-800 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-zinc-700"
                      >
                        -
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlacedFurnitures(prev => prev.map(p => p.instanceId === pf.instanceId ? { ...p, scale: Math.min(3, p.scale + 0.2) } : p));
                        }}
                        className="bg-zinc-800 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-zinc-700"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Feedback Button */}
                <div className="absolute bottom-4 right-4 z-30">
                  <button
                    onClick={() => setIsFeedbackModalOpen(true)}
                    className="bg-white/90 backdrop-blur-md text-zinc-700 hover:text-indigo-600 px-4 py-2 rounded-full shadow-lg border border-zinc-200 flex items-center gap-2 text-sm font-medium transition-colors"
                  >
                    <MessageSquareText size={16} />
                    不满意？提供反馈
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center max-w-sm">
                <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Layers size={32} className="text-zinc-300" />
                </div>
                <h4 className="text-lg font-medium text-zinc-900 mb-2">准备批量生成</h4>
                <p className="text-zinc-500 text-sm">
                  上传多张室内照片并选择多件家具，AI 将为您生成所有组合的可视化效果。
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Section */}
      {history.length > 0 && (
        <div className="pt-10 mt-10 border-t border-zinc-200">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-600">
                <History size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                  生成历史
                  <span className="bg-zinc-900 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {history.length}
                  </span>
                </h3>
                <p className="text-sm text-zinc-500 mt-1">点击任意卡片即可恢复之前的编辑状态</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {history.map((item) => (
              <div 
                key={item.id}
                onClick={() => loadHistoryItem(item)}
                className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col"
              >
                {/* Main Result Image */}
                <div className="relative aspect-[4/3] bg-zinc-100 overflow-hidden">
                  <Image
                    src={item.generatedImage.imageUrl}
                    alt="History result"
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3">
                    <div className="bg-white text-zinc-900 font-medium text-sm px-4 py-2 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      点击恢复此状态
                    </div>
                  </div>

                  {/* Timestamp Badge */}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-zinc-700 text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5">
                    <Clock size={12} />
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* Parameters Info */}
                <div className="p-4 bg-white flex-1 flex flex-col justify-between border-t border-zinc-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider w-12">家具</div>
                    <div className="flex items-center gap-2 bg-zinc-50 px-2 py-1.5 rounded-lg flex-1 border border-zinc-100 overflow-hidden">
                      <div className="relative w-6 h-6 rounded-md overflow-hidden bg-white border border-zinc-200 shrink-0">
                        <Image src={item.furniture.imageUrl} alt={item.furniture.name} fill className="object-contain p-0.5" unoptimized />
                      </div>
                      <span className="text-sm font-medium text-zinc-700 truncate">
                        {item.furniture.name}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider w-12">场景</div>
                    <div className="flex items-center gap-2 bg-zinc-50 px-2 py-1.5 rounded-lg flex-1 border border-zinc-100 overflow-hidden">
                      <div className="relative w-6 h-6 rounded-md overflow-hidden bg-zinc-200 shrink-0">
                        <Image src={item.roomImage.imageUrl} alt={item.roomImage.name} fill className="object-cover" unoptimized />
                      </div>
                      <span className="text-sm text-zinc-600 truncate">
                        原始室内图
                      </span>
                    </div>
                  </div>

                  {item.customInstruction && (
                    <div className="flex items-start gap-3 mt-3 pt-3 border-t border-zinc-100">
                      <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider w-12 mt-0.5">指令</div>
                      <div className="text-xs text-zinc-600 flex-1 line-clamp-2" title={item.customInstruction}>
                        {item.customInstruction}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Furniture Preview Modal */}
      {previewFurniture && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewFurniture(null)}
        >
          <div 
            className="relative w-full max-w-3xl aspect-square md:aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setPreviewFurniture(null)}
              className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
            >
              <X size={20} />
            </button>
            <Image src={previewFurniture.imageUrl} alt={previewFurniture.name} fill className="object-contain p-4" unoptimized />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 pt-12">
              <h3 className="text-white text-xl font-medium">{previewFurniture.name}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Furniture Selection Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setIsDrawerOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
                <div className="flex items-center gap-2">
                  <Layers size={20} className="text-indigo-600" />
                  <h3 className="text-lg font-bold text-zinc-900">选择家具</h3>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-4 border-b border-zinc-100">
                {/* Category Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                  {FURNITURE_CATEGORIES.map(category => (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        activeCategory === category 
                          ? 'bg-zinc-900 text-white' 
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => !isUploadingFurniture && furnitureInputRef.current?.click()}
                    disabled={isUploadingFurniture}
                    className={`aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors ${
                      isUploadingFurniture 
                        ? 'border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed' 
                        : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300'
                    }`}
                  >
                    {isUploadingFurniture ? (
                      <>
                        <Loader2 size={20} className="mb-1 text-indigo-500 animate-spin" />
                        <span className="text-xs font-medium text-indigo-500">识别中...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={20} className="mb-1 text-zinc-400" />
                        <span className="text-xs font-medium">上传家具</span>
                      </>
                    )}
                  </button>
                  {filteredCatalog.map((item) => {
                    const isSelected = selectedFurnitures.some(f => f.id === item.id);
                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/json', JSON.stringify({ type: 'NEW', furnitureId: item.id }));
                        }}
                        onClick={() => toggleFurniture(item)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                          isSelected 
                            ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                            : 'border-zinc-100 hover:border-zinc-300'
                        }`}
                      >
                        <Image src={item.imageUrl} alt={item.name} fill className="object-contain bg-zinc-50 p-2" unoptimized />
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-indigo-500 text-white rounded-full p-0.5 z-10 shadow-sm">
                            <CheckCircle2 size={16} />
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewFurniture(item);
                          }}
                          className="absolute bottom-2 right-2 bg-white/90 text-zinc-700 p-1.5 rounded-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-zinc-100 hover:text-zinc-900 shadow-sm z-10"
                          title="放大查看"
                        >
                          <Maximize2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="p-4 border-t border-zinc-200 bg-zinc-50">
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-full py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  确认选择 ({selectedFurnitures.length} 件)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      <AnimatePresence>
        {isFeedbackModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsFeedbackModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <MessageSquareText size={20} className="text-indigo-600" />
                  提供优化反馈
                </h3>
                <button 
                  onClick={() => setIsFeedbackModalOpen(false)}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors p-1"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-5">
                <p className="text-sm text-zinc-600 mb-4">
                  如果生成的图像在透视、光影或摆放位置上不够理想，请告诉我们具体问题。您的反馈将直接附加到下一次生成的提示词中，帮助 AI 更精准地理解您的意图。
                </p>
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {['透视不对', '阴影太假', '大小比例不协调', '遮挡关系错误', '没有倒影', '位置放错了'].map(tag => (
                      <button
                        key={tag}
                        onClick={() => setFeedbackText(prev => prev ? `${prev}，${tag}` : tag)}
                        className="text-xs px-3 py-1.5 bg-zinc-50 border border-zinc-200 text-zinc-600 rounded-full hover:bg-zinc-100 hover:border-zinc-300 transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="例如：请把沙发的阴影调得更柔和一些，并且确保它完全贴合木地板的透视线..."
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none h-32 text-sm"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsFeedbackModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      if (feedbackText.trim()) {
                        setCustomInstruction(prev => prev ? `${prev}\n[修正反馈]: ${feedbackText}` : `[修正反馈]: ${feedbackText}`);
                        setIsFeedbackModalOpen(false);
                        setFeedbackText('');
                        handleGenerate();
                      }
                    }}
                    disabled={!feedbackText.trim()}
                    className="flex-1 py-2.5 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <Sparkles size={16} />
                    应用反馈并重新生成
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
