import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/AuthProvider';
import { fileQueryKeys } from './use-file-queries';
import { FileCache } from '@/hooks/files';
import { toast } from 'sonner';
// Import the normalizePath function from use-file-queries
function normalizePath(path: string): string {
  if (!path) return '/';

  // Remove any leading/trailing whitespace
  path = path.trim();

  // Ensure path starts with /
  if (!path.startsWith('/')) {
    path = '/' + path;
  }

  // Remove duplicate slashes and normalize
  path = path.replace(/\/+/g, '/');

  // Remove trailing slash unless it's the root
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  return path;
}

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
const STATIC_BEARER =
  'Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6IlJndGI5enVNdm9QMXIybVEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2Rja3d2aWZvZG13aWNlbXNqdmViLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzMjY0OTg2YS1mYjhiLTQwNDQtOWVlNC0yODFiNTcwY2U1ZTgiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY3NzUwMjM2LCJpYXQiOjE3Njc3NDY2MzYsImVtYWlsIjoiNDk4MjAwMDNAcXEuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6IjQ5ODIwMDAzQHFxLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6IjMyNjQ5ODZhLWZiOGItNDA0NC05ZWU0LTI4MWI1NzBjZTVlOCIsInRlcm1zX2FjY2VwdGVkX2F0IjoiMjAyNS0xMi0yNlQwMzo1OToyNC42MDRaIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoibWFnaWNsaW5rIiwidGltZXN0YW1wIjoxNzY3NzQ2NjM2fV0sInNlc3Npb25faWQiOiI3ZDY3MmRkNS04YWNlLTQ5ZDAtOTNjNC02MGIxZWM1NGEyZmUiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.bp17AIcaOW9HQesorZRWnkblkwuYdxlLzh2Xo9fBmQs';

/**
 * Hook for uploading files
 */
export function useFileUpload() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sandboxId,
      file,
      targetPath,
    }: {
      sandboxId: string;
      file: File;
      targetPath: string;
    }) => {
      const authHeader = session?.access_token
        ? `Bearer ${session.access_token}`
        : STATIC_BEARER;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', targetPath);

      const response = await fetch(`${API_URL}/sandboxes/${sandboxId}/files`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Upload failed');
      }

      return await response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate directory listing for the target directory
      const directoryPath = variables.targetPath.substring(
        0,
        variables.targetPath.lastIndexOf('/'),
      );
      queryClient.invalidateQueries({
        queryKey: fileQueryKeys.directory(variables.sandboxId, directoryPath),
      });

      // Also invalidate all file listings to be safe
      queryClient.invalidateQueries({
        queryKey: fileQueryKeys.directories(),
      });

      toast.success(`Uploaded: ${variables.file.name}`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Upload failed: ${message}`);
    },
  });
}

/**
 * Hook for deleting files
 */
export function useFileDelete() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sandboxId,
      filePath,
    }: {
      sandboxId: string;
      filePath: string;
    }) => {
      const authHeader = session?.access_token
        ? `Bearer ${session.access_token}`
        : STATIC_BEARER;

      const response = await fetch(
        `${API_URL}/sandboxes/${sandboxId}/files?path=${encodeURIComponent(filePath)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: authHeader,
          },
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Delete failed');
      }

      return await response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate directory listing for the parent directory
      const directoryPath = variables.filePath.substring(
        0,
        variables.filePath.lastIndexOf('/'),
      );
      queryClient.invalidateQueries({
        queryKey: fileQueryKeys.directory(variables.sandboxId, directoryPath),
      });

      // Invalidate all directory listings to be safe
      queryClient.invalidateQueries({
        queryKey: fileQueryKeys.directories(),
      });

      // Invalidate all file content queries for this specific file
      // This covers all content types (text, blob, json) for the deleted file
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          // Check if this is a file content query for our sandbox and file
          return (
            queryKey.length >= 4 &&
            queryKey[0] === 'files' &&
            queryKey[1] === 'content' &&
            queryKey[2] === variables.sandboxId &&
            queryKey[3] === variables.filePath
          );
        },
      });

      // Also remove the specific queries from cache completely
      ['text', 'blob', 'json'].forEach((contentType) => {
        const queryKey = fileQueryKeys.content(
          variables.sandboxId,
          variables.filePath,
          contentType,
        );
        queryClient.removeQueries({ queryKey });
      });

      // Clean up legacy FileCache entries for this file
      const normalizedPath = normalizePath(variables.filePath);
      const legacyCacheKeys = [
        `${variables.sandboxId}:${normalizedPath}:blob`,
        `${variables.sandboxId}:${normalizedPath}:text`,
        `${variables.sandboxId}:${normalizedPath}:json`,
        `${variables.sandboxId}:${normalizedPath}`,
        // Also try without leading slash for compatibility
        `${variables.sandboxId}:${normalizedPath.substring(1)}:blob`,
        `${variables.sandboxId}:${normalizedPath.substring(1)}:text`,
        `${variables.sandboxId}:${normalizedPath.substring(1)}:json`,
        `${variables.sandboxId}:${normalizedPath.substring(1)}`,
      ];

      legacyCacheKeys.forEach((key) => {
        const cachedEntry = (FileCache as any).cache?.get(key);
        if (cachedEntry) {
          // If it's a blob URL, revoke it before deleting
          if (
            cachedEntry.type === 'url' &&
            typeof cachedEntry.content === 'string' &&
            cachedEntry.content.startsWith('blob:')
          ) {
            URL.revokeObjectURL(cachedEntry.content);
          }
          FileCache.delete(key);
        }
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Delete failed: ${message}`);
    },
  });
}

/**
 * Hook for creating files
 */
export function useFileCreate() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sandboxId,
      filePath,
      content,
    }: {
      sandboxId: string;
      filePath: string;
      content: string;
    }) => {
      const authHeader = session?.access_token
        ? `Bearer ${session.access_token}`
        : STATIC_BEARER;

      const response = await fetch(`${API_URL}/sandboxes/${sandboxId}/files`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: filePath,
          content,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Create failed');
      }

      return await response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate directory listing for the parent directory
      const directoryPath = variables.filePath.substring(
        0,
        variables.filePath.lastIndexOf('/'),
      );
      queryClient.invalidateQueries({
        queryKey: fileQueryKeys.directory(variables.sandboxId, directoryPath),
      });

      toast.success('File created successfully');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Create failed: ${message}`);
    },
  });
}
