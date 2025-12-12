import { handleAuth } from '@workos-inc/authkit-nextjs'

// Explicitly set baseURL for containerized environments where
// the internal hostname (0.0.0.0) differs from the public URL
const baseURL = process.env.WORKOS_REDIRECT_URI?.replace('/callback', '') || undefined

export const GET = handleAuth({
  baseURL,
  returnPathname: '/',
})
