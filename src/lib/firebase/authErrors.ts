/**
 * Maps Firebase Auth error codes to friendly, actionable messages.
 * Firebase v9+ consolidates user-not-found + wrong-password into
 * auth/invalid-credential for security (prevents user enumeration).
 */
export function friendlyAuthError(err: any): string {
  const code: string = err?.code ?? ''

  const MAP: Record<string, string> = {
    'auth/invalid-credential':        'Incorrect email or password. Please try again.',
    'auth/user-not-found':            'No account found with this email. Sign up first?',
    'auth/wrong-password':            'Incorrect password. Please try again.',
    'auth/email-already-in-use':      'An account with this email already exists. Try signing in.',
    'auth/weak-password':             'Password must be at least 6 characters.',
    'auth/invalid-email':             'Please enter a valid email address.',
    'auth/user-disabled':             'This account has been disabled. Contact support.',
    'auth/too-many-requests':         'Too many failed attempts. Please wait a moment and try again.',
    'auth/network-request-failed':    'Network error. Check your internet connection.',
    'auth/popup-blocked':             'Popup blocked by browser — redirecting you instead.',
    'auth/popup-closed-by-user':      'Sign-in popup was closed. Please try again.',
    'auth/cancelled-popup-request':   'Sign-in was cancelled. Please try again.',
    'auth/requires-recent-login':     'Please sign in again to complete this action.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email. Try a different sign-in method.',
  }

  return MAP[code] ?? (err?.message?.replace('Firebase: ', '')?.replace(/\s*\(auth\/[^)]+\)\.?/, '') || 'Something went wrong. Please try again.')
}
