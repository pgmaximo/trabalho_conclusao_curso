import * as WebBrowser from 'expo-web-browser';
import { signInWithRedirect, signOut } from 'aws-amplify/auth';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle() {
  await signOut().catch(() => {});

  await signInWithRedirect({
    provider: 'Google',
    options: {
      authSessionOpener: openExpoAuthSession,
      preferPrivateSession: true,
    },
  });
}

export function serializeAuthError(error: any) {
  return {
    name: error?.name,
    message: error?.message,
    recoverySuggestion: error?.recoverySuggestion,
    underlyingName: error?.underlyingError?.name,
    underlyingMessage: error?.underlyingError?.message,
    underlyingStack: error?.underlyingError?.stack,
  };
}

async function openExpoAuthSession(
  url: string,
  redirectUrls: string[],
  prefersEphemeralSession?: boolean,
) {
  const result = await WebBrowser.openAuthSessionAsync(url, redirectUrls[0], {
    preferEphemeralSession: prefersEphemeralSession,
  });

  if (result.type === 'success') {
    return { type: 'success' as const, url: result.url };
  }

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { type: 'canceled' as const };
  }

  return { type: 'error' as const, error: result };
}
