# marketplace-labs-public

Integral Productivity's public **labs** Claude Code marketplace: the experimental edge, kept separate from the [core marketplace](https://github.com/Integral-Productivity/marketplace).

The core marketplace holds the work Integral Productivity stands behind as its mission-core offering. **Labs** is the home for everything else: experimental first-party work, broad domain practices, and third-party plugins. Every plugin listed here installs from a public source, with no GitHub sign-in.

> Listing a plugin in labs is **not** a quality endorsement. It means "part of Integral Productivity's experimental edge", not "core offering".

## Install

In Claude Code, or in Claude Desktop:

```text
/plugin marketplace add Integral-Productivity/marketplace-labs-public
/plugin install <name>@integral-productivity-labs-public
```

## The three categories

Each plugin's category is a tag at the start of its description (for example `[Experimental]`).

| Category | What it means | Graduates to core? |
|---|---|---|
| **Experimental** | Integral Productivity's own early, unproven work | Yes, see the [graduation rule](docs/graduation.md) |
| **Domain** | Broad practices not specific to Integral Productivity (Lean, Holacracy, software architecture) | No |
| **Integrations** | Plugins built around third-party products and tools | No |

## Plugins

| Category | Plugin | Source |
|---|---|---|
| Experimental | `metawork` | [metawork-claude-plugin](https://github.com/Integral-Productivity/metawork-claude-plugin) |
| Domain | `lean-management` | [lean-management-claude-plugin](https://github.com/Integral-Productivity/lean-management-claude-plugin) |
| Domain | `self-org` | [holacracy-claude-plugin](https://github.com/Integral-Productivity/holacracy-claude-plugin) |
| Domain | `model-framework` | [model-framework-claude-plugin](https://github.com/Integral-Productivity/model-framework-claude-plugin) |
| Domain | `software-architecture` | [software-architecture-claude-plugin](https://github.com/Integral-Productivity/software-architecture-claude-plugin) |
| Domain | `mattpocock-skills` | [mattpocock/skills](https://github.com/mattpocock/skills) (third-party) |
| Domain | `compound-engineering` | [EveryInc/compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin) (third-party) |

Each first-party plugin is pinned to its `stable` branch or a release tag where it has one, and to `main` otherwise. Third-party plugins are pinned to a commit, so every upstream change arrives as a reviewed PR.

## Checks

- `Check plugin pins` fails a PR that lists a plugin from outside Integral-Productivity without a 40-character commit pin. Run it locally with `node scripts/check-external-pins.mjs`.
- `Bump plugin pins` runs every Monday. When upstream has a newer `compound-engineering-vX.Y.Z` release tag, it opens a PR that moves `ref` and `sha` together. A person reviews and merges it.

## Feedback

Open an issue in this repository.
