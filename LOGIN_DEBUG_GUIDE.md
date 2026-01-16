# 登录跳转问题诊断

## 问题分析

登录成功后没有跳转到目标页面，可能的原因：

### 1. Token 保存问题
- Token 可能没有正确保存到 localStorage 或 cookie
- 检查：打开浏览器 DevTools → Application → LocalStorage/Cookies

### 2. 跳转时序问题  
- 页面跳转可能太快，middleware 还没读取到新 token
- 修复：添加延迟确保 token 已同步

### 3. Middleware 验证问题
- Middleware 可能验证 token 失败
- 检查：在 middleware 中添加日志

## 调试步骤

### Step 1: 检查 Token 是否保存

打开浏览器 DevTools，执行：
```javascript
// 检查 localStorage
console.log('localStorage.auth_token:', localStorage.getItem('auth_token'));

// 检查 cookies
console.log('document.cookie:', document.cookie);
```

### Step 2: 检查 JWT Token 有效性

```javascript
// 在浏览器控制台执行
const token = localStorage.getItem('auth_token');
const parts = token.split('.');
console.log('Header:', JSON.parse(atob(parts[0])));
console.log('Payload:', JSON.parse(atob(parts[1])));
console.log('Signature:', parts[2]);
```

### Step 3: 手动测试跳转

在登录页面，登录后在控制台执行：
```javascript
// 手动跳转
window.location.href = '/dashboard';
```

如果能成功跳转到 dashboard，说明 token 已保存并被 middleware 验证通过。

## 解决方案

### 方案 1: 增加跳转延迟

在 [src/app/login/page.tsx](src/app/login/page.tsx) 中：

```typescript
// 登录成功处理
toast.success('登录成功');

// 增加延迟确保 token 已同步
setTimeout(() => {
    router.push(returnUrl);
}, 500); // 改为 500ms 或更长
```

### 方案 2: 检查 Cookie 设置

在 [src/lib/auth/client.ts](src/lib/auth/client.ts) 中确保 cookie 正确：

```typescript
function saveToken(token: string): void {
  saveTokenToStorage(token);

  // 检查 cookie 是否设置成功
  if (typeof document !== 'undefined') {
    const maxAge = 24 * 60 * 60;
    document.cookie = `auth_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
    
    // 验证 cookie 是否设置
    console.log('Cookie set:', document.cookie);
  }
}
```

### 方案 3: 更新 AuthProvider 监听

让 AuthProvider 在 cookie 变化时立即更新状态：

```typescript
// 在 AuthProvider 中添加 cookie 监听
useEffect(() => {
  const checkAuthCookie = setInterval(() => {
    const token = getTokenFromStorage();
    if (token) {
      const userData = verifyToken(token);
      if (userData) {
        setUser(userData);
        setSession({ user: userData, token });
      }
    }
  }, 100);

  return () => clearInterval(checkAuthCookie);
}, []);
```

## 推荐修复

结合多个方案：

1. ✅ 在 `saveToken` 后增加 500ms 延迟
2. ✅ 添加 cookie 有效性检查日志
3. ✅ 在 middleware 中添加调试日志

这样可以确保：
- Token 已保存到 localStorage 和 cookie
- 页面跳转时 middleware 能读取到 token
- 用户成功认证后进入保护路由
