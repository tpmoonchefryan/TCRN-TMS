# Blocklist Data Sources

This directory contains sensitive word lists for content moderation in the Marshmallow module.

## Sources

### English
- **LDNOOBW** (List of Dirty, Naughty, Obscene, and Otherwise Bad Words)
  - GitHub: https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words
  - License: CC-BY-4.0
  - Stars: 3.3k+

### Chinese (中文)
- **Sensitive-lexicon** (敏感词库)
  - GitHub: https://github.com/konsheng/Sensitive-lexicon
  - License: MIT
  - Stars: 2.8k+
- Additional political sensitive words collected from public domain sources

### Japanese (日本語)
- **inappropriate-words-ja** (不適切表現集)
  - GitHub: https://github.com/MosasoM/inappropriate-words-ja
  - License: MIT

## Categories

| Category | Description | Default Action |
|----------|-------------|----------------|
| safety | Death threats, self-harm | reject |
| illegal | Child exploitation, drugs, gambling | reject |
| political | Political sensitive content (Chinese only) | reject |
| profanity | Profanity, vulgar language | flag/reject |
| sexual | Sexual content, harassment | reject |
| privacy | Personal information, contact info | flag |
| spam | Advertising, contact solicitation | flag |
| harassment | Personal attacks, discrimination | reject |

## Severity Levels

- **high**: Automatic rejection, no human review needed
- **medium**: Flag for human review
- **low**: Flag only, does not block

## Inheritance Control

- `isForceUse: true` - Critical rules that cannot be disabled by lower levels
- `isForceUse: false` - Recommended rules that can be disabled by Subsidiary/Talent
- `inherit: true` - Rules automatically inherited by child entities

## Notes

1. Political sensitive words are only applicable for China mainland operations. Overseas operations can disable this category at the Subsidiary/Talent level.
2. All word lists are merged into regex patterns to reduce database entries while maintaining matching efficiency.
3. Word lists are maintained as TypeScript constants in the seed file for version control and deployment consistency.

## Last Updated

2026-01-23
