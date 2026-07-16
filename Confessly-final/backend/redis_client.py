import redis

from config import REDIS_URL

_client = None


def get_redis():
    global _client
    if _client is None:
        _client = redis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=1,
            socket_timeout=1,
        )
    return _client


VIEW_KEY_PREFIX = 'post:views:'
PENDING_VIEWS_SET = 'posts:pending_views'


def queue_post_views(post_ids):
    client = get_redis()
    pipe = client.pipeline()
    for post_id in post_ids:
        pipe.incr(f'{VIEW_KEY_PREFIX}{post_id}')
        pipe.sadd(PENDING_VIEWS_SET, post_id)
    pipe.execute()


def pop_pending_view_counts():
    client = get_redis()
    post_ids = client.smembers(PENDING_VIEWS_SET)
    if not post_ids:
        return {}

    pipe = client.pipeline()
    for post_id in post_ids:
        pipe.get(f'{VIEW_KEY_PREFIX}{post_id}')
    counts = pipe.execute()

    result = {}
    cleanup = client.pipeline()
    for post_id, count in zip(post_ids, counts):
        if count and int(count) > 0:
            result[int(post_id)] = int(count)
        cleanup.delete(f'{VIEW_KEY_PREFIX}{post_id}')
        cleanup.srem(PENDING_VIEWS_SET, post_id)
    cleanup.execute()

    return result
