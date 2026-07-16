import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import '../styles/global.css';
import '../styles/login.css';

const PILLARS = [
    {
        title: 'Completely Anonymous',
        text: "No names, no profiles that give you away, no traces. Say what you've been carrying without worrying who's watching.",
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
        title: 'Real Human Connection',
        text: 'Underneath the anonymity is something honest. Connect through the unfiltered truth, not the highlight reel.',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
        ),
    },
    {
        title: 'A Space to Vent',
        text: "Some days are just heavy. Let it out here, where no one needs your name to understand what you're going through.",
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        ),
    },
    {
        title: 'Untold Stories, Finally Told',
        text: "The things you've never said out loud have a home here — read, felt, and understood by people who get it.",
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
                    <span className="wi-kicker">What is Confessly?</span>
                    <h2 className="wi-headline">A sanctuary for shared secrets.</h2>
                    <p className="wi-lede">
                        Confessly is a safe, anonymous space for human connection — for venting, for
                        confessing, for sharing the stories you've never told anyone. No usernames tied
                        to your real life, no followers who know your face, no fear of judgment. Just you
                        and the truth, out in the open.
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
                        <p className="wi-cta-text">Ready to say what you've been holding in?</p>
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
