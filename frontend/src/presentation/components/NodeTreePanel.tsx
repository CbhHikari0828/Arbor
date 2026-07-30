import {
  BookOpen,
  ChevronDown,
  FileText,
  Home,
  Leaf,
  Moon,
  MoreHorizontal,
  Network,
  NotebookPen,
  Plus,
  Settings,
  Sparkle,
  Star,
  SunMedium,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  FormEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { NavLink, useNavigate } from "react-router-dom";
import type { KnowledgeNode } from "@/domain/knowledge/types";

interface NodeTreePanelProps {
  nodes: KnowledgeNode[];
  selectedNodeId: string | undefined;
  onSelectNode: (nodeId: string) => void;
  onCreateRootNode: (title: string) => Promise<void>;
  onDeleteNode: (nodeId: string) => Promise<void>;
  isCreatingRootNode: boolean;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const DEFAULT_SIDEBAR_WIDTH = 258;
const MIN_SIDEBAR_WIDTH = 220;
const MIN_COMPACT_SIDEBAR_WIDTH = 160;
const MAX_SIDEBAR_WIDTH = 420;
const MIN_WORKSPACE_WIDTH = 720;
const SIDEBAR_WIDTH_STORAGE_KEY = "arbor-sidebar-width";

function getMinimumSidebarWidth() {
  if (typeof window === "undefined") {
    return MIN_SIDEBAR_WIDTH;
  }

  return Math.max(
    MIN_COMPACT_SIDEBAR_WIDTH,
    Math.min(MIN_SIDEBAR_WIDTH, window.innerWidth - MIN_WORKSPACE_WIDTH),
  );
}

function getMaximumSidebarWidth() {
  if (typeof window === "undefined") {
    return MAX_SIDEBAR_WIDTH;
  }

  return Math.max(
    getMinimumSidebarWidth(),
    Math.min(MAX_SIDEBAR_WIDTH, window.innerWidth - MIN_WORKSPACE_WIDTH),
  );
}

function clampSidebarWidth(width: number) {
  return Math.min(Math.max(width, getMinimumSidebarWidth()), getMaximumSidebarWidth());
}

export function NodeTreePanel({
  nodes,
  selectedNodeId,
  onSelectNode,
  onCreateRootNode,
  onDeleteNode,
  isCreatingRootNode,
  isDarkMode,
  onToggleDarkMode,
}: NodeTreePanelProps) {
  const navigate = useNavigate();
  const rootNodes = useMemo(() => nodes.filter((node) => node.parentId === null), [nodes]);
  const [draftTitle, setDraftTitle] = useState("新知识树");
  const [isRenamingNewNode, setIsRenamingNewNode] = useState(false);
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(() => new Set());
  const [actionNodeId, setActionNodeId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_SIDEBAR_WIDTH;
    }

    const storedWidth = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    const parsedWidth = storedWidth ? Number.parseFloat(storedWidth) : Number.NaN;

    return Number.isFinite(parsedWidth) ? clampSidebarWidth(parsedWidth) : clampSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
  });
  const [isResizing, setIsResizing] = useState(false);
  const draftInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingDraftRef = useRef(false);
  const isCancellingDraftRef = useRef(false);
  const resizeStartRef = useRef<{ clientX: number; pointerId: number; width: number } | null>(null);
  const dragStyleRef = useRef<{ cursor: string; userSelect: string } | null>(null);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    const handleWindowResize = () => {
      setSidebarWidth((currentWidth) => clampSidebarWidth(currentWidth));
    };

    window.addEventListener("resize", handleWindowResize);

    return () => window.removeEventListener("resize", handleWindowResize);
  }, []);

  const restoreDragStyles = useCallback(() => {
    const previousStyles = dragStyleRef.current;

    if (!previousStyles) {
      return;
    }

    document.body.style.cursor = previousStyles.cursor;
    document.body.style.userSelect = previousStyles.userSelect;
    dragStyleRef.current = null;
  }, []);

  const stopResizing = useCallback(
    (pointerId?: number) => {
      const resizeStart = resizeStartRef.current;

      if (pointerId !== undefined && resizeStart?.pointerId !== pointerId) {
        return;
      }

      resizeStartRef.current = null;
      restoreDragStyles();
      setIsResizing(false);
    },
    [restoreDragStyles],
  );

  const resizeFromPointer = useCallback((clientX: number, pointerId: number) => {
    const resizeStart = resizeStartRef.current;

    if (!resizeStart || pointerId !== resizeStart.pointerId) {
      return;
    }

    setSidebarWidth(clampSidebarWidth(resizeStart.width + clientX - resizeStart.clientX));
  }, []);

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => resizeFromPointer(event.clientX, event.pointerId);
    const handlePointerUp = (event: PointerEvent) => stopResizing(event.pointerId);
    const handleWindowBlur = () => stopResizing();

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("blur", handleWindowBlur);
      resizeStartRef.current = null;
      restoreDragStyles();
    };
  }, [isResizing, resizeFromPointer, restoreDragStyles, stopResizing]);

  useEffect(() => {
    if (!isRenamingNewNode) {
      return;
    }

    window.requestAnimationFrame(() => {
      draftInputRef.current?.focus();
      draftInputRef.current?.select();
    });
  }, [isRenamingNewNode]);

  const startCreateRootNode = () => {
    if (isRenamingNewNode || isCreatingRootNode) {
      return;
    }

    setDraftTitle("新知识树");
    setIsRenamingNewNode(true);
  };

  const submitDraft = async () => {
    if (isCancellingDraftRef.current) {
      isCancellingDraftRef.current = false;
      return;
    }

    if (isSubmittingDraftRef.current) {
      return;
    }

    const title = draftTitle.trim();

    if (!title) {
      setIsRenamingNewNode(false);
      return;
    }

    isSubmittingDraftRef.current = true;
    setIsSubmittingDraft(true);

    try {
      await onCreateRootNode(title);
      setIsRenamingNewNode(false);
    } finally {
      isSubmittingDraftRef.current = false;
      setIsSubmittingDraft(false);
    }
  };

  const handleDraftSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitDraft();
  };

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      isCancellingDraftRef.current = true;
      setIsRenamingNewNode(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    setCollapsedNodeIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(nodeId)) {
        nextIds.delete(nodeId);
      } else {
        nextIds.add(nodeId);
      }

      return nextIds;
    });
  };

  const selectAndOpenNode = (nodeId: string) => {
    onSelectNode(nodeId);
    navigate(`/workspace?node=${nodeId}`);
  };

  const handleResizePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !event.isPrimary) {
      return;
    }

    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeStartRef.current = {
      clientX: event.clientX,
      pointerId: event.pointerId,
      width: sidebarWidth,
    };
    dragStyleRef.current = {
      cursor: document.body.style.cursor,
      userSelect: document.body.style.userSelect,
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    setIsResizing(true);
  };

  const handleResizePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    resizeFromPointer(event.clientX, event.pointerId);
  };

  const handleResizePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    stopResizing(event.pointerId);
  };

  const handleResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const widthByKey: Record<string, number> = {
      ArrowLeft: -16,
      ArrowRight: 16,
    };

    if (event.key === "Home") {
      event.preventDefault();
      setSidebarWidth(getMinimumSidebarWidth());
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setSidebarWidth(getMaximumSidebarWidth());
      return;
    }

    const widthDelta = widthByKey[event.key];

    if (widthDelta === undefined) {
      return;
    }

    event.preventDefault();
    setSidebarWidth((currentWidth) => clampSidebarWidth(currentWidth + widthDelta));
  };

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col border-r border-[#d8d8d8] bg-[#f7f7f7] px-4 pb-4 pt-6 transition-colors duration-300 dark:border-[#27313a] dark:bg-[#090d12]"
      style={{ width: sidebarWidth }}
    >
      <div className="mb-9 flex items-start justify-between px-2">
        <div className="flex items-center gap-3">
          <div aria-label="Arbor 标志" className="grid size-8 place-items-center text-[#111111] dark:text-[#61b979]" role="img">
            <Leaf size={31} strokeWidth={1.9} />
          </div>
          <div>
            <h1 className="text-[28px] font-semibold leading-7 tracking-[-0.02em] text-[#191919] dark:text-[#f4f7f5]">
              Arbor
            </h1>
            <p className="mt-1 text-xs tracking-[0.08em] text-[#666666] dark:text-[#98a49f]">
              AI 知识工作台
            </p>
          </div>
        </div>
      </div>

      <nav className="mb-7 space-y-1.5 text-[14px] text-[#222222] dark:text-[#e3e9e5]">
        <SidebarLink icon={<Home size={16} />} label="首页" to="/workspace" />
        <SidebarLink icon={<BookOpen size={16} />} label="我的知识库" to="/library" />
        <SidebarLink icon={<NotebookPen size={16} />} label="笔记" to="/notes" />
        <SidebarLink icon={<Star size={16} />} label="收藏夹" to="/favorites" />
        <SidebarLink icon={<Trash2 size={16} />} label="回收站" to="/trash" />
      </nav>

      <div className="mb-3 flex items-center justify-between px-2 text-sm text-[#444444] dark:text-[#d7dfda]">
        <span>知识树</span>
        <button
          aria-label="新建知识树"
          className="grid size-7 place-items-center rounded-md text-[#111111] transition hover:bg-[#e9e9e9] dark:text-[#d7dfda] dark:hover:bg-[#151c24]"
          onClick={startCreateRootNode}
          type="button"
        >
          <Plus size={17} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {isRenamingNewNode ? (
          <form className="mb-2" onSubmit={handleDraftSubmit}>
            <input
              ref={draftInputRef}
              aria-label="根节点名称"
              className="h-10 w-full rounded-xl border border-[#111111] bg-white px-3 text-sm font-medium text-[#111111] shadow-sm outline-none dark:border-[#4d8d5f] dark:bg-[#111820] dark:text-[#edf3ef]"
              disabled={isSubmittingDraft || isCreatingRootNode}
              onBlur={() => void submitDraft()}
              onChange={(event) => setDraftTitle(event.target.value)}
              onKeyDown={handleDraftKeyDown}
              value={draftTitle}
            />
          </form>
        ) : null}

        <div className="space-y-1">
          {rootNodes.map((node) => (
            <TreeRow
              key={node.id}
              depth={0}
              node={node}
              nodes={nodes}
              collapsedNodeIds={collapsedNodeIds}
              onSelectNode={selectAndOpenNode}
              onDeleteNode={onDeleteNode}
              actionNodeId={actionNodeId}
              onToggleActions={(nodeId) => setActionNodeId((currentId) => currentId === nodeId ? null : nodeId)}
              onToggleNode={toggleNode}
              selectedNodeId={selectedNodeId}
              isExpanded={!collapsedNodeIds.has(node.id)}
            />
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between px-2">
        <div className="relative">
          <div className="size-10 overflow-hidden rounded-full bg-[#dddddd] dark:bg-[#d8d2c8]">
            <div className="mx-auto mt-2 size-6 rounded-full bg-[#bdbdbd]" />
            <div className="mx-auto mt-1 h-5 w-8 rounded-t-full bg-[#2b2b2b]" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#f7f7f7] bg-[#111111] dark:border-[#090d12]" />
        </div>
        <ThemeSwitch isDarkMode={isDarkMode} onToggleDarkMode={onToggleDarkMode} />
        <FooterButton icon={<Settings size={19} />} label="设置" />
      </div>

      <div
        aria-label="调整侧栏宽度"
        aria-orientation="vertical"
        aria-valuemax={getMaximumSidebarWidth()}
        aria-valuemin={getMinimumSidebarWidth()}
        aria-valuenow={Math.round(sidebarWidth)}
        className="group absolute inset-y-0 -right-1.5 z-20 w-3 cursor-col-resize touch-none outline-none focus-visible:bg-[#ececec] dark:focus-visible:bg-[#15271d]"
        onKeyDown={handleResizeKeyDown}
        onLostPointerCapture={handleResizePointerEnd}
        onPointerCancel={handleResizePointerEnd}
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerEnd}
        role="separator"
        tabIndex={0}
        title="拖动调整侧栏宽度"
      >
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors ${
            isResizing
              ? "bg-[#111111] dark:bg-[#62c487]"
              : "bg-transparent group-hover:bg-[#777777] group-focus:bg-[#111111] dark:group-hover:bg-[#4d765e] dark:group-focus:bg-[#62c487]"
          }`}
        />
      </div>
    </aside>
  );
}

function SidebarLink({ icon, label, to }: { icon: ReactNode; label: string; to: string }) {
  return (
    <NavLink
      className={({ isActive }) =>
        [
          "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left transition",
          isActive
            ? "bg-[#e9e9e9] font-medium text-[#111111] dark:bg-[#17231d] dark:text-[#b9e2c5]"
            : "hover:bg-[#eeeeee] dark:hover:bg-[#151c24]",
        ].join(" ")
      }
      end
      to={to}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

function TreeRow({
  depth,
  node,
  nodes,
  collapsedNodeIds,
  selectedNodeId,
  onSelectNode,
  onDeleteNode,
  actionNodeId,
  onToggleActions,
  onToggleNode,
  isExpanded,
}: {
  depth: number;
  node: KnowledgeNode;
  nodes: KnowledgeNode[];
  collapsedNodeIds: Set<string>;
  selectedNodeId: string | undefined;
  onSelectNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => Promise<void>;
  actionNodeId: string | null;
  onToggleActions: (nodeId: string) => void;
  onToggleNode: (nodeId: string) => void;
  isExpanded: boolean;
}) {
  const children = nodes.filter((candidate) => candidate.parentId === node.id);
  const isSelected = node.id === selectedNodeId;
  const isRoot = depth === 0;
  const handleRowClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (children.length > 0 && (event.target as HTMLElement).closest("[data-tree-toggle]")) {
      onToggleNode(node.id);
      return;
    }

    if ((event.target as HTMLElement).closest("[data-tree-actions]")) {
      onToggleActions(node.id);
      return;
    }

    onSelectNode(node.id);
  };

  return (
    <div>
      <button
        className={[
          "group flex h-10 w-full items-center gap-2 rounded-lg pr-2 text-left text-sm transition",
          isSelected
            ? "bg-[#e9e9e9] font-semibold text-[#111111] dark:bg-[#151c24] dark:text-[#f3f7f4]"
            : "text-[#262626] hover:bg-[#eeeeee] dark:text-[#cdd6d1] dark:hover:bg-[#121920]",
        ].join(" ")}
        aria-expanded={children.length > 0 ? isExpanded : undefined}
        onClick={handleRowClick}
        style={{ paddingLeft: 8 + depth * 26 }}
        type="button"
      >
        {children.length > 0 ? (
          <span
            aria-label={isExpanded ? "收起子节点" : "展开子节点"}
            className={[
              "grid size-4 shrink-0 place-items-center transition-transform",
              isExpanded ? "" : "-rotate-90",
            ].join(" ")}
            data-tree-toggle
          >
            <ChevronDown size={14} className="text-[#333333] dark:text-[#d5ded8]" />
          </span>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        {isRoot ? (
          <Network size={16} className="shrink-0 text-[#222222] dark:text-[#d6ede0]" />
        ) : (
          <FileText size={16} className="shrink-0 text-[#343936] dark:text-[#d6ded9]" />
        )}
        <span className="min-w-0 flex-1 truncate">{node.title}</span>
        {isRoot ? (
          <span data-tree-actions className="grid size-6 shrink-0 place-items-center rounded-md text-[#747970] hover:bg-[#dddddd] dark:text-[#d7dfda] dark:hover:bg-[#202a33]">
            <MoreHorizontal size={15} />
          </span>
        ) : null}
      </button>

      {actionNodeId === node.id ? (
        <div className="ml-8 mt-1 flex justify-end">
          <button className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-[#b42318] transition hover:bg-[#fff0ed] dark:text-[#ffad96] dark:hover:bg-[#38211f]" onClick={() => void onDeleteNode(node.id)} type="button">
            <Trash2 size={13} />删除节点
          </button>
        </div>
      ) : null}

      {children.length > 0 && isExpanded ? (
        <div className="relative ml-5 border-l border-[#d8d8d8] dark:border-[#2b343d]">
          {children.map((child) => (
            <TreeRow
              key={child.id}
              depth={depth + 1}
              node={child}
              nodes={nodes}
              collapsedNodeIds={collapsedNodeIds}
              onSelectNode={onSelectNode}
              onDeleteNode={onDeleteNode}
              actionNodeId={actionNodeId}
              onToggleActions={onToggleActions}
              onToggleNode={onToggleNode}
              selectedNodeId={selectedNodeId}
              isExpanded={!collapsedNodeIds.has(child.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GrowthCard() {
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-[#d8d8d8] bg-white px-4 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.08)] transition-colors duration-300 dark:border-[#303a44] dark:bg-[#111820] dark:shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#222222] dark:text-[#edf3ef]">
        <Sparkle size={16} className="text-[#111111] dark:text-[#61b979]" />
        今日成长
      </div>
      <div className="space-y-2 text-sm text-[#333333] dark:text-[#e7eee9]">
        <p>
          新增节点 <span className="ml-1 font-semibold text-[#111111] dark:text-[#f0b84f]">3</span>
        </p>
        <p>
          AI 总结完成 <span className="ml-1 font-semibold text-[#111111] dark:text-[#f0b84f]">2</span>
        </p>
        <p>
          连接推荐 <span className="ml-1 font-semibold text-[#111111] dark:text-[#f0b84f]">1</span>
        </p>
      </div>

      <div className="relative -mb-5 ml-auto mt-1 h-16 w-24 dark:hidden">
        <div className="absolute bottom-0 right-0 h-6 w-20 rounded-t-[60%] bg-[#d2d2d2]" />
        <div className="absolute bottom-4 right-9 h-10 w-1.5 rounded-full bg-[#777777]" />
        <span className="absolute bottom-8 right-7 size-4 rounded-full bg-[#9c9c9c]" />
        <span className="absolute bottom-5 right-14 size-3 rounded-full bg-[#b8b8b8]" />
        <span className="absolute bottom-2 right-6 size-3 rounded-full bg-[#b8b8b8]" />
      </div>

      <div className="mt-2 hidden h-16 items-end gap-3 border-b border-[#36404a] px-1 dark:flex">
        {[14, 26, 34, 24, 38, 28, 54].map((height, index) => (
          <span
            key={`${height}-${index}`}
            className={[
              "w-3 rounded-t-sm bg-gradient-to-t from-[#2f6e47] to-[#73b982]",
              index === 2 ? "ring-8 ring-[#1e5b38]/40" : "",
            ].join(" ")}
            style={{ height }}
          />
        ))}
      </div>
      <div className="hidden justify-between px-1 pt-2 text-xs text-[#a1aba6] dark:flex">
        <span>一</span>
        <span>二</span>
        <span>三</span>
        <span>四</span>
        <span>五</span>
        <span>六</span>
        <span>日</span>
      </div>
    </div>
  );
}

function ThemeSwitch({
  isDarkMode,
  onToggleDarkMode,
}: {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}) {
  return (
    <button
      aria-label={isDarkMode ? "切换到浅色模式" : "切换到黑暗模式"}
      className="flex h-10 items-center gap-1 rounded-full bg-[#e9e9e9] p-1 text-[#1f1f1f] transition dark:bg-[#111820] dark:text-[#dce5df]"
      onClick={onToggleDarkMode}
      type="button"
    >
      <span
        className={[
          "grid size-8 place-items-center rounded-full transition",
          isDarkMode ? "text-[#9aa6a1]" : "bg-white shadow-sm",
        ].join(" ")}
      >
        <SunMedium size={18} />
      </span>
      <span
        className={[
          "grid size-8 place-items-center rounded-full transition",
          isDarkMode ? "bg-[#222a33] shadow-[0_8px_18px_rgba(0,0,0,0.25)]" : "text-[#666666]",
        ].join(" ")}
      >
        <Moon size={18} fill={isDarkMode ? "currentColor" : "none"} />
      </span>
    </button>
  );
}

function FooterButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <NavLink
      aria-label={label}
      className={({ isActive }) =>
        `grid size-9 place-items-center rounded-lg transition ${
          isActive
            ? "bg-[#e9e9e9] text-[#111111] dark:bg-[#17231d] dark:text-[#b9e2c5]"
            : "text-[#1f1f1f] hover:bg-[#e9e9e9] dark:text-[#dce5df] dark:hover:bg-[#151c24]"
        }`
      }
      title={label}
      to="/settings"
    >
      {icon}
    </NavLink>
  );
}
