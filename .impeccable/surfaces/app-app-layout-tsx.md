---
version: 1
slug: "app-app-layout-tsx"
primary_target: "app/(app)/layout.tsx"
related_targets: ["app/globals.css","app/(marketing)/page.tsx"]
---

# App shell + tailoring workspace

Scope: every authenticated surface (dashboard, new application, pipeline, review/edit workspace, settings, onboarding, auth). Mode: Operate. The marketing page inherits the world and plays it as Persuade.

Audience/job: a job seeker, often at night on a laptop, aims one resume at one posting, checks every AI change, and downloads.

## Direction contract

THESIS: The compositor's room. Tailoring is typesetting: the job is the copy, the AI marks it up, sets new lines, pulls a proof and locks the forme. It refuses the category default of a grey SaaS dashboard with a purple "AI" sparkle and a chat box.

OWN-WORLD: The ground is lead graphite (warm near-black, oklch L≈16%), with panels stepped up in graphite. Text is bone, not white. The only accent is a brass line used for action, selection and locks. Diff inks: vermilion for removal (struck through) and verdigris for insertion (underlined). The proofreader's blue pencil marks a query (a flag the user must verify). The resume page sits on warm proof paper. The light theme is the same press in daylight: a pale ground with ink-black and darker brass. Type: Schibsted Grotesk for the UI with a tight, few-step scale, Geist Mono for measurements only, and Bodoni Moda for marketing display only.

STORY: The user sees what the AI changed, why it changed it, and how the score moved. They lock or revert each change, edit in place, and download exactly what they see.

FIRST VIEWPORT: Workspace. On the left is a thin top bar (back, title, save state, Export). In the center is the proof page at real scale. On the right rail is the score lock-up (before → after with a breakdown) and, below it, the change list. Review / Edit / Compare tabs sit above the page.

FORM: candidate 6 of 7 grounded (letterpress composing room); seed:65c21a5b61d56760. Signature move: the slug. Each change is set as a pair of type lines, the original struck in vermilion over the new line underlined in verdigris. Locking a change seats it with a brass tick, and changes that are still unreviewed keep a brass margin mark. The pipeline runs as five composing-stick stages (ids copy, markup, set, proof, lockup). Decision (finish review): user-facing labels are plain verbs (Read the job, Measure your resume, Rewrite lines, Proof every change, Score and save), because a waiting user needs to know what is happening; the composing-stick structure carries the world (numbered stick, brass rule filling as stages set).
Raises: emission-line-rail → diff and states carried by line form (strike, underline, dash), not hue alone. timetable-slide-rack → strict 6-step type scale with rank by weight. streaming-wall → the focused change brightens and the rest dim. boarding-pass → changed rows hold their mark until acknowledged; the score reranks in place.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance


## Review log

2026-11-17 finish review: fix (8 material) → all 8 resolved on verdict pass; 3 follow-ups fixed (dark-card strike contrast, lock-up title wrap, stage-label rationale recorded above). Two pipeline-note observations were capture-time animation artifacts; entrance shortened to 280 ms.
