import * as WebBrowser from 'expo-web-browser';
import { signInWithRedirect, signOut } from 'aws-amplify/auth';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_AUTH_TIMEOUT_MS = 60000;

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
  const redirectUrl = getRedirectUriFromAuthorizeUrl(url) ?? redirectUrls[0];
  const result = await withTimeout(
    WebBrowser.openAuthSessionAsync(url, redirectUrl, {
      preferEphemeralSession: prefersEphemeralSession,
    }),
    GOOGLE_AUTH_TIMEOUT_MS,
  );

  if (result.type === 'success') {
    return { type: 'success' as const, url: result.url };
  }

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { type: 'canceled' as const };
  }

  return { type: 'error' as const, error: result };
}

function getRedirectUriFromAuthorizeUrl(url: string) {
  const redirectUriMatch = url.match(/[?&]redirect_uri=([^&]+)/);

  if (!redirectUriMatch) {
    return undefined;
  }

  return decodeURIComponent(redirectUriMatch[1]);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Google authentication timed out before returning to the app.'));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
}
