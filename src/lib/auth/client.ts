/**
 * JWT Auth Client
 * 客户端认证方法
 */

import {
  UserInfo,
  generateToken,
  saveTokenToStorage,
  removeTokenFromStorage,
  getCurrentUser,
  verifyToken,
} from './jwt';

export interface LoginCredentials {
  email?: string;
  phone?: string;
  password?: string;
  verificationCode?: string;
}

export interface RegisterData {
  email?: string;
  phone?: string;
  password: string;
  name?: string;
}

/**
 * 保存 token 到 localStorage 和 cookie
 */
function saveToken(token: string): void {
  saveTokenToStorage(token);

  // 同时设置 cookie，以便服务端中间件可以读取
  if (typeof document !== 'undefined') {
    const maxAge = 24 * 60 * 60; // 24 hours
    document.cookie = `auth_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;

    // 验证 cookie 是否设置成功
    const savedToken = document.cookie
      .split('; ')
      .find((row) => row.startsWith('auth_token='))
      ?.split('=')[1];

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Token saved successfully');
      console.log(
        '📦 Token in localStorage:',
        localStorage.getItem('auth_token') ? '✓' : '✗',
      );
      console.log('🍪 Cookie set:', savedToken ? '✓' : '✗');
    }
  }
}

/**
 * 删除 token（localStorage 和 cookie）
 */
function removeToken(): void {
  removeTokenFromStorage();

  // 删除 cookie
  if (typeof document !== 'undefined') {
    document.cookie =
      'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
}

/**
 * 模拟用户数据库（实际应该在后端）
 */
const mockUsers = new Map<string, any>();

// 添加测试用户 - 支持邮箱、手机号、账号登录
const testUser = {
  id: '1',
  username: 'testuser', // 账号
  email: 'test@example.com', // 邮箱
  phone: '13800138000', // 手机号
  password: 'password123',
  name: 'Test User',
  createdAt: new Date().toISOString(),
};

mockUsers.set('test@example.com', testUser);
mockUsers.set('13800138000', testUser);
mockUsers.set('testuser', testUser);

/**
 * 检测账号类型
 */
function detectAccountType(account: string): 'email' | 'phone' | 'username' {
  // 邮箱格式检测
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account)) {
    return 'email';
  }

  // 手机号格式检测（中国手机号）
  if (/^1[3-9]\d{9}$/.test(account)) {
    return 'phone';
  }

  // 其他视为账号
  return 'username';
}

/**
 * 通用密码登录 - 支持邮箱、手机号、账号
 */
export async function signInWithPassword(
  credentials: LoginCredentials,
): Promise<{
  user: UserInfo | null;
  token: string | null;
  error: string | null;
}> {
  try {
    const { email, password } = credentials;
    const account = email; // 这里的 email 字段实际上可以是邮箱、手机号或账号

    if (!account || !password) {
      return { user: null, token: null, error: '账号和密码不能为空' };
    }

    // 模拟 API 调用
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 检测账号类型
    const accountType = detectAccountType(account);

    // 验证用户（实际应该在后端验证）
    const mockUser = mockUsers.get(account);
    if (!mockUser || mockUser.password !== password) {
      return { user: null, token: null, error: '账号或密码错误' };
    }

    // 生成 token
    const userInfo: UserInfo = {
      id: mockUser.id,
      email: mockUser.email,
      phone: mockUser.phone,
      name: mockUser.name,
      createdAt: mockUser.createdAt,
      lastLoginAt: new Date().toISOString(),
    };

    const token = generateToken(userInfo);
    // 同时保存到 localStorage 和 cookie
    saveToken(token);

    return { user: userInfo, token, error: null };
  } catch (error) {
    return { user: null, token: null, error: '登录失败，请重试' };
  }
}

/**
 * 手机验证码登录
 */
export async function signInWithPhone(credentials: LoginCredentials): Promise<{
  user: UserInfo | null;
  token: string | null;
  error: string | null;
}> {
  try {
    const { phone, verificationCode } = credentials;

    if (!phone || !verificationCode) {
      return { user: null, token: null, error: '手机号和验证码不能为空' };
    }

    // 模拟 API 调用
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 验证验证码（实际应该在后端验证）
    if (verificationCode !== '123456') {
      return { user: null, token: null, error: '验证码错误' };
    }

    // 生成 token
    const userInfo: UserInfo = {
      id: `phone_${phone}`,
      email: '',
      phone,
      name: `用户${phone.slice(-4)}`,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    const token = generateToken(userInfo);
    saveToken(token);

    return { user: userInfo, token, error: null };
  } catch (error) {
    return { user: null, token: null, error: '登录失败，请重试' };
  }
}

/**
 * 用户注册
 */
export async function signUp(data: RegisterData): Promise<{
  user: UserInfo | null;
  token: string | null;
  error: string | null;
}> {
  try {
    const { email, phone, password, name } = data;

    if ((!email && !phone) || !password) {
      return { user: null, token: null, error: '邮箱/手机号和密码不能为空' };
    }

    // 模拟 API 调用
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 检查用户是否存在
    if (email && mockUsers.has(email)) {
      return { user: null, token: null, error: '邮箱已被注册' };
    }

    // 创建用户
    const userId = Date.now().toString();
    const userInfo: UserInfo = {
      id: userId,
      email: email || '',
      phone,
      name: name || `用户${userId.slice(-4)}`,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    // 保存用户（实际应该在后端）
    if (email) {
      mockUsers.set(email, {
        ...userInfo,
        password,
      });
    }

    const token = generateToken(userInfo);
    saveToken(token);

    return { user: userInfo, token, error: null };
  } catch (error) {
    return { user: null, token: null, error: '注册失败，请重试' };
  }
}

/**
 * 登出
 */
export async function signOut(): Promise<void> {
  removeToken();
  // 清除其他相关数据
  if (typeof window !== 'undefined') {
    localStorage.removeItem('selected_team_id');
    localStorage.removeItem('user_preferences');
  }
}

/**
 * 获取当前会话
 */
export function getSession(): {
  user: UserInfo | null;
  token: string | null;
} {
  const user = getCurrentUser();
  const token = user ? localStorage.getItem('auth_token') : null;
  return { user, token };
}

/**
 * 刷新 token
 */
export async function refreshToken(): Promise<{
  token: string | null;
  error: string | null;
}> {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return { token: null, error: 'No user found' };
    }

    // 生成新 token
    const newToken = generateToken({
      ...currentUser,
      lastLoginAt: new Date().toISOString(),
    });

    saveToken(newToken);
    return { token: newToken, error: null };
  } catch (error) {
    return { token: null, error: 'Failed to refresh token' };
  }
}

/**
 * 发送手机验证码
 */
export async function sendVerificationCode(phone: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return { success: false, error: '请输入有效的手机号' };
    }

    // 模拟 API 调用
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 实际应该调用后端发送短信
    console.log(`Verification code sent to ${phone}: 123456`);

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: '发送验证码失败' };
  }
}
