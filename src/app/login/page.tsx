'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { KortixLogo } from '@/components/sidebar/kortix-logo';
import { useAuth } from '@/components/AuthProvider';
import { signInWithPassword, signInWithPhone, sendVerificationCode } from '@/lib/auth/client';
import { useTranslations } from 'next-intl';
import { User, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type LoginMethod = 'password' | 'code';

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginContent />
        </Suspense>
    );
}

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isLoading } = useAuth();
    const t = useTranslations('auth');

    const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
    const [mounted, setMounted] = useState(false);

    // Get return URL from query params
    const returnUrl = searchParams.get('returnUrl') || '/dashboard';

    // Account/Password state (支持邮箱、手机号、账号)
    const [account, setAccount] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [passwordErrors, setPasswordErrors] = useState(0);
    const [showCaptcha, setShowCaptcha] = useState(false);
    const [captchaInput, setCaptchaInput] = useState('');
    const [captchaCode, setCaptchaCode] = useState('');

    // Phone verification state
    const [phone, setPhone] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [countdown, setCountdown] = useState(0);

    // Loading state
    const [isSigningIn, setIsSigningIn] = useState(false);

    useEffect(() => {
        setMounted(true);
        // 如果已登录，直接跳转
        if (user && !isLoading) {
            router.push(returnUrl);
        }
    }, [user, isLoading, returnUrl, router]);

    // Countdown timer for SMS
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // Generate random captcha code
    const generateCaptcha = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setCaptchaCode(code);
        return code;
    };

    useEffect(() => {
        if (showCaptcha && !captchaCode) {
            generateCaptcha();
        }
    }, [showCaptcha]);

    // Handle account/password login
    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // 输入验证
        if (!account || !password) {
            toast.error('请输入账号和密码');
            return;
        }

        if (showCaptcha && !captchaInput) {
            toast.error('请输入验证码');
            return;
        }

        if (showCaptcha && captchaInput.toUpperCase() !== captchaCode) {
            toast.error('验证码错误');
            setCaptchaInput('');
            generateCaptcha();
            return;
        }

        setIsSigningIn(true);
        try {
            // 使用 JWT 认证登录
            const { user: loggedInUser, token, error } = await signInWithPassword({
                email: account, // 这里的 email 字段实际上可以是邮箱、手机号或账号
                password,
            });

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

            // 调试：打印 token 信息
            if (process.env.NODE_ENV === 'development') {
                console.log('🎉 Login successful');
                console.log('📍 Redirecting to:', returnUrl);
                console.log('🔐 Token received:', token ? `${token.substring(0, 50)}...` : 'N/A');
            }

            // 触发自定义事件通知 AuthProvider 更新
            const event = new Event('auth-update');
            window.dispatchEvent(event);

            // 增加延迟确保 token 已同步到 cookie 和 AuthProvider
            // 这样 middleware 能读取到新的 token
            setTimeout(() => {
                router.push(returnUrl);
            }, 500);
        } catch (error) {
            toast.error('登录失败，请重试');
            console.error('Login error:', error);
        } finally {
            setIsSigningIn(false);
        }
    };

    // Send verification code
    const handleSendCode = async () => {
        if (!phone) {
            toast.error('请输入手机号');
            return;
        }

        if (!/^1[3-9]\d{9}$/.test(phone)) {
            toast.error('请输入有效的手机号');
            return;
        }

        setIsSigningIn(true);
        try {
            // 使用 JWT 认证发送验证码
            const { success, error } = await sendVerificationCode(phone);

            if (error) {
                toast.error(error);
                return;
            }

            if (success) {
                setCodeSent(true);
                setCountdown(60);
                toast.success('验证码已发送');
            }
        } catch (error) {
            toast.error('发送验证码失败');
            console.error('Send code error:', error);
        } finally {
            setIsSigningIn(false);
        }
    };

    // Handle phone verification login
    const handlePhoneLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // 输入验证
        if (!phone || !verificationCode) {
            toast.error('请输入手机号和验证码');
            return;
        }

        setIsSigningIn(true);
        try {
            // 使用 JWT 认证登录
            const { user: loggedInUser, token, error } = await signInWithPhone({
                phone,
                verificationCode,
            });

            // 登录失败处理
            if (error || !loggedInUser || !token) {
                toast.error(error || '验证码错误或已过期');
                setVerificationCode('');
                return;
            }

            // 登录成功处理
            toast.success('登录成功');

            // 调试：打印 token 信息
            if (process.env.NODE_ENV === 'development') {
                console.log('🎉 Phone login successful');
                console.log('📍 Redirecting to:', returnUrl);
                console.log('🔐 Token received:', token ? `${token.substring(0, 50)}...` : 'N/A');
            }

            // 触发自定义事件通知 AuthProvider 更新
            const event = new Event('auth-update');
            window.dispatchEvent(event);

            // 增加延迟确保 token 已同步到 cookie 和 AuthProvider
            // 这样 middleware 能读取到新的 token
            setTimeout(() => {
                router.push(returnUrl);
            }, 500);
        } catch (error) {
            toast.error('登录失败，请重试');
            console.error('Phone login error:', error);
        } finally {
            setIsSigningIn(false);
        }
    };

    if (!mounted || isLoading) {
        return null;
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background via-background to-muted/20 px-4 py-8">
            {/* Header */}
            <Link href="/" className="mb-8">
                <KortixLogo size={32} variant="logomark" />
            </Link>

            {/* Login Card */}
            <Card className="w-full max-w-md p-6 md:p-8 border border-border bg-background/80 backdrop-blur-xl">
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold mb-2">用户登录</h1>
                    <p className="text-sm text-muted-foreground">选择您喜欢的登录方式</p>
                </div>

                {/* Login Method Tabs */}
                <div className="flex gap-2 mb-6 p-1 bg-muted/40 rounded-lg">
                    <button
                        onClick={() => {
                            setLoginMethod('password');
                            setPasswordErrors(0);
                            setShowCaptcha(false);
                            setCaptchaInput('');
                        }}
                        className={`flex-1 py-2 px-3 rounded-md font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${loginMethod === 'password'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Shield className="w-4 h-4" />
                        <span className="hidden sm:inline">密码登录</span>
                    </button>
                    <button
                        onClick={() => {
                            setLoginMethod('code');
                            setCodeSent(false);
                            setCountdown(0);
                        }}
                        className={`flex-1 py-2 px-3 rounded-md font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${loginMethod === 'code'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <User className="w-4 h-4" />
                        <span className="hidden sm:inline">验证码登录</span>
                    </button>
                </div>

                {/* Password Login */}
                {loginMethod === 'password' && (
                    <form onSubmit={handlePasswordLogin} className="space-y-4">
                        {/* Account Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">账号</label>
                            <Input
                                type="text"
                                placeholder="邮箱 / 手机号 / 账号"
                                value={account}
                                onChange={(e) => setAccount(e.target.value)}
                                disabled={isSigningIn}
                                className="bg-muted/50 border-border"
                            />
                            <p className="text-xs text-muted-foreground">
                                支持邮箱、手机号或账号登录
                            </p>
                        </div>

                        {/* Password Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">密码</label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isSigningIn}
                                    className="bg-muted/50 border-border pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Captcha (shown after 3 failed attempts) */}
                        {showCaptcha && (
                            <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border">
                                <label className="text-sm font-medium text-foreground">图文验证码</label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <Input
                                            type="text"
                                            placeholder="输入下方验证码"
                                            value={captchaInput}
                                            onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                                            disabled={isSigningIn}
                                            maxLength={4}
                                            className="bg-background border-border uppercase"
                                        />
                                    </div>
                                    <div
                                        onClick={() => generateCaptcha()}
                                        className="w-24 h-10 bg-gradient-to-br from-primary/10 to-primary/5 border border-border rounded-md flex items-center justify-center font-mono font-bold text-lg text-primary cursor-pointer hover:bg-primary/15 transition-colors select-none"
                                    >
                                        {captchaCode}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => generateCaptcha()}
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                    看不清？换一张
                                </button>
                            </div>
                        )}

                        {/* Login Button */}
                        <Button
                            type="submit"
                            disabled={isSigningIn}
                            className="w-full mt-6 bg-primary text-primary-foreground shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] border border-white/[0.12]"
                        >
                            {isSigningIn && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {isSigningIn ? '登录中...' : '登录'}
                        </Button>
                    </form>
                )}

                {/* Code Verification Login */}
                {loginMethod === 'code' && (
                    <form onSubmit={handlePhoneLogin} className="space-y-4">
                        {/* Phone Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">手机号</label>
                            <Input
                                type="tel"
                                placeholder="请输入手机号"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                                disabled={isSigningIn || codeSent}
                                className="bg-muted/50 border-border"
                            />
                        </div>

                        {/* Verification Code Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">验证码</label>
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    placeholder="请输入验证码"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    disabled={isSigningIn || !codeSent}
                                    className="flex-1 bg-muted/50 border-border"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isSigningIn || countdown > 0 || !phone}
                                    onClick={handleSendCode}
                                    className="px-4 border-border"
                                >
                                    {countdown > 0 ? `${countdown}s` : '发送'}
                                </Button>
                            </div>
                        </div>

                        {/* Login Button */}
                        <Button
                            type="submit"
                            disabled={isSigningIn || !codeSent}
                            className="w-full mt-6 bg-primary text-primary-foreground shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] border border-white/[0.12]"
                        >
                            {isSigningIn && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {isSigningIn ? '登录中...' : '登录'}
                        </Button>
                    </form>
                )}

                {/* Footer Links */}
                <div className="mt-6 pt-6 border-t border-border space-y-3">
                    <p className="text-center text-sm text-muted-foreground">
                        还没有账号？{' '}
                        <Link href="/login?tab=register" className="text-primary hover:underline font-medium">
                            立即注册
                        </Link>
                    </p>
                    <p className="text-center text-sm text-muted-foreground">
                        <Link href="/login?tab=reset" className="text-primary hover:underline font-medium">
                            忘记密码？
                        </Link>
                    </p>
                </div>
            </Card>

            {/* Demo Credentials */}
            <div className="mt-8 text-center text-xs text-muted-foreground space-y-1">
                <p className="font-semibold">测试凭证</p>
                <div className="space-y-0.5">
                    <p>邮箱：test@example.com / password123</p>
                    <p>手机号：13800138000 / password123</p>
                    <p>账号：testuser / password123</p>
                    <p>验证码：123456</p>
                </div>
            </div>
        </div>
    );
}
