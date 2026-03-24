# Tiny-Typeless 开发计划

## 1. 技术栈选型
- **后端框架**: Go (提供核心业务逻辑、配置管理、AI 接口调用)
- **桌面端框架**: Wails v2 (桥接 Go 与 Web 前端，打包跨平台桌面应用)
- **前端技术**: React + TypeScript + TailwindCSS (快速构建现代化 UI，你也可以替换为 Vue 等)
- **音频处理**: 
  - **录音与波形**: 前端 Web Audio API (`MediaRecorder` 用于录制，`AnalyserNode` + Canvas 用于绘制波形图)。在 Web 层处理音频可视化最成熟且性能好。
  - **音频传输**: 录制完成后，前端将音频 Blob 转换为 Base64 或字节流，通过 Wails 绑定方法发送给 Go 后端。
- **AI 接口**: `github.com/google/generative-ai-go/genai` (Google 官方 Go SDK，用于调用 Gemini 2.0 Flash)。

## 2. 架构设计与扩展性预留
- **配置管理 (`config` 模块)**: 
  - 本地持久化 (如存入 `~/.tiny-typeless/config.json`)。
  - 存储字段：`Provider` (默认 gemini), `APIKey`, `Model`。
- **AI 供应商抽象 (`llm` 模块)**:
  - 定义接口 `type Transcriber interface { Transcribe(audio []byte) (string, error) }`。
  - 实现 `GeminiTranscriber`，未来如果需要支持 OpenAI Whisper 等，只需新增一个实现即可。

## 3. 分阶段开发步骤

### 阶段一：项目初始化与骨架搭建
1. 使用 Wails CLI 初始化项目 (例如：`wails init -n tiny-typeless -t react-ts`)。
2. 清理默认模板代码，搭建基础的前端路由或状态管理（区分“主界面”和“设置界面”）。
3. 梳理 Go 端的 Wails Bindings 结构（如 `App.go` 中的暴露方法）。

### 阶段二：后端核心逻辑开发 (Go)
1. **配置系统**: 实现 `LoadConfig()` 和 `SaveConfig(cfg Config)` 并暴露给前端。
2. **AI 集成**: 
   - 引入 Gemini Go SDK。
   - 实现上传音频流并调用 Gemini 2.0 Flash 提取文本的方法 (`TranscribeAudio`)。
3. **接口绑定**: 暴露前端所需的 Go 方法，如 `SaveSettings`, `GetSettings`, `ProcessAudio`。

### 阶段三：前端功能与 UI 开发 (React)
1. **设置页面 (Settings UI)**:
   - Provider 下拉选择 (Gemini)。
   - API Key 密码输入框。
   - Model 下拉选择 (Gemini 2.0 Flash)。
   - 保存按钮（调用 Go `SaveSettings`）。
2. **主页面 (Main UI)**:
   - **核心状态**: `isRecording`, `audioLevel`, `transcriptionText`。
   - **录音功能**: 封装 `useAudioRecorder` hook，请求麦克风权限，获取音频流。
   - **波形图组件**: 使用 HTML5 `<canvas>` 结合 `AnalyserNode`，根据 `requestAnimationFrame` 实时绘制声波动态。
   - **控制面板**: 一个醒目的麦克风按钮控制开始/停止。
   - **文本展示**: 一个 `<textarea>`，绑定转换后的文本，支持用户直接修改和复制。
3. **联调**: 录音结束后，收集音频 Buffer 传给 Go 端，显示 Loading 状态，等待 Gemini 返回文本并打在文本框内。

### 阶段四：打包与跨平台测试
1. 准备应用图标。
2. 使用 Wails 在 Windows 和 Mac (M芯片/Intel) 环境下分别执行 `wails build` 测试编译。
3. 测试麦克风权限申请、API Key 保存、网络请求稳定性。

## 4. 后续优化方向 (可选)
- 流式识别 (Streaming): 等 Gemini 多模态 Live API 更稳定后可以接入实时出字。
- 全局快捷键: 绑定快捷键直接唤起录音。
- 文本追加模式: 连续多次录音可以自动追加或换行。