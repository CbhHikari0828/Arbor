# Arbor

> 面向知识探索的 AI 工作台。将知识节点、讨论分支、文档资料和后续 AI 检索能力组织在同一个可视化工作区。  
> An AI workspace for knowledge exploration. It brings knowledge nodes, discussion branches, reference documents, and future AI retrieval into one visual workspace.

## 功能 / Features

- **知识图谱工作台 / Knowledge graph workspace**：以可视化节点和连线组织知识结构，支持创建子节点、删除节点、定位根节点和自动聚焦新建节点。  
  Organize knowledge as connected visual nodes. Create child nodes, remove nodes, focus the root, and automatically focus newly created nodes.
- **收藏节点 / Favorites**：节点右上角可切换收藏状态；收藏夹会显示当前收藏的知识节点。  
  Toggle a favorite star in the top-right corner of each node; the Favorites view lists the currently saved nodes.
- **知识库 / Knowledge library**：提供文档列表、搜索和本地上传后的索引状态演示，为接入 AI 检索知识库预留界面。  
  Includes a document list, search, and local-upload indexing demo, ready to be connected to an AI retrieval knowledge base.
- **回收站 / Recycle bin**：展示最近删除节点的 mock 数据，并提供恢复和永久删除的交互演示。  
  Shows mock recently deleted nodes with restore and permanent-delete interaction demos.
- **AI 助手与笔记 / AI assistant and notes**：右侧对话面板可最大化为中间工作区，方便持续提问，再收缩回侧栏。  
  The right-side conversation panel can expand over the main workspace for focused prompting, then collapse back to the sidebar.
- **浅色与深色模式 / Light and dark modes**：为工作台和资源页面提供一致的主题切换。  
  Consistent theme switching across the workspace and resource views.

## 页面 / Views

| 路径 / Route | 说明 / Description |
| --- | --- |
| `/workspace` | 知识图谱工作台 / Knowledge graph workspace |
| `/library` | 文档知识库 / Document knowledge library |
| `/favorites` | 收藏的知识节点 / Favorited knowledge nodes |
| `/trash` | 最近删除节点的 mock 回收站 / Mock recycle bin |

## 技术栈 / Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS
- React Flow (`@xyflow/react`) for the knowledge graph
- TanStack Query and Zustand for application state
- Tiptap for the discussion editor
- Docker Compose for the local development environment

## 快速开始 / Quick Start

### Docker Compose

从仓库根目录运行：  
From the repository root, run:

```bash
docker compose -f Arbor/docker-compose.yml up --build
```

打开 / Open:

```text
http://localhost:5173/workspace
```

Compose 会将本地 `frontend/` 挂载到容器，并启用文件轮询，因此修改前端代码会触发 Vite 热更新。  
Compose mounts the local `frontend/` directory into the container and enables file polling, so frontend changes trigger Vite hot updates.

### 本地运行 / Run Locally

```bash
cd frontend
npm install
npm run dev
```

### 构建 / Build

```bash
cd frontend
npm run build
```

## 项目结构 / Project Structure

```text
.
├── frontend/
│   └── src/
│       ├── application/      # 用例与工作台控制逻辑 / Use cases and workspace controller
│       ├── domain/           # 领域模型与仓储契约 / Domain models and repository contracts
│       ├── infrastructure/   # 当前的 Mock Repository / Current mock repository
│       └── presentation/     # React 页面、组件与样式 / React pages, components, and styles
├── Arbor/
│   ├── docker-compose.yml
│   └── frontend/Dockerfile
├── 产品.md                   # 产品说明 / Product notes
└── README.md
```

## 当前状态 / Current Status

本项目当前使用内存中的 Mock Repository，知识库文档、回收站记录和 AI 问答均为前端交互演示。后续可在保持现有领域与应用层结构的基础上接入持久化存储、文档解析/向量检索，以及真实的 AI 服务。  
The project currently uses an in-memory mock repository. Knowledge-library documents, recycle-bin records, and AI conversation are frontend interaction demos. Persistent storage, document parsing/vector retrieval, and a real AI service can be added while preserving the existing domain and application-layer structure.
