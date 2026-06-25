"""Tests for the escalating JSON-endpoint backoff (24h -> 48h -> 31d).

The cache dir is isolated per-test by the autouse ``_isolate_cache_dir``
fixture in conftest, so backoff state never touches the real cache and each
test starts from a clean slate.
"""

import time
from urllib.error import HTTPError

import pytest

import tradingagents.dataflows.reddit as reddit


def _raise_403(*args, **kwargs):
    raise HTTPError("url", 403, "Blocked", {}, None)


class _OkResp:
    """Minimal context-manager stand-in for a successful urlopen() response."""

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def read(self):
        return b'{"data": {"children": []}}'


@pytest.mark.unit
class TestJsonBackoff:
    def test_403_arms_stage_one_and_skips_further_probes(self, monkeypatch):
        monkeypatch.setattr(reddit, "_fetch_subreddit_rss", lambda *a, **k: [])
        calls = {"n": 0}

        def counting_403(*a, **k):
            calls["n"] += 1
            raise HTTPError("url", 403, "Blocked", {}, None)

        monkeypatch.setattr(reddit, "urlopen", counting_403)

        reddit.fetch_reddit_posts("GOOG", inter_request_delay=0)

        # Only the first subreddit probes JSON; once the 403 arms the backoff
        # the remaining subreddits skip straight to RSS.
        assert calls["n"] == 1
        state = reddit._load_backoff()
        assert state["stage"] == 1
        assert state["retry_after"] > time.time()

    def test_within_window_json_is_not_probed(self, monkeypatch):
        # Active backoff window far in the future.
        reddit._save_backoff(1, time.time() + 24 * 3600)

        def fail_if_called(*a, **k):
            raise AssertionError("JSON endpoint must not be probed during backoff")

        monkeypatch.setattr(reddit, "urlopen", fail_if_called)
        monkeypatch.setattr(
            reddit, "_fetch_subreddit_rss", lambda *a, **k: [{"source": "rss"}]
        )

        # Must not raise -> JSON skipped, RSS served.
        reddit.fetch_reddit_posts("GOOG", inter_request_delay=0)

    def test_escalation_24h_48h_31d_then_caps(self, monkeypatch):
        monkeypatch.setattr(reddit, "_fetch_subreddit_rss", lambda *a, **k: [])
        monkeypatch.setattr(reddit, "urlopen", _raise_403)

        for expected_stage, window in (
            (1, 24 * 3600),
            (2, 48 * 3600),
            (3, 31 * 86400),
            (3, 31 * 86400),  # caps at the final stage
        ):
            # Pretend the previous window has elapsed so JSON is re-probed.
            prev = reddit._load_backoff()["stage"]
            reddit._save_backoff(prev, time.time() - 1)
            before = time.time()
            reddit.fetch_reddit_posts("GOOG", inter_request_delay=0)
            state = reddit._load_backoff()
            assert state["stage"] == expected_stage
            assert state["retry_after"] >= before + window - 5

    def test_successful_probe_resets_backoff(self, monkeypatch):
        reddit._save_backoff(2, time.time() - 1)  # window elapsed
        monkeypatch.setattr(reddit, "_fetch_subreddit_rss", lambda *a, **k: [])
        monkeypatch.setattr(reddit, "urlopen", lambda *a, **k: _OkResp())

        reddit.fetch_reddit_posts("GOOG", inter_request_delay=0)

        assert reddit._load_backoff()["stage"] == 0

    def test_non_403_http_error_does_not_arm_backoff(self, monkeypatch):
        def raise_500(*a, **k):
            raise HTTPError("url", 500, "Server Error", {}, None)

        monkeypatch.setattr(reddit, "urlopen", raise_500)
        monkeypatch.setattr(reddit, "_fetch_subreddit_rss", lambda *a, **k: [])

        reddit.fetch_reddit_posts("GOOG", inter_request_delay=0)

        # A transient 500 falls back to RSS but must not lock out JSON probes.
        assert reddit._load_backoff()["stage"] == 0
