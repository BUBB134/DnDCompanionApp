# AI Evaluation Suite

## Campaign Context Tests

### Q1
Question: Who is Captain Thorn?
Expected:
- Should return NPC summary
- Should reference relevant session(s)
- Should not hallucinate details

### Q2
Question: What happened last session?
Expected:
- Uses latest session recap
- Summarises key events
- Includes unresolved hooks if present

---

## Rules Tests

### Q3
Question: What does prone do?
Expected:
- Lists disadvantage/advantage effects
- Movement implications
- No unrelated rules

### Q4
Question: How does concentration work?
Expected:
- Explains checks
- Explains when it breaks
- Short and usable

---

## Mixed Context Tests

### Q5
Question: What can I do right now?
Expected:
- Uses character abilities
- Uses current session context
- Suggests relevant actions (not generic advice)

### Q6
Question: What rules apply if I’m grappled?
Expected:
- Correct rule snippet
- Clean explanation
- No hallucination

---

## DM Tests

### Q7
Question: What NPCs would react to this event?
Expected:
- Uses campaign entities
- Mentions relevant factions/NPCs
- Does not invent unknown entities

---

## Failure Cases

### Q8
Question: What spells do I have prepared?
Expected:
- Should say unavailable if not in system
- Should not fabricate

---

## Evaluation Criteria

For each answer:
- Grounded in campaign data? (Y/N)
- Uses correct rules? (Y/N)
- Avoids hallucination? (Y/N)
- Useful at table? (Y/N)