'use client';

import { useState } from 'react';
import { Icons } from './home/icons';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface GitHubSignInProps {
  returnUrl?: string;
  referralCode?: string;
}

export default function GitHubSignIn({ returnUrl, referralCode }: GitHubSignInProps) {
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations('auth');

  const handleGitHubSignIn = () => {
    if (isLoading) return;
    setIsLoading(true);

    if (referralCode) {
      document.cookie = `pending-referral-code=${referralCode.trim().toUpperCase()}; path=/; max-age=600; SameSite=Lax`;
    }

    const target = returnUrl || '/dashboard';
    window.location.href = target;
  };

  return (
    <div className="relative">
      <Button
        onClick={handleGitHubSignIn}
        disabled={isLoading}
        variant="outline"
        size="lg"
        className="w-full h-12"
        aria-label={
          isLoading ? 'Signing in with GitHub...' : 'Sign in with GitHub'
        }
        type="button"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          // <Icons.github className="w-4 h-4" />
             <Loader2 className="w-4 h-4 animate-spin" />
        )}
        <span>
          {isLoading ? t('signingIn') : t('continueWithGitHub')}
        </span>
      </Button>

    </div>
  );
}