'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

// Mention is stored as @Name\u2060 (word-joiner — invisible, acts as terminator)
const TERM = '\u2060'

export function CommentBody({ text, className }) {
  // Match @anything up to the invisible terminator
  const parts = text.split(new RegExp(`(@[^@${TERM}]+${TERM})`, 'g'))
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.startsWith('@') && part.endsWith(TERM) ? (
          <span key={i} className="text-amber-400 font-semibold">
            {part.slice(0, -1) /* strip terminator for display */}
          </span>
        ) : part
      )}
    </span>
  )
}

export function MentionTextarea({
  value, onChange, placeholder, rows = 3,
  className, containerClassName, onKeyDown,
  canMention = true,   // pass false for agents
}) {
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionOpen, setMentionOpen]   = useState(false)
  const [dropdownPos, setDropdownPos]   = useState({ top: 0, left: 0 })
  const [users, setUsers]               = useState([])
  const [selectedIdx, setSelectedIdx]   = useState(0)
  const [mounted, setMounted]           = useState(false)
  const textareaRef = useRef(null)
  const atPosRef    = useRef(-1)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (canMention) {
      fetch('/api/users').then(r => r.json()).then(j => setUsers(j.data ?? []))
    }
  }, [canMention])

  const filtered = users.filter(u => {
    const name = (u.full_name || u.email || '').toLowerCase()
    return mentionQuery ? name.includes(mentionQuery.toLowerCase()) : true
  }).slice(0, 6)

  function handleChange(e) {
    onChange(e)
    if (!canMention) return

    const val    = e.target.value
    const cursor = e.target.selectionStart
    const textBefore = val.slice(0, cursor)
    const atMatch    = textBefore.match(/@([\w\s]*)$/)

    if (atMatch) {
      atPosRef.current = cursor - atMatch[0].length
      setMentionQuery(atMatch[1])
      setSelectedIdx(0)
      const rect = textareaRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 4, left: rect.left + 12 })
      setMentionOpen(true)
    } else {
      setMentionOpen(false)
      atPosRef.current = -1
    }
  }

  function insertMention(user) {
    const name   = user.full_name || user.email
    // Store as @Name + invisible word-joiner + space — looks clean in textarea
    const token  = `@${name}${TERM} `
    const before = value.slice(0, atPosRef.current)
    const after  = value.slice(textareaRef.current.selectionStart)
    const newVal = `${before}${token}${after}`

    const nativeInput = textareaRef.current
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
    setter.call(nativeInput, newVal)
    nativeInput.dispatchEvent(new Event('input', { bubbles: true }))
    setMentionOpen(false)
    atPosRef.current = -1

    const pos = before.length + token.length
    setTimeout(() => nativeInput.setSelectionRange(pos, pos), 0)
  }

  function handleKeyDown(e) {
    if (canMention && mentionOpen && filtered.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(filtered[selectedIdx]); return }
      if (e.key === 'Escape')    { setMentionOpen(false); return }
    }
    onKeyDown?.(e)
  }

  const dropdown = canMention && mentionOpen && filtered.length > 0 && mounted && createPortal(
    <div
      style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999 }}
      className="bg-popover border border-border rounded-lg shadow-xl overflow-hidden min-w-[200px]"
    >
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-2 pb-1">
        Mention
      </p>
      {filtered.map((user, i) => {
        const initials = user.full_name
          ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
          : (user.email?.[0] ?? '?').toUpperCase()
        return (
          <button
            key={user.id}
            onMouseDown={e => { e.preventDefault(); insertMention(user) }}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors cursor-pointer',
              i === selectedIdx ? 'bg-accent text-foreground' : 'hover:bg-accent'
            )}
          >
            <span className="size-6 rounded-md bg-amber-500/15 text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0">
              {initials}
            </span>
            <div className="text-left min-w-0">
              <p className="text-xs font-medium truncate">{user.full_name || user.email}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{user.role}</p>
            </div>
          </button>
        )
      })}
    </div>,
    document.body
  )

  return (
    <div className={cn('relative w-full', containerClassName)}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setMentionOpen(false), 150)}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none',
          className
        )}
      />
      {dropdown}
    </div>
  )
}
