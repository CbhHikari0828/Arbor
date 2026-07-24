import { useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  FileText,
  MoreHorizontal,
  Search,
  Upload,
} from "lucide-react";
import { WorkspaceScaffold } from "@/presentation/components/WorkspaceScaffold";

type LibraryDocumentStatus = "ready" | "indexing";

interface LibraryDocument {
  id: string;
  title: string;
  type: string;
  source: string;
  size: string;
  chunks: number;
  updatedAt: string;
  status: LibraryDocumentStatus;
}

const initialDocuments: LibraryDocument[] = [
  {
    id: "doc-prd",
    title: "Arbor 产品需求文档 v2.1",
    type: "PDF",
    source: "本地上传",
    size: "2.4 MB",
    chunks: 86,
    updatedAt: "今天 10:32",
    status: "ready",
  },
  {
    id: "doc-research",
    title: "用户研究访谈纪要",
    type: "DOCX",
    source: "本地上传",
    size: "864 KB",
    chunks: 42,
    updatedAt: "昨天 16:18",
    status: "ready",
  },
  {
    id: "doc-market",
    title: "知识管理产品市场分析",
    type: "PDF",
    source: "网页剪藏",
    size: "1.8 MB",
    chunks: 57,
    updatedAt: "7 月 22 日",
    status: "ready",
  },
  {
    id: "doc-notes",
    title: "团队共识与决策记录",
    type: "MD",
    source: "Notion 同步",
    size: "128 KB",
    chunks: 19,
    updatedAt: "7 月 21 日",
    status: "ready",
  },
  {
    id: "doc-competitor",
    title: "竞品功能拆解与截图整理",
    type: "PDF",
    source: "本地上传",
    size: "4.2 MB",
    chunks: 0,
    updatedAt: "刚刚",
    status: "indexing",
  },
];

export function KnowledgeLibraryPage() {
  const [documents, setDocuments] = useState(initialDocuments);
  const [query, setQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    if (!normalizedQuery) {
      return documents;
    }

    return documents.filter((document) =>
      [document.title, document.type, document.source]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [documents, query]);

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextDocuments = Array.from(event.target.files ?? []).map<LibraryDocument>((file) => ({
      id: `local-${file.name}-${file.lastModified}`,
      title: file.name.replace(/\.[^/.]+$/, "") || file.name,
      type: file.name.split(".").pop()?.toUpperCase() || "FILE",
      source: "本地上传",
      size: formatFileSize(file.size),
      chunks: 0,
      updatedAt: "刚刚",
      status: "indexing",
    }));

    if (nextDocuments.length > 0) {
      setDocuments((currentDocuments) => [...nextDocuments, ...currentDocuments]);
    }

    event.target.value = "";
  };

  return (
    <WorkspaceScaffold>
      {() => (
        <section className="flex h-full min-w-0 flex-col bg-[#f7f7f7] dark:bg-[#0b1016]">
          <header className="flex min-h-[96px] shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border/70 bg-white/95 px-7 py-5 transition-colors duration-300 dark:border-[#202b34] dark:bg-[#0b1016]/95">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#eeeeee] text-[#111111] dark:bg-[#173626] dark:text-[#91d4a8]">
                <BookOpen size={21} strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-[21px] font-semibold text-[#1b2520] dark:text-[#f4f7f5]">
                  我的知识库
                </h1>
                <p className="mt-1 text-sm text-[#666666] dark:text-[#9aa6a1]">
                  文档会被分段、索引，并在对话中作为知识来源引用
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-[#666666] sm:inline dark:text-[#a4afa9]">
                {documents.length} 份文档 · {documents.reduce((total, document) => total + document.chunks, 0)} 个片段
              </span>
              <input
                ref={fileInputRef}
                className="sr-only"
                multiple
                onChange={handleFilesSelected}
                type="file"
              />
              <button
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#111111] px-4 text-sm font-medium text-white transition hover:bg-[#2a2a2a] dark:bg-[#4b9b65] dark:text-[#07100a] dark:hover:bg-[#62ad79]"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <Upload size={17} strokeWidth={1.8} />
                上传文档
              </button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col overflow-auto px-7 py-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div className="relative w-full max-w-[360px]">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#777777] dark:text-[#9aa6a1]"
                  size={17}
                />
                <input
                  aria-label="搜索知识库文档"
                  className="h-10 w-full rounded-lg border border-[#d8d8d8] bg-white pl-10 pr-3 text-sm text-[#222222] outline-none transition placeholder:text-[#999999] focus:border-[#111111] focus:ring-2 focus:ring-black/10 dark:border-[#2a3540] dark:bg-[#111820] dark:text-[#edf3ef] dark:placeholder:text-[#708078]"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索文档、类型或来源"
                  value={query}
                />
              </div>
              <p className="text-sm text-[#777777] dark:text-[#9aa6a1]">
                已同步 {documents.filter((document) => document.status === "ready").length} 份
              </p>
            </div>

            <section className="min-w-[720px] overflow-hidden rounded-lg border border-[#d8d8d8] bg-white dark:border-[#27313a] dark:bg-[#10161d]">
              <div className="grid grid-cols-[minmax(270px,1.7fr)_100px_130px_100px_120px_72px] items-center gap-4 border-b border-[#e2e2e2] bg-[#f3f3f3] px-5 py-3 text-xs font-medium text-[#777777] dark:border-[#27313a] dark:bg-[#141b23] dark:text-[#97a39c]">
                <span>文档</span>
                <span>类型</span>
                <span>来源</span>
                <span>片段</span>
                <span>最后更新</span>
                <span className="text-right">状态</span>
              </div>

              {filteredDocuments.length > 0 ? (
                <div className="divide-y divide-[#e2e2e2] dark:divide-[#27313a]">
                  {filteredDocuments.map((document) => (
                    <article
                      key={document.id}
                      className="grid grid-cols-[minmax(270px,1.7fr)_100px_130px_100px_120px_72px] items-center gap-4 px-5 py-4 transition hover:bg-[#f3f3f3] dark:hover:bg-[#131b22]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-[#eeeeee] text-[#333333] dark:bg-[#252119] dark:text-[#e2ad58]">
                          <FileText size={18} strokeWidth={1.7} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#222222] dark:text-[#edf3ef]">{document.title}</p>
                          <p className="mt-1 text-xs text-[#888888] dark:text-[#85938b]">{document.size}</p>
                        </div>
                      </div>
                      <span className="text-sm text-[#666666] dark:text-[#c1cbc4]">{document.type}</span>
                      <span className="truncate text-sm text-[#666666] dark:text-[#c1cbc4]">{document.source}</span>
                      <span className="text-sm tabular-nums text-[#666666] dark:text-[#c1cbc4]">
                        {document.status === "ready" ? document.chunks : "处理中"}
                      </span>
                      <span className="text-sm text-[#777777] dark:text-[#a4afa9]">{document.updatedAt}</span>
                      <div className="flex items-center justify-end gap-1">
                        {document.status === "ready" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#222222] dark:text-[#8fcfa6]">
                            <Check size={14} strokeWidth={2.2} />
                            已就绪
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-[#777777] dark:text-[#efb55e]">索引中</span>
                        )}
                        <button
                          aria-label={`更多操作：${document.title}`}
                          className="grid size-7 place-items-center rounded-md text-[#777777] transition hover:bg-[#eeeeee] hover:text-[#222222] dark:text-[#99a69e] dark:hover:bg-[#202a33] dark:hover:text-[#edf3ef]"
                          type="button"
                        >
                          <MoreHorizontal size={17} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="grid min-h-56 place-items-center px-6 text-center">
                  <div>
                    <FileText className="mx-auto mb-3 text-[#a2aaa3] dark:text-[#728077]" size={28} strokeWidth={1.5} />
                    <p className="text-sm font-medium text-[#333333] dark:text-[#dbe4de]">没有匹配的文档</p>
                    <p className="mt-1 text-sm text-[#777777] dark:text-[#8f9c94]">调整搜索关键词后再试</p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </section>
      )}
    </WorkspaceScaffold>
  );
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
