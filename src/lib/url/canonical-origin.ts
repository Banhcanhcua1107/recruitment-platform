const LOCALHOST_HOSTNAMES = new Set(['localhost', '0.0.0.0', '127.0.0.1'])
const CANONICAL_LOCAL_ORIGIN = 'http://localhost:3000'

function normalizeOrigin(candidate: string): string | null {
  try {
    const parsed = new URL(candidate)

    if (LOCALHOST_HOSTNAMES.has(parsed.hostname)) {
      parsed.protocol = 'http:'
      parsed.hostname = 'localhost'
      if (!parsed.port || parsed.port === '80') {
        parsed.port = '3000'
      }
    }

    return parsed.origin
  } catch {
    return null
  }
}

function resolveConfiguredOrigin(): string | null {
  const configured =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL

  if (configured) {
    const normalizedConfigured = normalizeOrigin(configured)
    if (normalizedConfigured) {
      return normalizedConfigured
    }
  }

  if (process.env.VERCEL_URL) {
    return normalizeOrigin(`https://${process.env.VERCEL_URL}`)
  }

  return null
}

export function getCanonicalAppOrigin(originOrUrl?: string | null): string {
  if (originOrUrl) {
    const normalizedInput = normalizeOrigin(originOrUrl)
    if (normalizedInput) {
      return normalizedInput
    }
  }

  return resolveConfiguredOrigin() || CANONICAL_LOCAL_ORIGIN
}

export function buildCanonicalAppUrl(path: string, originOrUrl?: string | null): URL {
  const url = new URL(getCanonicalAppOrigin(originOrUrl))
  url.pathname = path
  url.search = ''
  url.hash = ''
  return url
}
