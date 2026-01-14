import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

interface MCPServer {
  qualifiedName: string;
  displayName: string;
  description: string;
  createdAt: string;
  useCount: number;
  homepage: string;
  iconUrl?: string;
  isDeployed?: boolean;
  connections?: any[];
  tools?: any[];
  security?: any;
}

interface MCPServerDetailResponse {
  qualifiedName: string;
  displayName: string;
  iconUrl?: string;
  deploymentUrl?: string;
  connections: any[];
  security?: any;
  tools?: any[];
}

export const useMCPServerDetails = (
  qualifiedName: string,
  enabled: boolean = true,
) => {
  const supabase = createClient();

  return useQuery({
    queryKey: ['mcp-server-details', qualifiedName],
    queryFn: async (): Promise<MCPServerDetailResponse> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(`${API_URL}/mcp/servers/${qualifiedName}`, {
        headers: {
          Authorization:
            'Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6IlJndGI5enVNdm9QMXIybVEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2Rja3d2aWZvZG13aWNlbXNqdmViLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzMjY0OTg2YS1mYjhiLTQwNDQtOWVlNC0yODFiNTcwY2U1ZTgiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY3NzUwMjM2LCJpYXQiOjE3Njc3NDY2MzYsImVtYWlsIjoiNDk4MjAwMDNAcXEuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6IjQ5ODIwMDAzQHFxLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6IjMyNjQ5ODZhLWZiOGItNDA0NC05ZWU0LTI4MWI1NzBjZTVlOCIsInRlcm1zX2FjY2VwdGVkX2F0IjoiMjAyNS0xMi0yNlQwMzo1OToyNC42MDRaIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoibWFnaWNsaW5rIiwidGltZXN0YW1wIjoxNzY3NzQ2NjM2fV0sInNlc3Npb25faWQiOiI3ZDY3MmRkNS04YWNlLTQ5ZDAtOTNjNC02MGIxZWM1NGEyZmUiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.bp17AIcaOW9HQesorZRWnkblkwuYdxlLzh2Xo9fBmQs',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch MCP server details');
      }

      return response.json();
    },
    enabled: enabled && !!qualifiedName,
    staleTime: 10 * 60 * 1000,
  });
};
