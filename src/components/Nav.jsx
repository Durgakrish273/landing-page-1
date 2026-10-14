export default function Nav() {
  return (
    <header className="nav">
      <div className="wrap nav__inner">
        <a className="brand" href="#top">
          <span className="brand__mark" aria-hidden="true">E2</span>
          <span className="brand__name">E2Shipped</span>
        </a>
        <nav className="nav__links" aria-label="Main">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a className="btn btn--sm btn--primary" href="#scan">Scan my resume</a>
        </nav>
      </div>
    </header>
  );
}
