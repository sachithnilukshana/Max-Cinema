import { useState, useEffect, useRef } from 'react'
import { db } from '../lib/firebase.js'
import { ref, set, get, onValue } from 'firebase/database'
import { movieEmbedUrl, tvEmbedUrl } from '../lib/api.js'
import { usePremium } from '../lib/PremiumContext.jsx'
import styles from './WatchParty.module.css'

const EMOJIS = ['❤️', '😂', '😱', '👏', '🔥', '🍿']

export default function WatchParty({ user, profile, onBack }) {
  const { isPremium } = usePremium()
  const [roomCode, setRoomCode] = useState('')
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [currentRoom, setCurrentRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [chatText, setChatText] = useState('')
  const [floatingEmojis, setFloatingEmojis] = useState([])
  const [copied, setCopied] = useState(false)
  
  // Custom movie input for room creation
  const [customTmdbId, setCustomTmdbId] = useState('')
  const [customTitle, setCustomTitle] = useState('')

  const chatEndRef = useRef(null)
  const broadcastRef = useRef(null)

  // Listen for room code in URL query (?room=XYZ)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('room')
    if (code) {
      joinRoom(code.toUpperCase())
    }
  }, [])

  // Setup BroadcastChannel fallback
  useEffect(() => {
    if (!roomCode) return
    const channelName = `mc_party_${roomCode}`
    const bc = new BroadcastChannel(channelName)
    broadcastRef.current = bc

    bc.onmessage = (event) => {
      const { type, payload } = event.data || {}
      if (type === 'chat') {
        setMessages((prev) => [...prev, payload])
      } else if (type === 'emoji') {
        triggerEmoji(payload.emoji)
      } else if (type === 'syncRoom') {
        setCurrentRoom(payload)
      }
    }

    return () => {
      bc.close()
    }
  }, [roomCode])

  // Setup Firebase RTDB listeners if db is available
  useEffect(() => {
    if (!roomCode || !db) return
    try {
      const roomRef = ref(db, `rooms/${roomCode}`)
      const unsubscribe = onValue(roomRef, (snapshot) => {
        const val = snapshot.val()
        if (val) {
          setCurrentRoom(val)
          if (val.chat) {
            setMessages(Object.values(val.chat))
          }
        }
      })
      return () => unsubscribe()
    } catch (e) {
      console.warn('Firebase RTDB room listener error:', e)
    }
  }, [roomCode])

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const triggerEmoji = (emoji) => {
    const id = Date.now() + Math.random()
    const leftPercent = Math.floor(Math.random() * 80) + 10
    setFloatingEmojis((prev) => [...prev, { id, emoji, left: leftPercent }])
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== id))
    }, 2400)
  }

  const handleSendEmoji = (emoji) => {
    triggerEmoji(emoji)
    if (broadcastRef.current) {
      broadcastRef.current.postMessage({ type: 'emoji', payload: { emoji } })
    }
    if (db && roomCode) {
      try {
        const emojiRef = ref(db, `rooms/${roomCode}/reactions/${Date.now()}`)
        set(emojiRef, { emoji, uid: user?.uid || 'guest' })
      } catch {}
    }
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!chatText.trim()) return

    const newMsg = {
      id: Date.now().toString(),
      sender: profile?.name || user?.displayName || 'Cinephile',
      text: chatText.trim(),
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, newMsg])
    setChatText('')

    if (broadcastRef.current) {
      broadcastRef.current.postMessage({ type: 'chat', payload: newMsg })
    }

    if (db && roomCode) {
      try {
        const msgRef = ref(db, `rooms/${roomCode}/chat/${newMsg.id}`)
        set(msgRef, newMsg)
      } catch {}
    }
  }

  const createRoom = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const tmdbId = customTmdbId.trim() || '550' // Default Fight Club if empty
    const title = customTitle.trim() || 'Watch Party Room'
    const embedUrl = movieEmbedUrl(tmdbId, isPremium)

    const roomData = {
      code,
      title,
      tmdbId,
      embedUrl,
      hostUid: user?.uid || 'guest',
      createdAt: Date.now(),
      membersCount: 1,
    }

    setCurrentRoom(roomData)
    setRoomCode(code)

    if (db) {
      try {
        const roomRef = ref(db, `rooms/${code}`)
        set(roomRef, roomData)
      } catch {}
    }

    // Update URL without reload
    window.history.pushState({}, '', `?room=${code}`)
  }

  const joinRoom = (code) => {
    const clean = code.trim().toUpperCase()
    if (!clean) return

    setRoomCode(clean)
    // Fallback room data
    const fallback = {
      code: clean,
      title: 'Synchronized Cinema Room',
      tmdbId: '550',
      embedUrl: movieEmbedUrl('550', isPremium),
      membersCount: 2,
    }
    setCurrentRoom(fallback)

    if (db) {
      try {
        const roomRef = ref(db, `rooms/${clean}`)
        get(roomRef).then((snap) => {
          if (snap.exists()) {
            setCurrentRoom(snap.val())
          }
        })
      } catch {}
    }

    window.history.pushState({}, '', `?room=${clean}`)
  }

  const leaveRoom = () => {
    setRoomCode('')
    setCurrentRoom(null)
    setMessages([])
    window.history.pushState({}, '', window.location.pathname)
  }

  const copyShareLink = () => {
    const url = `${window.location.origin}/party?room=${roomCode}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Render Lobby ──
  if (!roomCode || !currentRoom) {
    return (
      <div className={styles.page}>
        <div className={styles.lobby}>
          <span className={styles.lobbyIcon}>🍿</span>
          <h1 className={styles.lobbyTitle}>Max Cinema Watch Party</h1>
          <p className={styles.lobbySub}>
            Watch movies and TV series together with friends in real-time, react with live emojis, and chat side-by-side!
          </p>

          <div className={styles.lobbyCard}>
            <div className={styles.cardTitle}>
              <span>✨</span> Create a New Party
            </div>
            <div className={styles.inputGroup}>
              <input
                type="text"
                placeholder="Movie Title or Room Name (e.g. Inception Night)"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className={styles.input}
              />
            </div>
            <div className={styles.inputGroup}>
              <input
                type="text"
                placeholder="IMDb / TMDB ID (e.g. 550, 157336, tt1375666)"
                value={customTmdbId}
                onChange={(e) => setCustomTmdbId(e.target.value)}
                className={styles.input}
              />
              <button onClick={createRoom} className={styles.btnPrimary}>
                Create Party
              </button>
            </div>
          </div>

          <div className={styles.lobbyCard}>
            <div className={styles.cardTitle}>
              <span>🔑</span> Join an Existing Party
            </div>
            <div className={styles.inputGroup}>
              <input
                type="text"
                placeholder="Enter 6-letter Room Code"
                value={joinCodeInput}
                maxLength={6}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                className={styles.input}
              />
              <button
                onClick={() => joinRoom(joinCodeInput)}
                className={styles.btnPrimary}
                disabled={!joinCodeInput.trim()}
              >
                Join Room
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Render Active Room ──
  return (
    <div className={styles.page}>
      <div className={styles.roomContainer}>
        {/* Left: Player Area */}
        <div className={styles.playerArea}>
          <div className={styles.headerBar}>
            <div className={styles.roomInfo}>
              <span className={styles.roomCodeBadge}>ROOM: {roomCode}</span>
              <span className={styles.roomTitle}>{currentRoom.title}</span>
            </div>
            <div className={styles.headerActions}>
              <button onClick={copyShareLink} className={styles.btnSecondary}>
                {copied ? 'Link Copied! ✓' : '🔗 Share Party'}
              </button>
              <button onClick={leaveRoom} className={styles.btnSecondary}>
                Leave
              </button>
            </div>
          </div>

          <div className={styles.iframeWrapper}>
            <iframe
              src={currentRoom.embedUrl}
              title={currentRoom.title}
              className={styles.iframe}
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture"
            />
            {/* Floating emojis overlay */}
            <div className={styles.reactionsOverlay}>
              {floatingEmojis.map((item) => (
                <div
                  key={item.id}
                  className={styles.floatingEmoji}
                  style={{ left: `${item.left}%` }}
                >
                  {item.emoji}
                </div>
              ))}
            </div>
          </div>

          {/* Reaction Emoji Bar */}
          <div className={styles.reactionBar}>
            <span className={styles.reactionLabel}>Live Reactions:</span>
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                className={styles.emojiBtn}
                onClick={() => handleSendEmoji(emoji)}
                aria-label={`React ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Live Chat Sidebar */}
        <div className={styles.chatSidebar}>
          <div className={styles.chatHeader}>
            <span>💬 Live Chat</span>
            <span className={styles.memberCount}>Watch Party</span>
          </div>

          <div className={styles.messagesList}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, marginTop: 40 }}>
                Say hello to everyone in the room! 👋
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={styles.message}>
                  <span className={styles.msgAuthor}>{m.sender}</span>
                  <span className={styles.msgText}>{m.text}</span>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className={styles.chatInputRow}>
            <input
              type="text"
              placeholder="Type a message..."
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              className={styles.chatInput}
            />
            <button type="submit" className={styles.chatSendBtn}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
