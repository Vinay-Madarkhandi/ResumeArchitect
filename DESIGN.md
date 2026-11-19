---
name: ResumeArchitect
description: Tailor a resume to one job, line by line, with every change visible, explained, and reversible.
colors:
  brass: "oklch(80% 0.095 82)"
  brass-strong: "oklch(86% 0.095 85)"
  brass-soft: "oklch(80% 0.095 82 / 0.13)"
  on-brass: "oklch(19% 0.02 75)"
  add: "oklch(80% 0.1 165)"
  add-soft: "oklch(80% 0.1 165 / 0.14)"
  del: "oklch(73% 0.13 32)"
  del-soft: "oklch(73% 0.13 32 / 0.13)"
  query: "oklch(77% 0.09 250)"
  query-soft: "oklch(77% 0.09 250 / 0.13)"
  danger: "oklch(70% 0.15 28)"
  ground: "oklch(16.5% 0.006 75)"
  sunken: "oklch(14% 0.005 75)"
  panel: "oklch(19.5% 0.007 75)"
  raised: "oklch(23% 0.008 75)"
  hover: "oklch(26% 0.009 75)"
  line: "oklch(29% 0.008 75)"
  line-strong: "oklch(38% 0.009 75)"
  ink: "oklch(92% 0.012 85)"
  ink-2: "oklch(76% 0.012 80)"
  ink-3: "oklch(63% 0.01 80)"
  focus: "oklch(86% 0.095 85)"
  paper: "oklch(94.5% 0.01 85)"
  paper-ink: "oklch(22% 0.01 70)"
  paper-muted: "oklch(44% 0.01 70)"
  paper-rule: "oklch(83% 0.012 80)"
typography:
  display:
    fontFamily: "Bodoni Moda, Bodoni 72, Didot, serif"
    fontSize: "clamp(2.75rem, 6vw, 4.75rem)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.02em"
  page:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: "2.125rem"
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: "1.75rem"
  lead:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5rem"
  body:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.375rem"
    fontFeature: "\"ss01\", \"cv11\""
  small:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  label:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: "1rem"
  figure:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "40px"
    fontWeight: 500
    lineHeight: 1
    fontFeature: "\"tnum\""
  paper-body:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.5
  paper-section:
    fontFamily: "Hanken Grotesk, ui-sans-serif, sans-serif"
    fontSize: "12.5px"
    fontWeight: 650
    letterSpacing: "0.09em"
rounded:
  paper: "2px"
  sm: "4px"
  md: "6px"
  lg: "10px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  section: "80px"
components:
  button-primary:
    backgroundColor: "{colors.brass}"
    textColor: "{colors.on-brass}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.brass-strong}"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-secondary-hover:
    backgroundColor: "{colors.hover}"
  button-ghost:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-ghost-hover:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.ink}"
  button-danger:
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    height: "36px"
  button-danger-hover:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.ground}"
  input:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
  tabs-list:
    backgroundColor: "{colors.sunken}"
    rounded: "{rounded.md}"
    padding: "2px"
  tab-active:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.sm}"
    height: "28px"
  badge-query:
    backgroundColor: "{colors.query-soft}"
    textColor: "{colors.query}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "1px 6px"
  badge-brass:
    backgroundColor: "{colors.brass-soft}"
    textColor: "{colors.brass}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "1px 6px"
  change-card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px 14px 8px"
  menu:
    backgroundColor: "{colors.raised}"
    rounded: "{rounded.md}"
    padding: "4px"
  dialog:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.lg}"
    padding: "24px"
    width: "28rem"
  proof-page:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.paper-ink}"
    typography: "{typography.paper-body}"
    rounded: "{rounded.paper}"
    padding: "60px 58px"
    width: "794px"
---

# Design System: ResumeArchitect

## Overview

**Creative North Star: "The Compositor's Room"**

Tailoring is typesetting. The job posting is the copy. The AI marks it up, sets new lines, pulls a proof, and locks the forme. The interface is a print shop at night. The ground is warm lead graphite, the text is bone rather than white, and a single brass accent marks action, selection, and lock. The resume itself sits on warm proof paper at real scale in the middle of the room, and everything else is the furniture around that page: a thin top bar, a tab strip, and a rail holding the score and the change list.

The density is working-tool density: a tight six-step type scale, controls 32 to 36px tall, panels separated by hairlines instead of shadows. Meaning is carried by the form of a line (strike, underline, dashed, margin rule) before hue. The system rejects the category default of a grey SaaS dashboard with a purple "AI" sparkle and a chat box. Nothing in it glows, gradients only appear as a moving "working" rule, and the AI is never a character.

The light theme is the same press in daylight: a pale warm ground, ink-black text, and a darker brass. Each role keeps its job in both themes. Only the values change.

**Key Characteristics:**
- Dark-first, with warm graphite steps (hue 75) and no pure black or white in the chrome.
- One accent (brass). Diff inks (vermilion, verdigris) and the blue pencil are semantic and never decorative.
- The proof page is the hero of every workspace screen and renders in the export faces (Source Serif 4 and Hanken Grotesk).
- Numbers are set in Geist Mono with tabular figures, and only numbers are.
- Every state has a line form as well as a color, so nothing depends on hue alone.

## Colors

The palette is warm graphite neutrals with one brass accent and three semantic inks taken from the proofreader's desk. All values are OKLCH and live in `app/globals.css`. The frontmatter holds the dark (default) theme. The light values below are the `[data-theme="light"]` overrides of the same tokens.

### Primary
- **Brass Line** (`brass`; light: oklch(52% 0.1 72)): the only accent. Used for primary buttons, the active-nav underline, the focused change card border, unreviewed markers, done stages in the pipeline, the rule under the current score, the caret, and the italic line of the marketing display. Hover deepens it to **Bright Brass** (`brass-strong`; light: oklch(45% 0.1 70)). **Brass Wash** (`brass-soft`) is used for selection highlights and requirement badges. **Press Black** (`on-brass`; light: oklch(98% 0.01 85)) is the text that sits on brass.

### Secondary (semantic inks)
- **Verdigris** (`add`; light: oklch(47% 0.1 165)): inserted text, matched requirements and keywords, positive score gain, success toasts. Always underlined when it marks text.
- **Vermilion** (`del`; light: oklch(51% 0.17 30)): removed text, negative score gain, failed ATS checks. Always struck through when it marks text.
- **Blue Pencil** (`query`; light: oklch(48% 0.13 255)): a query that the user must verify, such as a number, name, or skill the original resume does not support. Used on the "Verify" badge and on query notes with a `query-soft` fill.
- **Error Red** (`danger`; light: oklch(52% 0.18 28)): destructive actions and form errors only. It is not a diff ink.

### Neutral
- **Lead Graphite** (`ground`; light: oklch(96% 0.006 85)): the page ground.
- **Well** (`sunken`; light: oklch(93.6% 0.008 85)): inputs, tab tracks, and score-bar tracks, recessed one step below the ground.
- **Graphite Panel** (`panel`; light: oklch(99.2% 0.003 85)): cards, dialogs, and the score rail (at 40% opacity on the rail).
- **Raised Graphite** (`raised`; light: oklch(100% 0 0)): menus, toasts, active tab, and the Ask-AI popover.
- **Hover Graphite** (`hover`; light: oklch(93.5% 0.008 85)): hover fills for ghost controls and menu items.
- **Hairline** (`line`; light: oklch(89.5% 0.008 80)) and **Strong Hairline** (`line-strong`; light: oklch(80% 0.01 80)): every divider and border. Strong hairlines are used for control borders and the pipeline spine.
- **Bone** (`ink`; light: oklch(21% 0.01 70)), **Bone 2** (`ink-2`; light: oklch(40% 0.01 70)), and **Bone 3** (`ink-3`; light: oklch(51% 0.01 70)): primary text, secondary text, and tertiary text or icons.
- **Proof Paper** (`paper`; light: oklch(98.6% 0.008 85)) with **Paper Ink** (`paper-ink`), **Paper Muted** (`paper-muted`), and **Paper Rule** (`paper-rule`; light: oklch(86% 0.01 80)): the resume page. In dark mode the paper is dimmed a step so it never glares on a dark desk.

### Paper-context inks
On the paper, the diff inks switch to print-strength literals so they read on a light sheet in both themes. Removed text uses oklch(48% 0.17 30) on oklch(70% 0.14 30 / 0.14). Added text uses oklch(40% 0.1 165) on oklch(70% 0.11 165 / 0.2). The brass margin mark is oklch(68% 0.12 78). The focused-hunk wash is oklch(80% 0.1 82 / 0.16), and the compare wash is oklch(70% 0.11 165 / 0.12). The Modern template's section accent is oklch(48% 0.1 72) on screen and #8a6420 in exports.

### Named Rules
**The One Brass Rule.** Brass is the only accent and means "act here, this is selected, this is locked or still needs you". Do not use it for decoration, illustration, or a second meaning.

**The Line-Form Rule.** Every semantic color travels with a line form: removal is struck through, insertion is underlined, an unmatched keyword has a dashed border, and an unreviewed change has a margin rule or dot. If a state would disappear in greyscale, the work is not finished.

**The Bone-Not-White Rule.** Dark-theme text tops out at oklch 92% with warm chroma. Pure #fff and pure #000 never appear in the chrome.

## Typography

**Display Font:** Bodoni Moda (with Bodoni 72, Didot, serif), used on the marketing page only.
**Body Font:** Schibsted Grotesk (with ui-sans-serif, system-ui), used for all app UI.
**Label/Mono Font:** Geist Mono (with ui-monospace), used for scores, counts, page length, and key caps only.
**Paper Fonts:** Source Serif 4 (Classic body) and Hanken Grotesk (headings, Modern body). These are the same faces the PDF embeds.

**Character:** A sturdy, slightly condensed grotesk does the shop work. A high-contrast Didone appears only when the product is speaking to a newcomer. The mono is a measuring tool, not a style.

### Hierarchy
- **Display** (400, clamp(2.75rem, 6vw, 4.75rem), 0.98, -0.02em): the marketing hero. The second line is italic and set in brass. Secondary marketing headings use clamp(2rem, 3.6vw, 2.75rem) at 1.05.
- **Page** (600, 1.75rem / 2.125rem, -0.015em): page and auth titles.
- **Title** (600, 1.25rem / 1.75rem): dialog titles and section heads.
- **Lead** (400 to 600, 1rem / 1.5rem): intros, marketing feature heads, and large buttons.
- **Body** (400 to 600, 0.875rem / 1.375rem): the default size, with `ss01` and `cv11` enabled. The workspace title is body at 600.
- **Small** (400 to 500, 0.8125rem / 1.25rem): rail copy, change reasons, field labels, and small buttons.
- **Label** (400 to 500, 0.75rem / 1rem): change-kind labels, badges, hints, and requirement evidence. Set in sentence case and never tracked uppercase in the chrome.
- **Figures** (Geist Mono, tabular): current score 40px/500, original score 26px struck, landing figures 22 and 34px, stage numerals 11px.

### Named Rules
**The Six-Step Rule.** The UI uses exactly six sizes (label, small, body, lead, title, page). Rank comes from weight (400, 500, 600) before size. Do not add in-between sizes.

**The Mono-Means-Measured Rule.** Geist Mono appears only on a number or a key cap. If it isn't a measurement, it is set in Schibsted.

**The Didone-Stays-Outside Rule.** Bodoni Moda is for marketing display only and never appears inside the authenticated app.

## Layout

The app shell is a sticky 56px top bar (`ground` at 90% with a 12px backdrop blur and a hairline bottom), with content in a `max-w-6xl` (72rem) column padded 16px, or 24px from `sm` up. The workspace replaces the shell. Its top bar holds back, title, save state, page count, template, theme, and Download. Below it is a two-column grid, `minmax(0,1fr) 23rem` from `lg` (1024px) up. The proof page is centered in the main column at a max width of 794px (A4 at 96 dpi) and padded 46/52px, or 58/60px from `sm`. The rail is sticky under the bar, scrolls independently, and has a hairline left border. Below `lg` the rail stacks under the page, and a mono "before → after" chip jumps to it. Compare lays the two pages side by side from `xl` (1280px).

The spacing rhythm is a 4px base: 4, 8, 12, and 16px inside components, 24px between groups and in dialog padding, and 80 to 112px between marketing sections. Rail sections are separated by hairlines rather than gaps.

## Elevation & Depth

The chrome is flat and tonal. Depth comes from graphite steps (sunken, ground, panel, raised, hover) and hairlines. Shadows are reserved for two things: the proof paper, which is a physical sheet on the desk, and floating layers (menus, toasts, dialogs, popovers). Cards and the rail have no shadow.

### Shadow Vocabulary
- **Paper** (dark: `0 1px 0 oklch(100% 0 0 / 0.04), 0 18px 48px -12px oklch(0% 0 0 / 0.55)`; light: `0 1px 2px oklch(30% 0.02 70 / 0.08), 0 14px 40px -14px oklch(30% 0.02 70 / 0.22)`): the proof sheet only.
- **Pop** (dark: `0 12px 32px -8px oklch(0% 0 0 / 0.6), 0 2px 6px oklch(0% 0 0 / 0.35)`; light: `0 12px 32px -10px oklch(30% 0.02 70 / 0.25), 0 2px 6px oklch(30% 0.02 70 / 0.1)`): menus, toasts, dialogs, and the Ask-AI popover.
- **Seat** (`0 1px 2px oklch(0% 0 0 / 0.25)`): the active tab only.
- **Scrim**: oklch(8% 0.005 75 / 0.6) with a 2px backdrop blur behind dialogs.

### Named Rules
**The Only-Paper-Floats Rule.** At rest, the only shadowed surface is the proof sheet. Everything else gets depth from tone and hairlines, and a shadow means the layer is temporary.

## Shapes

Corners are small and squared off, like type furniture rather than pills: 4px for badges, tab triggers, menu items, and key caps; 6px for buttons, inputs, menus, and tab tracks; 10px for cards, dialogs, and popovers. The paper uses an almost-square 2px. Circles appear only for the pipeline stage markers, the unreviewed dot, and score bars. Borders are always 1px hairlines. The only heavier strokes are the 2px brass rules: the active-nav underline, the score seat, and the margin marks.

## Components

### Buttons
Compact and confident, with weight 500 and no uppercase.
- **Shape:** gently squared (6px). Heights are 32px (sm, 13px text), 36px (md), and 44px (lg, 16px text). Icon buttons are 32px square.
- **Primary:** brass fill with press-black text. Hover goes to bright brass. Active slightly darkens it (`brightness 0.95`). Use one per view region: Download, Keep, New application, Tailor.
- **Secondary (default):** panel fill, strong hairline border, and bone text. Hover raises the border to bone 3 and the fill to hover.
- **Ghost:** bone 2 text with a hover fill. Used for nav and tertiary actions.
- **Danger:** error-red text with a 50% red border. Hover fills it red with ground-colored text.
- **States:** transitions run at 150ms on color, border, and background. Disabled is 45% opacity. Loading shows a spinning loader icon and sets `aria-busy`. Focus shows a 2px `focus` outline at a 2px offset.

### Chips (badges and keyword chips)
- **Badge:** a 4px-radius label-size chip in the neutral, brass, add, del, or query tone. The fill is the soft wash and the text is the full ink.
- **Keyword chip:** a matched keyword has a verdigris text and a 40% verdigris border. A missing keyword has a dashed strong-hairline border, bone 3 text, and a hidden "Missing:" label for screen readers.

### Cards / Containers
- **Corner Style:** 10px.
- **Background:** panel, with a 1px hairline border.
- **Shadow Strategy:** none (see Elevation).
- **Internal Padding:** 12 to 16px. Rail sections use 16px.

### Inputs / Fields
- **Style:** a sunken fill with a strong-hairline border, 6px radius, 36px tall, 12px horizontal padding, and a brass caret. Textareas start at 96px tall and use relaxed leading.
- **Focus:** the border turns brass, with a 2px brass-soft ring and no outline.
- **Error / Disabled:** invalid fields get an error-red border and an error-red message in small text below, linked with `aria-describedby`. Disabled fields are 50% opacity. Labels are small at 500 in bone 2, with an "Optional" tag in label size.

### Navigation
- **App bar:** a sticky 56px glass bar holding the logo, six areas on one row (Dashboard, Scan, Resumes, Jobs, Career tools, Settings, plus Admin for admins), the "Scan a resume" primary button, the theme toggle and the account menu. Nav links are body-size bone 3, turning bone on hover. The active area is bone with a 2px brass underline that sits on the bar's bottom hairline and carries `aria-current="page"`. Career tools is a disclosure button with a short list of links; it opens with Enter or Space, closes with Escape (returning focus) or an outside click, and carries the underline when one of its tools is current. Each area owns its routes in `lib/nav.ts` (Scan owns `/scan` and `/scans`, Resumes owns `/resumes` and `/new`). Below `lg` (1024px) the row becomes a Menu button that discloses a full-width panel of the same links, with the Career tools links listed under their own label.
- **Tabs (Review / Edit / Compare, Changes / How it's scored):** a sunken track with a 2px inset and 28px triggers. The active trigger is raised, bone, and seated with a shadow. Counts sit inside the trigger in mono, and the unreviewed count is in brass.

### Menus, dialogs, toasts
Menus and toasts use the raised fill, a hairline border, 6px radius, and the pop shadow. Dialogs are panel-colored, 28rem wide, 10px radius, padded 24px, and title-sized. Toasts slide in with `slug-in`, stack to a maximum of three, and stay 4s (7s for errors). The toast icon is verdigris for success, brass for info, and error red for errors.

### The Slug Redline (signature)
Each change is set as a pair of type lines: the original struck through in vermilion (`<del>`, 1.5px strike) sitting on the new text underlined in verdigris (`<ins>`, 1.5px underline at a 3px offset). Both carry a soft wash and a 2px radius. A rewrite shows word-level marks inline, while additions and removals show whole lines. On the paper, each hunk is a clickable block. The focused hunk gets a brass wash, and every other line dims to 45% (the focus brightens and the rest of the page recedes). Inside rail cards the strike drops its fill, so the line form carries the meaning on a dark card.

### Brass Margin Marks (signature)
An unreviewed changed line carries a 2px brass rule in the left margin of the paper (14px outside the hunk, 40px for list items). In the rail it carries a 6px brass dot labeled "Not reviewed yet". Keeping the change turns the margin rule to paper-rule grey and dims the card to 60% with a "Kept" badge. Marks persist until the user acknowledges the change.

### Score Lock-up (signature)
Before → now, set like a slug. The original figure is 26px Geist Mono in bone 3, struck in 70% vermilion. The current figure is 40px/500 in bone, seated on a 2px brass rule the width of the figure. The point gain sits right-aligned in small mono, verdigris for a gain and vermilion for a loss. The breakdown below gives each component as `points/weight` in mono over a 4px bar: the previous ratio in strong hairline under the current ratio in brass, animated over 300ms with ease-out-expo. Requirements are listed with a verdigris check or a bone-3 dash, a "new" tag for gains, and the quoted evidence line. Missing requirements can only be added through the user's own "I have this" action.

### Blue-Pencil Query (signature)
When the AI introduces a number, name, or skill the original cannot back up, the change carries a query-tone "Verify" badge with a help-circle icon. When focused, it shows a query note: a query-soft panel with a 6px radius and a query-colored icon. The rail summary counts "N need checking" in blue pencil. The query is never shown as an error and never as brass.

### Composing-Stick Pipeline (signature)
Five stages (copy, markup, set, proof, lockup) labeled with plain verbs: Read the job, Measure your resume, Rewrite lines, Proof every change, Score and save. Each stage is a 24px circle on a 1px vertical spine. A waiting stage shows its mono numeral in a strong-hairline ring. A running stage has a brass ring and a spinner, a "doing" line, and a 1px brass `working-rule` shimmer (1.6s). A done stage is filled brass with a check, and its result note slides in with `slug-in` (280ms). The spine segment below a finished stage turns brass, so the stick fills as stages are set. A failed stage has an error-red ring and an alert icon. On marketing, the same structure becomes a five-cell hairline grid with brass-ringed numerals.

### Proof Page
The paper sheet is 794px wide with a 2px radius, the paper shadow, and paper inks. **Classic** uses a Source Serif 4 13.5px body, a Hanken 28px/700 name, and 12.5px/650 uppercase section heads tracked 0.09em over a paper-rule hairline. **Modern** uses a Hanken 13px body, with section heads in bronze accent, tracked 0.12em and with no rule. Page breaks are shown as dashed paper-rule lines with a 10px mono label. These templates are mirrored in `lib/resume/templates.ts` (in points) for PDF and DOCX, so the screen matches the download.

## Do's and Don'ts

### Do:
- **Do** route every color through the role tokens in `app/globals.css` so both themes stay in step, and check every new surface in dark and light.
- **Do** pair every semantic ink with a line form: strike for removal, underline for insertion, a dashed border for missing, and a margin rule or dot for unreviewed.
- **Do** keep brass for action, selection, and lock, with one primary button per region.
- **Do** set every score, count, and measurement in Geist Mono with tabular figures, and set everything else in Schibsted Grotesk.
- **Do** stay within the six-step UI scale and rank by weight (400, 500, 600) before reaching for a larger size.
- **Do** keep the proof page at real measure (794px) and in the export faces, so what is on screen is what downloads.
- **Do** separate panels with 1px hairlines and tonal steps. Reserve shadows for the paper and floating layers.
- **Do** honor reduced motion. Motion is limited to `slug-in` (280ms, ease-out-expo), 150 to 300ms state transitions, and the working-rule shimmer.

### Don't:
- **Don't** introduce a second accent, a purple "AI" tint, sparkles, or a chat-bubble treatment for the AI.
- **Don't** use pure white text or a pure black ground in the dark theme.
- **Don't** use vermilion or verdigris decoratively, or use error red for a diff.
- **Don't** show a query (blue pencil) as an error, or let a flagged change look identical to a clean one.
- **Don't** use Bodoni Moda inside the authenticated app, or use mono for prose.
- **Don't** add shadows to cards, rails, or the top bar, or round controls into pills.
- **Don't** add tracked-uppercase labels in the chrome. Uppercase tracking belongs to the resume's own section heads on the paper.
