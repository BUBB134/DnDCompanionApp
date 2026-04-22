# D&D Companion App — Project Definition (v2)

## 1. Product one-liner

A mobile-first Dungeons & Dragons companion app that helps players and DMs run smoother sessions by centralising campaign context, session tools, and **contextual rules & abilities surfaced at the moment they're needed**, powered by grounded AI.

## 2. Product vision

The app should feel like a **magical second brain for the table**. It is not trying to become a full virtual tabletop, rules engine, or video game. Instead, it reduces friction around playing D&D in person or in voice/video sessions by:

* remembering names, places, and unresolved hooks
* tracking session notes and party decisions
* surfacing relevant character abilities and rules contextually
* helping DMs improvise consistently
* giving players a cleaner interface than scattered notes, PDFs, and chats

Long-term: the default **companion layer** alongside the table, Discord, Roll20, or paper play.

## 3. Core problem

D&D sessions create a huge amount of context, but most groups store it badly and **retrieve it even worse**.

**Players forget:**

* who NPCs are
* what happened last session
* what their character knows
* what quests are active
* what loot the party has
* how certain rules/conditions actually work mid-session

**DMs struggle with:**

* continuity and consistency
* improvising in line with prior events
* tracking factions, locations, NPC motivations, and secrets
* quick rule clarification during play
* surfacing the *right* information at the *right* time

**Current workflow is fragmented across:**

* paper sheets
* D&D Beyond
* Roll20
* Notion/Obsidian/Docs
* WhatsApp/Discord

Result: friction before, during, and after sessions.

## 4. Target users

### Primary: engaged player

Wants:
* campaign memory
* quick character context
* relevant abilities surfaced in play
* rule clarification without breaking flow

### Secondary: active DM

Wants:
* campaign knowledge base
* improv + prep support
* fast rule lookup
* structured world tracking
* controlled information sharing

### Tertiary: casual/new groups

Wants:
* lower cognitive load
* easier onboarding
* fewer interruptions

## 5. Product positioning

### What it is

* campaign organiser
* session assistant
* narrative memory layer
* contextual rules & abilities surface
* AI-assisted D&D knowledge companion

### What it is not

* not a full VTT
* not a full rules engine
* not a character sheet replacement (MVP)
* not primarily a homebrew marketplace

## 6. Design principles

1. **Support the table, do not dominate it**
2. **Context first (campaign > everything)**
3. **Surface, don't overwhelm (especially rules)**
4. **AI must be grounded in campaign + rules context**
5. **Fast at the table (seconds, not minutes)**
6. **Clear player vs DM boundaries**
7. **Useful without AI, better with AI**

## 7. Main jobs to be done

### Players

* "Catch me up before session."
* "Who is this NPC?"
* "What are we doing?"
* "What can I do right now?"
* "How does this condition/spell work?"

### DMs

* "Summarise campaign state."
* "What are the consequences of last session?"
* "What NPCs connect to this?"
* "What rules apply here?"
* "What should I prep next?"

## 8. MVP scope

### Core thesis

**Campaign context + contextual surfacing (rules & abilities) dramatically reduces friction at the table.**

## 9. MVP feature pillars

### 9.1 Campaign hub

* campaigns with roles (DM/player)
* sessions, characters, NPCs, locations, factions, quests, items

### 9.2 Session logging & recap

* structured notes
* entity tagging
* AI recap generation
* "previously on…" summaries
* unresolved hooks tracking

### 9.3 Character companion (lightweight)

* profile, class, level
* backstory, goals, relationships
* inventory
* **ability summaries (not full sheets)**
* personal notes

### 9.4 Campaign wiki entities

**Entities:**
* NPCs
* locations
* factions
* quests
* items

**Each supports:**
* description
* tags
* links
* visibility (DM/private)
* timeline mentions
* AI summary

### 9.5 Contextual Rules & Ability Surfacing (NEW CORE PILLAR)

#### Goal

Surface the **right rule or ability at the exact moment it's needed**.

#### Scope (MVP-safe)

* conditions (e.g. prone, grappled, stunned)
* core mechanics (advantage, concentration, death saves)
* action basics
* ability summaries (short, usable descriptions)

#### Not included

* full rules database
* full spell compendium
* automation engine

#### UX patterns

* tap-to-expand rule cards
* inline tappable terms in notes
* quick-search rule panel
* session-aware suggestions

#### Example

Session note: "Ogre knocks you prone" → "prone" becomes tappable → shows:
* effects
* attack implications
* movement restrictions

### 9.6 AI chat grounded in context

**Supports queries like:**

* "Who is Captain Thorn?"
* "What do we know about this place?"
* "What rules apply to restrained?"
* "What can my character do here?"

**DM prompts:**

* "What NPCs respond to this?"
* "Give 3 rumours grounded in this town"
* "What should I prep next?"

**AI must combine:**

* campaign context
* rules/ability context

### 9.7 Table utilities

* initiative tracker (simple)
* condition tracker
* shared loot
* optional dice roller (low priority)

## 10. Key user flows

### Player: before session

* open campaign
* read recap
* review quests
* check abilities
* quick AI question

### Player: during session

* take notes
* tap NPC/location/condition
* view relevant abilities
* check rules instantly

### DM: prep

* review last session
* check unresolved hooks
* AI-assisted prep

### DM: during session

* search entities
* check rules quickly
* add new content
* mark consequences

## 11. Differentiators

* structured campaign memory
* contextual AI retrieval
* **situational rules & ability surfacing**
* player/DM boundaries
* session-first workflow
* mobile-first usability

## 12. Product risks

1. too broad
2. AI hallucination
3. input friction
4. IP/rules constraints
5. cold start
6. rules feature scope creep

## 13. Success metrics

### Activation

* campaign created
* session logged
* entities created
* AI query made

### Engagement

* sessions per campaign
* AI usage
* recap usage
* rule/ability card usage

### Retention

* active campaigns after 4 weeks
* return before sessions

### Quality

* AI satisfaction
* grounded answers
* recap acceptance rate

## 14. Technical product shape

### Core domain objects

* User
* Campaign
* Membership
* Session
* Character
* NPC
* Location
* Faction
* Quest
* Item
* Note
* RelationshipLink
* RuleSnippet
* Condition
* AbilitySummary
* AIConversation

### AI system

**Two knowledge layers:**

1. campaign context
2. rules/abilities context

**Agents:**

* ingestion agent
* retrieval agent (campaign + rules)
* answer agent (combined reasoning)
* summarisation agent

**Requirements:**

* embeddings + retrieval
* prompt templates
* citations/grounding
* visibility filtering

## 15. MVP wedge

**"The easiest way for a D&D group to remember what is going on — and know what to do next."**

## 16. Example pitch

"D&D Companion is a campaign memory and session assistant that keeps track of your world, sessions, and characters, then uses AI to give grounded recaps, answer questions, and surface the rules and abilities you need in the moment."

## 17. Release boundary

Ship when these are excellent:

* campaign creation
* session logging
* entity linking
* recap generation
* grounded AI Q&A
* contextual rules/ability cards
* DM vs player separation

## 18. Immediate next steps

1. PRD + user stories
2. schema + permissions model
3. AI agent architecture
4. Linear epics
5. decide web vs mobile first

## 19. Open questions

* DM vs player focus?
* in-person vs online first?
* D&D-specific vs system-agnostic?
* level of character support?
* real-time vs async collaboration?
* primary AI entry point?

## 20. Recommendation

**Start with:**

* campaign memory
* session recaps
* contextual rules & abilities

**Do NOT start with:**

* full sheets
* combat automation
* VTT features

Win the **continuity + clarity problem at the table first.**