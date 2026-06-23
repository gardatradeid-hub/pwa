/**
 * Audit logger for Garda edge functions.
 *
 * Logs every API call to the audit_logs table with user, action, request/response,
 * and error data. Call at the end of each edge function handler.
 *
 * Usage:
 *   import { logAudit, Action } from '../_shared/logger.ts';
 *   await logAudit(supabase, { userId, userEmail, action: Action.EXECUTE_TRADE, functionName: 'execute-trade', requestBody, responseStatus: 200, responseBody });
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const Action = {
  CONNECT_EXCHANGE: 'connect_exchange',
  EXECUTE_TRADE: 'execute_trade',
  CLOSE_TRADE: 'close_trade',
  GET_TICKER: 'get_ticker',
  GET_OHLCV: 'get_ohlcv',
  GET_BALANCE: 'get_balance',
  GET_POSITIONS: 'get_positions',
  GET_MARKETS: 'get_markets',
  ADMIN_LIST_USERS: 'admin_list_users',
  ADMIN_UPDATE_USER: 'admin_update_user',
  ADMIN_GET_CONFIG: 'admin_get_config',
  ADMIN_UPDATE_CONFIG: 'admin_update_config',
  ADMIN_GET_LOGS: 'admin_get_logs',
} as const;

export type ActionType = (typeof Action)[keyof typeof Action];

interface LogInput {
  userId?: string;
  userEmail?: string;
  action: string;
  functionName: string;
  requestBody?: unknown;
  responseStatus: number;
  responseBody?: unknown;
  errorMessage?: string;
  ipAddress?: string;
}

/**
 * Insert an audit log entry. Fails silently if DB write fails (non-critical).
 */
export async function logAudit(
  supabaseClient: ReturnType<typeof createClient>,
  input: LogInput,
): Promise<void> {
  try {
    await supabaseClient.from('audit_logs').insert({
      user_id: input.userId || null,
      user_email: input.userEmail || null,
      action: input.action,
      function_name: input.functionName,
      request_body: input.requestBody ? JSON.parse(JSON.stringify(input.requestBody)) : null,
      response_status: input.responseStatus,
      response_body: input.responseBody ? JSON.parse(JSON.stringify(input.responseBody)) : null,
      error_message: input.errorMessage || null,
      ip_address: input.ipAddress || null,
    });
  } catch (_) {
    // audit logging must never break the main flow
  }
}
