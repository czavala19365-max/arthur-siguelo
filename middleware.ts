import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require Supabase Auth (judicial module)
const PROTECTED_ROUTES = ['/judicial', '/select']

// Routes that authenticated users should NOT see (redirect to /select)
const AUTH_ROUTES = ['/login', '/register']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_JUDICIAL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_JUDICIAL!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    },
  )

  // IMPORTANT: Do not use getSession() — it reads from storage and can be tampered with.
  // getUser() sends a request to Supabase Auth server to revalidate the token.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // 1) Protected routes: redirect to /login if no session
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // 2) Auth routes: redirect to /select if already logged in
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route)
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/select'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/judicial',
    '/judicial/:path*',
    '/select',
    '/login',
    '/register',
  ],
}
