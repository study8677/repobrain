"""Tests for hub._merkle content-hash change detection."""
from pathlib import Path

from antigravity_engine.hub._merkle import (
    SNAPSHOT_VERSION,
    MerkleTree,
    build_tree,
    build_workspace_tree,
    compute_content_hash,
    diff_trees,
    load_snapshot,
    save_snapshot,
)


# --- hashing primitives ---------------------------------------------------


def test_content_hash_str_and_bytes_agree() -> None:
    assert compute_content_hash("hello") == compute_content_hash(b"hello")
    assert compute_content_hash("a") != compute_content_hash("b")


def test_build_tree_is_deterministic_and_order_independent() -> None:
    a = build_tree({"m1": {"x.py": "h1", "y.py": "h2"}, "m2": {"z.py": "h3"}})
    b = build_tree({"m2": {"z.py": "h3"}, "m1": {"y.py": "h2", "x.py": "h1"}})
    assert a.root == b.root
    assert a.modules["m1"].hash == b.modules["m1"].hash


def test_build_tree_changes_when_a_file_hash_changes() -> None:
    base = build_tree({"m1": {"x.py": "h1"}})
    changed = build_tree({"m1": {"x.py": "h1-CHANGED"}})
    assert base.root != changed.root
    assert base.modules["m1"].hash != changed.modules["m1"].hash


def test_build_tree_root_changes_when_a_module_is_added() -> None:
    base = build_tree({"m1": {"x.py": "h1"}})
    plus = build_tree({"m1": {"x.py": "h1"}, "m2": {"y.py": "h2"}})
    assert base.root != plus.root
    assert base.modules["m1"].hash == plus.modules["m1"].hash  # unchanged module stable


# --- diff -----------------------------------------------------------------


def test_diff_against_none_marks_everything_added() -> None:
    cur = build_tree({"m1": {"x.py": "h1"}, "m2": {"y.py": "h2"}})
    d = diff_trees(None, cur)
    assert d.added == ["m1", "m2"]
    assert d.modified == [] and d.removed == []
    assert d.changed_modules == ["m1", "m2"]


def test_diff_detects_modified_added_removed() -> None:
    prev = build_tree({"keep": {"a.py": "h"}, "gone": {"b.py": "h"}, "edit": {"c.py": "h1"}})
    cur = build_tree({"keep": {"a.py": "h"}, "edit": {"c.py": "h2"}, "new": {"d.py": "h"}})
    d = diff_trees(prev, cur)
    assert d.added == ["new"]
    assert d.modified == ["edit"]
    assert d.removed == ["gone"]
    assert d.changed_modules == ["edit", "new"]  # removed is not "to recompute"


def test_diff_identical_trees_is_empty() -> None:
    t = build_tree({"m1": {"x.py": "h1"}})
    again = build_tree({"m1": {"x.py": "h1"}})
    d = diff_trees(t, again)
    assert d.is_empty
    assert d.changed_modules == []


# --- snapshot persistence -------------------------------------------------


def test_snapshot_round_trip(tmp_path: Path) -> None:
    tree = build_tree({"m1": {"x.py": "h1", "y.py": "h2"}, "m2": {"z.py": "h3"}})
    snap = tmp_path / "merkle.json"
    save_snapshot(tree, snap)

    loaded = load_snapshot(snap)
    assert loaded is not None
    assert loaded.root == tree.root
    assert loaded.modules["m1"].files == {"x.py": "h1", "y.py": "h2"}
    assert diff_trees(loaded, tree).is_empty


def test_load_snapshot_missing_returns_none(tmp_path: Path) -> None:
    assert load_snapshot(tmp_path / "nope.json") is None


def test_load_snapshot_bad_json_returns_none(tmp_path: Path) -> None:
    bad = tmp_path / "merkle.json"
    bad.write_text("{not valid json", encoding="utf-8")
    assert load_snapshot(bad) is None


def test_load_snapshot_version_mismatch_returns_none(tmp_path: Path) -> None:
    stale = tmp_path / "merkle.json"
    stale.write_text(
        '{"version": %d, "root": "r", "modules": {}}' % (SNAPSHOT_VERSION + 1),
        encoding="utf-8",
    )
    assert load_snapshot(stale) is None


# --- real workspace end to end (file reads only, no LLM) ------------------


def test_build_workspace_tree_detects_content_change(tmp_path: Path) -> None:
    (tmp_path / "main.go").write_text("package main\nfunc main() {}\n", encoding="utf-8")
    internal = tmp_path / "internal"
    internal.mkdir()
    service = internal / "service.go"
    service.write_text("package internal\nfunc Service() {}\n", encoding="utf-8")

    before = build_workspace_tree(tmp_path)
    assert len(before.root) == 64  # sha256 hex
    assert before.modules  # at least one module detected

    # Edit one file's content; structure (module set) is unchanged.
    service.write_text("package internal\nfunc Service() { return }\n", encoding="utf-8")
    after = build_workspace_tree(tmp_path)

    assert after.root != before.root
    d = diff_trees(before, after)
    assert not d.is_empty
    assert d.added == [] and d.removed == []
    assert d.changed_modules  # the edited module shows up as modified
