# Local committed knowledge selection

## Decisions
Successful generations remain in the existing workspace-local generations
directory. Promotion saves a published.json receipt; completed pre-receipt
versions are discovered from snapshot metadata and validated before reuse.
Unpublished recovery candidates are not answer sources. No branch-named
directories or Git hooks are needed: selection happens at command invocation.

Refresh preserves configuration and integrity checks. It prefers an exact
version, otherwise the nearest compatible ancestor measured by commit count.
The selected pointer is passed explicitly into incremental refresh and cloning;
the workspace pointer changes only on successful reuse or publication.
Matching interrupted work remains resumable, including force-full work started
while another branch was active.

Ask resolves exact or nearest compatible ancestor knowledge, pins its root with
the existing context override, and never updates current.json or .last_refresh_sha.
Staged, unstaged and untracked edits are allowed. A transient context supplies
status and a bounded tracked diff, with secrets redacted using existing rules,
to host and API answer agents. It identifies saved knowledge as historical;
affected claims must be checked against current source or marked unverified.
Cached retrieval-only shortcuts and fact-only legacy answers are bypassed when
source has changed. Continuing edits produce a notice; changed HEAD discards the
answer. Legacy Git knowledge also allows ancestor commit markers. Refresh keeps
its clean-worktree requirement. Non-Git legacy behavior is preserved.

## Limits
Storage remains per worktree. Branches at one commit can share the same local
generation, but separate worktrees do not gain a machine-wide cache. This change
does not index dirty files, add shared packages, or change model configuration
compatibility. Local historical generations continue to occupy disk space.
