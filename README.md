<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 佩奇家具 (Peiqi Furniture) - AI 室内可视化应用

基于先进的 Gemini 模型架构搭建的企业级 AI 室内家具渲染预览终端。支持极速图像识别与融合。

## 🎯 核心新特性 
- 基于 Cloudflare R2 搭建的全球免出网流量图床，完美解决大量高清 AI 预览图带宽危机。  
- 无缝集成 Better Auth 和连接池化架构的 PostgreSQL，保障应用并发性能。

## 🚀 部署指南 (Run Locally)

**环境要求:**  Node.js 20+

1. **安装依赖:**
   ```bash
   npm install
   ```
2. **配置环境变量:**
   根据 `.env.example` 提示，创建自己的 `.env` 文件。务必补全您的图床配置：
   - `GEMINI_API_KEY`：Google AI 密钥
   - `DATABASE_URL` 与 Supabase 配置
   - `R2_ACCOUNT_ID` 等全套 Cloudflare 密钥
3. **启动应用:**
   ```bash
   npm run dev
   ```
打开 `http://localhost:3000` 即可见证奇迹。
