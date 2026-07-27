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
    return (
      <pre
        key={index}
        className="overflow-x-auto rounded-lg border border-[#d8d8d8] bg-[#f3f3f3] px-3 py-2 text-xs leading-6 text-[#1f1f1f] dark:border-[#303a44] dark:bg-[#0b1016] dark:text-[#dce5df]"
      >
        <code>{block.code}</code>
      </pre>
    );
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
