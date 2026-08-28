# Concept Case Bridge — visual thesis

## Direction: the decision workshop

Concept Case Bridge uses a **risograph tactile collage** to make transfer practice
feel like working at a desk: fragments of a case are pinned together until a
decision becomes visible. The imperfect ink overlap is a useful metaphor for the
product's job—joining technical concepts to messy domain signals—without making
the interface feel like a generic study app. Decoration is limited to explanatory
art, paper edges, registration marks, and a restrained grain texture.

The product has one deliberately painted light treatment. This is a paper-and-ink
workbench, so a dark theme would break the physical metaphor and reduce the
distinctive overprint effects. The canvas is explicitly warm cream in every route
and in the installed-app splash.

## Palette

| Token | Value | Role |
| --- | --- | --- |
| `paper` | `#F4EBD8` | main background, like uncoated stock |
| `paper-high` | `#FFF9EC` | raised sheets and inputs |
| `ink` | `#172521` | primary copy; near-black green, 13+:1 on paper |
| `ink-soft` | `#4B5B55` | secondary copy; 6.4+:1 on paper |
| `teal` | `#087F73` | technical-concept ink and focus cue |
| `teal-dark` | `#07584F` | interactive text; 6.3+:1 on paper |
| `coral` | `#D65345` | domain-signal ink, stamps, destructive emphasis |
| `coral-dark` | `#963A31` | accessible coral copy |
| `mustard` | `#D6A824` | reveal/decision highlight; never carries meaning alone |
| `success` | `#176A46` | correct outcome with icon and text |
| `warning` | `#855800` | due and offline notices |
| `danger` | `#9B2C2C` | errors/destructive text |

Overprints use teal/coral at low opacity over paper, never beneath body copy.
All text and UI outline combinations target WCAG AA (4.5:1 for text, 3:1 for
controls); focus is a 3 px teal ring with a 2 px paper offset.

## Type

- **Display:** Georgia (system serif), bold, tight leading. Its editorial voice
  makes each case read like a compact field note rather than a software ticket.
- **Working text:** system sans (`Inter`-like native stack) for forms, controls,
  labels, and long explanations. No font files or third-party requests are needed.
- Scale: 14 px micro labels, 16 px body, 20 px section title, 28 px card prompt,
  `clamp(36px, 7vw, 72px)` product h1. Body leading is 1.55 and reading measure is
  capped at 68 characters. Numeric review stats use tabular figures.

## Space and shape

The base rhythm is 4 px, with primary gaps of 8 / 12 / 16 / 24 / 32 / 48 / 64.
Pages use a 1200 px max workbench. Content sheets have small 2–6 px corner radii,
offset ink shadows, and occasional 0.5–1.2 degree rotations on non-interactive
decoration only. Controls remain aligned, at least 44 px high, and 8 px apart.
On 390 px screens the supporting illustration and secondary context collapse;
editing and reviewing become one full-width, linear reading path.

## Interaction grammar

- A case is visually assembled in three marked layers: **signal** (coral),
  **concept** (teal), and **decision** (mustard reveal strip).
- Primary verbs are concrete: “Write a case”, “Save case”, “Reveal decision”,
  “Export backup”. The main action is ink-dark; secondary actions are paper.
- Reveal uses a physical lift: the cover sheet moves 8 px and fades in 220 ms.
- Navigation is an understated workbench index, not a row of app-style cards.
- Correct/incorrect review is always expressed with a symbol, phrase, and color.
- Deletion requires a dialog naming the case. Import validates before replacing or
  merging, and never silently overwrites local work.

## Motion policy

Motion follows paper logic: a newly opened editor rises from the originating
button; reveal lifts its cover; toast messages slide from the page edge. UI motion
is 160–240 ms and only animates opacity/transform. Nothing loops. Under
`prefers-reduced-motion: reduce`, transforms and smooth scrolling are removed and
state changes are instant; depth remains through borders, offset shadows, scale,
and layer order.

## Asset plan and provenance

One generated hero illustration explains the bridge: two paper islands—technical
schematics and business evidence—joined by a narrow sequence of signal, choice,
and counterexample cards. It is supportive, not a literal product screenshot.
Small icons, registration marks, and paper textures are hand-authored CSS/SVG.

### Prompt sheet

- **Subject:** an overhead still life of a professional learning workbench; paper
  fragments showing abstract database blocks, queue arrows, invoices, a warehouse
  shelf grid, and three blank decision slips connected by a paper bridge
- **World/materials:** handmade risograph print, torn recycled paper, soy ink,
  coarse halftone dots, slight teal/coral misregistration, tactile cut-paper edges
- **Light/lens:** even warm studio light, straight overhead editorial composition,
  shallow paper shadows, no photographic people
- **Palette words:** warm oat paper, deep green-black, oxidized teal, vermilion
  coral, sparing mustard yellow
- **Negative list:** no words, letters, numbers, logos, watermarks, UI screenshot,
  gradients, glossy 3D, people, hands, brands, copyrighted characters
- **Generation:** Azure OpenAI image model via factory `gen-image.sh`, 2026-08-28.
  Generated specifically for this product; original asset used under the product's
  MIT distribution. The exact prompt is stored beside the source PNG.

All shipped raster variants must be WebP (plus AVIF when tool support permits),
carry explicit dimensions, and stay below 300 KB. Generated imagery is disclosed
in the footer.
