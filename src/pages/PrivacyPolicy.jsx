import styles from './LegalPage.module.css'

export default function PrivacyPolicy({ onBack, onOpenPrivacyChoices }) {
  return (
    <article className={styles.page}>
      <button type="button" className={styles.back} onClick={onBack}>← Back to Max Cinema</button>
      <p className={styles.eyebrow}>Max Cinema</p>
      <h1 className={styles.title}>Privacy Policy</h1>
      <p className={styles.updated}>Last updated: September 17, 2026</p>
      <p className={styles.intro}>
        Max Cinema helps you discover films and television series, save titles to a personal list, and track viewing progress. This policy explains the information the app uses and the choices available to you.
      </p>

      <section className={styles.section}>
        <h2>Browser data and cloud sync</h2>
        <p>Max Cinema stores the following information in your browser so its personal features work:</p>
        <ul>
          <li>the profile name you choose;</li>
          <li>Need Watch titles, favorites, ratings, private notes, and custom collections;</li>
          <li>movie and episode progress, watched status, and recently viewed titles; and</li>
          <li>display preferences such as your theme selection.</li>
        </ul>
        <p>When you use Max Cinema as a guest, this data remains in your browser unless you export it or clear browser data. If you choose to sign in with Google or an email/password account, the listed watchlist and viewing data are stored in Firebase Realtime Database under your account so they can be restored on another device.</p>
        <p>Firebase Authentication processes your sign-in details and Firebase Realtime Database processes your synced profile data. Google&apos;s privacy practices apply to those services.</p>
      </section>

      <section className={styles.section}>
        <h2>Film and television information</h2>
        <p>Max Cinema requests catalogue information, artwork, cast details, and provider availability from The Movie Database (TMDB) through its own same-origin service. TMDB may process technical information such as your IP address under its own privacy practices. Max Cinema is not endorsed by or affiliated with TMDB.</p>
      </section>

      <section className={styles.section}>
        <h2>Trailers and playback</h2>
        <p>When you choose a trailer, it is played through YouTube&apos;s privacy-enhanced domain. Playback and provider links may open or embed a third-party, licensed service. Those services have their own policies and may collect information independently of Max Cinema.</p>
      </section>

      <section className={styles.section}>
        <h2>Advertising and consent choices</h2>
        <p>Max Cinema loads Google AdSense to show advertising where it is enabled. Google and its advertising partners may use cookies or similar technologies for ad delivery, measurement, frequency capping, fraud prevention, and—where permitted—personalised advertising.</p>
        <p>Where a Google consent message is available, you can review or change your privacy choices below. The option is supplied by Google after the site owner publishes the consent message in AdSense.</p>
        <button type="button" className={styles.choiceButton} onClick={onOpenPrivacyChoices}>Manage privacy &amp; cookie choices</button>
      </section>

      <section className={styles.section}>
        <h2>Sharing and selling</h2>
        <p>Max Cinema does not sell the browser-stored or Firebase-synced profile data described above. Information processed by third-party services, including Firebase, Google, YouTube, TMDB, Netlify, and any playback provider, is governed by the applicable third party&apos;s own terms and privacy policy.</p>
      </section>

      <section className={styles.section}>
        <h2>Changes to this policy</h2>
        <p>This policy may change when Max Cinema features or service providers change. The current version and its effective date will always appear on this page.</p>
      </section>

      <p className={styles.note}>Site owner note: review this policy before publishing and update it with a real support contact and any services, data collection, or regional rights that apply to your site.</p>
    </article>
  )
}
