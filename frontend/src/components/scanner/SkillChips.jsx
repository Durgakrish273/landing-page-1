/* `tone` picks the colour class, `empty` is what to say when the list is bare. */
export default function SkillChips({ title, tone, skills, empty }) {
  return (
    <section className="skills__col">
      <h3 className="skills__title">
        {title}{" "}
        <span className={`badge badge--${tone === "good" ? "good" : "bad"}`}>
          {skills.length}
        </span>
      </h3>
      <ul className={`chips chips--${tone}`}>
        {skills.length === 0 ? (
          <li className="is-empty">{empty}</li>
        ) : (
          skills.map((skill) => <li key={skill}>{skill}</li>)
        )}
      </ul>
    </section>
  );
}
