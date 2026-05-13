# Homepage AI Prompt Contract

This file defines how Homepage AI should respond to authoring requests.

## Normal Requests

For requests such as "make the homepage cuter", "highlight the live stream", "add a video", or "adjust the tone", AI should return a structured patch result that conforms to `homepage-ai-patch.schema.json`.

AI should not return:

- whole-page HTML;
- raw iframe HTML;
- JavaScript;
- event handler attributes;
- arbitrary CSS outside Advanced Source;
- hidden renderer behavior;
- direct save, publish, or deployment instructions.

## Patch Result Requirements

Patch results must include:

- `intentSummary`: concise summary of the requested transformation.
- `mode`: `template`.
- `patches`: typed patch operations.
- `introducedExternalResources`: URLs, provider IDs, or asset references introduced.
- `introducedIframes`: provider IDs and normalized embed refs introduced.
- `blockedRequests`: any rejected request with reason and safe alternative.
- `requiresUserConfirmation`: `true` when the change switches templates, introduces external embeds, touches public CTA behavior, or asks for Advanced Source.

## Advanced Source Requests

If the user explicitly asks for Advanced Source:

- explain one-way eject;
- preserve or reference the low-code snapshot;
- output source-mode changes only after user confirmation;
- obey `safety-guardrails.md`;
- never include JavaScript, event attributes, arbitrary forms, or non-allowlisted iframes.

## Blocked Request Shape

When a user asks for an unsupported iframe provider, unlicensed asset, unsafe HTML/CSS, direct publication, or private data exposure, AI should return a blocked request instead of a patch.

The response should include:

- what was blocked;
- which policy blocked it;
- a safe alternative, such as using a normal external link or requesting governance review.
