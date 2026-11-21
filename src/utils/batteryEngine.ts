export type ChargeStatus = 'CHARGING' | 'FULL' | 'UNPLUGGED';

export type TemperatureSeverity = 'NORMAL' | 'WARM' | 'HIGH';

export interface BatterySimState {
  level: number; // 0..100
  isPluggedIn: boolean;
  temperatureC: number; // e.g., 32.5
  isMonitoring: boolean;
  threshold: number; // 80..100, default 100
  isAlarmRinging: boolean;
  dismissedForCurrentCycle: boolean;
  isScreenOff: boolean;
  hasNotificationPermission: boolean;
  wakeLockHeld: boolean;
}

export interface BatteryEventEntry {
  id: string;
  timestamp: string;
  action: string;
  detail: string;
  severity: 'info' | 'success' | 'warning' | 'alarm';
}

export const DEFAULT_BATTERY_STATE: BatterySimState = {
  level: 88,
  isPluggedIn: true,
  temperatureC: 33.4,
  isMonitoring: false,
  threshold: 100,
  isAlarmRinging: false,
  dismissedForCurrentCycle: false,
  isScreenOff: false,
  hasNotificationPermission: true,
  wakeLockHeld: false,
};

export function clampBatteryLevel(level: number): number {
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.min(100, Math.round(level)));
}

export function clampThreshold(threshold: number): number {
  if (!Number.isFinite(threshold)) return 100;
  return Math.max(80, Math.min(100, Math.round(threshold)));
}

export function clampTemperature(tempC: number): number {
  if (!Number.isFinite(tempC)) return 25;
  return Math.max(15, Math.min(55, Math.round(tempC * 10) / 10));
}

export function getChargeStatus(level: number, isPluggedIn: boolean): ChargeStatus {
  if (!isPluggedIn) return 'UNPLUGGED';
  if (level >= 100) return 'FULL';
  return 'CHARGING';
}

export function getChargeStatusLabel(status: ChargeStatus): string {
  switch (status) {
    case 'CHARGING':
      return 'En charge';
    case 'FULL':
      return 'Charge complète';
    case 'UNPLUGGED':
      return 'Débranché';
  }
}

export function getTemperatureSeverity(tempC: number): TemperatureSeverity {
  if (tempC >= 42) return 'HIGH';
  if (tempC >= 37) return 'WARM';
  return 'NORMAL';
}

export function getTemperatureLabel(severity: TemperatureSeverity): string {
  switch (severity) {
    case 'NORMAL':
      return 'Température normale';
    case 'WARM':
      return 'Légèrement tiède';
    case 'HIGH':
      return 'Température élevée';
  }
}

export interface TransitionResult {
  nextState: BatterySimState;
  event: Omit<BatteryEventEntry, 'id' | 'timestamp'> | null;
}

/**
 * Pure state machine mirroring Android's BatteryMonitorService BroadcastReceiver
 * logic for Intent.ACTION_BATTERY_CHANGED and user commands.
 */
export function evaluateBatteryUpdate(
  prev: BatterySimState,
  patch: Partial<Pick<BatterySimState, 'level' | 'isPluggedIn' | 'temperatureC' | 'threshold' | 'isMonitoring' | 'isScreenOff' | 'hasNotificationPermission'>>
): TransitionResult {
  const nextLevel = patch.level !== undefined ? clampBatteryLevel(patch.level) : prev.level;
  const nextPlugged = patch.isPluggedIn !== undefined ? patch.isPluggedIn : prev.isPluggedIn;
  const nextTemp = patch.temperatureC !== undefined ? clampTemperature(patch.temperatureC) : prev.temperatureC;
  const nextThreshold = patch.threshold !== undefined ? clampThreshold(patch.threshold) : prev.threshold;
  const nextMonitoring = patch.isMonitoring !== undefined ? patch.isMonitoring : prev.isMonitoring;
  const nextScreenOff = patch.isScreenOff !== undefined ? patch.isScreenOff : prev.isScreenOff;
  const nextPerm =
    patch.hasNotificationPermission !== undefined
      ? patch.hasNotificationPermission
      : prev.hasNotificationPermission;

  let dismissed = prev.dismissedForCurrentCycle;
  let isAlarmRinging = prev.isAlarmRinging;
  let event: Omit<BatteryEventEntry, 'id' | 'timestamp'> | null = null;

  // Reset cycle dismissal if battery falls below threshold, charger is unplugged,
  // or threshold was raised above current level.
  if (!nextPlugged || nextLevel < nextThreshold) {
    dismissed = false;
  }

  // Monitoring turned off -> stop alarm and release WakeLock immediately
  if (!nextMonitoring) {
    if (prev.isAlarmRinging) {
      event = {
        action: 'ACTION_STOP_MONITORING',
        detail: 'Surveillance désactivée : arrêt du service et de l’alarme.',
        severity: 'info',
      };
    } else if (prev.isMonitoring) {
      event = {
        action: 'STOP_FOREGROUND',
        detail: 'BatteryMonitorService arrêté, BroadcastReceiver désenregistré.',
        severity: 'info',
      };
    }
    return {
      nextState: {
        level: nextLevel,
        isPluggedIn: nextPlugged,
        temperatureC: nextTemp,
        isMonitoring: false,
        threshold: nextThreshold,
        isAlarmRinging: false,
        dismissedForCurrentCycle: false,
        isScreenOff: nextScreenOff,
        hasNotificationPermission: nextPerm,
        wakeLockHeld: false,
      },
      event,
    };
  }

  // Monitoring was just enabled
  if (!prev.isMonitoring && nextMonitoring) {
    event = {
      action: 'START_FOREGROUND',
      detail: `BatteryMonitorService démarré (seuil ${nextThreshold} %, notification persistante active).`,
      severity: 'success',
    };
  }

  // Cable unplugged while alarm is ringing -> automatic alarm stop
  if (!nextPlugged && prev.isAlarmRinging) {
    isAlarmRinging = false;
    event = {
      action: 'BATTERY_STATUS_DISCHARGING',
      detail: 'Câble débranché : arrêt automatique de l’alarme et de la vibration.',
      severity: 'success',
    };
  } else if (nextPlugged && nextLevel >= nextThreshold && !dismissed) {
    // Trigger alarm if monitoring + plugged in (CHARGING or FULL) + level >= threshold
    if (!prev.isAlarmRinging) {
      isAlarmRinging = true;
      event = {
        action: 'ALARM_TRIGGERED',
        detail: `Seuil ${nextThreshold} % atteint (${nextLevel} %) — USAGE_ALARM + vibration continue${nextScreenOff ? ' (WakeLock actif, écran éteint)' : ''}.`,
        severity: 'alarm',
      };
    }
  } else if (nextLevel < nextThreshold && prev.isAlarmRinging) {
    isAlarmRinging = false;
  }

  return {
    nextState: {
      level: nextLevel,
      isPluggedIn: nextPlugged,
      temperatureC: nextTemp,
      isMonitoring: nextMonitoring,
      threshold: nextThreshold,
      isAlarmRinging,
      dismissedForCurrentCycle: dismissed,
      isScreenOff: nextScreenOff,
      hasNotificationPermission: nextPerm,
      wakeLockHeld: nextMonitoring && isAlarmRinging,
    },
    event,
  };
}

export function dismissAlarm(
  prev: BatterySimState,
  source: 'APP_BUTTON' | 'NOTIFICATION_ACTION'
): TransitionResult {
  if (!prev.isAlarmRinging) {
    return { nextState: prev, event: null };
  }

  return {
    nextState: {
      ...prev,
      isAlarmRinging: false,
      dismissedForCurrentCycle: true,
      wakeLockHeld: false,
    },
    event: {
      action: 'ACTION_STOP_ALARM',
      detail:
        source === 'NOTIFICATION_ACTION'
          ? 'Alarme arrêtée depuis le bouton d’action de la notification.'
          : 'Alarme arrêtée depuis le bouton principal de l’application.',
      severity: 'warning',
    },
  };
}
