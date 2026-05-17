'use client'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init('phc_xh9qkMnqtWsC5MNA8NeSJ7MsQcw2gF4iH4je6J4YiFZX', {
      api_host: 'https://eu.i.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
    })
  }, [])
  return <PHProvider client={posthog}>{children}</PHProvider>
}
