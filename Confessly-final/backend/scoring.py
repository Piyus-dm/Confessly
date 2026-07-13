"""
scoring.py — Hacker News-style Time-Decay Trending Score

Formula implemented:
    Score = (Total_Likes + (Total_Comments * 3)) / ((Age_In_Hours + 2) ^ 1.5)

This utility is used by both the hourly cron job (for bulk recalculation)
and as a fallback inline in API queries.
"""

from datetime import datetime, timezone
from math import pow


def calculate_trending_score(likes_count: int, comments_count: int, created_at_str: str | None) -> float:
    """
    Calculate the trending score for a post using the HN time-decay formula.

    Args:
        likes_count:     Total number of likes on the post.
        comments_count:  Total number of comments on the post.
        created_at_str:  The post's creation timestamp in SQLite format
                         ('YYYY-MM-DD HH:MM:SS' or None).

    Returns:
        A non‑negative float score. Higher = more trending.
    """
    age_hours = _get_age_in_hours(created_at_str)

    numerator = likes_count + (comments_count * 3)
    denominator = pow(age_hours + 2.0, 1.5)

    if denominator < 0.001:
        return float(numerator)

    return round(numerator / denominator, 8)


def _get_age_in_hours(created_at_str: str | None) -> float:
    """Return the number of hours since the post was created (UTC)."""
    if not created_at_str:
        return 0.0

    try:
        # SQLite CURRENT_TIMESTAMP stores as 'YYYY-MM-DD HH:MM:SS' in UTC
        created_at = datetime.strptime(created_at_str, '%Y-%m-%d %H:%M:%S').replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        delta = now - created_at
        hours = delta.total_seconds() / 3600.0
        return max(0.0, hours)
    except (ValueError, TypeError):
        return 0.0
