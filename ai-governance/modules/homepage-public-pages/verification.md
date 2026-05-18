# Homepage AI Verification

Use this checklist when implementing or wiring Homepage AI governance files.

## Prompt-Level Checks

- A normal "make it cuter" request produces a template patch, not HTML/CSS.
- A request to create a new template or component produces an authoring proposal for the Web IDE review path, not a runtime tenant patch.
- A request to add YouTube, Bilibili, or Twitch embeds uses the iframe allowlist.
- A request for an unknown iframe provider returns a blocked request with a safe alternative.
- A request for unlicensed stickers, fonts, images, or copied character art is blocked.
- A request for custom HTML/CSS explains that runtime tenant content cannot accept executable template/component code; code authoring must go through the Web IDE review path.

## Schema Checks

- Example AI output validates against `homepage-ai-patch.schema.json`.
- Patch operations do not include arbitrary layout trees.
- Patch operations do not include arbitrary section order changes, unregistered component insertion, custom CSS/JS, route/domain mutations, publish/schedule/rollback commands, or live-pointer movement.
- External resources and iframe providers are listed explicitly.
- Blocked requests include reason and safe alternative.

## Runtime Checks For Future Wiring

- Studio canvas, live preview, author preview, and public route consume the same safe projection/rendering path for the relevant document or fixture.
- Public renderer does not inject visible Hero, stats, CTA, badges, or headers absent from the document.
- Template code owns layout, section order, and slots. Visual Mode edits only registry-declared fields.
- Template Center and Component Store Add actions open full-screen Web IDE plus preview authoring routes; they do not write executable code into tenant content.
- Advanced Source cannot write executable layout/component code back into Visual Mode.
- Image and media changes use asset URLs, not base64 payloads.
- Internal Mobile preview mode and desktop preview mode are both proven; a narrow browser viewport alone is not sufficient.
- Mobile and desktop browser proof cover the same document or fixture before acceptance.
