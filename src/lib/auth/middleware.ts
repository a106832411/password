/**
 * JWT Auth Middleware for Server-side
 * 服务端 JWT 验证中间件
 */

import { NextRequest, NextResponse } from 'next/server';

interface UserInfo {
  id: string;
  email: string;
  phone?: string;
  name?: string;
  avatar?: string;
  createdAt: string;
  lastLoginAt: string;
}

const JWT_SECRET =
  process.env.NEXT_PUBLIC_JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * 服务端验证 JWT token
 */
export function verifyTokenServer(token: string): UserInfo | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [header, payload, signature] = parts;

    // 验证签名
    const expectedSignature = Buffer.from(payload + JWT_SECRET).toString(
      'base64',
    );
    if (signature !== expectedSignature) {
      console.error('Invalid token signature');
      return null;
    }

    // 解码 payload
    const decodedPayload = JSON.parse(
      Buffer.from(payload, 'base64').toString('utf-8'),
    );

    // 检查过期时间
    if (decodedPayload.exp && Date.now() > decodedPayload.exp) {
      console.error('Token expired');
      return null;
    }

    return decodedPayload as UserInfo;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * 从请求中获取 token
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  // 从 Authorization header 获取
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 从 cookie 获取
  const cookieToken = request.cookies.get('auth_token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * 验证请求是否已认证
 */
export function isAuthenticatedRequest(request: NextRequest): boolean {
  const token = getTokenFromRequest(request);
  if (!token) return false;

  const user = verifyTokenServer(token);
  return user !== null;
}

/**
 * 从请求中获取用户信息
 */
export function getUserFromRequest(request: NextRequest): UserInfo | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  return verifyTokenServer(token);
}

/**
 * 创建带认证信息的响应
 */
export function createAuthResponse(
  response: NextResponse,
  token: string,
  maxAge: number = 24 * 60 * 60, // 24 hours
): NextResponse {
  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  });

  return response;
}

/**
 * 清除认证信息
 */
export function clearAuthResponse(response: NextResponse): NextResponse {
  response.cookies.delete('auth_token');
  return response;
}
