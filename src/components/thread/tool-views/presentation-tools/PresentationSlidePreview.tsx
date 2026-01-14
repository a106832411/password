import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PresentationSlideCard } from './PresentationSlideCard';
import { constructHtmlPreviewUrl } from '@/lib/utils/url';
import { Project } from '@/lib/api/threads';
import { Loader2, RefreshCw, Presentation } from 'lucide-react';
import { usePresentationViewerStore } from '@/stores/presentation-viewer-store';
import { Button } from '@/components/ui/button';

interface PresentationSlidePreviewProps {
  presentationName: string;
  project?: Project;
  onFullScreenClick?: (slideNumber: number) => void;
  className?: string;
  initialSlide?: number; // Optional slide number to show (defaults to first slide)
}

interface SlideMetadata {
  title: string;
  filename: string;
  file_path: string;
  preview_url: string;
  created_at: string;
}

interface PresentationMetadata {
  presentation_name: string;
  title: string;
  description: string;
  slides: Record<string, SlideMetadata>;
  created_at: string;
  updated_at: string;
}

const sanitizeFilename = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9\-_]/g, '').toLowerCase();
};

export function PresentationSlidePreview({
  presentationName,
  project,
  onFullScreenClick,
  className = '',
  initialSlide,
}: PresentationSlidePreviewProps) {
  const { openPresentation } = usePresentationViewerStore();
  const [metadata, setMetadata] = useState<PresentationMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 10; // Retry up to 10 times

  const loadMetadata = useCallback(async (retry: number = 0) => {
    if (!presentationName || !project?.sandbox?.sandbox_url) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setRetryCount(retry);

    try {
      const sanitizedName = sanitizeFilename(presentationName);
      const metadataUrl = constructHtmlPreviewUrl(
        project.sandbox.sandbox_url,
        `presentations/${sanitizedName}/metadata.json`
      );

      const urlWithCacheBust = `${metadataUrl}?t=${Date.now()}`;
      console.log(`[PresentationSlidePreview] Loading metadata (attempt ${retry + 1}):`, urlWithCacheBust);

      const response = await fetch(urlWithCacheBust, {
        cache: 'no-cache',
        credentials: 'include', // Include cookies for Daytona auth
        headers: {
          'Cache-Control': 'no-cache',
          'Accept': 'application/json',
          'X-Daytona-Skip-Preview-Warning': 'true',
        },
      });

      if (response.ok) {
        const responseText = await response.text();

        // Validate that we got JSON, not HTML (Daytona warning page or error page)
        const trimmed = responseText.trim();
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
          // Check if it's a Daytona warning page - this is a transient condition, retry
          if (trimmed.includes('daytona.io') || trimmed.includes('Preview URL Warning')) {
            console.log('[PresentationSlidePreview] Detected Daytona warning page, will retry...');
            throw new Error('DAYTONA_WARNING_PAGE');
          }
          throw new Error(`Expected JSON but received HTML: ${trimmed.substring(0, 80)}`);
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        }

        console.log('[PresentationSlidePreview] Metadata loaded successfully:', data);
        setMetadata(data);
        setIsLoading(false);
        setError(null);
      } else if (response.status === 404) {
        // 404: File not found - don't retry, show error immediately
        throw new Error('Presentation not found. Ensure the presentation has been created.');
      } else if (response.status === 502 || response.status === 503 || response.status === 500) {
        // 5xx errors: Sandbox might be starting, retry
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[PresentationSlidePreview] Error loading metadata (attempt ${retry + 1}):`, err);

      // Don't retry for 404 errors (presentation doesn't exist)
      const is404Error = errorMessage.includes('Presentation not found');
      // DO retry for Daytona warning pages (transient, sandbox is initializing)
      const isDaytonaWarning = errorMessage.includes('DAYTONA_WARNING_PAGE');

      // Retry with exponential backoff if we haven't exceeded max retries and it's a transient error
      if (retry < maxRetries && (!is404Error || isDaytonaWarning)) {
        const delay = isDaytonaWarning
          ? Math.min(1000 * Math.pow(2, retry), 10000) // Longer delays for Daytona warning (up to 10s)
          : Math.min(1000 * Math.pow(1.5, retry), 5000); // Shorter delays for other errors
        console.log(`[PresentationSlidePreview] Retrying in ${delay}ms...`);

        retryTimeoutRef.current = setTimeout(() => {
          loadMetadata(retry + 1);
        }, delay);
      } else {
        setError(errorMessage);
        setIsLoading(false);
      }
    }
  }, [presentationName, project?.sandbox?.sandbox_url]);

  useEffect(() => {
    loadMetadata(0);

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [loadMetadata]);

  // Show loading state
  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 bg-muted/30 rounded-lg border ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
        <span className="text-sm text-muted-foreground">Loading presentation...</span>
        {retryCount > 0 && (
          <span className="text-xs text-muted-foreground/70 mt-1">
            Attempt {retryCount + 1}
          </span>
        )}
      </div>
    );
  }

  // Show error state with retry button
  if (error || !metadata) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 bg-muted/30 rounded-lg border ${className}`}>
        <Presentation className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground mb-3">
          {error || 'Presentation not found'}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadMetadata(0)}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  // Get slides and find the one to display
  const slides = Object.entries(metadata.slides)
    .map(([num, slide]) => ({ number: parseInt(num), ...slide }))
    .sort((a, b) => a.number - b.number);

  // Find the slide to display: use initialSlide if provided, otherwise use first slide
  const slideToDisplay = initialSlide
    ? slides.find(slide => slide.number === initialSlide) || slides[0]
    : slides[0];

  if (!slideToDisplay) {
    return null;
  }

  const handleFullScreenClick = (slideNumber: number) => {
    if (onFullScreenClick) {
      onFullScreenClick(slideNumber);
    } else if (openPresentation && project?.sandbox?.sandbox_url) {
      // Open full screen presentation viewer directly using shared context
      openPresentation(presentationName, project.sandbox.sandbox_url, slideNumber);
    }
  };

  return (
    <PresentationSlideCard
      slide={slideToDisplay}
      project={project}
      onFullScreenClick={handleFullScreenClick}
      className={className}
      showFullScreenButton={true}
    />
  );
}

