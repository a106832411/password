/**
 * API Request Helper with JWT Authentication
 * 带 JWT 认证的 API 请求助手
 */

import { getAuthHeaders, authFetch } from './jwt';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

/**
 * 执行带认证的 GET 请求
 */
export async function apiGet<T = any>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await authFetch(url, {
      method: 'GET',
    });

    const data = await response.json();

    return {
      data: response.ok ? data : undefined,
      error: response.ok ? undefined : data.error || data.message,
      status: response.status,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '请求失败',
      status: 500,
    };
  }
}

/**
 * 执行带认证的 POST 请求
 */
export async function apiPost<T = any>(
  url: string,
  body: any,
): Promise<ApiResponse<T>> {
  try {
    const response = await authFetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return {
      data: response.ok ? data : undefined,
      error: response.ok ? undefined : data.error || data.message,
      status: response.status,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '请求失败',
      status: 500,
    };
  }
}

/**
 * 执行带认证的 PUT 请求
 */
export async function apiPut<T = any>(
  url: string,
  body: any,
): Promise<ApiResponse<T>> {
  try {
    const response = await authFetch(url, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return {
      data: response.ok ? data : undefined,
      error: response.ok ? undefined : data.error || data.message,
      status: response.status,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '请求失败',
      status: 500,
    };
  }
}

/**
 * 执行带认证的 DELETE 请求
 */
export async function apiDelete<T = any>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await authFetch(url, {
      method: 'DELETE',
    });

    const data = response.status !== 204 ? await response.json() : null;

    return {
      data: response.ok ? data : undefined,
      error: response.ok ? undefined : data?.error || data?.message,
      status: response.status,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '请求失败',
      status: 500,
    };
  }
}

/**
 * 执行带认证的 PATCH 请求
 */
export async function apiPatch<T = any>(
  url: string,
  body: any,
): Promise<ApiResponse<T>> {
  try {
    const response = await authFetch(url, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return {
      data: response.ok ? data : undefined,
      error: response.ok ? undefined : data.error || data.message,
      status: response.status,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '请求失败',
      status: 500,
    };
  }
}

/**
 * 上传文件（带认证）
 */
export async function apiUpload<T = any>(
  url: string,
  file: File,
  additionalData?: Record<string, any>,
): Promise<ApiResponse<T>> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(
          key,
          typeof value === 'string' ? value : JSON.stringify(value),
        );
      });
    }

    const headers = getAuthHeaders();
    delete (headers as any)['Content-Type']; // Let browser set Content-Type with boundary

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();

    return {
      data: response.ok ? data : undefined,
      error: response.ok ? undefined : data.error || data.message,
      status: response.status,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '上传失败',
      status: 500,
    };
  }
}
