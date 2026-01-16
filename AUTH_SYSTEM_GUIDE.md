# 🔐 JWT 认证系统完整指南

本项目已从 Supabase 认证迁移到自定义 JWT 认证系统，完整支持密码登录、验证码登录和访问保护。

## 📑 目录

1. [📁 文件结构](#文件结构)
2. [🔑 核心功能](#核心功能)
3. [🎯 登录系统](#登录系统)
4. [🔒 访问保护](#访问保护)
5. [⚙️ 配置说明](#配置说明)
6. [🧪 测试账号](#测试账号)
7. [📖 使用示例](#使用示例)
8. [🚀 完整流程](#完整流程)
9. [✅ 登录流程改进](#登录流程改进)
10. [📝 常见问题](#常见问题)

---

## 📁 文件结构

```
src/
├── lib/
│   └── auth/
│       ├── jwt.ts          # JWT 核心功能（生成、验证、存储）
│       ├── client.ts       # 客户端认证方法（登录、注册、登出）
│       ├── middleware.ts   # 服务端中间件（验证请求、访问控制）
│       └── api.ts          # API 请求助手（带认证）
├── components/
│   └── AuthProvider.tsx    # React 认证上下文
├── app/
│   ├── login/
│   │   └── page.tsx        # 登录页面（密码登录 + 验证码登录）
│   └── api/
│       └── example/
│           └── route.ts    # API 路由示例
└── middleware.ts           # Next.js 中间件（路由保护）
```

---

## 🔑 核心功能

### 1. JWT Token 管理

**生成、验证和存储 Token**

```typescript
import { generateToken, verifyToken, getCurrentUser } from '@/lib/auth/jwt';

// 生成 token
const token = generateToken({
  id: 'user-id',
  email: 'user@example.com',
  name: 'User Name',
  createdAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString(),
});

// 验证 token
const user = verifyToken(token);

// 获取当前用户
const currentUser = getCurrentUser();
```

**Token 格式**: `header.payload.signature`
- **Header**: `{ "alg": "HS256", "typ": "JWT" }` (Base64 编码)
- **Payload**: 用户信息 + 时间戳 (Base64 编码)
- **Signature**: HMAC-SHA256 签名 (Base64 编码)

**Token 存储位置**:
- **localStorage**: `auth_token`
- **Cookie**: `auth_token` (Path=/, SameSite=Lax, 24h)
- **请求头**: `Authorization: Bearer <token>`

---

## 🎯 登录系统

### 支持的登录方式

#### 1. 密码登录（支持三种账号类型）

```typescript
import { signInWithPassword } from '@/lib/auth/client';

// 邮箱登录
const { user, token, error } = await signInWithPassword({
  email: 'test@example.com',
  password: 'password123',
});

// 手机号登录
const { user, token, error } = await signInWithPassword({
  email: '13800138000',
  password: 'password123',
});

// 账号登录
const { user, token, error } = await signInWithPassword({
  email: 'testuser',
  password: 'password123',
});
```

**账号类型自动识别**:
- 包含 `@` → 识别为邮箱
- 11位数字且以1开头 → 识别为手机号
- 其他 → 识别为账号名

#### 2. 验证码登录

```typescript
import { signInWithPhone, sendVerificationCode } from '@/lib/auth/client';

// 发送验证码
const { success, error } = await sendVerificationCode('13800138000');

// 使用验证码登录
const { user, token, error } = await signInWithPhone({
  phone: '13800138000',
  verificationCode: '123456',
});
```

#### 3. 用户注册

```typescript
import { signUp } from '@/lib/auth/client';

const { user, token, error } = await signUp({
  email: 'user@example.com',
  password: 'password123',
  name: 'User Name',
});
```

#### 4. 登出

```typescript
import { signOut } from '@/lib/auth/client';

await signOut();
```

### UI 组件

**登录页面** ([app/login/page.tsx](src/app/login/page.tsx))
- 🔐 密码登录标签：支持邮箱/手机号/账号
- 👤 验证码登录标签：手机号验证码
- 🖼️ 多次错误自动显示图文验证码
- ⏱️ 验证码倒计时（60秒）

**导航栏** ([components/home/navbar.tsx](src/components/home/navbar.tsx))
- 已登录：显示"进入控制台"按钮 → `/dashboard`
- 未登录：显示"登录"按钮 → `/login`
- 支持桌面端和移动端

---

## 🔒 访问保护

### 1. 路由保护规则

**公开路由**（无需登录）:
```typescript
/, /login, /auth/*, /legal/*, /help/*, /share/*, 
/templates/*, /enterprise/*, /support/*, /suna/*, /agents-101
```

**受保护路由**（需要登录）:
```typescript
/dashboard, /agents, /projects, /settings, 
/subscription, /billing, /profile
```

### 2. 访问控制流程

```
Client Request
    ↓
Middleware (middleware.ts)
    ↓
Check if Protected Route?
    ├─ Yes → Verify Token
    │  ├─ Valid → Allow Access ✓
    │  └─ Invalid → Redirect to /login?returnUrl=... ❌
    └─ No → Allow Access ✓
```

### 3. Token 验证逻辑

```typescript
// 从 middleware.ts
import { isAuthenticatedRequest } from '@/lib/auth/middleware';

const PROTECTED_ROUTES = ['/dashboard', '/agents', '/projects', ...];

if (isProtectedRoute) {
  const isAuthenticated = isAuthenticatedRequest(request);
  
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
}
```

### 4. 添加新的受保护路由

在 [middleware.ts](src/middleware.ts) 中添加：

```typescript
const PROTECTED_ROUTES = [
  '/dashboard',
  '/agents',
  '/projects',
  '/settings',
  '/subscription',
  '/billing',
  '/profile',
  '/your-new-route', // 添加新路由
];
```

---

## ⚙️ 配置说明

### 1. 环境变量

在 `.env.local` 中配置：

```env
# JWT 认证密钥（必需）
NEXT_PUBLIC_JWT_SECRET=a7f3b9c2e1d8f5h4j6k8l0m2n4p6q8r0s2t4u6v8w0x2y4z6a8b0c2d4e6f8g0
```

**密钥生成**:
- 开发环境：可使用简单密钥（如 `dev-secret-123`）
- 生产环境：必须使用强密钥（64个随机字符）

**生成强密钥**:
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# PowerShell
[Convert]::ToHexString((New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes(32))
```

### 2. React 组件使用

```typescript
import { useAuth } from '@/components/AuthProvider';

function MyComponent() {
  const { user, session, isLoading, signOut, refreshUser } = useAuth();

  if (isLoading) {
    return <div>加载中...</div>;
  }

  if (!user) {
    return <div>请先登录</div>;
  }

  return (
    <div>
      <p>欢迎，{user.name || user.email}</p>
      <button onClick={signOut}>登出</button>
    </div>
  );
}
```

### 3. API 请求（带认证）

```typescript
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/auth/api';

// GET 请求
const { data, error } = await apiGet('/api/user/profile');

// POST 请求
const { data, error } = await apiPost('/api/user/update', {
  name: 'New Name',
});

// PUT 请求
const { data, error } = await apiPut('/api/user/settings', {
  theme: 'dark',
});

// DELETE 请求
const { data, error } = await apiDelete('/api/user/account');
```

### 4. API 路由（服务端验证）

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  // 验证用户
  const user = getUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { error: '未授权' },
      { status: 401 }
    );
  }

  // 返回数据
  return NextResponse.json({
    data: {
      userId: user.id,
      email: user.email,
    },
  });
}
```

---

## 🧪 测试账号

### 登录凭证

| 登录方式 | 账号 | 密码 |
|---------|------|------|
| 邮箱登录 | `test@example.com` | `password123` |
| 手机号登录 | `13800138000` | `password123` |
| 账号登录 | `testuser` | `password123` |
| 验证码登录 | 任意手机号 | `123456` |

### 测试场景

1. **测试未登录重定向**
   - 清除浏览器 Cookie 和 localStorage
   - 访问 `http://localhost:3000/dashboard`
   - 应重定向到 `/login?returnUrl=/dashboard`

2. **测试密码登录**
   - 访问 `/login`
   - 输入上表中任意账号和密码
   - 应成功登录并跳转到 `/dashboard`

3. **测试验证码登录**
   - 访问 `/login`
   - 切换到"验证码登录"
   - 输入任意手机号（如 `13800138000`）
   - 点击"发送"（模拟发送验证码）
   - 输入 `123456`
   - 应成功登录

4. **测试多错误验证码**
   - 在密码登录输入错误密码 3 次
   - 应自动显示图文验证码
   - 输入显示的验证码可继续尝试

---

## 📖 使用示例

### 完整登录流程

```typescript
import { useAuth } from '@/components/AuthProvider';
import { signInWithPassword } from '@/lib/auth/client';

export function LoginExample() {
  const { refreshUser } = useAuth();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const { user, token, error } = await signInWithPassword({
      email: account,
      password,
    });

    if (error) {
      console.error('登录失败:', error);
      return;
    }

    // 登录成功
    refreshUser();
    console.log('登录成功，用户:', user);
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
      <input
        type="text"
        placeholder="邮箱 / 手机号 / 账号"
        value={account}
        onChange={(e) => setAccount(e.target.value)}
      />
      <input
        type="password"
        placeholder="密码"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">登录</button>
    </form>
  );
}
```

### 保护页面示例

```typescript
import { useAuth } from '@/components/AuthProvider';

export function ProtectedPage() {
  const { user, isLoading, signOut } = useAuth();

  if (isLoading) {
    return <div>加载中...</div>;
  }

  if (!user) {
    return <div>未授权，请登录</div>;
  }

  return (
    <div>
      <h1>欢迎，{user.name || user.email}</h1>
      <p>邮箱：{user.email}</p>
      <p>手机：{user.phone}</p>
      <button onClick={signOut}>登出</button>
    </div>
  );
}
```

### API 端点示例

```typescript
// src/app/api/user/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
  });
}
```

---

## 🚀 完整流程

### 场景 1: 新用户首次访问

```
1. 用户访问 http://localhost:3000/dashboard
   ↓
2. Middleware 检查是否为受保护路由
   ↓
3. 验证 Token（无 Token）
   ↓
4. 重定向到 /login?returnUrl=/dashboard
   ↓
5. 用户在登录页输入账号和密码
   ↓
6. 点击登录按钮
   ↓
7. 系统生成 JWT Token
   ↓
8. Token 保存到 localStorage 和 Cookie
   ↓
9. 刷新用户状态
   ↓
10. 自动跳转到 /dashboard
   ↓
11. Middleware 验证 Token 有效
   ↓
12. 显示 Dashboard 页面 ✓
```

### 场景 2: 已登录用户访问

```
1. 用户访问 http://localhost:3000/dashboard
   ↓
2. Middleware 检查是否为受保护路由
   ↓
3. 从 Cookie 读取 Token
   ↓
4. 验证 Token 有效
   ↓
5. 直接显示 Dashboard 页面 ✓
```

### 场景 3: Token 过期/无效

```
1. 用户访问受保护页面
   ↓
2. Middleware 检查路由
   ↓
3. 验证 Token 失败（过期或无效）
   ↓
4. 重定向到 /login?returnUrl=...
   ↓
5. 用户需要重新登录
```

---

## ✅ 登录流程改进

本章节介绍登录系统的最新改进，包括解决的问题、代码优化和最佳实践。

### 改进概览

最近更新修复了登录后的跳转问题，并改进了登录判断逻辑的清晰性。

#### 问题 1: 登录成功后没有正确跳转

**原因**：
- 变量名冲突：`isLoading2` 与 `isLoading`（来自 AuthProvider）混淆
- 跳转逻辑没有等待 `refreshUser()` 完成
- 依赖关系不清晰

**解决方案**：
1. 重命名状态变量：`isLoading2` → `isSigningIn`（表示正在执行登录）
2. 改进跳转时序：先调用 `refreshUser()`，然后等待 300ms 再跳转
3. 在 useEffect 中添加自动登录检测

#### 问题 2: 登录判断逻辑不清晰

**原因**：
- 登录成功和失败的条件判断散乱
- 没有统一的错误处理模式
- 状态转移不够明显

**解决方案**：
1. 统一的失败判断：`if (error || !loggedInUser || !token)`
2. 显式的成功处理：单独的代码块处理成功场景
3. 清晰的注释划分：登录失败处理 vs 登录成功处理

### 代码改进详解

#### 1. 修复状态变量名

**之前**：
```typescript
const [isLoading2, setIsLoading] = useState(false);
```

**之后**：
```typescript
const [isSigningIn, setIsSigningIn] = useState(false);
```

**优势**：
- 名称更准确反映状态含义（正在登录）
- 避免与 `isLoading` 冲突
- 代码意图更清晰

#### 2. 添加自动登录检测

**新增 useEffect**：
```typescript
useEffect(() => {
    setMounted(true);
    // 如果已登录，直接跳转
    if (user && !isLoading) {
        router.push(returnUrl);
    }
}, [user, isLoading, returnUrl, router]);
```

**功能**：
- 登录页加载时检查用户状态
- 已登录的用户自动跳转到目标页面
- 避免已登录用户看到登录页

#### 3. 改进密码登录逻辑

**之前**（混乱的判断）：
```typescript
if (error) {
    const newErrors = passwordErrors + 1;
    setPasswordErrors(newErrors);
    if (newErrors >= 3) {
        // 显示验证码
    } else {
        toast.error(error || '登录失败');
    }
    return;
}

if (loggedInUser && token) {
    // 登录成功
    refreshUser();
    router.push(returnUrl);
}
```

**之后**（清晰的流程）：
```typescript
// 登录失败处理
if (error || !loggedInUser || !token) {
    const newErrors = passwordErrors + 1;
    setPasswordErrors(newErrors);

    // 3次失败后显示验证码
    if (newErrors >= 3) {
        setShowCaptcha(true);
        generateCaptcha();
        toast.error('密码错误次数过多，请输入验证码');
    } else {
        toast.error(error || '账号或密码错误');
    }
    setPassword('');
    return;
}

// 登录成功处理
toast.success('登录成功');
refreshUser();

// 等待 AuthProvider 更新后再跳转
setTimeout(() => {
    router.push(returnUrl);
}, 300);
```

**改进点**：
- 清晰分离失败和成功逻辑
- 统一的条件判断
- 添加了等待时间确保状态更新

#### 4. 改进验证码登录逻辑

**之前**：
```typescript
if (error) {
    toast.error(error);
    setVerificationCode('');
    return;
}

if (loggedInUser && token) {
    refreshUser();
    router.push(returnUrl);
}
```

**之后**：
```typescript
// 登录失败处理
if (error || !loggedInUser || !token) {
    toast.error(error || '验证码错误或已过期');
    setVerificationCode('');
    return;
}

// 登录成功处理
toast.success('登录成功');
refreshUser();

// 等待 AuthProvider 更新后再跳转
setTimeout(() => {
    router.push(returnUrl);
}, 300);
```

**改进点**：
- 明确的失败信息提示
- 统一的成功处理流程
- 保持代码一致性

### 登录流程详解

#### 完整登录流程

```
用户输入 → 验证输入 → 检查验证码 → 调用登录API
    ↓
成功: 生成Token → 保存Token → 调用refreshUser()
    ↓
等待300ms → 状态更新完成 → 跳转到returnUrl
    ↓
显示目标页面 ✓


失败: 记录错误次数 → 检查是否≥3次
    ├─ Yes → 显示图文验证码
    └─ No → 显示错误提示
```

#### 登录状态判断流程

```
isSigningIn = true  (登录开始)
    ↓
执行登录请求
    ↓
检查响应:
├─ 有Error 或 没有User 或 没有Token
│  └─ 登录失败处理
│     ├─ 累计错误次数
│     └─ 错误次数≥3 → 显示验证码
│
└─ 没有Error 且 有User 且 有Token
   └─ 登录成功处理
      ├─ 显示成功提示
      ├─ 刷新用户状态
      └─ 等待300ms后跳转
    ↓
isSigningIn = false  (登录结束)
```

### 改进的测试场景

#### 测试场景 1: 正常登录

1. 访问 `/login`
2. 输入 `test@example.com` 和 `password123`
3. 点击登录
4. ✅ 显示"登录成功"
5. ✅ 300ms 后跳转到 `/dashboard`（或 `returnUrl` 指定的页面）

#### 测试场景 2: 登录失败重试

1. 输入 `test@example.com` 和错误密码
2. 点击登录
3. ✅ 显示"账号或密码错误"
4. 第 2 次失败后
5. ✅ 仍显示密码输入框（无验证码）
6. 第 3 次失败后
7. ✅ 显示图文验证码输入框

#### 测试场景 3: 验证码登录

1. 切换到"验证码登录"
2. 输入 `13800138000`
3. 点击"发送"
4. ✅ 显示"验证码已发送"
5. ✅ 倒计时 60 秒开始
6. 输入 `123456`
7. 点击登录
8. ✅ 显示"登录成功"
9. ✅ 跳转到 `/dashboard`

#### 测试场景 4: 已登录用户访问登录页

1. 用户已登录
2. 直接访问 `/login`
3. ✅ 自动跳转到 `/dashboard`（无需显示登录页）

#### 测试场景 5: 从受保护页面重定向登录

1. 清空 localStorage 和 Cookie
2. 访问 `/dashboard`
3. ✅ 重定向到 `/login?returnUrl=/dashboard`
4. 输入账号密码登录
5. ✅ 显示"登录成功"
6. ✅ 自动跳转回 `/dashboard`

#### 测试场景 6: 跨标签页登录同步

1. 打开两个标签页都访问 `/login`
2. 在标签页1 输入账号密码登录
3. ✅ 标签页1 跳转到 `/dashboard`
4. ✅ 标签页2 监听到登录，也跳转到 `/dashboard`

### 状态变量参考

| 状态变量 | 含义 | 默认值 | 用途 |
|---------|------|-------|------|
| `isSigningIn` | 正在登录 | `false` | 控制按钮和输入框禁用状态 |
| `passwordErrors` | 密码错误次数 | `0` | 满 3 次后显示验证码 |
| `showCaptcha` | 显示验证码 | `false` | 控制图文验证码显示/隐藏 |
| `codeSent` | 验证码已发送 | `false` | 控制验证码输入框和重新发送 |
| `countdown` | 倒计时秒数 | `0` | 60 秒倒计时 |
| `user` | 当前用户 | `null` | 来自 AuthProvider 的用户信息 |
| `isLoading` | 初始化中 | `true` | 来自 AuthProvider 的加载状态 |

### 核心改进点总结

1. **变量命名更清晰**：`isLoading2` → `isSigningIn`
2. **登录流程更明确**：分离失败/成功处理
3. **状态更新更可靠**：添加等待时间确保同步
4. **自动登录检测**：已登录用户自动跳转
5. **错误提示更准确**：明确的错误消息
6. **代码可维护性更高**：逻辑清晰，易于扩展

---

## 📝 常见问题

### Q1: 如何修改 Token 过期时间？

**A:** 在 [lib/auth/jwt.ts](src/lib/auth/jwt.ts) 中修改：

```typescript
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 小时改为其他值
```

### Q2: 如何添加新的受保护路由？

**A:** 在 [middleware.ts](src/middleware.ts) 中的 `PROTECTED_ROUTES` 数组添加：

```typescript
const PROTECTED_ROUTES = [
  '/dashboard',
  '/your-new-route', // 添加这里
];
```

### Q3: Token 存储在哪里？

**A:** Token 同时存储在三个地方：
- `localStorage.auth_token` - 客户端持久化
- Cookie `auth_token` - 服务端可读
- 内存 - 当前会话

### Q4: 如何实现自动登出（Token 过期）？

**A:** 在 [lib/auth/jwt.ts](src/lib/auth/jwt.ts) 中，Token 包含 `exp` 字段。Middleware 会自动检查过期时间。

### Q5: 如何在多个标签页间同步登录状态？

**A:** 系统已通过 `storage` 事件实现。登录会自动同步到所有标签页。

### Q6: 生产环境需要什么准备？

**A:** 
1. 生成强 JWT_SECRET
2. 启用 HTTPS
3. 设置 Cookie 的 Secure 标志
4. 考虑添加 Token 刷新机制
5. 实现真实的后端 API

### Q7: 如何与真实后端集成？

**A:** 在 [lib/auth/client.ts](src/lib/auth/client.ts) 的 `signInWithPassword` 函数中替换模拟逻辑：

```typescript
// 替换这部分
const mockUser = mockUsers.get(account);

// 为这样
const response = await fetch('https://your-api.com/login', {
  method: 'POST',
  body: JSON.stringify({ account, password }),
});
```

---

## 🛡️ 安全最佳实践

1. **环境变量**
   - 不在代码中硬编码密钥
   - 在 `.env.local` 中设置（不提交到 Git）
   - 生产环境使用强密钥

2. **Token 管理**
   - 默认 24 小时过期
   - 支持 Token 刷新
   - 存储在 HttpOnly Cookie

3. **网络安全**
   - 生产环境必须使用 HTTPS
   - Cookie 设置 Secure 标志
   - 防止 CSRF 攻击

4. **访问控制**
   - Middleware 验证所有请求
   - API 路由检查用户身份
   - 定期轮换密钥

---

## 📞 技术支持

- 查看代码注释获取详细说明
- 查阅 [JWT_AUTH_README.md](JWT_AUTH_README.md) 了解 JWT 详情
- 查阅 [LOGIN_REDIRECT_GUIDE.md](LOGIN_REDIRECT_GUIDE.md) 了解访问保护
