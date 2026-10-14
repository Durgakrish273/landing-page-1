const FEATURES = [
  {
    title: "A score you can track",
    body: "One number out of 100, so you can measure a rewrite instead of guessing.",
  },
  {
    title: "Skills you already have",
    body: "Every keyword we matched, so you know what is landing with the parser.",
  },
  {
    title: "Skills you are missing",
    body: "The gaps that show up most in the roles you are going after.",
  },
];

export default function Features() {
  return (
    <section className="section section--alt" id="features">
      <div className="wrap">
        <h2 className="section__title">What you get back</h2>
        <div className="grid">
          {FEATURES.map((feature) => (
            <article className="feature" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
