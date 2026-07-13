# hacker-news style trending score
# score = (likes + comments*3) / (age_hours + 2)^1.5
from datetime import datetime, timezone
from math import pow


def calculate_trending_score(likes_count: int, comments_count: int, created_at_str: str | None) -> float:
    age_hours = _get_age_in_hours(created_at_str)

    numerator = likes_count + (comments_count * 3)
    denominator = pow(age_hours + 2.0, 1.5)

    if denominator < 0.001:
        return float(numerator)

    return round(numerator / denominator, 8)


def _get_age_in_hours(created_at_str: str | None) -> float:
    # hours since created_at, assumes utc
    if not created_at_str:
        return 0.0

    try:
        created_at = datetime.strptime(created_at_str, '%Y-%m-%d %H:%M:%S').replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        delta = now - created_at
        hours = delta.total_seconds() / 3600.0
        return max(0.0, hours)
    except (ValueError, TypeError):
        return 0.0
