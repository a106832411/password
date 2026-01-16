import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAuthenticatedRequest } from '@/lib/auth/middleware';
import { locales, defaultLocale, type Locale } from '@/i18n/config';
import { detectBestLocaleFromHeaders } from '@/lib/utils/geo-detection-server';

// Marketing pages that support locale routing for SEO (/de, /it, etc.)
const MARKETING_ROUTES = [
  '/',
  '/suna',
  '/enterprise',
  '/legal',
  '/support',
  '/templates',
];

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/', // Homepage should be public!
  '/auth',
  '/auth/callback',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/login', // Login page
  '/legal',
  '/api/auth',
  '/share', // Shared content should be public
  '/templates', // Template pages should be public
  '/enterprise', // Enterprise page should be public
  '/master-login', // Master password admin login
  '/checkout', // Public checkout wrapper for Apple compliance
  '/support', // Support page should be public
  '/suna', // Suna rebrand page should be public for SEO
  '/help', // Help center and documentation should be public
  '/credits-explained', // Credits explained page should be public
  '/agents-101',
  // Add locale routes for marketing pages
  ...locales.flatMap((locale) =>
    MARKETING_ROUTES.map((route) => `/${locale}${route === '/' ? '' : route}`),
  ),
];

// Routes that require authentication - will redirect to /login if not authenticated
const PROTECTED_ROUTES = [
  '/dashboard',
  '/agents',
  '/projects',
  '/settings',
  '/subscription',
  '/billing',
  '/profile',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  // Handle Supabase verification redirects at root level
  // Supabase sometimes redirects to root (/) instead of /auth/callback
  // Detect authentication parameters and redirect to proper callback handler
  if (pathname === '/' || pathname === '') {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    const error = searchParams.get('error');

    // If we have Supabase auth parameters, redirect to /auth/callback
    // Note: Mobile apps use direct deep links and bypass this route
    if (code || token || type || error) {
      const callbackUrl = new URL('/auth/callback', request.url);

      // Preserve all query parameters
      searchParams.forEach((value, key) => {
        callbackUrl.searchParams.set(key, value);
      });

      console.log(
        '🔄 Redirecting Supabase verification from root to /auth/callback',
      );
      return NextResponse.redirect(callbackUrl);
    }
  }

  // Extract path segments
  const pathSegments = pathname.split('/').filter(Boolean);
  const firstSegment = pathSegments[0];

  // Check if first segment is a locale (e.g., /de, /it, /de/suna)
  if (firstSegment && locales.includes(firstSegment as Locale)) {
    const locale = firstSegment as Locale;
    const remainingPath = '/' + pathSegments.slice(1).join('/') || '/';

    // Verify remaining path is a marketing route
    const isRemainingPathMarketing = MARKETING_ROUTES.some((route) => {
      if (route === '/') {
        return remainingPath === '/' || remainingPath === '';
      }
      return remainingPath === route || remainingPath.startsWith(route + '/');
    });

    if (isRemainingPathMarketing) {
      // Rewrite /de to /, /de/suna to /suna, etc.
      const response = NextResponse.rewrite(
        new URL(remainingPath, request.url),
      );
      response.cookies.set('locale', locale, {
        path: '/',
        maxAge: 31536000, // 1 year
        sameSite: 'lax',
      });

      // Store locale in headers so next-intl can pick it up
      response.headers.set('x-locale', locale);

      return response;
    }
  }

  // Check if this is a marketing route (without locale prefix)
  const isMarketingRoute = MARKETING_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/'),
  );

  // 基于地理检测对营销页面进行自动重定向
  // 仅在以下情况下重定向：
  // 1. 用户访问的是没有语言前缀的营销页面
  // 2. 用户没有显式偏好（无 cookie）
  // 3. 检测到的语言不是默认语言（中文）
  if (
    isMarketingRoute &&
    (!firstSegment || !locales.includes(firstSegment as Locale))
  ) {
    // Check if user has explicit preference in cookie
    const localeCookie = request.cookies.get('locale')?.value;
    const hasExplicitPreference =
      !!localeCookie && locales.includes(localeCookie as Locale);

    // Only auto-redirect if no explicit preference and detected locale is not default
    if (!hasExplicitPreference) {
      const acceptLanguage = request.headers.get('accept-language');
      const detectedLocale = detectBestLocaleFromHeaders(acceptLanguage);

      // Only redirect if detected locale is not default
      if (detectedLocale !== defaultLocale) {
        const redirectUrl = new URL(request.url);
        redirectUrl.pathname = `/${detectedLocale}${pathname === '/' ? '' : pathname}`;

        const redirectResponse = NextResponse.redirect(redirectUrl);
        // Set cookie so we don't redirect again on next visit
        redirectResponse.cookies.set('locale', detectedLocale, {
          path: '/',
          maxAge: 31536000, // 1 year
          sameSite: 'lax',
        });
        return redirectResponse;
      }
    }
  }

  // Allow all public routes without any checks
  if (
    PUBLIC_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + '/'),
    )
  ) {
    return NextResponse.next();
  }

  // Check if route requires authentication
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/'),
  );

  if (isProtectedRoute) {
    // Check if user is authenticated
    const isAuthenticated = isAuthenticatedRequest(request);

    if (!isAuthenticated) {
      // Redirect to login page with return URL
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname);

      console.log('🔒 Redirecting unauthenticated user to /login');
      return NextResponse.redirect(loginUrl);
    }
  }

  // Allow all other routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - root path (/)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
