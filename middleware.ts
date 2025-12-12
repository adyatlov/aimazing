import { authkitMiddleware } from '@workos-inc/authkit-nextjs'

export default authkitMiddleware({
  redirectUri: process.env.WORKOS_REDIRECT_URI,
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: [],
  },
})

export const config = {
  matcher: [
    '/',
    '/game/:path*',
  ],
}
