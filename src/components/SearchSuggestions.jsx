import React, { useEffect, useRef, useState } from 'react'
import { api, getYear, posterUrl } from '../lib/api.js'
import styles from './SearchSuggestions.module.css'

export default function SearchSuggestions({ query, type, onSelect }) {
  const [items, setItems] = useState([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [open, setOpen] = useState(false)
  const listId = useRef(`search-suggestions-${Math.random().toString(36).slice(2)}`).current

  useEffect(() => {
    const term = query.trim()
    let active = true
    setActiveIndex(-1)
    if (term.length < 2) {
      setItems([])
      setOpen(false)
      return undefined
    }
    const timer = window.setTimeout(() => {
      const request = type === 'tv' ? api.searchTV(term) : api.searchMovies(term)
      request.then(data => {
        if (!active) return
        setItems((data.results || []).slice(0, 6))
        setOpen(true)
      }).catch(() => {
        if (!active) return
        setItems([])
        setOpen(false)
      })
    }, 260)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [query, type])

  useEffect(() => {
    if (!open || !items.length) return undefined
    const handleKeyDown = event => onKeyDown(event)
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, items, activeIndex])

  function choose(item) {
    setOpen(false)
    onSelect(item)
  }

  function onKeyDown(event) {
    if (!open || !items.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex(index => (index + 1) % items.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(index => (index <= 0 ? items.length - 1 : index - 1))
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      choose(items[activeIndex])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className={styles.wrap}>
      {open && !!items.length && (
        <div id={listId} className={styles.list} role="listbox" aria-label="Search suggestions">
          {items.map((item, index) => {
            const title = type === 'tv' ? item.name : item.title
            const date = type === 'tv' ? item.first_air_date : item.release_date
            return (
              <button key={item.id} type="button" role="option" aria-selected={activeIndex === index} className={activeIndex === index ? styles.active : ''} onMouseDown={event => event.preventDefault()} onClick={() => choose(item)}>
                {item.poster_path ? <img src={posterUrl(item.poster_path)} alt="" decoding="async" draggable="false" /> : <span className={styles.posterFallback}>✦</span>}
                <span><b>{title}</b><small>{getYear(date) || 'Coming soon'} · {type === 'tv' ? 'TV series' : 'Movie'}</small></span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
