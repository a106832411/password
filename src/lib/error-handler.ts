import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  AgentRunLimitError,
  ProjectLimitError,
  BillingError,
  TriggerLimitError,
  ModelAccessDeniedError,
  CustomWorkerLimitError,
  ThreadLimitError,
  AgentCountLimitError,
} from './api/errors';
import { usePricingModalStore } from '@/stores/pricing-modal-store';

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
  response?: Response;
}

export interface ErrorContext {
  operation?: string;
  resource?: string;
  silent?: boolean;
}

const getStatusMessage = (status: number): string => {
  switch (status) {
    case 400:
      return '请求无效。请检查输入并重试。';
    case 401:
      return '需要认证。请重新登录。';
    case 403:
      return '访问被拒绝。您没有执行此操作的权限。';
    case 404:
      return '未找到请求的资源。';
    case 408:
      return '请求超时。请重试。';
    case 409:
      return '检测到冲突。该资源可能已被其他用户修改。';
    case 422:
      return '提供的数据无效。请检查输入。';
    case 429:
      return '请求过多。请稍候再试。';
    case 500:
      return '服务器错误。我们的团队已收到通知。';
    case 502:
      return '服务暂时不可用。请稍后重试。';
    case 503:
      return '服务维护中。请稍后重试。';
    case 504:
      return '请求超时。服务器响应过慢。';
    default:
      return '发生了意外错误。请重试。';
  }
};

const extractErrorMessage = (error: any): string => {
  if (error instanceof BillingError) {
    return error.detail?.message || error.message || '检测到计费问题';
  }

  if (error instanceof AgentRunLimitError) {
    return error.detail?.message || error.message || '智能体运行次数已达上限';
  }

  if (error instanceof ProjectLimitError) {
    return error.detail?.message || error.message || '项目数量已达上限';
  }

  if (error instanceof AgentCountLimitError) {
    return error.detail?.message || error.message || '智能体数量已达上限';
  }

  if (error instanceof TriggerLimitError) {
    return error.detail?.message || error.message || '触发器数量已达上限';
  }

  if (error instanceof ModelAccessDeniedError) {
    return error.detail?.message || error.message || '模型访问被拒绝';
  }

  if (error instanceof CustomWorkerLimitError) {
    return (
      error.detail?.message || error.message || '自定义 Worker 限制已达上限'
    );
  }

  if (error instanceof ThreadLimitError) {
    return error.detail?.message || error.message || '线程数量已达上限';
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error?.response) {
    const status = error.response.status;
    return getStatusMessage(status);
  }

  if (error?.status) {
    return getStatusMessage(error.status);
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error?.message) {
    return error.message;
  }

  if (error?.error) {
    return typeof error.error === 'string'
      ? error.error
      : error.error.message || 'Unknown error';
  }

  return 'An unexpected error occurred';
};

const shouldShowError = (error: any, context?: ErrorContext): boolean => {
  if (context?.silent) {
    return false;
  }
  if (error instanceof BillingError) {
    return false;
  }

  if (error?.status === 404 && context?.resource) {
    return false;
  }

  return true;
};

const formatErrorMessage = (
  message: string,
  context?: ErrorContext,
): string => {
  if (!context?.operation && !context?.resource) {
    return message;
  }

  const parts = [];

  if (context.operation) {
    parts.push(`Failed to ${context.operation}`);
  }

  if (context.resource) {
    parts.push(context.resource);
  }

  const prefix = parts.join(' ');

  if (message.toLowerCase().includes(context.operation?.toLowerCase() || '')) {
    return message;
  }

  return `${prefix}: ${message}`;
};

export const handleApiError = (error: any, context?: ErrorContext): void => {
  console.error('API Error:', error, context);

  if (!shouldShowError(error, context)) {
    return;
  }

  const rawMessage = extractErrorMessage(error);
  const formattedMessage = formatErrorMessage(rawMessage, context);

  if (error instanceof AgentRunLimitError) {
    // Note: Translations should be handled in components that use this handler
    // This is a fallback for non-component contexts
    const upgradeMessage = `您已达到上限。智能体运行限制 (${error.detail.running_count}/${error.detail.limit})`;
    usePricingModalStore
      .getState()
      .openPricingModal({ isAlert: true, alertTitle: upgradeMessage });
    return;
  }

  if (error instanceof ProjectLimitError) {
    // Note: Translations should be handled in components that use this handler
    // This is a fallback for non-component contexts
    const upgradeMessage = `您已达到上限。项目限制 (${error.detail.current_count}/${error.detail.limit})`;
    usePricingModalStore
      .getState()
      .openPricingModal({ isAlert: true, alertTitle: upgradeMessage });
    return;
  }

  if (error instanceof ThreadLimitError) {
    const upgradeMessage = `您已达到上限。线程限制 (${error.detail.current_count}/${error.detail.limit})`;
    usePricingModalStore
      .getState()
      .openPricingModal({ isAlert: true, alertTitle: upgradeMessage });
    return;
  }

  if (error instanceof AgentCountLimitError) {
    const upgradeMessage = `您已达到上限。Worker 限制 (${error.detail.current_count}/${error.detail.limit})`;
    usePricingModalStore
      .getState()
      .openPricingModal({ isAlert: true, alertTitle: upgradeMessage });
    return;
  }

  if (error instanceof TriggerLimitError) {
    const upgradeMessage = `您已达到上限。触发器限制 (${error.detail.current_count}/${error.detail.limit})`;
    usePricingModalStore
      .getState()
      .openPricingModal({ isAlert: true, alertTitle: upgradeMessage });
    return;
  }

  if (error instanceof ModelAccessDeniedError) {
    const upgradeMessage = '升级以访问高级 AI 模型';
    usePricingModalStore
      .getState()
      .openPricingModal({ isAlert: true, alertTitle: upgradeMessage });
    return;
  }

  if (error instanceof CustomWorkerLimitError) {
    const upgradeMessage = `您已达到上限。Worker 限制 (${error.detail.current_count}/${error.detail.limit})`;
    usePricingModalStore
      .getState()
      .openPricingModal({ isAlert: true, alertTitle: upgradeMessage });
    return;
  }

  if (error instanceof BillingError) {
    // Extract billing error message and determine if credits are exhausted
    const message = error.detail?.message?.toLowerCase() || '';
    const originalMessage = error.detail?.message || '';
    const isCreditsExhausted =
      message.includes('credit') ||
      message.includes('balance') ||
      message.includes('insufficient') ||
      message.includes('out of credits') ||
      message.includes('no credits');

    // Try to extract balance from message (e.g., "Your balance is -284 credits")
    const balanceMatch = originalMessage.match(/balance is (-?\d+)\s*credits/i);
    const balance = balanceMatch ? balanceMatch[1] : null;

    // Open pricing modal with appropriate alert title and subtitle
    const alertTitle = isCreditsExhausted ? '您的积分已用完' : '账单检查失败';

    const alertSubtitle = balance
      ? `您当前的余额为 ${balance} 积分。请升级您的套餐以继续使用。`
      : isCreditsExhausted
        ? '请升级套餐以获取更多积分并继续使用 AI 助手。'
        : '请升级以继续使用。';

    usePricingModalStore.getState().openPricingModal({
      isAlert: true,
      alertTitle,
      alertSubtitle,
    });
    return;
  }

  if (error?.status >= 500) {
    toast.error(formattedMessage, {
      description: 'Our team has been notified and is working on a fix.',
      duration: 6000,
    });
  } else if (error?.status === 401) {
    // Handle authentication errors - redirect to login
    toast.error(formattedMessage, {
      description: 'Your session has expired. Please sign in again.',
      duration: 5000,
    });
    // Redirect to login page after a short delay to allow user to see the toast
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }, 1000);
  } else if (error?.status === 403) {
    toast.error(formattedMessage, {
      description: 'Contact support if you believe this is an error.',
      duration: 6000,
    });
  } else if (error?.status === 429) {
    toast.warning(formattedMessage, {
      description: 'Please wait a moment before trying again.',
      duration: 5000,
    });
  } else {
    toast.error(formattedMessage, {
      duration: 5000,
    });
  }
};

export const handleNetworkError = (
  error: any,
  context?: ErrorContext,
): void => {
  const isNetworkError =
    error?.message?.includes('fetch') ||
    error?.message?.includes('network') ||
    error?.message?.includes('connection') ||
    error?.code === 'NETWORK_ERROR' ||
    !navigator.onLine;

  if (isNetworkError) {
    toast.error('Connection error', {
      description: 'Please check your internet connection and try again.',
      duration: 6000,
    });
  } else {
    handleApiError(error, context);
  }
};

export const handleApiSuccess = (
  message: string,
  description?: string,
): void => {
  toast.success(message, {
    description,
    duration: 3000,
  });
};

export const handleApiWarning = (
  message: string,
  description?: string,
): void => {
  toast.warning(message, {
    description,
    duration: 4000,
  });
};

export const handleApiInfo = (message: string, description?: string): void => {
  toast.info(message, {
    description,
    duration: 3000,
  });
};

/**
 * Check if an error is a billing/limit error that should open the pricing modal
 */
export const isBillingError = (error: any): boolean => {
  return (
    error instanceof BillingError ||
    error instanceof AgentRunLimitError ||
    error instanceof ProjectLimitError ||
    error instanceof ThreadLimitError ||
    error instanceof AgentCountLimitError ||
    error instanceof TriggerLimitError ||
    error instanceof ModelAccessDeniedError ||
    error instanceof CustomWorkerLimitError
  );
};

/**
 * Handle billing errors by opening the pricing modal with appropriate message.
 * Returns true if error was handled, false otherwise.
 * Use this in mutation onError callbacks.
 */
export const handleBillingError = (error: any): boolean => {
  if (!isBillingError(error)) {
    return false;
  }

  handleApiError(error);
  return true;
};
