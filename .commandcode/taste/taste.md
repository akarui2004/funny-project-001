# Tastes

## Workflow & tooling
- Uses both Claude Code and Command Code and wants the same skills/capabilities available in both — prefers copying skills (e.g., the `/review` command) from Claude Code into Command Code so tooling stays consistent across tools, including sharing the `~/.agents/skills/` directory that both read. Confidence: 0.8
- Actively grows the agent's skill library by importing skills from external/third-party collections (e.g., claudekit.cc's 80+ skill packs) in addition to built-in commands — asked to copy claudekit.cc skills into Command Code's skill directory. Confidence: 0.8
- Prefers the agent reuse already-installed local resources over fetching from remote sources — explicitly noted all claudekit.cc skills were already installed on the machine, expecting the agent to locate and copy from the local installation rather than download from the repo/web. Confidence: 0.6
- Likes to clean up temporary helper scripts/artifacts once the task they served is complete — proactively asked to remove the /tmp/copy-ck-skills.sh migration script after the copy was verified. Confidence: 0.5

## Code review & communication
- During code reviews, wants concrete, actionable suggestions (e.g., exact alternative variable names) rather than only abstract critique — after an interface review, asked "can you suggest me the variable name?" Confidence: 0.6
