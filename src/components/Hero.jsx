export default function Hero() {
  return (
    <section className="hero">
      <div className="wrap hero__inner">
        <p className="eyebrow">Resume parser · mock preview</p>
        <h1>
          Find out why your resume
          <br />
          gets filtered out.
        </h1>
        <p className="lede">
          Drop in a PDF and get a score out of 100, the skills we picked up, and
          the ones the job market expects but your resume is missing.
        </p>
        <div className="hero__actions">
          <a className="btn btn--primary" href="#scan">Upload a resume</a>
          <a className="btn btn--ghost" href="#how">See how it works</a>
        </div>
      </div>
    </section>
  );
}
