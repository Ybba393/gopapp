import { type NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static assets
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Check for a Supabase session cookie
  // Supabase stores auth as sb-<project_ref>-auth-token or sb-<project_ref>-auth-token.0
  const cookies = request.cookies.getAll()
  const hasSession = cookies.some(
    (c) => c.name.startsWith('sb-') && c.name.includes('auth-token') && c.value.length > 0
  )

  if (pathname === '/') {
    return NextResponse.next()
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
