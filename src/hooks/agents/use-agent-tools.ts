import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

export interface AgentTool {
  name: string;
  description: string;
  type: 'agentpress' | 'mcp';
  server?: string;
  enabled: boolean;
  icon?: string;
  color?: string;
}

interface AgentToolsResponse {
  agentpress_tools: AgentTool[];
  mcp_tools: AgentTool[];
}

const fetchAgentTools = async (
  agentId: string,
): Promise<AgentToolsResponse> => {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You must be logged in to get agent tools');
  }

  const response = await fetch(`${API_URL}/agents/${agentId}/tools`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization:
        'Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6IlJndGI5enVNdm9QMXIybVEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2Rja3d2aWZvZG13aWNlbXNqdmViLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzMjY0OTg2YS1mYjhiLTQwNDQtOWVlNC0yODFiNTcwY2U1ZTgiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY3NzUwMjM2LCJpYXQiOjE3Njc3NDY2MzYsImVtYWlsIjoiNDk4MjAwMDNAcXEuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6IjQ5ODIwMDAzQHFxLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6IjMyNjQ5ODZhLWZiOGItNDA0NC05ZWU0LTI4MWI1NzBjZTVlOCIsInRlcm1zX2FjY2VwdGVkX2F0IjoiMjAyNS0xMi0yNlQwMzo1OToyNC42MDRaIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoibWFnaWNsaW5rIiwidGltZXN0YW1wIjoxNzY3NzQ2NjM2fV0sInNlc3Npb25faWQiOiI3ZDY3MmRkNS04YWNlLTQ5ZDAtOTNjNC02MGIxZWM1NGEyZmUiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.bp17AIcaOW9HQesorZRWnkblkwuYdxlLzh2Xo9fBmQs',
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: 'Unknown error' }));
    throw new Error(
      errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
    );
  }

  const toolsResponse = (await response.json()) as AgentToolsResponse;
  return toolsResponse;
};

export const useAgentTools = (agentId: string) => {
  return useQuery({
    queryKey: ['agent-tools', agentId],
    queryFn: () => fetchAgentTools(agentId),
    staleTime: 5 * 60 * 1000,
    enabled: !!agentId,
  });
};
