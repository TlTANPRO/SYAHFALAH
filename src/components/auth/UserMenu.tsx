// components/auth/UserMenu.tsx
// User avatar + dropdown menu (profile, settings, logout).
// Replaces the inline DropdownMenu in Topbar for cleaner separation.

"use client"

import { useRouter } from "next/navigation"
import { useState, useRef, useEffect, useLayoutEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import Image from "next/image"
import { LogOut, User as UserIcon, Settings, ChevronDown } from "lucide-react"
import { useAuthStore } from "@/stores/authStore"
import { useUIStore } from "@/stores/uiStore"

// Use isomorphic layout effect to avoid SSR warnings.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

export function UserMenu({ user }: { user: any }) {
  const router = useRouter()
  const { logout } = useAuthStore()
  const { addToast } = useUIStore()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useIsomorphicLayoutEffect(() => {
    setMounted(true)
  }, [])

  // Compute position from trigger button. Position: fixed is used to escape
  // <header>'s overflow-x-hidden + backdrop-blur stacking context (which would
  // otherwise clip the dropdown). We position it via getBoundingClientRect
  // from the trigger so it works at any scroll offset.
  useIsomorphicLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    function update() {
      const rect = triggerRef.current!.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
    update()
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [open])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Node
      if (menuRef.current && menuRef.current.contains(target)) return
      if (triggerRef.current && triggerRef.current.contains(target)) return
      setOpen(false)
    }
    if (open) {
      document.addEventListener("mousedown", onClick)
      return () => document.removeEventListener("mousedown", onClick)
    }
  }, [open])

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {}
    logout()
    addToast({ type: "success", title: "Sampai jumpa" })
    router.push("/login")
  }

  const initials = (user.name || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((s) => !s)}
        className="flex items-center gap-2 px-3 h-9 rounded-md text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] transition-colors"
        aria-label="User menu"
        aria-expanded={open}
      >
        <Image
          src={user.avatarUrl || `/api/avatar?name=${encodeURIComponent(user.name)}`}
          alt={user.name}
          width={36}
          height={36}
          unoptimized
          className="h-9 w-9 rounded-full bg-[var(--color-surface-2)] object-cover ring-1 ring-[var(--color-border-subtle)]"
        />
        <span className="hidden md:inline text-sm font-medium">{user.name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
      </button>

      {mounted && open && pos && createPortal(
        <div
          ref={menuRef}
          // Portal-rendered so it escapes the <header>'s overflow-x-hidden
          // AND its backdrop-blur stacking context (which would otherwise clip
          // fixed-positioned children). Position computed from trigger rect
          // so the dropdown tracks the button at any scroll position.
          className="fixed w-64 rounded-lg bg-[var(--color-surface-1)] shadow-[var(--shadow-elevated)] border border-[var(--color-border-subtle)] overflow-hidden"
          style={{ top: pos.top, right: pos.right, zIndex: 100 }}
        >
          <div className="p-4 border-b border-[var(--color-border-subtle)]">
            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{user.name}</p>
            <p className="text-xs text-[var(--color-text-tertiary)] capitalize mt-0.5">
              {user.role.replace("_", " ")}
            </p>
            {user.position && (
              <p className="text-xs text-[var(--color-text-tertiary)]">{user.position}</p>
            )}
          </div>
          <div className="p-1">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] transition-colors"
            >
              <UserIcon className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <span>Profile</span>
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] transition-colors"
            >
              <Settings className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <span>Settings</span>
            </Link>
          </div>
          <div className="p-1 border-t border-[var(--color-border-subtle)]">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm rounded-md text-[var(--color-danger)] hover:bg-[oklch(0.62_0.22_25_/_0.08)] transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
