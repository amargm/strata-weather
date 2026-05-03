import React, { createContext, useContext } from 'react';

export type AuthState = 'loading' | 'none' | 'signed_in' | 'guest';

interface UserContextValue {
  authState: AuthState;
  /** true when user has paid/pro access (signed_in). false for guests. */
  isPro: boolean;
  /** Show the paywall modal */
  showPaywall: () => void;
  /** Sign out and return to auth screen */
  signOut: () => void;
}

const UserContext = createContext<UserContextValue>({
  authState: 'loading',
  isPro: false,
  showPaywall: () => {},
  signOut: () => {},
});

export const UserProvider = UserContext.Provider;

export function useUser(): UserContextValue {
  return useContext(UserContext);
}
