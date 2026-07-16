import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import '../styles/global.css';
import '../styles/login.css';

const PILLARS = [
    {
        title: 'Truly Anonymous',
        text: 'There is no real name attached to anything you write here. No profile that traces back to you, no history that follows you around. Just your words, exactly as you feel them.',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                <circle cx="10" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        ),
    },
    {
        title: 'People Who Actually Understand',
        text: 'Behind every post is someone who has felt something close to what you are feeling right now. That is where the connection comes from, not from likes or followers.',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
        ),
    },
    {
        title: 'Somewhere To Let It Out',
        text: 'Some days are simply too heavy to carry alone. Come here, say what you need to say, and let some of that weight go.',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        ),
    },
    {
        title: 'Stories That Deserve To Be Heard',
        text: 'The thing you have never told anyone finally has a place to exist, and people who will actually read it and understand.',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
        ),
    },
];

export default function Welcome() {
    return (
        <div className="welcome-view">
            <main className="welcome-hero">
                <div className="welcome-glow" aria-hidden="true" />
                <div className="welcome-logo">
                    <Logo height={54} />
                </div>
                <h1 className="sr-only">Confessly</h1>
                <p className="brand-tagline">Anonymous confessions. No names. Just stories.</p>

                <div className="welcome-actions">
                    <Link to="/login" className="btn-primary">
                        Get Started
                    </Link>
                    <Link to="/register" className="btn-ghost">
                        Create Account
                    </Link>
                </div>
            </main>

            <section className="wi-section">
                <div className="wi-inner">
                    <span className="wi-kicker">What Is Confessly</span>
                    <h2 className="wi-headline">A place to finally say it.</h2>
                    <p className="wi-lede">
                        Everyone is carrying something they have never said out loud. A secret that
                        keeps replaying at night. A confession that never found the right person.
                        A story that felt too heavy to tell anyone who actually knows you. Confessly
                        was built so none of that has to stay locked away anymore.
                    </p>

                    <div className="wi-grid">
                        {PILLARS.map((p) => (
                            <div className="wi-card" key={p.title}>
                                <div className="wi-card-icon">{p.icon}</div>
                                <h3 className="wi-card-title">{p.title}</h3>
                                <p className="wi-card-text">{p.text}</p>
                            </div>
                        ))}
                    </div>

                    <div className="wi-cta">
                        <p className="wi-cta-text">
                            You are not alone in whatever you are carrying. Come tell your story, or come
                            read someone else's and realize you never were.
                        </p>
                        <div className="welcome-actions wi-cta-actions">
                            <Link to="/register" className="btn-primary">
                                Create Account
                            </Link>
                            <Link to="/login" className="btn-ghost">
                                Get Started
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
