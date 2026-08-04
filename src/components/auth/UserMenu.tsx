// components/auth/UserMenu.tsx
// User avatar + dropdown menu (profile, settings, logout).
// Replaces the inline DropdownMenu in Topbar for cleaner separation.

"use client"

import { useRouter } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { LogOut, User as UserIcon, Settings, ChevronDown } from "lucide-react"
import { useAuthStore } from "@/stores/authStore"
import { useUIStore } from "@/stores/uiStore"

export function UserMenu({ user }: { user: any }) {
  const router = useRouter()
  const { logout } = useAuthStore()
  const { addToast } = useUIStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
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
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex items-center gap-2 px-20 h-9 rounded-md text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] transition-colors"
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

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-lg bg-[var(--color-surface-1)] shadow-[var(--shadow-elevated)] border border-[var(--color-border-subtle)] overflow-hidden animate-[slideUp_200ms_var(--ease-out-expo)]"
          style={{ animation: "slideUp 150ms ease-out" }}
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
        </div>
      )}
    </div>
  )
}
