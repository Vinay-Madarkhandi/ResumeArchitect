"use client";

import { useState, useRef, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Undo2,
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronDown,
  Briefcase,
  GraduationCap,
  Wrench,
  FolderGit2,
  FileText,
  Award,
  Type,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { TEMPLATES, type TemplateId } from "@/lib/resume/templates";

interface FormatBarProps {
  editor: Editor | null;
  className?: string;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  template?: TemplateId;
  onTemplateChange?: (t: TemplateId) => void;
}

function Tool({
  label,
  active,
  onClick,
  children,
  disabled,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded transition-colors text-ink-3 hover:bg-hover hover:text-ink disabled:opacity-30 disabled:pointer-events-none [&_svg]:size-4",
        active && "bg-raised font-medium text-brass shadow-xs",
      )}
    >
      {children}
    </button>
  );
}

export function FormatBar({
  editor,
  className,
  zoom = 100,
  onZoomChange,
  template,
  onTemplateChange,
}: FormatBarProps) {
  if (!editor) return <div className={cn("h-10", className)} />;
  return (
    <RibbonTools
      editor={editor}
      className={className}
      zoom={zoom}
      onZoomChange={onZoomChange}
      template={template}
      onTemplateChange={onTemplateChange}
    />
  );
}

function RibbonTools({
  editor,
  className,
  zoom = 100,
  onZoomChange,
  template,
  onTemplateChange,
}: {
  editor: Editor;
  className?: string;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  template?: TemplateId;
  onTemplateChange?: (t: TemplateId) => void;
}) {
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sectionRef.current && !sectionRef.current.contains(event.target as Node)) {
        setSectionMenuOpen(false);
      }
      if (styleRef.current && !styleRef.current.contains(event.target as Node)) {
        setStyleMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            h1: e.isActive("heading", { level: 1 }),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            p: e.isActive("paragraph") && !e.isActive("bulletList") && !e.isActive("orderedList"),
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            link: e.isActive("link"),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            undo: e.can().undo(),
            redo: e.can().redo(),
          }
        : null,
  });

  if (!s) return <div className={cn("h-10", className)} />;
  const c = () => editor.chain().focus();

  const currentStyleLabel = s.h1
    ? "Name (H1)"
    : s.h2
    ? "Section (H2)"
    : s.h3
    ? "Entry (H3)"
    : s.bullet
    ? "Bullet List"
    : s.ordered
    ? "Numbered List"
    : "Normal Text";

  const handleLinkToggle = () => {
    if (s.link) {
      c().unsetLink().run();
      return;
    }
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter link URL (e.g. https://github.com/username):", previousUrl || "https://");
    if (url === null) return;
    if (url.trim() === "") {
      c().unsetLink().run();
      return;
    }
    c().setLink({ href: url.trim() }).run();
  };

  const insertSection = (type: "experience" | "education" | "skills" | "projects" | "summary" | "certifications") => {
    setSectionMenuOpen(false);
    const chain = editor.chain().focus();
    switch (type) {
      case "experience":
        chain
          .insertContent([
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "WORK EXPERIENCE" }] },
            { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Senior Software Engineer — Acme Corp" }] },
            { type: "paragraph", content: [{ type: "text", text: "San Francisco, CA · 2022 – Present" }] },
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [
                        {
                          type: "text",
                          text: "Designed and scaled distributed microservices handling 25M+ requests daily with 99.99% uptime.",
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [
                        {
                          type: "text",
                          text: "Led a cross-functional team of 5 engineers to deliver high-performance streaming pipelines.",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ])
          .run();
        break;
      case "education":
        chain
          .insertContent([
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "EDUCATION" }] },
            { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "B.S. in Computer Science — University of California" }] },
            { type: "paragraph", content: [{ type: "text", text: "2018 – 2022 · GPA 3.85 / 4.0 · Dean's Honors List" }] },
          ])
          .run();
        break;
      case "skills":
        chain
          .insertContent([
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "TECHNICAL SKILLS" }] },
            {
              type: "paragraph",
              content: [
                { type: "text", marks: [{ type: "bold" }], text: "Languages & Frameworks: " },
                { type: "text", text: "TypeScript, Python, Go, React, Next.js, Node.js, GraphQL, PostgreSQL" },
              ],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", marks: [{ type: "bold" }], text: "Cloud & Infrastructure: " },
                { type: "text", text: "AWS (ECS, Lambda, RDS), Docker, Kubernetes, Terraform, CI/CD, Redis" },
              ],
            },
          ])
          .run();
        break;
      case "projects":
        chain
          .insertContent([
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "PROJECTS" }] },
            { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "ResumeArchitect — AI-Powered ATS Resume Platform" }] },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Built a Sejda-style PDF editor and ATS keyword tailoring engine with instant PDF/DOCX generation.",
                },
              ],
            },
          ])
          .run();
        break;
      case "summary":
        chain
          .insertContent([
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "PROFESSIONAL SUMMARY" }] },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Results-driven Software Engineer with extensive experience in full-stack architecture, distributed systems, and user-centric web applications. Proven track record of improving system latency by 40% and leading high-velocity engineering sprints.",
                },
              ],
            },
          ])
          .run();
        break;
      case "certifications":
        chain
          .insertContent([
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "CERTIFICATIONS & AWARDS" }] },
            {
              type: "paragraph",
              content: [
                { type: "text", marks: [{ type: "bold" }], text: "AWS Certified Solutions Architect" },
                { type: "text", text: " — Amazon Web Services (2024)" },
              ],
            },
          ])
          .run();
        break;
    }
  };

  const handleZoom = (delta: number) => {
    if (!onZoomChange) return;
    const next = Math.min(150, Math.max(60, zoom + delta));
    onZoomChange(next);
  };

  const resetZoom = () => {
    if (onZoomChange) onZoomChange(100);
  };

  return (
    <div
      role="toolbar"
      aria-label="Document editing ribbon"
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-md border border-line bg-panel/90 px-2.5 py-1.5 shadow-sm backdrop-blur-md",
        className,
      )}
    >
      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <Tool label="Undo (Ctrl+Z)" disabled={!s.undo} onClick={() => c().undo().run()}>
          <Undo2 />
        </Tool>
        <Tool label="Redo (Ctrl+Y)" disabled={!s.redo} onClick={() => c().redo().run()}>
          <Redo2 />
        </Tool>
      </div>

      <span className="mx-1 h-5 w-px bg-line" aria-hidden />

      {/* Style selector dropdown */}
      <div className="relative" ref={styleRef}>
        <button
          type="button"
          onClick={() => setStyleMenuOpen((prev) => !prev)}
          className="flex h-8 items-center gap-1.5 rounded px-2 text-small font-medium text-ink transition-colors hover:bg-hover"
          title="Block style hierarchy"
          aria-expanded={styleMenuOpen}
        >
          <Type className="size-3.5 text-brass" />
          <span>{currentStyleLabel}</span>
          <ChevronDown className="size-3 text-ink-3" />
        </button>

        {styleMenuOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[190px] rounded-md border border-line bg-raised p-1 shadow-lg backdrop-blur-lg">
            <button
              type="button"
              onClick={() => {
                c().setParagraph().run();
                setStyleMenuOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded px-2.5 py-1.5 text-small text-ink hover:bg-hover",
                s.p && "bg-hover font-medium text-brass",
              )}
            >
              <span>Normal Text</span>
              <span className="font-mono text-label text-ink-3">P</span>
            </button>
            <button
              type="button"
              onClick={() => {
                c().toggleHeading({ level: 1 }).run();
                setStyleMenuOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded px-2.5 py-1.5 text-small text-ink hover:bg-hover",
                s.h1 && "bg-hover font-medium text-brass",
              )}
            >
              <span className="font-bold">Candidate Name</span>
              <span className="font-mono text-label text-ink-3">H1</span>
            </button>
            <button
              type="button"
              onClick={() => {
                c().toggleHeading({ level: 2 }).run();
                setStyleMenuOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded px-2.5 py-1.5 text-small text-ink hover:bg-hover",
                s.h2 && "bg-hover font-medium text-brass",
              )}
            >
              <span className="font-semibold uppercase text-label tracking-wider">Section Heading</span>
              <span className="font-mono text-label text-ink-3">H2</span>
            </button>
            <button
              type="button"
              onClick={() => {
                c().toggleHeading({ level: 3 }).run();
                setStyleMenuOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded px-2.5 py-1.5 text-small text-ink hover:bg-hover",
                s.h3 && "bg-hover font-medium text-brass",
              )}
            >
              <span className="font-medium">Job Title / School</span>
              <span className="font-mono text-label text-ink-3">H3</span>
            </button>
          </div>
        )}
      </div>

      {/* Template quick preview */}
      {template && onTemplateChange && (
        <select
          value={template}
          onChange={(e) => onTemplateChange(e.target.value as TemplateId)}
          className="h-8 rounded border border-line bg-transparent px-2 text-small font-medium text-ink hover:bg-hover focus:outline-none focus:ring-1 focus:ring-brass"
          title="Document Typography Template"
        >
          {Object.values(TEMPLATES).map((t) => (
            <option key={t.id} value={t.id} className="bg-raised text-ink">
              {t.label} ({t.body === "serif" ? "Serif" : "Sans"})
            </option>
          ))}
        </select>
      )}

      <span className="mx-1 h-5 w-px bg-line" aria-hidden />

      {/* Formatting tools */}
      <div className="flex items-center gap-0.5">
        <Tool label="Bold (Ctrl+B)" active={s.bold} onClick={() => c().toggleBold().run()}>
          <Bold />
        </Tool>
        <Tool label="Italic (Ctrl+I)" active={s.italic} onClick={() => c().toggleItalic().run()}>
          <Italic />
        </Tool>
        <Tool label="Link" active={s.link} onClick={handleLinkToggle}>
          <Link2 />
        </Tool>
      </div>

      <span className="mx-1 h-5 w-px bg-line" aria-hidden />

      {/* Lists */}
      <div className="flex items-center gap-0.5">
        <Tool label="Bullet List" active={s.bullet} onClick={() => c().toggleBulletList().run()}>
          <List />
        </Tool>
        <Tool label="Numbered List" active={s.ordered} onClick={() => c().toggleOrderedList().run()}>
          <ListOrdered />
        </Tool>
      </div>

      <span className="mx-1 h-5 w-px bg-line" aria-hidden />

      {/* + Add Section Dropdown */}
      <div className="relative" ref={sectionRef}>
        <button
          type="button"
          onClick={() => setSectionMenuOpen((prev) => !prev)}
          className="flex h-8 items-center gap-1.5 rounded bg-brass/15 px-2.5 text-small font-semibold text-brass transition-colors hover:bg-brass/25"
          title="Insert standard resume section"
          aria-expanded={sectionMenuOpen}
        >
          <Plus className="size-3.5" />
          <span>Add Section</span>
          <ChevronDown className="size-3" />
        </button>

        {sectionMenuOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[210px] rounded-md border border-line bg-raised p-1 shadow-xl backdrop-blur-lg">
            <div className="px-2.5 py-1 text-label font-medium uppercase tracking-wider text-ink-3">
              Standard ATS Sections
            </div>
            <button
              type="button"
              onClick={() => insertSection("experience")}
              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-small text-ink hover:bg-hover"
            >
              <Briefcase className="size-4 text-brass" />
              <span>Work Experience</span>
            </button>
            <button
              type="button"
              onClick={() => insertSection("education")}
              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-small text-ink hover:bg-hover"
            >
              <GraduationCap className="size-4 text-brass" />
              <span>Education</span>
            </button>
            <button
              type="button"
              onClick={() => insertSection("skills")}
              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-small text-ink hover:bg-hover"
            >
              <Wrench className="size-4 text-brass" />
              <span>Technical Skills</span>
            </button>
            <button
              type="button"
              onClick={() => insertSection("projects")}
              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-small text-ink hover:bg-hover"
            >
              <FolderGit2 className="size-4 text-brass" />
              <span>Projects</span>
            </button>
            <button
              type="button"
              onClick={() => insertSection("summary")}
              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-small text-ink hover:bg-hover"
            >
              <FileText className="size-4 text-brass" />
              <span>Professional Summary</span>
            </button>
            <button
              type="button"
              onClick={() => insertSection("certifications")}
              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-small text-ink hover:bg-hover"
            >
              <Award className="size-4 text-brass" />
              <span>Certifications</span>
            </button>
          </div>
        )}
      </div>

      {/* Zoom controls */}
      {onZoomChange && (
        <>
          <span className="mx-1 h-5 w-px bg-line" aria-hidden />
          <div className="flex items-center gap-0.5">
            <Tool label="Zoom Out" onClick={() => handleZoom(-10)} disabled={zoom <= 60}>
              <ZoomOut />
            </Tool>
            <button
              type="button"
              onClick={resetZoom}
              title="Reset Zoom to 100%"
              className="h-8 min-w-[42px] px-1 text-center font-mono text-label font-medium text-ink-2 hover:text-ink hover:bg-hover rounded"
            >
              {zoom}%
            </button>
            <Tool label="Zoom In" onClick={() => handleZoom(10)} disabled={zoom >= 150}>
              <ZoomIn />
            </Tool>
            <Tool label="Fit Width (100%)" onClick={resetZoom} active={zoom === 100}>
              <Maximize2 />
            </Tool>
          </div>
        </>
      )}
    </div>
  );
}
