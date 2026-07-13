# rate limiting + file content checks, all in-memory
import time
import threading

_lock = threading.Lock()
_buckets = {}  # key -> list of hit timestamps


def rate_limit(key, max_attempts, window_seconds):
    # sliding window counter; True = allowed, False = over the limit
    now = time.time()
    with _lock:
        hits = [t for t in _buckets.get(key, []) if now - t < window_seconds]
        if len(hits) >= max_attempts:
            _buckets[key] = hits
            return False
        hits.append(now)
        _buckets[key] = hits
        # keep the table from growing forever
        if len(_buckets) > 10000:
            stale = [k for k, v in _buckets.items() if not v or now - v[-1] > window_seconds]
            for k in stale:
                _buckets.pop(k, None)
        return True


def client_ip(request):
    return request.remote_addr or 'unknown'


def looks_like_image(file_storage):
    # magic-byte check so renamed non-images get rejected
    try:
        header = file_storage.stream.read(12)
        file_storage.stream.seek(0)
    except Exception:
        return False
    if len(header) < 12:
        return False
    if header[:3] == b'\xff\xd8\xff':                                  # jpeg
        return True
    if header[:8] == b'\x89PNG\r\n\x1a\n':                             # png
        return True
    if header[:4] == b'RIFF' and header[8:12] == b'WEBP':              # webp
        return True
    return False
