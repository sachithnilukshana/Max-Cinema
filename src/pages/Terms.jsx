import styles from './LegalPage.module.css'

export default function Terms({ onBack }) {
  return (
    <article className={styles.page}>
      <button type="button" className={styles.back} onClick={onBack}>← Back to Max Cinema</button>
      <p className={styles.eyebrow}>Max Cinema</p>
      <h1 className={styles.title}>Terms of Use</h1>
      <p className={styles.updated}>Last updated: September 17, 2026</p>
      <p className={styles.intro}>By using Max Cinema, you agree to use the service responsibly and in accordance with these terms.</p>

      <section className={styles.section}>
        <h2>What Max Cinema provides</h2>
        <p>Max Cinema is a discovery and personal watchlist tool. It provides title information, personal tracking tools, trailer links, and links to or embeds from third-party content providers. Availability, metadata, ratings, and provider details can change and are not guaranteed.</p>
      </section>

      <section className={styles.section}>
        <h2>Personal use</h2>
        <p>Use Max Cinema for lawful, personal purposes. Do not attempt to interfere with the site, bypass access controls, scrape the service excessively, or use it in a way that harms the site, its providers, or other users.</p>
      </section>

      <section className={styles.section}>
        <h2>Third-party services and content</h2>
        <p>TMDB data, YouTube trailers, advertising, and playback/provider services are operated by third parties. Their content, availability, and policies are their responsibility. You must follow the terms of any service you choose to access.</p>
      </section>

      <section className={styles.section}>
        <h2>Content rights</h2>
        <p>Max Cinema does not claim ownership of movie or television titles, posters, trailers, trademarks, or other third-party content. Copyright and other rights remain with their respective owners. Max Cinema must only link to or embed playback services that are licensed to distribute the relevant content.</p>
      </section>

      <section className={styles.section}>
        <h2>Service availability</h2>
        <p>Max Cinema is provided as available. Features may be changed, paused, or removed without notice. To the maximum extent permitted by law, Max Cinema is not responsible for losses arising from unavailable or inaccurate third-party information or services.</p>
      </section>

      <section className={styles.section}>
        <h2>Changes to these terms</h2>
        <p>These terms may be updated as Max Cinema evolves. Continued use after an update means you accept the revised terms.</p>
      </section>

      <p className={styles.note}>Site owner note: these are a practical starter template, not legal advice. Obtain legal review and add a real support contact before public launch.</p>
    </article>
  )
}
