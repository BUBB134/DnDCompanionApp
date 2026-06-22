# MVP UX Direction

Status: implementation direction for DND-17

Last reviewed: 2026-06-22

## Decision

The DnD Companion should feel like a **living campaign journal with the speed of
a table tool**.

It should open on the most useful shared context, make the next table action
obvious, and let a user retrieve a person, place, rule, note, or grounded answer
without navigating through the product's data model.

The product should not present every feature as an equal destination. Its
experience has three modes:

1. **Remember** before play: recap, current objective, party and character
   context, and unresolved hooks.
2. **Play** during a session: notes, fast retrieval, rules, character actions,
   and shared live state.
3. **Reflect and prepare** after play: recap review, consequences, new links,
   and DM-only preparation.

The campaign is always the primary context. Sessions are the primary activity.
Search and grounded AI are retrieval tools that work across both.

## Evidence and current-state audit

This direction is grounded in the current repository at `ef795e5`, the PRD, the
first-campaign readiness runbook, and the shipped DND-49 polish.

The current product already establishes useful foundations:

- the signed-in shell keeps campaign, user, role, and environment context visible
- the campaign dashboard links directly to sessions, characters, rules, and
  campaign memory
- the latest recap, unresolved hooks, mentioned entities, and DM-only brief are
  brought together on the campaign dashboard
- mobile navigation is sticky and exposes the same destinations as desktop
- session notes include explicit save, recovery, retry, and grounding behavior
- characters have campaign-scoped creation, profile, spellbook, action, and
  level-up paths
- visibility filtering exists in repositories and shared types rather than
  relying only on presentation

The main experience gaps are now about hierarchy and coherence:

- Home, Campaigns, Characters, Sessions, Rules, and Entities are presented as
  peer destinations even though they have different importance at the table
- campaign switching is a global utility but currently competes with primary
  campaign activity in navigation
- Sessions are presented as a collection when the dominant table need is usually
  to start, resume, or join the current session
- rules, entities, recaps, notes, and future AI answers use separate retrieval
  surfaces rather than one consistent "find context" interaction
- the dashboard is useful but can become a stack of equally weighted cards as
  quests, party state, AI, timelines, and live-session status arrive
- visual styling is consistent enough for the MVP but relies heavily on repeated
  page-local utility classes and Arial, so it does not yet express a durable
  product system

## Target feelings

### Players

- **Oriented:** "I know what happened, what matters, and where the group is."
- **Capable:** "I can find my useful character actions and rules without slowing
  everyone down."
- **Included:** "The campaign feels shared, current, and responsive to what we
  did."
- **Safe:** "I can trust that the app shows me the right information without
  exposing DM material."

### Dungeon Masters

- **In control:** "The table can move into and out of a session deliberately."
- **Supported:** "The app remembers links and consequences without taking over
  the game."
- **Fast:** "I can retrieve or record context in seconds."
- **Confident:** "I always understand what is private, what is shared, and what
  grounded an AI output."

## Product principles

1. **Show the next table action first.** A current session, latest recap, or
   first-campaign setup action outranks generic browsing.
2. **Use campaign language, not database language.** Prefer "World", "People",
   "Places", "Quests", and "Previously on" over exposing generic entity
   terminology in primary UI.
3. **One interaction model for retrieval.** Search, rules lookup, entity lookup,
   and grounded questions should begin from one persistent find/ask affordance.
4. **Progressive disclosure over dashboards of everything.** Show a concise
   summary first and reveal detail on demand.
5. **Session mode changes the interface.** During live play, notes and immediate
   context become primary while setup and administration recede.
6. **Private information is visibly and structurally private.** DM-only state
   must be recognizable before editing or sharing, and authorization remains a
   server/data concern.
7. **AI earns trust through grounding.** Answers and recaps expose sources,
   uncertainty, and a clear no-context state.
8. **Useful without AI.** Navigation, notes, rules, character context, and
   campaign memory remain complete workflows when AI is disabled.
9. **Touch first, keyboard excellent.** Primary controls meet a 44px minimum
   target; search, notes, and command actions support efficient keyboards.
10. **Atmosphere frames information; it never obscures it.** The app may feel
    magical, but readability and speed win every disagreement.

## Player aha moments

1. **Instant re-entry:** opening a campaign shows a short "Previously on", the
   current objective, and a clear action to join or resume play.
2. **Context in place:** tapping a linked NPC, location, quest, condition, or
   rule opens a compact contextual card without losing the current note or
   session.
3. **A grounded answer, not a chatbot guess:** asking "Who is Captain Thorn?"
   returns a concise answer with links to the exact campaign notes and entities
   used.
4. **My character is ready at the table:** the character surface leads with
   useful actions, spells, and short ability summaries rather than a long form
   to administer.

## DM aha moments

1. **Start Session changes the table:** one deliberate action creates or resumes
   the shared session and gives every member a clear live entry point.
2. **Notes become campaign memory:** links, rule references, entities, recap
   grounding, and unresolved hooks remain connected without duplicate entry.
3. **Private versus shared is obvious:** the DM can tell at a glance what players
   can retrieve through pages, search, recaps, and AI.
4. **Prep begins with consequences:** after a session, unresolved hooks and
   changed relationships become a small, grounded prep queue rather than a blank
   AI prompt.

## Primary journeys

### Before a session

#### Player

1. Open the active campaign.
2. Read the latest player-safe recap and current objective.
3. Check character readiness, relevant quests, and any session announcement.
4. Ask or search for one missing piece of context.
5. Join the live session when the DM starts it.

#### DM

1. Open the campaign home in overview mode.
2. Review the latest recap, unresolved hooks, party state, and DM-only prep.
3. Resolve or add only the context needed for tonight.
4. Start or resume the session.

### During a session

#### Player

1. Enter the active-session workspace.
2. Keep shared notes or personal character context within one interaction.
3. Open linked context, rules, or search without abandoning the session.
4. Use character actions and quick rolls from compact secondary panels.

#### DM

1. Keep session title, live state, notes, and save status continuously visible.
2. Capture people, places, decisions, and hooks with minimal interruption.
3. Use private prep alongside player-safe shared context.
4. End the session explicitly so the campaign returns to reflection mode.

### After a session

#### Player

1. Review the saved recap and sources.
2. See changed quests, notable entities, and character progression.
3. Add or correct personal notes without editing authoritative campaign state.

#### DM

1. Review note persistence and generate or edit the player-safe recap.
2. Confirm unresolved hooks and important entity changes.
3. Separate shared consequences from private prep.
4. Leave the campaign home ready to explain what matters next.

## Information architecture

### Campaign context

The active campaign is the default scope for all primary destinations. Campaign
switching belongs in the header or account/campaign control, not beside
session-time navigation.

### Mobile primary navigation

Use no more than five persistent destinations:

1. **Home** — campaign overview and next action
2. **Session** — start, join, resume, notes, and recap
3. **Find** — campaign search, rule lookup, and grounded Ask
4. **Character** — the current user's character or the campaign character list
5. **More** — World, Party, Quests, campaign switching, and settings

When no campaign is selected, Home becomes the campaign chooser and onboarding
surface. Character may be hidden or replaced with Campaigns until a durable
campaign context exists.

During a live session, Session remains selected and the workspace exposes
contextual shortcuts for Find, Rules, Character, Party, and Rolls. Those
shortcuts should not become another full navigation bar.

### Desktop navigation

Use a stable campaign sidebar:

- Home
- Session
- Characters or Party
- World
- Quests

Place Find/Ask as a persistent high-visibility control above the destinations.
Keep Rules available through Find and as a secondary World/tool link. Put
campaign switching, invitations, and settings in a clearly separated utility
section.

### Destination model

- **Home:** current campaign state, not an analytics dashboard
- **Session:** the active or latest session first; history second
- **Find:** names, aliases, notes, sessions, quests, rules, and grounded questions
- **Characters/Party:** player action context and party overview
- **World:** people, places, factions, items, and their relationships
- **Quests:** active intent and unresolved work, distinct from generic entities
- **Campaigns:** switching and onboarding utility

## Campaign home composition

The campaign home should have a deliberate order rather than a free-growing card
grid.

### 1. Now

One dominant action:

- Start Session
- Join Session
- Resume Session
- Create the first session

Show live state, session title, and save/connection status when relevant.

### 2. Previously on

Show the latest player-safe recap in a concise form with:

- source count and a route to inspect grounding
- unresolved hooks or decisions
- a clear route to the full session

### 3. What matters next

Show a small, ranked set:

- current objective or top active quest
- one or two recent/relevant entities
- party or character readiness

Do not render every available category as an equal widget. Each item should
answer "why is this here now?"

### 4. Table shortcuts

Keep direct actions for notes, Find, character, and rules. These support the
dominant content; they do not lead the page once a campaign has meaningful data.

### 5. DM-only preparation

Place private hooks, secrets, and prep in a visually distinct region with an
unambiguous private label. It should never be interleaved with player-safe
content in a way that makes disclosure easy.

## Interaction patterns

### Entity links and tags

- Use readable campaign nouns and type icons/colors as supporting metadata.
- Open a compact preview card from notes or search before navigating away.
- Include the last relevant mention and a direct route to the full profile.
- A DM-only entity uses a consistent private mark in every DM surface.
- Player requests for inaccessible entities return a normal not-found/unknown
  state without confirming secret content exists.

### Rule cards

- Lead with the consequence at the table, then the precise rule summary.
- Keep source/version metadata visible but secondary.
- Support inline expansion from notes and Find.
- Offer a clear route from a rule to relevant character actions only when that
  relationship is grounded in stored data.
- Never grow the rule card into a full automation engine.

### Recaps

- Present recaps as editable campaign memory, not final AI prose.
- Show grounding count and source links near the recap.
- Separate player-safe recap text from DM-only consequences and prep.
- Make stale-generation or changed-notes warnings explicit.
- Keep "Previously on" short on Home; use the session route for full detail.

### Grounded AI answers

- Use a campaign-aware Ask field within Find rather than a generic chat-first
  home screen.
- Answer concisely first, then list citations.
- Label campaign sources and rules sources separately.
- If retrieval returns no authorized sources, say so and offer search terms or
  destinations instead of improvising.
- Preserve the user's role in every retrieval request and do not expose hidden
  source counts or names.
- Conversation history is secondary to the current answer and must not become
  hidden campaign memory.

### Visibility controls

- Use plain labels: **Shared with players** and **DM only**.
- Default new secret-capable content to the safer state defined by its workflow.
- Show the visibility choice before save, not only after content is published.
- Provide a player-preview affordance for DMs where practical.
- Use the same semantic treatment in forms, cards, search results, recaps, AI
  citations, and live-session panels.

### Empty, loading, error, and save states

- Empty states explain the next useful action and why the surface will matter.
- Loading preserves page hierarchy with skeletons for primary content before
  secondary widgets.
- Errors retain user input and offer a specific retry or safe destination.
- Save state uses a consistent vocabulary: Unsaved, Saving, Saved, Save failed,
  and Recovered draft.
- Offline/reconnect behavior is especially explicit inside a live session.

## Visual direction

### Concept

Use **field journal plus clean instrument panel**:

- warm, tactile campaign atmosphere for narrative surfaces
- crisp, high-contrast controls for live table use
- restrained ornament rather than faux parchment on every element

### Typography

- Use an expressive, readable serif for campaign titles, recaps, and narrative
  moments.
- Use a highly legible humanist sans serif for navigation, forms, metadata, and
  dense table tools.
- Preserve comfortable default text at 16px on mobile and avoid condensed or
  decorative fonts for interaction text.
- Treat the current Arial stack as a bootstrap choice, not the final identity.

### Colour

Keep the existing family as a useful starting point:

- ink for primary controls and text
- parchment/cream for the canvas
- teal for shared context, focus, and informational state
- oxblood for DM/private emphasis and critical state
- gold for campaign/story accents and caution

Define these as semantic tokens in DND-63. Do not rely on color alone for
visibility, error, live, or selected states.

### Spacing and density

- Base spacing on a 4px scale with 8, 12, 16, 24, and 32px as common steps.
- Use 44px minimum interactive targets.
- Keep narrative pages relaxed; allow denser rows and panels only in live-session
  and search results.
- Avoid putting every section inside a visually equal bordered card.

### Shape, elevation, and motion

- Reserve the largest radius/elevation for modal, command, and dominant campaign
  surfaces.
- Use lower emphasis for supporting rows and metadata.
- Motion should confirm state changes in roughly 150–220ms and respect reduced
  motion preferences.
- Avoid ambient animation during live play.

### Tone

Use concise, warm table language:

- "Previously on"
- "What matters next"
- "Start session"
- "Join the table"
- "DM only"
- "Grounded in 3 campaign sources"

Avoid overusing fantasy flavor in validation, permissions, save failures, and
other moments where precision matters.

## Prominence and scope decisions

### Prominent in the MVP

- active campaign context
- Start/Join/Resume Session
- notes and save state
- latest recap and unresolved hooks
- current character context
- Find/Ask across campaign memory and rules
- explicit shared versus DM-only state

### Secondary

- session history
- full entity collections
- campaign settings and invitations after onboarding
- timeline browsing
- detailed character administration
- recap generation controls after a recap exists

### Hidden until relevant

- empty categories with no immediate action
- advanced AI prompts
- automation controls
- deep metadata and source diagnostics
- future combat, voice, map, export, and wiki-generation tools

### Remain outside the MVP boundary

- a full VTT
- a complete rules engine or compendium
- a full character-sheet replacement
- autonomous campaign decisions
- AI answers without authorized grounding

## Follow-up implementation map

The discovery does not create duplicate tickets. The concrete recommendations
already map to implementation-ready Linear work:

1. **DND-62 — Start Session and live-session workspace**

   Implements the Play mode and dominant Start/Join/Resume action.
2. **DND-68 — Global search and command palette**

   Implements the persistent Find interaction and fast retrieval.
3. **DND-15 — Grounded AI Q&A**

   Implements Ask within the shared retrieval model with citations.
4. **DND-69 — DM-private/player-visible controls**

   Extends visibility semantics across authoring and derived surfaces.
5. **DND-70 — Dual-mode campaign home**

   Implements the ordered Now / Previously on / What matters next composition.
6. **DND-65 — Quest and party views**

   Gives active intent and party context first-class destinations.
7. **DND-63 — Stitch alignment and shared visual primitives**

   Turns the visual direction into tokens, components, responsive behavior, and
   screenshot review.
8. **DND-66 — Performance and perceived responsiveness**

   Measures and protects the "seconds, not minutes" table experience.
9. **DND-16 — Campaign dashboard widgets**

   Should be refined through DND-70 so widgets remain ranked context rather than
   an unbounded grid.

Recommended sequence:

1. DND-69 visibility foundation
2. DND-62 live-session state and workspace
3. DND-68 unified Find
4. DND-15 grounded Ask
5. DND-65 quest and party destinations
6. DND-70 campaign home composition
7. DND-63 visual-system alignment throughout the slices
8. DND-66 measured performance pass after representative routes exist

## Handoff checklist

Every implementation ticket derived from this direction should answer:

- What mode is the user in: Remember, Play, or Reflect/Prepare?
- What is the single most important action?
- What campaign and role context is visible?
- What can a player retrieve directly or indirectly?
- What happens with no data, slow data, failed data, and stale data?
- Can the primary task be completed at 390x844 without horizontal page scroll?
- Can keyboard users reach and operate retrieval and authoring controls?
- Are AI outputs cited, authorized, and useful when AI is unavailable?
- Does the page introduce a new primary destination, or can it live within the
  information architecture above?

## Success signals

Use the first real campaign to test whether:

- a returning player can identify what happened and what to do next in under
  30 seconds
- a DM can start or resume the shared session in one obvious action
- a user can reach notes, a rule, a known entity, or their character context in
  two interactions or fewer from the campaign
- users can correctly distinguish shared and DM-only content without training
- grounded answers are opened through campaign context rather than a disconnected
  generic chatbot
- the live-session workspace remains useful on a 390x844 viewport
- users spend less time navigating collections and more time reading, recording,
  and acting on relevant context
