# Homepage AI Verification

Use this checklist when implementing or wiring Homepage AI governance files.

## Prompt-Level Checks

- A normal "make it cuter" request produces a template patch, not HTML/CSS.
- A request to add YouTube, Bilibili, or Twitch embeds uses the iframe allowlist.
- A request for an unknown iframe provider returns a blocked request with a safe alternative.
- A request for unlicensed stickers, fonts, images, or copied character art is blocked.
- A request for custom HTML/CSS explains Advanced Source and requires one-way eject confirmation.

## Schema Checks

- Example AI output validates against `homepage-ai-patch.schema.json`.
- Patch operations do not include arbitrary layout trees.
- External resources and iframe providers are listed explicitly.
- Blocked requests include reason and safe alternative.

## Runtime Checks For Future Wiring

- Editor canvas, live preview, and public route consume the same page document.
- Public renderer does not inject visible Hero, stats, CTA, badges, or headers absent from the document.
- Legacy Puck content is not silently migrated. New template drafts require explicit user confirmation.
- Advanced Source cannot write back into Visual Mode. Recovery creates or restores a low-code snapshot as a new template draft.
- Image and media changes use asset URLs, not base64 payloads.
- Mobile and desktop browser proof cover the same document before acceptance.
