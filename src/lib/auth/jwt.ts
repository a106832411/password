/**
 * JWT Authentication Library
 * 使用 HMAC-SHA256 生成标准 JWT token
 */

import crypto from 'crypto';

export interface UserInfo {
  id: string;
  email: string;
  phone?: string;
  name?: string;
  avatar?: string;
  createdAt: string;
  lastLoginAt: string;
}

const JWT_SECRET =
  process.env.NEXT_PUBLIC_JWT_SECRET ||
  'a7f3b9c2e1d8f5h4j6k8l0m2n4p6q8r0s2t4u6v8w0x2y4z6a8b0c2d4e6f8g0';
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Base64URL 编码（JWT 标准）
 */
function base64urlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64URL 解码
 */
function base64urlDecode(str: string): string {
  // 添加回 padding
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf-8');
}

/**
 * 使用 HMAC-SHA256 创建签名
 */
function createSignature(message: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(message);
  return base64urlEncode(hmac.digest('base64'));
}

/**
 * 生成优化的 JWT token（使用 HMAC-SHA256）
 */
export function generateToken(userInfo: UserInfo): string {
  const now = Math.floor(Date.now() / 1000); // JWT 使用秒为单位
  const exp = now + 24 * 60 * 60; // 24小时后过期

  // JWT Header - 精简格式
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  // JWT Payload - 精简格式，去掉不必要的字段
  const payload = {
    // 标准 JWT 字段
    sub: userInfo.id,
    aud: 'authenticated',
    exp: exp,
    iat: now,

    // 用户信息
    email: userInfo.email,
    phone: userInfo.phone || '',
    name: userInfo.name || '',
    avatar: userInfo.avatar || '',

    // 简化的 metadata
    role: 'authenticated',
    is_anonymous: false,
  };

  // Base64URL 编码 header 和 payload
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));

  // 生成 HMAC-SHA256 签名
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createSignature(signatureInput, JWT_SECRET);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * 验证并解码 JWT token
 */
export function verifyToken(token: string): UserInfo | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [header, payload, signature] = parts;

    // 验证签名 - 使用 HMAC-SHA256
    const signatureInput = `${header}.${payload}`;
    const expectedSignature = createSignature(signatureInput, JWT_SECRET);

    if (signature !== expectedSignature) {
      console.error('Invalid token signature');
      return null;
    }

    // 解码 payload
    const decodedPayload = JSON.parse(base64urlDecode(payload));

    // 检查过期时间（使用秒）
    const now = Math.floor(Date.now() / 1000);
    if (decodedPayload.exp && now > decodedPayload.exp) {
      console.error('Token expired');
      return null;
    }

    // 从 payload 提取用户信息
    return {
      id: decodedPayload.sub || decodedPayload.id,
      email: decodedPayload.email || '',
      phone: decodedPayload.phone || '',
      name: decodedPayload.name || '',
      avatar: decodedPayload.avatar || '',
      createdAt: decodedPayload.createdAt || new Date().toISOString(),
      lastLoginAt: decodedPayload.lastLoginAt || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * 从浏览器 localStorage 获取 token
 */
export function getTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

/**
 * 保存 token 到 localStorage
 */
export function saveTokenToStorage(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('auth_token', token);
}

/**
 * 从 localStorage 删除 token
 */
export function removeTokenFromStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
}

/**
 * 获取当前用户信息
 */
export function getCurrentUser(): UserInfo | null {
  const token = getTokenFromStorage();
  if (!token) return null;
  return verifyToken(token);
}

/**
 * 检查用户是否已登录
 */
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

/**
 * 获取授权请求头
 */
export function getAuthHeaders(): HeadersInit {
  const token = getTokenFromStorage();
  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * 获取Bearer token (兼容旧代码)
 */
export function getBearerToken(): string | null {
  const token = getTokenFromStorage();
  return token ? `Bearer ${token}` : null;
}

/**
 * 创建授权的 fetch 请求
 */
export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
}
