/**
 * CategoryTag — dynamic pill tag for confession categories.
 * Accepts any string from the backend (e.g. "College Life", "Relationships").
 * Pure dark glassmorphism style, zero emojis.
 */
export default function CategoryTag({ name }) {
    if (!name) return null;
    return (
        <span className="cat-tag" aria-label={`Category: ${name}`}>
            {name}
        </span>
    );
}
