import React from 'react'
import styles from './LegalPage.module.css'

export default function About({ onBack }) {
  return (
    <article className={styles.page}>
      <button type="button" className={styles.back} onClick={onBack}>← Back to Max Cinema</button>
      <p className={styles.eyebrow}>Max Cinema</p>
      <h1 className={styles.title}>About Max Cinema & Contact</h1>
      <p className={styles.updated}>Last updated: October 15, 2026 · Editorial Team</p>
      <p className={styles.intro}>
        Max Cinema is an advanced digital entertainment discovery platform engineered to make finding, tracking, and enjoying world-class movies and television series effortless, fast, and accessible everywhere.
      </p>

      <section className={styles.section}>
        <h2>Our Mission</h2>
        <p>
          We believe in democratizing digital entertainment. By connecting cinematic databases with blazing-fast responsive streaming discovery, Max Cinema gives viewers across the globe a clean, ad-light destination to organize their watchlists, view detailed ratings and cast credits, and stream trending entertainment in high definition.
        </p>
      </section>

      <section className={styles.section}>
        <h2>Curated Selection & Data Integrity</h2>
        <p>
          Our catalog highlights the top 24 trending movies and top 24 TV series each week, sourced directly from verified community databases including The Movie Database (TMDB). Every title features authenticated plot synopses, user ratings, release metadata, and direct playback capabilities.
        </p>
      </section>

      <section className={styles.section}>
        <h2>VIP Membership & Support</h2>
        <p>
          Max Cinema offers an optional VIP membership supporting zero ad interruptions, ultra-high-definition streaming, and priority server routing. Payments are securely processed through verified regional integrations including Cash Scan Connect Virtual Cards and PayHere.
        </p>
      </section>

      <section className={styles.section}>
        <h2>Contact & Community</h2>
        <p>
          Have questions, suggestions, or need content support? Reach out to our team directly:
        </p>
        <ul style={{ color: 'var(--text-muted)', lineHeight: '1.8', margin: '0.8rem 0 1rem 1.5rem' }}>
          <li><strong>Telegram Support:</strong> <a href="https://t.me/maxcinemabot_bot" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>@maxcinemabot_bot</a></li>
          <li><strong>GitHub Repository:</strong> <a href="https://github.com/sachithnilukshana/Max-Cinema" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>sachithnilukshana/Max-Cinema</a></li>
          <li><strong>Official Bot:</strong> <a href="https://t.me/maxcinemabot_bot" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>Max Cinema Telegram Bot</a></li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>Editorial & Content Standards</h2>
        <p>
          Max Cinema does not host unauthorized media files on its servers. All streaming playback is provided through licensed third-party embed providers and public APIs. If you believe any link infringes upon copyright, use our Content Report feature or contact our Telegram bot for prompt review and resolution.
        </p>
      </section>
    </article>
  )
}

