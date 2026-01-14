'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ReactNode, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { locales, defaultLocale, type Locale } from '@/i18n/config';
import { detectBestLocale } from '@/lib/utils/geo-detection';
import { createClient } from '@/lib/supabase/client';

// 预加载默认翻译以用于立即渲染
// 这样可以避免加载指示器阻塞首屏渲染（FCP）
import defaultTranslations from '../../translations/zh.json';

async function getTranslations(locale: Locale) {
  try {
    // 如果请求的是默认语言，立即返回预缓存的默认翻译（中文）
    if (locale === defaultLocale) {
      return defaultTranslations;
    }
    return (await import(`../../translations/${locale}.json`)).default;
  } catch (error) {
    console.error(`Failed to load translations for locale ${locale}:`, error);
    // 若 locale 文件不存在，则回退到默认语言（中文）
    return defaultTranslations;
  }
}

/**
 * Gets the stored locale with priority:
 * 1. User profile preference (from user_metadata) - ALWAYS highest priority
 * 2. Cookie (explicit user preference)
 * 3. localStorage (explicit user preference)
 * 4. Geo-detection (timezone/browser) - default when nothing is set
 * 5. Default locale
 */
async function getStoredLocale(): Promise<Locale> {
  if (typeof window === 'undefined') return defaultLocale;

  try {
    // Priority 1: Check user profile preference (if authenticated)
    // This ALWAYS takes precedence - user explicitly set it in settings
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.locale && locales.includes(user.user_metadata.locale as Locale)) {
      return user.user_metadata.locale as Locale;
    }
  } catch (error) {
    // Silently fail - user might not be authenticated
  }

  // Priority 2: Check cookie (explicit user preference)
  const cookies = document.cookie.split(';');
  const localeCookie = cookies.find(c => c.trim().startsWith('locale='));
  if (localeCookie) {
    const value = localeCookie.split('=')[1].trim();
    if (locales.includes(value as Locale)) {
      return value as Locale;
    }
  }

  // Priority 3: Check localStorage (explicit user preference)
  const stored = localStorage.getItem('locale');
  if (stored && locales.includes(stored as Locale)) {
    return stored as Locale;
  }

  // Priority 4: Geo-detection (default when nothing is explicitly set)
  const geoDetected = detectBestLocale();
  return geoDetected;
}

// Custom event name for locale changes (must match use-language.ts)
const LOCALE_CHANGE_EVENT = 'locale-change';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  // 使用预加载的默认翻译（中文）初始化以避免阻塞首屏渲染
  const [messages, setMessages] = useState<any>(defaultTranslations);
  const [isLoading, setIsLoading] = useState(false);
  const localeRef = useRef(locale);

  // Update ref when locale changes
  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  // Load translations for a given locale - memoized to avoid stale closures
  const loadTranslations = useCallback(async (targetLocale: Locale) => {
    setIsLoading(true);
    try {
      const translations = await getTranslations(targetLocale);
      // Verify critical sections exist
      if (!translations || typeof translations !== 'object') {
        throw new Error(`Invalid translations object for locale ${targetLocale}`);
      }
      if (!translations.common || !translations.suna) {
        console.warn(`Missing sections in ${targetLocale}:`, {
          hasCommon: !!translations.common,
          hasSuna: !!translations.suna,
          keys: Object.keys(translations).slice(0, 10)
        });
      }
      setMessages(translations);
      setLocale(targetLocale);
      localeRef.current = targetLocale;
    } catch (error) {
      console.error(`Failed to load translations for ${targetLocale}:`, error);
      // Fallback to default locale
      try {
        const defaultTranslations = await getTranslations(defaultLocale);
        setMessages(defaultTranslations);
        setLocale(defaultLocale);
        localeRef.current = defaultLocale;
      } catch (fallbackError) {
        console.error('Failed to load default locale translations:', fallbackError);
        // Last resort: empty translations object
        setMessages({});
        setLocale(defaultLocale);
        localeRef.current = defaultLocale;
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load - check user metadata, then cookie/localStorage, then geo-detect
  useEffect(() => {
    let mounted = true;

    async function initializeLocale() {
      const currentLocale = await getStoredLocale();

      if (!mounted) return;

      // Check if user has explicitly set a preference (metadata, cookie, or localStorage)
      const supabase = createClient();
      let hasExplicitPreference = false;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.locale) {
          hasExplicitPreference = true;
        }
      } catch (error) {
        // User might not be authenticated
      }

      const cookies = document.cookie.split(';');
      const hasLocaleCookie = cookies.some(c => c.trim().startsWith('locale='));
      const hasLocalStorage = localStorage.getItem('locale');

      hasExplicitPreference = hasExplicitPreference || hasLocaleCookie || !!hasLocalStorage;

      // Only auto-save geo-detected locale if:
      // 1. User has NO explicit preference (no metadata, cookie, or localStorage)
      // 2. Geo-detected locale is different from default
      // 3. User is NOT authenticated OR authenticated but has no locale in metadata
      if (!hasExplicitPreference && currentLocale !== defaultLocale) {
        // Save geo-detected locale to cookie and localStorage for persistence
        const cookieValue = `locale=${currentLocale}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = cookieValue;
        localStorage.setItem('locale', currentLocale);
      }

      if (mounted) {
        setLocale(currentLocale);
        loadTranslations(currentLocale);
      }
    }

    initializeLocale();

    return () => {
      mounted = false;
    };
  }, [loadTranslations]);

  // Listen for locale change events from useLanguage hook
  useEffect(() => {
    const handleLocaleChange = (e: CustomEvent<Locale>) => {
      const newLocale = e.detail;
      // Use ref to check current locale to avoid stale closure
      if (newLocale !== localeRef.current && locales.includes(newLocale)) {
        loadTranslations(newLocale);
      }
    };

    window.addEventListener(LOCALE_CHANGE_EVENT as any, handleLocaleChange as EventListener);

    return () => {
      window.removeEventListener(LOCALE_CHANGE_EVENT as any, handleLocaleChange as EventListener);
    };
  }, [loadTranslations]);

  // Listen for storage changes (when language is changed in another tab/window)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'locale' && e.newValue && locales.includes(e.newValue as Locale)) {
        loadTranslations(e.newValue as Locale);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadTranslations]);

  // Memoize messages to prevent unnecessary re-renders
  const safeMessages = useMemo(() => messages || defaultTranslations, [messages]);

  // 立即渲染子节点并使用可用的翻译
  // 这可以防止阻塞首屏渲染 — 我们以默认语言（中文）启动并按需切换
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={safeMessages}
      timeZone="UTC"
    >
      {children}
    </NextIntlClientProvider>
  );
}

