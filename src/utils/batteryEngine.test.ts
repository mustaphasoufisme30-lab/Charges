import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_BATTERY_STATE,
  clampThreshold,
  dismissAlarm,
  evaluateBatteryUpdate,
  getChargeStatus,
  getChargeStatusLabel,
  getTemperatureSeverity,
} from './batteryEngine';

test('threshold clamps strictly between 80% and 100%', () => {
  assert.equal(clampThreshold(100), 100);
  assert.equal(clampThreshold(80), 80);
  assert.equal(clampThreshold(65), 80);
  assert.equal(clampThreshold(120), 100);
});

test('charge status labels match French Android UI specifications', () => {
  assert.equal(getChargeStatusLabel(getChargeStatus(100, true)), 'Charge complète');
  assert.equal(getChargeStatusLabel(getChargeStatus(85, true)), 'En charge');
  assert.equal(getChargeStatusLabel(getChargeStatus(100, false)), 'Débranché');
});

test('alarm triggers at 100% when monitoring is active and phone is plugged in, even with screen off', () => {
  let state = { ...DEFAULT_BATTERY_STATE, level: 98, isPluggedIn: true, isScreenOff: true };
  state = evaluateBatteryUpdate(state, { isMonitoring: true }).nextState;
  assert.equal(state.isAlarmRinging, false);

  const triggered = evaluateBatteryUpdate(state, { level: 100 });
  assert.equal(triggered.nextState.isAlarmRinging, true);
  assert.equal(triggered.nextState.wakeLockHeld, true);
  assert.equal(triggered.event?.action, 'ALARM_TRIGGERED');
});

test('alarm does not trigger when monitoring is disabled or phone is unplugged', () => {
  const disabledRes = evaluateBatteryUpdate(
    { ...DEFAULT_BATTERY_STATE, isMonitoring: false, isPluggedIn: true },
    { level: 100 }
  );
  assert.equal(disabledRes.nextState.isAlarmRinging, false);

  const unpluggedRes = evaluateBatteryUpdate(
    { ...DEFAULT_BATTERY_STATE, isMonitoring: true, isPluggedIn: false },
    { level: 100 }
  );
  assert.equal(unpluggedRes.nextState.isAlarmRinging, false);
});

test('unplugging cable automatically stops ringing alarm and resets cycle dismissal', () => {
  const ringing = evaluateBatteryUpdate(
    { ...DEFAULT_BATTERY_STATE, isMonitoring: true, isPluggedIn: true, level: 99 },
    { level: 100 }
  ).nextState;
  assert.equal(ringing.isAlarmRinging, true);

  const unplugged = evaluateBatteryUpdate(ringing, { isPluggedIn: false });
  assert.equal(unplugged.nextState.isAlarmRinging, false);
  assert.equal(unplugged.nextState.wakeLockHeld, false);
  assert.equal(unplugged.nextState.dismissedForCurrentCycle, false);
  assert.equal(unplugged.event?.action, 'BATTERY_STATUS_DISCHARGING');
});

test('dismissing alarm from app or notification stops alarm until threshold cycle resets', () => {
  const ringing = evaluateBatteryUpdate(
    { ...DEFAULT_BATTERY_STATE, isMonitoring: true, isPluggedIn: true, threshold: 90, level: 88 },
    { level: 90 }
  ).nextState;
  assert.equal(ringing.isAlarmRinging, true);

  const stopped = dismissAlarm(ringing, 'NOTIFICATION_ACTION');
  assert.equal(stopped.nextState.isAlarmRinging, false);
  assert.equal(stopped.nextState.dismissedForCurrentCycle, true);

  // Staying at 91% in the same cycle should not re-trigger
  const stillQuiet = evaluateBatteryUpdate(stopped.nextState, { level: 91 });
  assert.equal(stillQuiet.nextState.isAlarmRinging, false);

  // Dropping below threshold resets dismissal so reaching 90% again re-triggers
  const dropped = evaluateBatteryUpdate(stillQuiet.nextState, { level: 89 });
  assert.equal(dropped.nextState.dismissedForCurrentCycle, false);
  const retriggered = evaluateBatteryUpdate(dropped.nextState, { level: 90 });
  assert.equal(retriggered.nextState.isAlarmRinging, true);
});

test('temperature severity classifies normal, warm, and high accurately', () => {
  assert.equal(getTemperatureSeverity(31.2), 'NORMAL');
  assert.equal(getTemperatureSeverity(38.5), 'WARM');
  assert.equal(getTemperatureSeverity(43.0), 'HIGH');
});
