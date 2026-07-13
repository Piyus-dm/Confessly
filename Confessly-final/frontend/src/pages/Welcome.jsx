import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import '../styles/global.css';
import '../styles/login.css';

export default function Welcome() {
    return (
        <div className="welcome-view">
            <main className="welcome-container">
                {/* Logo lockup (contains the wordmark) */}
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
        </div>
    );
}
