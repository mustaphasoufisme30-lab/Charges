import { useCallback, useEffect, useRef, useState } from 'react';
import { AndroidPhoneSimulator } from './components/AndroidPhoneSimulator';
import { ApkExportGuide } from './components/ApkExportGuide';
import { ArchitectureGuide } from './components/ArchitectureGuide';
import { CodeExplorer } from './components/CodeExplorer';
import { HardwareBenchControls } from './components/HardwareBenchControls';
import { TopBar, WorkspaceTab } from './components/TopBar';
import { ANDROID_PROJECT_FILES } from './data/androidProjectFiles';
import { alarmAudio } from './utils/alarmAudio';
import {
  BatteryEventEntry,
  BatterySimState,
  DEFAULT_BATTERY_STATE,
  dismissAlarm,
  evaluateBatteryUpdate,
} from './utils/batteryEngine';
import { buildZipArchive } from './utils/zipBuilder';

function formatNowTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('simulator');
  const [selectedFileId, setSelectedFileId] = useState<string>('battery-service');
  const [simState, setSimState] = useState<BatterySimState>(DEFAULT_BATTERY_STATE);
  const [isAutoCharging, setIsAutoCharging] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [events, setEvents] = useState<BatteryEventEntry[]>([
    {
      id: 'init-1',
      timestamp: formatNowTime(),
      action: 'ACTION_BATTERY_CHANGED',
      detail: 'Lecture initiale (sticky intent) : 88 %, En charge, 33,4 °C.',
      severity: 'info',
    },
  ]);
  const eventCounterRef = useRef(2);

  const appendEvent = useCallback(
    (evt: Omit<BatteryEventEntry, 'id' | 'timestamp'> | null) => {
      if (!evt) return;
      const id = `evt-${eventCounterRef.current++}`;
      setEvents((prev) => [{ ...evt, id, timestamp: formatNowTime() }, ...prev].slice(0, 20));
    },
    []
  );

  const applyUpdate = useCallback(
    (
      patch: Partial<
        Pick<
          BatterySimState,
          | 'level'
          | 'isPluggedIn'
          | 'temperatureC'
          | 'threshold'
          | 'isMonitoring'
          | 'isScreenOff'
          | 'hasNotificationPermission'
        >
      >
    ) => {
      setSimState((prev) => {
        const result = evaluateBatteryUpdate(prev, patch);
        if (result.event) {
          queueMicrotask(() => appendEvent(result.event));
        }
        return result.nextState;
      });
    },
    [appendEvent]
  );

  // Synchronize Web Audio alarm playback with simulator alarm state
  useEffect(() => {
    if (simState.isAlarmRinging && audioEnabled) {
      alarmAudio.start();
    } else {
      alarmAudio.stop();
    }
    return () => {
      alarmAudio.stop();
    };
  }, [simState.isAlarmRinging, audioEnabled]);

  // Auto-charge simulation timer
  useEffect(() => {
    if (!isAutoCharging) return;
    const intervalId = window.setInterval(() => {
      setSimState((prev) => {
        if (!prev.isPluggedIn || prev.level >= 100) {
          setIsAutoCharging(false);
          return prev;
        }
        const nextLevel = Math.min(100, prev.level + 2);
        const nextTemp = Math.min(39.5, Math.round((prev.temperatureC + 0.2) * 10) / 10);
        const result = evaluateBatteryUpdate(prev, {
          level: nextLevel,
          temperatureC: nextTemp,
        });
        if (result.event) {
          queueMicrotask(() => appendEvent(result.event));
        }
        if (nextLevel >= 100) {
          setIsAutoCharging(false);
        }
        return result.nextState;
      });
    }, 600);

    return () => window.clearInterval(intervalId);
  }, [isAutoCharging, appendEvent]);

  const handleStopAlarm = useCallback(
    (source: 'APP_BUTTON' | 'NOTIFICATION_ACTION') => {
      setSimState((prev) => {
        const result = dismissAlarm(prev, source);
        if (result.event) {
          queueMicrotask(() => appendEvent(result.event));
        }
        return result.nextState;
      });
    },
    [appendEvent]
  );

  const handleTogglePlugged = useCallback(() => {
    setSimState((prev) => {
      const nextPlugged = !prev.isPluggedIn;
      if (!nextPlugged) {
        setIsAutoCharging(false);
      }
      const result = evaluateBatteryUpdate(prev, { isPluggedIn: nextPlugged });
      if (result.event) {
        queueMicrotask(() => appendEvent(result.event));
      } else {
        queueMicrotask(() =>
          appendEvent({
            action: nextPlugged ? 'ACTION_POWER_CONNECTED' : 'ACTION_POWER_DISCONNECTED',
            detail: nextPlugged
              ? `Câble secteur branché (${prev.level} %).`
              : `Câble secteur débranché (${prev.level} %).`,
            severity: 'info',
          })
        );
      }
      return result.nextState;
    });
  }, [appendEvent]);

  const handleToggleAutoCharge = useCallback(() => {
    if (isAutoCharging) {
      setIsAutoCharging(false);
      return;
    }
    // Ensure cable is plugged and level starts below 100 so user sees progression
    setSimState((prev) => {
      const startLevel = prev.level >= 100 ? 92 : prev.level;
      const result = evaluateBatteryUpdate(prev, {
        isPluggedIn: true,
        level: startLevel,
        isMonitoring: true,
      });
      if (result.event) {
        queueMicrotask(() => appendEvent(result.event));
      }
      return result.nextState;
    });
    setIsAutoCharging(true);
  }, [isAutoCharging, appendEvent]);

  const handleDownloadZip = useCallback(() => {
    const zipBytes = buildZipArchive(
      ANDROID_PROJECT_FILES.map((file) => ({
        path: `ChargeGuard100/${file.path}`,
        content: file.content,
      }))
    );
    const blob = new Blob([zipBytes.slice().buffer], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ChargeGuard100-Android-Kotlin.zip';
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleOpenCodeFile = useCallback((fileId: string) => {
    setSelectedFileId(fileId);
    setActiveTab('code');
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-slate-900 flex flex-col">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onDownloadZip={handleDownloadZip}
      />

      <main className="mx-auto w-full max-w-[1380px] flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        {/* Compact Page Intro */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="max-w-3xl">
            <p className="text-xs font-medium text-slate-500">
              Kotlin 2.0 · Jetpack Compose · Material 3 · ForegroundService Android 13 / 14 / 15+
            </p>
            <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
              {activeTab === 'simulator' &&
                'Simulateur interactif ChargeGuard 100%'}
              {activeTab === 'code' &&
                'Code source complet du projet Android'}
              {activeTab === 'architecture' &&
                'Architecture ForegroundService, permissions et alarme'}
              {activeTab === 'apk' &&
                'Conversion et compilation du projet en APK'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
            <button
              type="button"
              onClick={() => handleOpenCodeFile('manifest')}
              className="font-mono hover:text-emerald-700 underline-offset-4 hover:underline cursor-pointer"
            >
              AndroidManifest.xml
            </button>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <button
              type="button"
              onClick={() => handleOpenCodeFile('battery-service')}
              className="font-mono hover:text-emerald-700 underline-offset-4 hover:underline cursor-pointer"
            >
              BatteryMonitorService.kt
            </button>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <button
              type="button"
              onClick={() => handleOpenCodeFile('main-activity')}
              className="font-mono hover:text-emerald-700 underline-offset-4 hover:underline cursor-pointer"
            >
              MainActivity.kt
            </button>
          </div>
        </div>

        {/* View 1: Live Android Phone Simulator + Hardware Test Bench */}
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[400px_minmax(0,1fr)] items-start">
            <AndroidPhoneSimulator
              state={simState}
              onToggleMonitoring={(enabled) => applyUpdate({ isMonitoring: enabled })}
              onThresholdChange={(threshold) => applyUpdate({ threshold })}
              onStopAlarmApp={() => handleStopAlarm('APP_BUTTON')}
              onStopAlarmNotification={() => handleStopAlarm('NOTIFICATION_ACTION')}
              onGrantNotificationPermission={() =>
                applyUpdate({ hasNotificationPermission: true })
              }
              onWakeScreen={() => applyUpdate({ isScreenOff: false })}
            />

            <HardwareBenchControls
              state={simState}
              isAutoCharging={isAutoCharging}
              audioEnabled={audioEnabled}
              events={events}
              onTogglePlugged={handleTogglePlugged}
              onLevelChange={(level) => applyUpdate({ level })}
              onTempChange={(temperatureC) => applyUpdate({ temperatureC })}
              onToggleAutoCharge={handleToggleAutoCharge}
              onToggleScreenOff={() =>
                applyUpdate({ isScreenOff: !simState.isScreenOff })
              }
              onToggleAudio={() => setAudioEnabled((prev) => !prev)}
              onTogglePermission={() =>
                applyUpdate({
                  hasNotificationPermission: !simState.hasNotificationPermission,
                })
              }
            />
          </div>
        )}

        {/* View 2: Full Android Studio Multi-File Source Code Explorer */}
        {activeTab === 'code' && (
          <CodeExplorer
            selectedFileId={selectedFileId}
            onSelectFile={setSelectedFileId}
            onDownloadZip={handleDownloadZip}
          />
        )}

        {/* View 3: Architecture & Android 13-15+ Permissions Guide */}
        {activeTab === 'architecture' && (
          <ArchitectureGuide onOpenFile={handleOpenCodeFile} />
        )}

        {/* View 4: APK Conversion & Export Guide */}
        {activeTab === 'apk' && (
          <ApkExportGuide
            onDownloadZip={handleDownloadZip}
            onOpenFile={handleOpenCodeFile}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-4 px-4 py-4 text-xs text-slate-500 sm:px-6 lg:px-8">
          <span>
            ChargeGuard 100% · Projet Android Kotlin &amp; Jetpack Compose (minSdk 26 · targetSdk 35)
          </span>
          <span>
            AudioAttributes.USAGE_ALARM · ForegroundService specialUse · BroadcastReceiver dynamique
          </span>
        </div>
      </footer>
    </div>
  );
}
