import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { knowledgeBaseKeys } from './keys';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
const STATIC_BEARER =
  'Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6IlJndGI5enVNdm9QMXIybVEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2Rja3d2aWZvZG13aWNlbXNqdmViLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzMjY0OTg2YS1mYjhiLTQwNDQtOWVlNC0yODFiNTcwY2U1ZTgiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY3NzUwMjM2LCJpYXQiOjE3Njc3NDY2MzYsImVtYWlsIjoiNDk4MjAwMDNAcXEuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6IjQ5ODIwMDAzQHFxLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6IjMyNjQ5ODZhLWZiOGItNDA0NC05ZWU0LTI4MWI1NzBjZTVlOCIsInRlcm1zX2FjY2VwdGVkX2F0IjoiMjAyNS0xMi0yNlQwMzo1OToyNC42MDRaIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoibWFnaWNsaW5rIiwidGltZXN0YW1wIjoxNzY3NzQ2NjM2fV0sInNlc3Npb25faWQiOiI3ZDY3MmRkNS04YWNlLTQ5ZDAtOTNjNC02MGIxZWM1NGEyZmUiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.bp17AIcaOW9HQesorZRWnkblkwuYdxlLzh2Xo9fBmQs';

// Only keep the types that are actually used
export interface KnowledgeBaseEntry {
  entry_id: string;
  name: string;
  description?: string;
  content: string;
  usage_context: 'always' | 'on_request' | 'contextual';
  is_active: boolean;
  content_tokens?: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateKnowledgeBaseEntryRequest {
  name?: string;
  description?: string;
  content?: string;
  usage_context?: 'always' | 'on_request' | 'contextual';
  is_active?: boolean;
}

const useAuthHeaders = () => {
  const getHeaders = async () => {
    return {
      Authorization: STATIC_BEARER,
      'Content-Type': 'application/json',
    };
  };

  return { getHeaders };
};

export function useKnowledgeBaseEntry(entryId: string) {
  const { getHeaders } = useAuthHeaders();

  return useQuery({
    queryKey: knowledgeBaseKeys.entry(entryId),
    queryFn: async (): Promise<KnowledgeBaseEntry> => {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/knowledge-base/${entryId}`, {
        headers,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to fetch knowledge base entry');
      }

      return await response.json();
    },
    enabled: !!entryId,
  });
}

export function useUpdateKnowledgeBaseEntry() {
  const queryClient = useQueryClient();
  const { getHeaders } = useAuthHeaders();

  return useMutation({
    mutationFn: async ({
      entryId,
      data,
    }: {
      entryId: string;
      data: UpdateKnowledgeBaseEntryRequest;
    }) => {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/knowledge-base/${entryId}`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to update knowledge base entry');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.all });
      toast.success('Knowledge base entry updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update knowledge base entry: ${error.message}`);
    },
  });
}

export function useDeleteKnowledgeBaseEntry() {
  const queryClient = useQueryClient();
  const { getHeaders } = useAuthHeaders();

  return useMutation({
    mutationFn: async (entryId: string) => {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/knowledge-base/${entryId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to delete knowledge base entry');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.all });
      toast.success('Knowledge base entry deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete knowledge base entry: ${error.message}`);
    },
  });
}

export function useAgentKnowledgeBaseContext(
  agentId: string,
  maxTokens = 4000,
) {
  const { getHeaders } = useAuthHeaders();

  return useQuery({
    queryKey: knowledgeBaseKeys.agentContext(agentId),
    queryFn: async () => {
      const headers = await getHeaders();
      const url = new URL(
        `${API_URL}/knowledge-base/agents/${agentId}/context`,
      );
      url.searchParams.set('max_tokens', maxTokens.toString());

      const response = await fetch(url.toString(), { headers });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          error || 'Failed to fetch agent knowledge base context',
        );
      }

      return await response.json();
    },
    enabled: !!agentId,
  });
}
