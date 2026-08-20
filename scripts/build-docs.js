#!/usr/bin/env node
/**
 * build-docs.js
 *
 * Collects co-located .md files from src/ and assembles them into docs/.
 *
 * Output:
 *   docs/index.html          — navigation index
 *   docs/<module>.html       — one page per .md file
 *
 * No external dependencies — uses only Node built-ins.
 *
 * Usage:
 *   node scripts/build-docs.js
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  existsSync,
} from "fs";
import { join, relative, basename, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "docs");

// ─── Markdown → HTML ─────────────────────────────────────────────────────────

function escapeHtmlEntities(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Apply inline formatting to a text span (never called on code block content)
function inlineFormat(text) {
  return (
    text
      // Bold before italic to avoid partial matches
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
      // Inline code
      .replace(
        /`([^`]+)`/g,
        (_, code) => `<code>${escapeHtmlEntities(code)}</code>`,
      )
      // Links — rewrite .md → .html
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
        const h = href.replace(/\.md(#.*)?$/, ".html$1");
        return `<a href="${h}">${label}</a>`;
      })
  );
}

function parseTableRow(line, tag) {
  return (
    "<tr>" +
    line
      .split("|")
      .slice(1, -1)
      .map((cell) => `<${tag}>${inlineFormat(cell.trim())}</${tag}>`)
      .join("") +
    "</tr>"
  );
}

function mdToHtml(md) {
  const lines = md.split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Fenced code block ───────────────────────────────────────────────────
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(escapeHtmlEntities(lines[i]));
        i++;
      }
      i++; // skip closing ```
      out.push(
        `<pre><code class="language-${lang}">${codeLines.join("\n")}</code></pre>`,
      );
      continue;
    }

    // ── Headings ────────────────────────────────────────────────────────────
    if (line.startsWith("### ")) {
      out.push(`<h3>${inlineFormat(line.slice(4))}</h3>`);
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      out.push(`<h2>${inlineFormat(line.slice(3))}</h2>`);
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      out.push(`<h1>${inlineFormat(line.slice(2))}</h1>`);
      i++;
      continue;
    }

    // ── Horizontal rule ─────────────────────────────────────────────────────
    if (line.trim() === "---") {
      out.push("<hr>");
      i++;
      continue;
    }

    // ── Blockquote ──────────────────────────────────────────────────────────
    if (line.startsWith("> ")) {
      out.push(`<blockquote>${inlineFormat(line.slice(2))}</blockquote>`);
      i++;
      continue;
    }

    // ── Table ───────────────────────────────────────────────────────────────
    if (
      line.startsWith("|") &&
      i + 1 < lines.length &&
      /^\|[-| :]+\|/.test(lines[i + 1])
    ) {
      const headerHtml = parseTableRow(line, "th");
      i += 2; // skip header + separator
      const bodyRows = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        bodyRows.push(parseTableRow(lines[i], "td"));
        i++;
      }
      out.push(
        `<table>\n<thead>${headerHtml}</thead>\n<tbody>${bodyRows.join("\n")}</tbody>\n</table>`,
      );
      continue;
    }

    // ── Unordered list ──────────────────────────────────────────────────────
    if (line.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(`<li>${inlineFormat(lines[i].slice(2))}</li>`);
        i++;
      }
      out.push(`<ul>\n${items.join("\n")}\n</ul>`);
      continue;
    }

    // ── Blank line ──────────────────────────────────────────────────────────
    if (line.trim() === "") {
      i++;
      continue;
    }

    // ── Paragraph ───────────────────────────────────────────────────────────
    out.push(`<p>${inlineFormat(line)}</p>`);
    i++;
  }

  return out.join("\n");
}

// ─── File collection ──────────────────────────────────────────────────────────

function collectMdFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectMdFiles(full, files);
    } else if (entry.endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

// ─── Theme ────────────────────────────────────────────────────────────────────

const theme = {
  "--font-sans": "system-ui, sans-serif",
  "--font-mono": "'SF Mono', Consolas, monospace",
  "--nav-width": "220px",
  "--content-width": "860px",
  "--radius-sm": "3px",
  "--radius-md": "6px",
  "--color-bg": "#ffffff",
  "--color-surface": "#f5f5f5",
  "--color-border": "#e0e0e0",
  "--color-text": "#1a1a1a",
  "--color-text-muted": "#333333",
  "--color-text-subtle": "#888888",
  "--color-link": "#0066cc",
  "--color-code-bg": "#f0f0f0",
};

function buildRootBlock(vars) {
  const declarations = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  return `:root {\n${declarations}\n}\n\n`;
}

// ─── Page template ────────────────────────────────────────────────────────────

function pageTemplate(title, content, navLinks) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Ement</title>
  <link rel="stylesheet" href="assets/docs.css">
  <link rel="stylesheet" href="assets/highlight.min.css">
</head>
<body>
<nav>
  <a href="index.html" style="font-weight:600; font-size:1rem; margin-bottom:1rem;">Ement Docs</a>
  ${navLinks}
</nav>
<main>
  ${content}
</main>
<script src="assets/highlight.min.js"></script>
<script>hljs.highlightAll();</script>
</body>
</html>`;
}

// ─── Index template ───────────────────────────────────────────────────────────

function indexTemplate(pages, navLinks) {
  const cards = pages
    .map(
      ({ title, slug, description }) =>
        `<a href="${slug}.html" style="display:block; padding:1rem; border:1px solid #e0e0e0; border-radius:8px; text-decoration:none; color:inherit; margin-bottom:0.75rem;">
      <strong>${title}</strong>
      ${description ? `<p style="margin:0.25rem 0 0; font-size:0.875rem; color:#555;">${description}</p>` : ""}
    </a>`,
    )
    .join("\n");

  return pageTemplate(
    "API Reference",
    `
    <h1>Ement API Reference</h1>
    <p>Modern web framework built on Custom Elements and native browser APIs.</p>
    <hr>
    ${cards}
  `,
    navLinks,
  );
}

// ─── Assets ───────────────────────────────────────────────────────────────────

const ASSETS_DIR = join(OUT, "assets");
const HLJS_VERSION = "11.9.0";
const ASSETS = [
  {
    url: `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/${HLJS_VERSION}/highlight.min.js`,
    file: "highlight.min.js",
  },
  {
    url: `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/${HLJS_VERSION}/styles/github-dark.min.css`,
    file: "highlight.min.css",
  },
];

async function downloadAssets() {
  mkdirSync(ASSETS_DIR, { recursive: true });
  for (const { url, file } of ASSETS) {
    const dest = join(ASSETS_DIR, file);
    if (existsSync(dest)) {
      console.log(`assets: ${file} already exists, skipping download`);
      continue;
    }
    console.log(`assets: downloading ${file}...`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
    writeFileSync(dest, await res.text(), "utf8");
    console.log(`assets: saved ${file}`);
  }
}

// ─── Build ────────────────────────────────────────────────────────────────────

const SECTION_ORDER = [
  "core",
  "di",
  "router",
  "http",
  "forms",
  "animate",
  "security",
  "filters",
];

async function main() {
  await downloadAssets();
  const css =
    buildRootBlock(theme) + readFileSync(join(__dirname, "docs.css"), "utf8");
  writeFileSync(join(ASSETS_DIR, "docs.css"), css, "utf8");

  const mdFiles = collectMdFiles(SRC);

  // Sort by section order
  mdFiles.sort((a, b) => {
    const sectionA = SECTION_ORDER.indexOf(relative(SRC, a).split("/")[0]);
    const sectionB = SECTION_ORDER.indexOf(relative(SRC, b).split("/")[0]);
    return (
      (sectionA === -1 ? 99 : sectionA) - (sectionB === -1 ? 99 : sectionB)
    );
  });

  // Parse each file
  const pages = mdFiles.map((filePath) => {
    const content = readFileSync(filePath, "utf8");
    const relPath = relative(SRC, filePath);
    const section = relPath.split("/")[0];
    const name = basename(filePath, ".md");
    const slug = relPath.replace(/\//g, "-").replace(/\.md$/, "");
    const firstLine = content.split("\n").find((l) => l.startsWith("# ")) || "";
    const title = firstLine.replace(/^# /, "");
    const lines = content.split("\n");
    const firstPara = lines.find(
      (l) =>
        l.trim() &&
        !l.startsWith("#") &&
        !l.startsWith("|") &&
        !l.startsWith("```"),
    );
    const description = firstPara?.trim() || "";

    return {
      filePath,
      relPath,
      section,
      name,
      slug,
      title,
      content,
      description,
    };
  });

  const navLinks = buildNav(pages);

  mkdirSync(OUT, { recursive: true });

  for (const { title, slug, content } of pages) {
    const html = mdToHtml(content);
    const page = pageTemplate(title, html, navLinks);
    writeFileSync(join(OUT, `${slug}.html`), page, "utf8");
  }

  const indexHtml = indexTemplate(pages, navLinks);
  writeFileSync(join(OUT, "index.html"), indexHtml, "utf8");

  console.log(`docs: wrote ${pages.length} pages → docs/`);
}

// Build navigation HTML
function buildNav(pages) {
  let nav = "";
  let lastSection = null;
  for (const { section, title, slug } of pages) {
    if (section !== lastSection) {
      nav += `<div class="section">${section}</div>`;
      lastSection = section;
    }
    nav += `<a href="${slug}.html">${title}</a>\n`;
  }
  return nav;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
