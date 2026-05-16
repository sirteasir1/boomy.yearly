'use client'
import { useStore } from '@/lib/store/useStore'
import { t, type TKey } from '@/lib/i18n/translations'

/** Hook — returns a bound t() for the current language */
export function useLang() {
  const { lang } = useStore()
  return (key: TKey) => t(lang, key)
}
