"""Tests for the optional Reddit OAuth (application-only) path.

When REDDIT_CLIENT_ID/SECRET are set, the fetcher uses oauth.reddit.com;
otherwise it falls back to the public RSS path. The autouse _clear_reddit_oauth
fixture in conftest unsets the creds by default, so each OAuth test opts in.
"""

from urllib.error import HTTPError

import pytest

import tradingagents.dataflows.reddit as reddit


class _Resp:
    """Minimal context-manager stand-in for a urlopen() response."""

    def __init__(self, body):
        self._body = body

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def read(self):
        return self._body


@pytest.fixture(autouse=True)
def _reset_token_cache():
    reddit._token_cache.update({"value": None, "expires_at": 0.0})
    yield
    reddit._token_cache.update({"value": None, "expires_at": 0.0})


def _with_creds(monkeypatch):
    monkeypatch.setenv("REDDIT_CLIENT_ID", "id")
    monkeypatch.setenv("REDDIT_CLIENT_SECRET", "secret")


@pytest.mark.unit
class TestRedditOAuth:
    def test_no_creds_returns_no_token(self):
        assert reddit._oauth_token(5.0) is None

    def test_oauth_used_and_restores_scores(self, monkeypatch):
        _with_creds(monkeypatch)
        token_json = b'{"access_token": "T", "expires_in": 3600}'
        search_json = (
            b'{"data": {"children": [{"data": {"title": "GOOG to moon",'
            b' "score": 400, "num_comments": 200, "created_utc": 1700000000,'
            b' "selftext": "dd"}}]}}'
        )

        def fake_urlopen(req, timeout=None):
            if "access_token" in req.full_url:
                return _Resp(token_json)
            assert req.full_url.startswith("https://oauth.reddit.com/")
            return _Resp(search_json)

        monkeypatch.setattr(reddit, "urlopen", fake_urlopen)

        def no_rss(*a, **k):
            raise AssertionError("RSS must not be used when OAuth succeeds")

        monkeypatch.setattr(reddit, "_fetch_subreddit_rss", no_rss)

        out = reddit.fetch_reddit_posts(
            "GOOG", subreddits=("stocks",), inter_request_delay=0
        )
        assert "GOOG to moon" in out
        assert "400↑" in out  # authed JSON restores score/comment counts

    def test_token_fetched_once_across_subreddits(self, monkeypatch):
        _with_creds(monkeypatch)
        counts = {"token": 0, "search": 0}

        def fake_urlopen(req, timeout=None):
            if "access_token" in req.full_url:
                counts["token"] += 1
                return _Resp(b'{"access_token": "T", "expires_in": 3600}')
            counts["search"] += 1
            return _Resp(b'{"data": {"children": []}}')

        monkeypatch.setattr(reddit, "urlopen", fake_urlopen)
        monkeypatch.setattr(reddit, "_fetch_subreddit_rss", lambda *a, **k: [])

        reddit.fetch_reddit_posts(
            "GOOG",
            subreddits=("stocks", "investing", "wallstreetbets"),
            inter_request_delay=0,
        )
        assert counts["token"] == 1  # cached across subreddits
        assert counts["search"] == 3

    def test_token_failure_falls_back_to_rss(self, monkeypatch):
        _with_creds(monkeypatch)

        def fail(req, timeout=None):
            raise HTTPError("url", 401, "Unauthorized", {}, None)

        monkeypatch.setattr(reddit, "urlopen", fail)

        rss_called = {"n": 0}

        def fake_rss(ticker, sub, limit, timeout):
            rss_called["n"] += 1
            return [{
                "title": "x", "source": "rss", "score": None,
                "num_comments": None, "created_utc": None, "selftext": "",
            }]

        monkeypatch.setattr(reddit, "_fetch_subreddit_rss", fake_rss)

        out = reddit.fetch_reddit_posts(
            "GOOG", subreddits=("stocks",), inter_request_delay=0
        )
        assert rss_called["n"] == 1
        assert "via RSS feed" in out

    def test_creds_set_never_probes_unauth_endpoint(self, monkeypatch):
        """With creds, a failed OAuth must go straight to RSS — never the
        WAF-blocked unauthenticated endpoint — so the backoff stays untouched."""
        _with_creds(monkeypatch)

        def fail_token(req, timeout=None):
            raise HTTPError("url", 500, "err", {}, None)

        monkeypatch.setattr(reddit, "urlopen", fail_token)
        monkeypatch.setattr(reddit, "_fetch_subreddit_rss", lambda *a, **k: [])

        reddit.fetch_reddit_posts(
            "GOOG", subreddits=("stocks",), inter_request_delay=0
        )
        assert reddit._load_backoff()["stage"] == 0
