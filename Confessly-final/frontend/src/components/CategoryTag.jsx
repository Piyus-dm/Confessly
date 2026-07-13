export default function CategoryTag({ name }) {
    if (!name) return null;
    return (
        <span className="cat-tag" aria-label={`Category: ${name}`}>
            {name}
        </span>
    );
}
