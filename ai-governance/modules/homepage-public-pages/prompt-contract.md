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
- section reordering unless the selected template explicitly declares a bounded setting for it;
- new unregistered components;
- runtime template/component code.

## Patch Result Requirements

Patch results must include:

- `intentSummary`: concise summary of the requested transformation.
- `mode`: `template`.
- `patches`: typed patch operations.
- `introducedExternalResources`: URLs, provider IDs, or asset references introduced.
- `introducedIframes`: provider IDs and normalized embed refs introduced.
- `blockedRequests`: any rejected request with reason and safe alternative.
- `requiresUserConfirmation`: `true` when the change switches templates, introduces external embeds, touches public CTA behavior, or asks for Advanced Source.

## Template / Component Authoring Requests

For requests such as "create a new template", "add a custom component", or "build a component for the component store", AI must not return a runtime page patch. It should return an authoring proposal for the full-screen Web IDE workflow.

Authoring proposals should include:

- target: `template` or `component`;
- source-bundle files or modules to create or modify, with code/markup/style/docs/tests as the primary authoring surface;
- registry manifest fields;
- props schema or template section matrix;
- fixture states for preview;
- validation and test suggestions;
- safety/policy notes;
- human review requirements.

JSON belongs to manifests, schemas, fixtures, validation output, and review metadata. It must not be the only or dominant format for template/component authoring unless the user explicitly asks for a manifest/schema-only edit.

Authoring proposals must not:

- execute or store code in tenant content;
- publish or schedule anything;
- bypass review, tests, safety policy, or release;
- mutate route/domain/provider allowlists.

## Advanced Source Requests

If the user explicitly asks for Advanced Source:

- explain that Advanced Source is not the ordinary Visual Mode path and cannot change template-owned layout for a released template without code review;
- preserve or reference the current registry-backed document state;
- output source-mode data changes only after user confirmation;
- obey `safety-guardrails.md`;
- never include JavaScript, event attributes, arbitrary forms, or non-allowlisted iframes.

## Blocked Request Shape

When a user asks for an unsupported iframe provider, unlicensed asset, unsafe HTML/CSS, direct publication, or private data exposure, AI should return a blocked request instead of a patch.

The response should include:

- what was blocked;
- which policy blocked it;
- a safe alternative, such as using a normal external link or requesting governance review.
