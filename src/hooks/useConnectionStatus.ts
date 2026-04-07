import { useTranslatorHealth, useJdcHealth, usePoolData } from './usePoolData';
import { useSetupStatus } from './useSetupStatus';

export interface ConnectionStatus {
  status: 'connected' | 'connecting' | 'disconnected';
  statusLabel: string | null;
  poolName: string | null;
  uptime: number;
}

/**
 * Single source of truth for header connection status.
 * Use this in any page that renders <Shell> to keep the indicator consistent.
 */
export function useConnectionStatus(): ConnectionStatus {
  const { miningMode, mode: templateMode, poolName } = useSetupStatus();
  const { isJdMode, global: poolGlobal } = usePoolData(templateMode);

  const { data: translatorOk, isLoading: translatorHealthLoading, isError: translatorHealthError } =
    useTranslatorHealth();
  const { data: jdcOk, isLoading: jdcHealthLoading, isError: jdcHealthError } =
    useJdcHealth(isJdMode);

  const translatorHealthy = translatorOk === true && !translatorHealthError;
  const jdcHealthy        = jdcOk === true && !jdcHealthError;
  const isHealthLoading   = translatorHealthLoading || (isJdMode && jdcHealthLoading);
  const isPoolConnected   = isJdMode ? (translatorHealthy && jdcHealthy) : translatorHealthy;
  const isSovereignSolo   = miningMode === 'solo' && templateMode === 'jd';

  return {
    status:   isHealthLoading ? 'connecting' : isPoolConnected ? 'connected' : 'disconnected',
    statusLabel: isSovereignSolo ? 'Mining services healthy' : null,
    poolName: poolName ?? null,
    uptime:   poolGlobal?.uptime_secs ?? 0,
  };
}
