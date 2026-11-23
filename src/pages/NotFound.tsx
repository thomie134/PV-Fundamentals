import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="page page--narrow">
      <header className="page-header">
        <span className="eyebrow">404</span>
        <h1>Page not found</h1>
        <p className="lede">This page doesn’t exist (yet). Weeks appear here as soon as their content folder is added.</p>
      </header>
      <Link to="/" className="btn btn--primary">
        Back to the overview
      </Link>
    </div>
  );
}
