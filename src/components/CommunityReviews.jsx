import { useState, useEffect } from 'react'
import styles from './CommunityReviews.module.css'

export default function CommunityReviews({ mediaId, title, user, profile }) {
  const [reviews, setReviews] = useState([])
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const storageKey = `cs_reviews_${mediaId}`

  useEffect(() => {
    if (!mediaId) return
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        setReviews(JSON.parse(stored))
      } else {
        // Prepopulate with a friendly community review if none yet
        setReviews([
          {
            id: 'sample_1',
            name: 'CinemaLover99',
            rating: 5,
            comment: `Masterpiece! Outstanding visuals and sound design. Definitely watching again on Max Cinema.`,
            date: 'Recently',
          },
        ])
      }
    } catch {
      setReviews([])
    }
  }, [mediaId, storageKey])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!comment.trim()) return

    const newReview = {
      id: Date.now().toString(),
      name: profile?.name || user?.displayName || 'Anonymous Viewer',
      rating,
      comment: comment.trim(),
      date: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    }

    const updated = [newReview, ...reviews]
    setReviews(updated)
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated))
    } catch {}

    setComment('')
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : '5.0'

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3 className={styles.title}>⭐ Community Reviews</h3>
          <span className={styles.avgBadge}>★ {avgRating} / 5</span>
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
        </span>
      </div>

      {/* Review Form */}
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formTitle}>Rate & Review {title || 'this title'}</div>

        <div className={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              className={`${styles.starBtn} ${
                (hoverRating || rating) >= star ? styles.starActive : ''
              }`}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              aria-label={`${star} Stars`}
            >
              ★
            </button>
          ))}
        </div>

        <textarea
          placeholder="Share your thoughts with other cinema fans..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className={styles.textarea}
        />

        <button type="submit" className={styles.submitBtn}>
          {submitted ? 'Review Posted! ✓' : 'Post Review'}
        </button>
      </form>

      {/* Reviews List */}
      <div className={styles.reviewsList}>
        {reviews.length === 0 ? (
          <div className={styles.empty}>Be the first to leave a review!</div>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className={styles.reviewItem}>
              <div className={styles.reviewMeta}>
                <span className={styles.reviewerName}>{r.name}</span>
                <span className={styles.reviewDate}>{r.date}</span>
              </div>
              <div className={styles.reviewStars}>
                {'★'.repeat(r.rating)}
                {'☆'.repeat(5 - r.rating)}
              </div>
              <p className={styles.reviewComment}>{r.comment}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

