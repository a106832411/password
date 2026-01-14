'use client';

import { useState } from 'react';
import { Icons } from './home/icons';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface GoogleSignInProps {
  returnUrl?: string;
  referralCode?: string;
}

export default function GoogleSignIn({ returnUrl, referralCode }: GoogleSignInProps) {
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations('auth');

  const handleGoogleSignIn = () => {
    if (isLoading) return;
    setIsLoading(true);

    if (referralCode) {
      document.cookie = `pending-referral-code=${referralCode.trim().toUpperCase()}; path=/; max-age=600; SameSite=Lax`;
    }

    const target = returnUrl || '/dashboard';
    window.location.href = target;
  };

  return (
    <Button
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      variant="outline"
      size="lg"
      className="w-full h-12"
      type="button"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
       <Loader2 className="w-4 h-4 animate-spin" />
      )}
      <span>
        {isLoading ? t('signingIn') : t('continueWithGoogle')}
      </span>
    </Button>
  );
}