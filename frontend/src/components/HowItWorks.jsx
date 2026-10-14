const STEPS = [
  {
    title: "Upload",
    body: "Drag your resume PDF onto the page or pick it from your files.",
  },
  {
    title: "Scan",
    body: "We pull the text out and match it against the skills employers ask for.",
  },
  {
    title: "Fix",
    body: "You get a score, what you already have, and the gaps worth closing.",
  },
];

export default function HowItWorks() {
  return (
    <section className="section" id="how">
      <div className="wrap">
        <h2 className="section__title">Three steps, no signup</h2>
        <ol className="how">
          {STEPS.map((step, i) => (
            <li className="how__item" key={step.title}>
              <span className="how__num">{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
