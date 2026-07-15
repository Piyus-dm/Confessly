const TOKEN_RE = /(https?:\/\/[^\s]+)|(#[a-zA-Z0-9_]+)/g;

export default function RichText({ text }) {
    if (!text) return null;

    const parts = [];
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = TOKEN_RE.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }
        const [token, url, hashtag] = match;
        if (url) {
            parts.push(
                <a
                    key={key++}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rt-link"
                    onClick={(e) => e.stopPropagation()}
                >
                    {url}
                </a>
            );
        } else if (hashtag) {
            parts.push(
                <span key={key++} className="rt-hashtag">{hashtag}</span>
            );
        }
        lastIndex = TOKEN_RE.lastIndex;
    }
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts;
}
