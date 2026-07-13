// confessly branding, self-hosted.
// the artwork ships black-on-transparent; we recolour it to white so it reads
// on the dark theme. Logo = full lockup (mark + "Confessly" wordmark),
// LogoMark = just the circular C, for tight square slots.
import lockupSrc from '../assets/confessly-logo.png';
import markSrc from '../assets/confessly-mark.png';

// the lockup is ~3.1:1, so size it by HEIGHT and let width follow
export default function Logo({ height = 26, className = '' }) {
    return (
        <img
            src={lockupSrc}
            alt="Confessly"
            className={`cf-logo-img ${className}`.trim()}
            style={{ height, width: 'auto' }}
            draggable="false"
        />
    );
}

export function LogoMark({ size = 26, className = '' }) {
    return (
        <img
            src={markSrc}
            alt=""
            aria-hidden="true"
            className={`cf-logo-mark ${className}`.trim()}
            style={{ width: size, height: size }}
            draggable="false"
        />
    );
}
