import { Copy, Download } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

interface MarkdownMessageProps {
  content: string;
}

type MarkdownBlock =
  | { type: "code"; code: string; language: string | undefined }
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "list"; items: string[]; ordered: boolean }
  | { type: "quote"; text: string }
  | { type: "paragraph"; text: string };

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="space-y-3 text-sm leading-7 text-[#202020] dark:text-[#eef3ef]">
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}

function renderBlock(block: MarkdownBlock, index: number) {
  if (block.type === "code") {
    return renderCodeBlock(block, index);
  }

  if (block.type === "heading") {
    const className = [
      "font-semibold text-[#111111] dark:text-[#f4f7f5]",
      block.level === 1 ? "text-base" : "text-sm",
    ].join(" ");

    if (block.level === 1) {
      return <h2 key={index} className={className}>{parseInlineMarkdown(block.text)}</h2>;
    }

    if (block.level === 2) {
      return <h3 key={index} className={className}>{parseInlineMarkdown(block.text)}</h3>;
    }

    return <h4 key={index} className={className}>{parseInlineMarkdown(block.text)}</h4>;
  }

  if (block.type === "list") {
    const ListTag = block.ordered ? "ol" : "ul";

    return (
      <ListTag
        key={index}
        className={[
          "space-y-1 pl-5",
          block.ordered ? "list-decimal" : "list-disc",
        ].join(" ")}
      >
        {block.items.map((item, itemIndex) => (
          <li key={`${index}-${itemIndex}`} className="pl-1">
            {parseInlineMarkdown(item)}
          </li>
        ))}
      </ListTag>
    );
  }

  if (block.type === "quote") {
    return (
      <blockquote
        key={index}
        className="border-l-2 border-[#111111] pl-3 text-[#555555] dark:border-[#61b979] dark:text-[#c0cbc4]"
      >
        {parseInlineMarkdown(block.text)}
      </blockquote>
    );
  }

  return (
    <p key={index} className="whitespace-pre-wrap">
      {parseInlineMarkdown(block.text)}
    </p>
  );
}

function renderCodeBlock(block: Extract<MarkdownBlock, { type: "code" }>, index: number) {
  return <CodeBlock key={index} block={block} />;
}

function CodeBlock({ block }: { block: Extract<MarkdownBlock, { type: "code" }> }) {
  const [hasCopied, setHasCopied] = useState(false);
  const language = normalizeLanguage(block.language);
  const downloadCode = () => {
    const file = new Blob([block.code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = `arbor-code.${getCodeFileExtension(language)}`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const copyCode = async () => {
    await navigator.clipboard.writeText(block.code);
    setHasCopied(true);
    window.setTimeout(() => setHasCopied(false), 1200);
  };

  return (
    <div className="overflow-hidden rounded-[32px] border border-[#d8d8d8] bg-[#f7f7f7] text-xs shadow-sm dark:border-white/10 dark:bg-[#111111]">
      <div className="flex items-center justify-between px-8 pt-7 text-[13px] font-semibold text-[#333333] dark:text-[#f4f4f4]">
        <span>
          {language}
        </span>
        <div className="flex items-center gap-2">
          <button
            aria-label="下载代码"
            className="grid size-8 place-items-center rounded-full text-[#555555] transition hover:bg-white hover:text-[#111111] dark:text-[#f4f4f4] dark:hover:bg-white/10"
            onClick={downloadCode}
            title="下载代码"
            type="button"
          >
            <Download size={18} strokeWidth={2.1} />
          </button>
          <button
            aria-label={hasCopied ? "代码已复制" : "复制代码"}
            className="grid size-8 place-items-center rounded-full text-[#555555] transition hover:bg-white hover:text-[#111111] dark:text-[#f4f4f4] dark:hover:bg-white/10"
            onClick={() => void copyCode()}
            title={hasCopied ? "已复制" : "复制代码"}
            type="button"
          >
            <Copy size={18} strokeWidth={2.1} />
          </button>
        </div>
      </div>
      <pre className="overflow-x-auto px-8 pb-7 pt-5 leading-6 text-[#1f1f1f] dark:text-[#f2f2f2]">
        <code>
          {block.code.split("\n").map((line, lineIndex, lines) => (
            <span key={lineIndex}>
              {highlightCodeLine(line, language)}
              {lineIndex < lines.length - 1 ? "\n" : null}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

function getCodeFileExtension(language: string) {
  const extensions: Record<string, string> = {
    bash: "sh",
    css: "css",
    html: "html",
    javascript: "js",
    json: "json",
    text: "txt",
    typescript: "ts",
    yaml: "yml",
  };

  return extensions[language] ?? "txt";
}

function normalizeLanguage(language: string | undefined) {
  const normalizedLanguage = language?.toLowerCase() ?? "text";
  const aliases: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    sh: "bash",
    shell: "bash",
    ts: "typescript",
    tsx: "typescript",
    yml: "yaml",
  };

  return aliases[normalizedLanguage] ?? normalizedLanguage;
}

function highlightCodeLine(line: string, language: string): ReactNode[] {
  if (language === "json") {
    return highlightTokens(
      line,
      /("(?:\\.|[^"\\])*"(?=\s*:)|"(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\b\d+(?:\.\d+)?\b|[{}[\]:,])/g,
      getJsonTokenClass,
    );
  }

  if (language === "bash") {
    return highlightTokens(
      line,
      /(#.*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:cd|cp|curl|docker|echo|export|git|mkdir|npm|pnpm|rm|yarn)\b|--?[\w-]+|\b\d+\b|[|&;<>()])/g,
      getShellTokenClass,
    );
  }

  return highlightTokens(
    line,
    /(\/\/.*|\/\*.*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:abstract|async|await|boolean|break|case|catch|class|const|continue|default|else|enum|export|extends|false|finally|for|from|function|if|implements|import|interface|let|new|null|private|protected|public|readonly|return|string|switch|throw|true|try|type|undefined|var|void|while)\b|\b\d+(?:\.\d+)?\b|[A-Za-z_$][\w$]*|[{}()[\].,;:+\-*/%=<>!&|?]+)/g,
    getCodeTokenClass,
  );
}

function highlightTokens(
  line: string,
  tokenPattern: RegExp,
  getTokenClass: (token: string) => string | undefined,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(line)) !== null) {
    if (match.index > cursor) {
      nodes.push(line.slice(cursor, match.index));
    }

    const token = match[0];
    const tokenClassName = getTokenClass(token);

    nodes.push(
      tokenClassName ? (
        <span key={`${match.index}-${token}`} className={tokenClassName}>
          {token}
        </span>
      ) : (
        token
      ),
    );
    cursor = match.index + token.length;
  }

  if (cursor < line.length) {
    nodes.push(line.slice(cursor));
  }

  return nodes.length > 0 ? nodes : [line];
}

function getCodeTokenClass(token: string) {
  if (token.startsWith("//") || token.startsWith("/*")) {
    return "italic text-[#6e7781] dark:text-[#7f8a86]";
  }

  if (isQuotedToken(token)) {
    return "text-[#b42318] dark:text-[#f0b84f]";
  }

  if (/^\d/.test(token)) {
    return "text-[#953800] dark:text-[#a9b7ff]";
  }

  if (CODE_KEYWORDS.has(token)) {
    return "font-semibold text-[#8250df] dark:text-[#c9b5ff]";
  }

  if (/^[A-Z]/.test(token)) {
    return "text-[#0550ae] dark:text-[#79d2d9]";
  }

  if (/^[A-Za-z_$]/.test(token)) {
    return "text-[#0969da] dark:text-[#79d2d9]";
  }

  return "text-[#555555] dark:text-[#9aa6a1]";
}

function getJsonTokenClass(token: string) {
  if (token.startsWith("\"") && /"$/.test(token) && token.match(/"(?:\\.|[^"\\])*"$/)) {
    return "text-[#b42318] dark:text-[#f0b84f]";
  }

  if (/^(true|false|null)$/.test(token)) {
    return "font-semibold text-[#8250df] dark:text-[#c9b5ff]";
  }

  if (/^-?\d/.test(token)) {
    return "text-[#953800] dark:text-[#a9b7ff]";
  }

  return "text-[#555555] dark:text-[#9aa6a1]";
}

function getShellTokenClass(token: string) {
  if (token.startsWith("#")) {
    return "italic text-[#6e7781] dark:text-[#7f8a86]";
  }

  if (isQuotedToken(token)) {
    return "text-[#b42318] dark:text-[#f0b84f]";
  }

  if (token.startsWith("-")) {
    return "text-[#0969da] dark:text-[#79d2d9]";
  }

  if (/^\d/.test(token)) {
    return "text-[#953800] dark:text-[#a9b7ff]";
  }

  if (/^[A-Za-z]/.test(token)) {
    return "font-semibold text-[#8250df] dark:text-[#c9b5ff]";
  }

  return "text-[#555555] dark:text-[#9aa6a1]";
}

function isQuotedToken(token: string) {
  return token.startsWith("\"") || token.startsWith("'") || token.startsWith("`");
}

const CODE_KEYWORDS = new Set([
  "abstract",
  "async",
  "await",
  "boolean",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "default",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "if",
  "implements",
  "import",
  "interface",
  "let",
  "new",
  "null",
  "private",
  "protected",
  "public",
  "readonly",
  "return",
  "string",
  "switch",
  "throw",
  "true",
  "try",
  "type",
  "undefined",
  "var",
  "void",
  "while",
]);

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const normalizedLines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraphLines: string[] = [];
  let index = 0;

  const flushParagraph = () => {
    const text = paragraphLines.join("\n").trim();

    if (text) {
      blocks.push({ type: "paragraph", text });
    }

    paragraphLines = [];
  };

  while (index < normalizedLines.length) {
    const line = normalizedLines[index];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      flushParagraph();
      index += 1;
      continue;
    }

    const fenceMatch = trimmedLine.match(/^```([\w-]+)?\s*$/);

    if (fenceMatch) {
      flushParagraph();
      const codeLines: string[] = [];
      const language = fenceMatch[1];
      index += 1;

      while (index < normalizedLines.length && !normalizedLines[index].trim().startsWith("```")) {
        codeLines.push(normalizedLines[index]);
        index += 1;
      }

      if (index < normalizedLines.length) {
        index += 1;
      }

      blocks.push({ type: "code", code: codeLines.join("\n"), language });
      continue;
    }

    const headingMatch = trimmedLine.match(/^(#{1,3})\s+(.+)$/);

    if (headingMatch) {
      flushParagraph();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2],
      });
      index += 1;
      continue;
    }

    const quoteMatch = trimmedLine.match(/^>\s?(.+)$/);

    if (quoteMatch) {
      flushParagraph();
      const quoteLines = [quoteMatch[1]];
      index += 1;

      while (index < normalizedLines.length) {
        const nextQuoteMatch = normalizedLines[index].trim().match(/^>\s?(.+)$/);

        if (!nextQuoteMatch) {
          break;
        }

        quoteLines.push(nextQuoteMatch[1]);
        index += 1;
      }

      blocks.push({ type: "quote", text: quoteLines.join("\n") });
      continue;
    }

    const unorderedMatch = trimmedLine.match(/^[-*]\s+(.+)$/);
    const orderedMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);

    if (unorderedMatch || orderedMatch) {
      flushParagraph();
      const ordered = Boolean(orderedMatch);
      const items: string[] = [];

      while (index < normalizedLines.length) {
        const currentLine = normalizedLines[index].trim();
        const currentMatch = ordered ? currentLine.match(/^\d+\.\s+(.+)$/) : currentLine.match(/^[-*]\s+(.+)$/);

        if (!currentMatch) {
          break;
        }

        items.push(currentMatch[1]);
        index += 1;
      }

      blocks.push({ type: "list", items, ordered });
      continue;
    }

    paragraphLines.push(line);
    index += 1;
  }

  flushParagraph();

  return blocks;
}

function parseInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const tokenPattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }

    const token = match[0];
    const key = `${match.index}-${token}`;

    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="rounded bg-[#eeeeee] px-1.5 py-0.5 text-[0.92em] text-[#111111] dark:bg-[#1d2730] dark:text-[#edf3ef]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={key} className="font-semibold text-[#111111] dark:text-[#f4f7f5]">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const label = linkMatch?.[1] ?? token;
      const href = sanitizeHref(linkMatch?.[2] ?? "");

      nodes.push(
        href ? (
          <a
            key={key}
            className="font-medium underline decoration-[#999999] underline-offset-4 transition hover:text-[#000000] dark:decoration-[#52606b] dark:hover:text-[#ffffff]"
            href={href}
            rel="noreferrer"
            target="_blank"
          >
            {label}
          </a>
        ) : (
          label
        ),
      );
    }

    cursor = match.index + token.length;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

function sanitizeHref(href: string) {
  if (/^(https?:|mailto:)/i.test(href)) {
    return href;
  }

  return undefined;
}
