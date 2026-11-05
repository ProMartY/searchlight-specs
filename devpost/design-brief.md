---
status: retrospective
---

# Searchlight design brief

Before the build, the participant asked for a useful everyday AR experience with a reason to use glasses, discussed alternatives, and approved the Searchlight concept and scope. The organizer's [plan-lens skill](https://github.com/challengepost/learn-specs/tree/main/skills/plan-lens) informed the planning discussion. The written brief was assembled after the prototype was built. The dimensions, colors, timings and specific preview controls are implementation defaults.

## The spatial moment

Someone looking for a key pauses at a crowded shelf. Two zones are marked as seen. The front lip shows an amber cue under the area hidden by a box. The person moves the box and sees the key for themselves.

## Why it belongs on glasses

The display shares the searcher's viewpoint and puts the coverage cues beside the shelf zones they describe. The person can keep looking at the shelf and use their hands to move things. A separate phone view would divide attention between a screen and the search area.

## Product and preview stand-in

The idea is a spatial overlay for searching a real shelf. The prototype uses a virtual shelf and a movable box. It samples visibility using the Preview camera and the box's known position. The modeled key gives the search a goal and plays no role in the coverage calculation.

## Where things live

- The 84 cm shelf starts 146 cm in front of the user's starting view and 22 cm below eye height. It stays in place as the user moves.
- Small markers sit on the shelf lip. Cyan and green corner marks sit around the inspectable areas on the shelf surface. The amber cue stays readable from the front when the corresponding area is blocked.
- A 58 cm wide panel sits just above the shelf, with one 22 cm wide button and two short lines of text.

## Hands and input

- Pinch **Start search** to begin. The same control becomes **Reset** once the search is active. In Interactive Preview, a mouse click represents a pinch.
- Pinch the box to slide it sideways. The user can also move sideways and look around it.

## When things show

The shelf appears with an invitation to start. After starting, the count and shelf markers respond to the current view. Amber marks a zone hidden by the box. Cyan marks a zone the user can inspect. Green appears after a zone has stayed visible long enough to count. Reset clears the count and returns the box.

## What to verify

1. Start a search and wait for **2 / 3 zones seen**. The box hides the key and the center cue is amber.
2. Slide the box aside and wait briefly. The key appears and the count reaches **3 / 3 zones seen**.
3. Reset and start another search. The box is back in front of the key and the center has to be seen again.

The saved Lens Studio Preview renders show the blocked and revealed states. An editor runtime probe exercised the start, slide and reset logic during development. The preview checks cover the simulated shelf. Physical hand tracking, outdoor visibility and comfort on hardware need an on-device test.

## Boundaries and open questions

Coverage means the zone was in the camera view with the modeled obstruction accounted for. It cannot verify that someone paid attention or confirm that a real item was found. The prototype uses the box as the only modeled obstruction and keeps coverage within the current session. A real shelf would need reliable surface and occlusion sensing. The Lens has no recording or identification feature.
