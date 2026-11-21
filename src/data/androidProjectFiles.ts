export interface AndroidSourceFile {
  id: string;
  name: string;
  path: string;
  language: 'xml' | 'kotlin' | 'gradle' | 'yaml' | 'text';
  category:
    | 'Manifest & Gradle'
    | 'UI Jetpack Compose'
    | 'Service & Modèle'
    | 'Build APK & Ressources';
  summary: string;
  content: string;
}

export const ANDROID_PROJECT_FILES: AndroidSourceFile[] = [
  {
    id: 'manifest',
    name: 'AndroidManifest.xml',
    path: 'app/src/main/AndroidManifest.xml',
    language: 'xml',
    category: 'Manifest & Gradle',
    summary:
      'Permissions Android 13, 14 et 15+ (FOREGROUND_SERVICE, SPECIAL_USE, POST_NOTIFICATIONS, VIBRATE, WAKE_LOCK) et déclaration du BatteryMonitorService.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <!-- Permissions obligatoires Android 13, 14 et 15+ -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="ChargeGuard 100%"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.Material.NoActionBar">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:showWhenLocked="true"
            android:turnScreenOn="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Service de premier plan conforme Android 14/15 (specialUse) -->
        <service
            android:name=".service.BatteryMonitorService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="specialUse">
            <property
                android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
                android:value="Surveillance continue du pourcentage de batterie en charge afin de déclencher une alarme sonore et une vibration au seuil configuré (100 % par défaut), même écran éteint." />
        </service>

    </application>
</manifest>
`,
  },
  {
    id: 'app-gradle',
    name: 'build.gradle.kts (app)',
    path: 'app/build.gradle.kts',
    language: 'gradle',
    category: 'Manifest & Gradle',
    summary:
      'Configuration Gradle Kotlin DSL ciblant Android 15 (compileSdk / targetSdk 35) avec Jetpack Compose Material 3 et Kotlin 2.0.',
    content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.chargeguard.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.chargeguard.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(composeBom)

    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.activity:activity-compose:1.9.3")

    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    debugImplementation("androidx.compose.ui:ui-tooling")
}
`,
  },
  {
    id: 'battery-service',
    name: 'BatteryMonitorService.kt',
    path: 'app/src/main/java/com/chargeguard/app/service/BatteryMonitorService.kt',
    language: 'kotlin',
    category: 'Service & Modèle',
    summary:
      'ForegroundService persistant avec BroadcastReceiver dynamique sur ACTION_BATTERY_CHANGED, MediaPlayer USAGE_ALARM en boucle, vibration continue et WakeLock.',
    content: `package com.chargeguard.app.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.chargeguard.app.MainActivity
import com.chargeguard.app.model.BatteryMonitorRepository
import com.chargeguard.app.model.ChargeStatus
import java.util.Locale

class BatteryMonitorService : Service() {

    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var wakeLock: PowerManager.WakeLock? = null

    private var isReceiverRegistered = false
    private var alarmDismissedForCurrentCycle = false
    private var currentThreshold = 100

    private val batteryReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action != Intent.ACTION_BATTERY_CHANGED) return
            handleBatteryIntent(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
        vibrator = resolveVibrator()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                currentThreshold = intent.getIntExtra(
                    EXTRA_THRESHOLD,
                    BatteryMonitorRepository.state.value.alertThreshold
                ).coerceIn(80, 100)

                BatteryMonitorRepository.updateMonitoring(
                    isMonitoring = true,
                    threshold = currentThreshold
                )
                startForegroundMonitoring()
                registerBatteryReceiver()
            }

            ACTION_UPDATE_THRESHOLD -> {
                currentThreshold = intent.getIntExtra(EXTRA_THRESHOLD, 100).coerceIn(80, 100)
                BatteryMonitorRepository.updateThreshold(currentThreshold)
                val current = BatteryMonitorRepository.state.value
                if (current.level < currentThreshold) {
                    alarmDismissedForCurrentCycle = false
                }
                evaluateAlarmCondition(
                    level = current.level,
                    isPluggedOrCharging = current.chargeStatus != ChargeStatus.UNPLUGGED
                )
                refreshNotification()
            }

            ACTION_STOP_ALARM -> {
                alarmDismissedForCurrentCycle = true
                stopAlarmAndVibration()
                refreshNotification()
            }

            ACTION_STOP_SERVICE -> {
                stopAlarmAndVibration()
                BatteryMonitorRepository.updateMonitoring(isMonitoring = false)
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
                return START_NOT_STICKY
            }
        }
        return START_STICKY
    }

    private fun startForegroundMonitoring() {
        val notification = buildNotification()
        val fgsType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
        } else {
            0
        }
        ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, fgsType)
    }

    private fun registerBatteryReceiver() {
        if (isReceiverRegistered) return
        val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        val stickyIntent = ContextCompat.registerReceiver(
            this,
            batteryReceiver,
            filter,
            ContextCompat.RECEIVER_NOT_EXPORTED
        )
        isReceiverRegistered = true
        stickyIntent?.let { handleBatteryIntent(it) }
    }

    private fun handleBatteryIntent(intent: Intent) {
        val rawLevel = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
        val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, 100).coerceAtLeast(1)
        val level = if (rawLevel >= 0) ((rawLevel * 100f) / scale).toInt().coerceIn(0, 100) else 0

        val status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, BatteryManager.BATTERY_STATUS_UNKNOWN)
        val plugged = intent.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0)
        val tempTenths = intent.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0)
        val temperatureC = tempTenths / 10f

        val isPluggedIn = plugged != 0 ||
            status == BatteryManager.BATTERY_STATUS_CHARGING ||
            status == BatteryManager.BATTERY_STATUS_FULL

        val chargeStatus = when {
            !isPluggedIn -> ChargeStatus.UNPLUGGED
            status == BatteryManager.BATTERY_STATUS_FULL || level >= 100 -> ChargeStatus.FULL
            else -> ChargeStatus.CHARGING
        }

        BatteryMonitorRepository.updateBatteryMetrics(
            level = level,
            temperatureCelsius = temperatureC,
            chargeStatus = chargeStatus
        )

        // Réinitialisation si l'utilisateur débranche le câble ou si la batterie redescend
        if (!isPluggedIn || level < currentThreshold) {
            alarmDismissedForCurrentCycle = false
        }

        // Arrêt automatique dès que le câble est débranché
        if (!isPluggedIn) {
            if (BatteryMonitorRepository.state.value.isAlarmRinging) {
                stopAlarmAndVibration()
            }
        } else {
            evaluateAlarmCondition(level = level, isPluggedOrCharging = true)
        }

        refreshNotification()
    }

    private fun evaluateAlarmCondition(level: Int, isPluggedOrCharging: Boolean) {
        val state = BatteryMonitorRepository.state.value
        if (!state.isMonitoring) return

        val thresholdReached = isPluggedOrCharging && level >= currentThreshold
        if (thresholdReached && !alarmDismissedForCurrentCycle && !state.isAlarmRinging) {
            triggerAlarmAndVibration()
        } else if (!thresholdReached && state.isAlarmRinging) {
            stopAlarmAndVibration()
        }
    }

    private fun triggerAlarmAndVibration() {
        acquireAlarmWakeLock()
        BatteryMonitorRepository.updateAlarmRinging(true)
        startAlarmAudio()
        startContinuousVibration()
    }

    private fun startAlarmAudio() {
        stopMediaPlayerOnly()

        val alarmUri: Uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()

        runCatching {
            mediaPlayer = MediaPlayer().apply {
                setDataSource(applicationContext, alarmUri)
                setAudioAttributes(audioAttributes)
                isLooping = true
                setWakeMode(applicationContext, PowerManager.PARTIAL_WAKE_LOCK)
                prepare()
                start()
            }
        }
    }

    private fun startContinuousVibration() {
        val vib = vibrator ?: return
        if (!vib.hasVibrator()) return

        val pattern = longArrayOf(0L, 650L, 300L, 650L, 300L)
        val effect = VibrationEffect.createWaveform(pattern, 0)

        val attrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()

        @Suppress("DEPRECATION")
        vib.vibrate(effect, attrs)
    }

    private fun stopAlarmAndVibration() {
        stopMediaPlayerOnly()
        vibrator?.cancel()
        releaseAlarmWakeLock()
        BatteryMonitorRepository.updateAlarmRinging(false)
    }

    private fun stopMediaPlayerOnly() {
        mediaPlayer?.let { player ->
            runCatching {
                if (player.isPlaying) player.stop()
                player.reset()
                player.release()
            }
        }
        mediaPlayer = null
    }

    private fun acquireAlarmWakeLock() {
        if (wakeLock?.isHeld == true) return
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "ChargeGuard100::FullChargeAlarmWakeLock"
        ).apply {
            setReferenceCounted(false)
            // Timeout de sécurité (10 minutes max)
            acquire(10 * 60 * 1000L)
        }
    }

    private fun releaseAlarmWakeLock() {
        wakeLock?.let { lock ->
            if (lock.isHeld) {
                runCatching { lock.release() }
            }
        }
        wakeLock = null
    }

    private fun resolveVibrator(): Vibrator {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val manager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            manager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
    }

    private fun refreshNotification() {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, buildNotification())
    }

    private fun buildNotification(): Notification {
        val state = BatteryMonitorRepository.state.value
        val openAppIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val channelId = if (state.isAlarmRinging) ALARM_CHANNEL_ID else MONITOR_CHANNEL_ID
        val tempFormatted = String.format(Locale.FRANCE, "%.1f °C", state.temperatureCelsius)

        val title = if (state.isAlarmRinging) {
            "Batterie chargée à \${state.level} % — Débranchez !"
        } else {
            "ChargeGuard 100% · \${state.level} % (\${state.chargeStatus.labelFr})"
        }

        val contentText = if (state.isAlarmRinging) {
            "Seuil d’alerte (\${state.alertThreshold} %) atteint · Température : \$tempFormatted"
        } else {
            "Seuil d’alerte : \${state.alertThreshold} % · Température : \$tempFormatted"
        }

        val builder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_lock_idle_charging)
            .setContentTitle(title)
            .setContentText(contentText)
            .setContentIntent(openAppIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(!state.isAlarmRinging)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(
                if (state.isAlarmRinging) NotificationCompat.CATEGORY_ALARM
                else NotificationCompat.CATEGORY_SERVICE
            )
            .setPriority(
                if (state.isAlarmRinging) NotificationCompat.PRIORITY_MAX
                else NotificationCompat.PRIORITY_LOW
            )

        if (state.isAlarmRinging) {
            val stopAlarmIntent = PendingIntent.getService(
                this,
                101,
                Intent(this, BatteryMonitorService::class.java).apply {
                    action = ACTION_STOP_ALARM
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.addAction(
                android.R.drawable.ic_menu_close_clear_cancel,
                "Arrêter l'alarme",
                stopAlarmIntent
            )
        } else {
            val stopServiceIntent = PendingIntent.getService(
                this,
                102,
                Intent(this, BatteryMonitorService::class.java).apply {
                    action = ACTION_STOP_SERVICE
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.addAction(
                android.R.drawable.ic_menu_close_clear_cancel,
                "Arrêter le suivi",
                stopServiceIntent
            )
        }

        return builder.build()
    }

    private fun createNotificationChannels() {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val monitorChannel = NotificationChannel(
            MONITOR_CHANNEL_ID,
            "Surveillance de charge",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Notification persistante indiquant le pourcentage de batterie en temps réel."
            setShowBadge(false)
        }

        val alarmChannel = NotificationChannel(
            ALARM_CHANNEL_ID,
            "Alarme de charge complète",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Alerte sonore prioritaire lorsque le seuil de batterie est atteint."
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            setBypassDnd(true)
            // Le son est géré directement par MediaPlayer en USAGE_ALARM
            setSound(null, null)
            enableVibration(false)
        }

        manager.createNotificationChannel(monitorChannel)
        manager.createNotificationChannel(alarmChannel)
    }

    override fun onDestroy() {
        if (isReceiverRegistered) {
            runCatching { unregisterReceiver(batteryReceiver) }
            isReceiverRegistered = false
        }
        stopAlarmAndVibration()
        BatteryMonitorRepository.updateMonitoring(isMonitoring = false)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val ACTION_START = "com.chargeguard.app.action.START_MONITORING"
        const val ACTION_STOP_SERVICE = "com.chargeguard.app.action.STOP_MONITORING"
        const val ACTION_STOP_ALARM = "com.chargeguard.app.action.STOP_ALARM"
        const val ACTION_UPDATE_THRESHOLD = "com.chargeguard.app.action.UPDATE_THRESHOLD"
        const val EXTRA_THRESHOLD = "com.chargeguard.app.extra.THRESHOLD"

        private const val MONITOR_CHANNEL_ID = "chargeguard_monitor_channel"
        private const val ALARM_CHANNEL_ID = "chargeguard_alarm_channel"
        private const val NOTIFICATION_ID = 1001

        fun start(context: Context, threshold: Int) {
            val intent = Intent(context, BatteryMonitorService::class.java).apply {
                action = ACTION_START
                putExtra(EXTRA_THRESHOLD, threshold)
            }
            ContextCompat.startForegroundService(context, intent)
        }

        fun updateThreshold(context: Context, threshold: Int) {
            val intent = Intent(context, BatteryMonitorService::class.java).apply {
                action = ACTION_UPDATE_THRESHOLD
                putExtra(EXTRA_THRESHOLD, threshold)
            }
            context.startService(intent)
        }

        fun stopAlarm(context: Context) {
            val intent = Intent(context, BatteryMonitorService::class.java).apply {
                action = ACTION_STOP_ALARM
            }
            context.startService(intent)
        }

        fun stopService(context: Context) {
            val intent = Intent(context, BatteryMonitorService::class.java).apply {
                action = ACTION_STOP_SERVICE
            }
            context.startService(intent)
        }
    }
}
`,
  },
  {
    id: 'main-activity',
    name: 'MainActivity.kt',
    path: 'app/src/main/java/com/chargeguard/app/MainActivity.kt',
    language: 'kotlin',
    category: 'UI Jetpack Compose',
    summary:
      'Écran Jetpack Compose complet : jauge circulaire animée, interrupteur principal, curseur de seuil 80–100 %, gestion permission Android 13+ et gros bouton rouge "Arrêter l’alarme".',
    content: `package com.chargeguard.app

import android.Manifest
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.BatteryManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.BatteryChargingFull
import androidx.compose.material.icons.rounded.NotificationsOff
import androidx.compose.material.icons.rounded.Thermostat
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chargeguard.app.model.BatteryMonitorRepository
import com.chargeguard.app.model.BatteryUiState
import com.chargeguard.app.model.ChargeStatus
import com.chargeguard.app.service.BatteryMonitorService
import com.chargeguard.app.ui.components.BatteryCircularGauge
import com.chargeguard.app.ui.theme.AlarmCrimson
import com.chargeguard.app.ui.theme.ChargeEmerald
import com.chargeguard.app.ui.theme.ChargeGuardTheme
import java.util.Locale
import kotlin.math.roundToInt

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        readInitialStickyBatteryState()

        setContent {
            ChargeGuardTheme {
                val uiState by BatteryMonitorRepository.state.collectAsStateWithLifecycle()
                ChargeGuardScreen(
                    state = uiState,
                    onToggleMonitoring = { enabled ->
                        if (enabled) {
                            BatteryMonitorService.start(this, uiState.alertThreshold)
                        } else {
                            BatteryMonitorService.stopService(this)
                        }
                    },
                    onThresholdChange = { newThreshold ->
                        BatteryMonitorRepository.updateThreshold(newThreshold)
                        if (uiState.isMonitoring) {
                            BatteryMonitorService.updateThreshold(this, newThreshold)
                        }
                    },
                    onStopAlarm = {
                        BatteryMonitorService.stopAlarm(this)
                    }
                )
            }
        }
    }

    private fun readInitialStickyBatteryState() {
        val batteryIntent = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED)) ?: return
        val level = batteryIntent.getIntExtra(BatteryManager.EXTRA_LEVEL, 0)
        val scale = batteryIntent.getIntExtra(BatteryManager.EXTRA_SCALE, 100).coerceAtLeast(1)
        val pct = ((level * 100f) / scale).roundToInt().coerceIn(0, 100)

        val status = batteryIntent.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
        val plugged = batteryIntent.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0)
        val tempC = batteryIntent.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0) / 10f

        val isPlugged = plugged != 0 ||
            status == BatteryManager.BATTERY_STATUS_CHARGING ||
            status == BatteryManager.BATTERY_STATUS_FULL

        val chargeStatus = when {
            !isPlugged -> ChargeStatus.UNPLUGGED
            status == BatteryManager.BATTERY_STATUS_FULL || pct >= 100 -> ChargeStatus.FULL
            else -> ChargeStatus.CHARGING
        }

        BatteryMonitorRepository.updateBatteryMetrics(pct, tempC, chargeStatus)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChargeGuardScreen(
    state: BatteryUiState,
    onToggleMonitoring: (Boolean) -> Unit,
    onThresholdChange: (Int) -> Unit,
    onStopAlarm: () -> Unit
) {
    val context = LocalContext.current
    var pendingEnableMonitoring by remember { mutableStateOf(false) }

    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (pendingEnableMonitoring) {
            pendingEnableMonitoring = false
            // Démarre la surveillance même si l'utilisateur refuse (Android 13+)
            // tout en ayant demandé l'autorisation système requise.
            onToggleMonitoring(true)
        }
    }

    fun requestMonitoringToggle(targetEnabled: Boolean) {
        if (!targetEnabled) {
            onToggleMonitoring(false)
            return
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val hasPerm = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            if (!hasPerm) {
                pendingEnableMonitoring = true
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                return
            }
        }
        onToggleMonitoring(true)
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text(
                        text = "ChargeGuard 100%",
                        fontWeight = FontWeight.Bold,
                        letterSpacing = (-0.3).sp
                    )
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // 1. Jauge circulaire animée + état de charge + température
            BatteryCircularGauge(
                level = state.level,
                chargeStatus = state.chargeStatus,
                temperatureCelsius = state.temperatureCelsius,
                isAlarmRinging = state.isAlarmRinging,
                modifier = Modifier.padding(top = 8.dp)
            )

            // Bandeau métriques rapides (État & Température)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                MetricTile(
                    label = "État de charge",
                    value = state.chargeStatus.labelFr,
                    icon = Icons.Rounded.BatteryChargingFull,
                    modifier = Modifier.weight(1f)
                )
                MetricTile(
                    label = "Température",
                    value = String.format(Locale.FRANCE, "%.1f °C", state.temperatureCelsius),
                    icon = Icons.Rounded.Thermostat,
                    modifier = Modifier.weight(1f)
                )
            }

            // 2. Gros bouton rouge d'arrêt d'alarme (visible uniquement si l'alarme sonne)
            AnimatedVisibility(
                visible = state.isAlarmRinging,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                Button(
                    onClick = onStopAlarm,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(62.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = AlarmCrimson,
                        contentColor = Color.White
                    )
                ) {
                    Icon(
                        imageVector = Icons.Rounded.NotificationsOff,
                        contentDescription = null,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "Arrêter l'alarme",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // 3. Interrupteur principal de surveillance ForegroundService
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f),
                border = BorderStroke(
                    width = 1.dp,
                    color = if (state.isMonitoring) ChargeEmerald.copy(alpha = 0.5f)
                    else MaterialTheme.colorScheme.outlineVariant
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 18.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f).padding(end = 12.dp)) {
                        Text(
                            text = "Activer la surveillance de charge",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = if (state.isMonitoring) {
                                "Service actif en arrière-plan · Alarme à \${state.alertThreshold} %"
                            } else {
                                "Démarre un service persistant même écran éteint"
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Switch(
                        checked = state.isMonitoring,
                        onCheckedChange = { requestMonitoringToggle(it) },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = ChargeEmerald
                        )
                    )
                }
            }

            // 4. Curseur optionnel pour ajuster le seuil d'alerte (80 % – 100 %)
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 18.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Seuil de déclenchement",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "\${state.alertThreshold} %",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = ChargeEmerald
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Slider(
                        value = state.alertThreshold.toFloat(),
                        onValueChange = { onThresholdChange(it.roundToInt()) },
                        valueRange = 80f..100f,
                        steps = 19,
                        colors = SliderDefaults.colors(
                            thumbColor = ChargeEmerald,
                            activeTrackColor = ChargeEmerald
                        )
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "80 % (Préservation)",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = "100 % (Défaut)",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MetricTile(
    label: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}
`,
  },
  {
    id: 'gauge-component',
    name: 'BatteryCircularGauge.kt',
    path: 'app/src/main/java/com/chargeguard/app/ui/components/BatteryCircularGauge.kt',
    language: 'kotlin',
    category: 'UI Jetpack Compose',
    summary:
      'Jauge circulaire animée en Jetpack Compose Canvas affichant le pourcentage en temps réel, le statut de charge et la température.',
    content: `package com.chargeguard.app.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chargeguard.app.model.ChargeStatus
import com.chargeguard.app.ui.theme.AlarmCrimson
import com.chargeguard.app.ui.theme.ChargeEmerald
import com.chargeguard.app.ui.theme.IdleSlate
import com.chargeguard.app.ui.theme.WarmAmber
import java.util.Locale

@Composable
fun BatteryCircularGauge(
    level: Int,
    chargeStatus: ChargeStatus,
    temperatureCelsius: Float,
    isAlarmRinging: Boolean,
    modifier: Modifier = Modifier,
    diameter: Dp = 236.dp,
    strokeWidth: Dp = 18.dp
) {
    val animatedProgress by animateFloatAsState(
        targetValue = (level.coerceIn(0, 100)) / 100f,
        animationSpec = tween(durationMillis = 600, easing = FastOutSlowInEasing),
        label = "battery_progress"
    )

    val targetAccentColor = when {
        isAlarmRinging -> AlarmCrimson
        chargeStatus == ChargeStatus.UNPLUGGED -> IdleSlate
        temperatureCelsius >= 42f -> WarmAmber
        else -> ChargeEmerald
    }

    val animatedAccentColor by animateColorAsState(
        targetValue = targetAccentColor,
        animationSpec = tween(durationMillis = 350),
        label = "battery_color"
    )

    val trackColor = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)

    Box(
        modifier = modifier.size(diameter),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.size(diameter)) {
            val strokePx = strokeWidth.toPx()
            val arcSize = Size(size.width - strokePx, size.height - strokePx)
            val topLeft = Offset(strokePx / 2f, strokePx / 2f)

            // Piste d'arrière-plan (arc 270° ouvert vers le bas)
            drawArc(
                color = trackColor,
                startAngle = 135f,
                sweepAngle = 270f,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = strokePx, cap = StrokeCap.Round)
            )

            // Arc actif animé
            drawArc(
                color = animatedAccentColor,
                startAngle = 135f,
                sweepAngle = 270f * animatedProgress,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = strokePx, cap = StrokeCap.Round)
            )
        }

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "\$level%",
                fontSize = 54.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = (-1.5).sp,
                color = if (isAlarmRinging) AlarmCrimson else MaterialTheme.colorScheme.onBackground
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = if (isAlarmRinging) "Alarme déclenchée" else chargeStatus.labelFr,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = animatedAccentColor
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = String.format(Locale.FRANCE, "%.1f °C", temperatureCelsius),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
`,
  },
  {
    id: 'ui-state',
    name: 'BatteryUiState.kt',
    path: 'app/src/main/java/com/chargeguard/app/model/BatteryUiState.kt',
    language: 'kotlin',
    category: 'Service & Modèle',
    summary:
      'Modèle immuable StateFlow partagé entre BatteryMonitorService et MainActivity sans fuite mémoire.',
    content: `package com.chargeguard.app.model

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

enum class ChargeStatus(val labelFr: String) {
    CHARGING("En charge"),
    FULL("Charge complète"),
    UNPLUGGED("Débranché")
}

data class BatteryUiState(
    val level: Int = 0,
    val temperatureCelsius: Float = 0f,
    val chargeStatus: ChargeStatus = ChargeStatus.UNPLUGGED,
    val isMonitoring: Boolean = false,
    val alertThreshold: Int = 100,
    val isAlarmRinging: Boolean = false
)

/**
 * Source de vérité unique partagée entre le ForegroundService et l'interface Compose.
 */
object BatteryMonitorRepository {
    private val _state = MutableStateFlow(BatteryUiState())
    val state: StateFlow<BatteryUiState> = _state.asStateFlow()

    fun updateBatteryMetrics(
        level: Int,
        temperatureCelsius: Float,
        chargeStatus: ChargeStatus
    ) {
        _state.update { current ->
            current.copy(
                level = level.coerceIn(0, 100),
                temperatureCelsius = temperatureCelsius,
                chargeStatus = chargeStatus
            )
        }
    }

    fun updateMonitoring(isMonitoring: Boolean, threshold: Int? = null) {
        _state.update { current ->
            current.copy(
                isMonitoring = isMonitoring,
                alertThreshold = threshold?.coerceIn(80, 100) ?: current.alertThreshold,
                isAlarmRinging = if (!isMonitoring) false else current.isAlarmRinging
            )
        }
    }

    fun updateThreshold(threshold: Int) {
        _state.update { current ->
            current.copy(alertThreshold = threshold.coerceIn(80, 100))
        }
    }

    fun updateAlarmRinging(isRinging: Boolean) {
        _state.update { current ->
            current.copy(isAlarmRinging = isRinging)
        }
    }
}
`,
  },
  {
    id: 'theme-kt',
    name: 'Theme.kt',
    path: 'app/src/main/java/com/chargeguard/app/ui/theme/Theme.kt',
    language: 'kotlin',
    category: 'UI Jetpack Compose',
    summary:
      'Palette Material 3 optimisée OLED (émeraude charge active, ambre thermique, cramoisi alarme).',
    content: `package com.chargeguard.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val ChargeEmerald = Color(0xFF10B981)
val WarmAmber = Color(0xFFD97706)
val AlarmCrimson = Color(0xFFDC2626)
val IdleSlate = Color(0xFF64748B)

private val DarkColors = darkColorScheme(
    primary = ChargeEmerald,
    onPrimary = Color(0xFF042F2E),
    background = Color(0xFF0B1117),
    onBackground = Color(0xFFF1F5F9),
    surface = Color(0xFF111923),
    onSurface = Color(0xFFF1F5F9),
    surfaceVariant = Color(0xFF17212E),
    onSurfaceVariant = Color(0xFF94A3B8),
    outlineVariant = Color(0xFF243242),
    error = AlarmCrimson
)

private val LightColors = lightColorScheme(
    primary = Color(0xFF059669),
    onPrimary = Color.White,
    background = Color(0xFFF8FAFC),
    onBackground = Color(0xFF0F172A),
    surface = Color.White,
    onSurface = Color(0xFF0F172A),
    surfaceVariant = Color(0xFFF1F5F9),
    onSurfaceVariant = Color(0xFF475569),
    outlineVariant = Color(0xFFE2E8F0),
    error = AlarmCrimson
)

@Composable
fun ChargeGuardTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        content = content
    )
}
`,
  },
  {
    id: 'root-gradle',
    name: 'build.gradle.kts (racine)',
    path: 'build.gradle.kts',
    language: 'gradle',
    category: 'Manifest & Gradle',
    summary: 'Déclaration des plugins Android Gradle Plugin 8.7.3 et Kotlin 2.0.21 au niveau racine.',
    content: `plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
}
`,
  },
  {
    id: 'settings-gradle',
    name: 'settings.gradle.kts',
    path: 'settings.gradle.kts',
    language: 'gradle',
    category: 'Manifest & Gradle',
    summary: 'Configuration des dépôts Google / MavenCentral et du module :app.',
    content: `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "ChargeGuard100"
include(":app")
`,
  },
  {
    id: 'gradle-properties',
    name: 'gradle.properties',
    path: 'gradle.properties',
    language: 'text',
    category: 'Build APK & Ressources',
    summary: 'Active AndroidX, la mémoire JVM pour R8/Compose et le style Kotlin officiel pour compiler l’APK.',
    content: `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true
`,
  },
  {
    id: 'gradle-wrapper-props',
    name: 'gradle-wrapper.properties',
    path: 'gradle/wrapper/gradle-wrapper.properties',
    language: 'text',
    category: 'Build APK & Ressources',
    summary: 'Fixe Gradle 8.10.2 compatible avec Android Gradle Plugin 8.7.3 et JDK 17.',
    content: `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.10.2-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`,
  },
  {
    id: 'proguard-rules',
    name: 'proguard-rules.pro',
    path: 'app/proguard-rules.pro',
    language: 'text',
    category: 'Build APK & Ressources',
    summary: 'Règles R8/ProGuard pour la compilation APK Release (assembleRelease).',
    content: `# Conserve les points d'entrée Android déclarés dans AndroidManifest.xml
-keep class com.chargeguard.app.MainActivity { *; }
-keep class com.chargeguard.app.service.BatteryMonitorService { *; }
`,
  },
  {
    id: 'strings-xml',
    name: 'strings.xml',
    path: 'app/src/main/res/values/strings.xml',
    language: 'xml',
    category: 'Build APK & Ressources',
    summary: 'Chaînes de ressources Android pour l’empaquetage AAPT2.',
    content: `<resources>
    <string name="app_name">ChargeGuard 100%</string>
</resources>
`,
  },
  {
    id: 'colors-xml',
    name: 'colors.xml',
    path: 'app/src/main/res/values/colors.xml',
    language: 'xml',
    category: 'Build APK & Ressources',
    summary: 'Couleur de fond de l’icône adaptative Android.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0B1117</color>
</resources>
`,
  },
  {
    id: 'ic-launcher-fg',
    name: 'ic_launcher_foreground.xml',
    path: 'app/src/main/res/drawable/ic_launcher_foreground.xml',
    language: 'xml',
    category: 'Build APK & Ressources',
    summary: 'Icône vectorielle adaptative (éclair émeraude) pour éviter toute erreur @mipmap lors du build APK.',
    content: `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#10B981"
        android:pathData="M59,24L35,58h17l-4,26 25,-35H56l3,-25z" />
</vector>
`,
  },
  {
    id: 'ic-launcher-xml',
    name: 'ic_launcher.xml',
    path: 'app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
    language: 'xml',
    category: 'Build APK & Ressources',
    summary: 'Déclaration de l’icône adaptative principale (@mipmap/ic_launcher).',
    content: `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
`,
  },
  {
    id: 'ic-launcher-round-xml',
    name: 'ic_launcher_round.xml',
    path: 'app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml',
    language: 'xml',
    category: 'Build APK & Ressources',
    summary: 'Déclaration de l’icône adaptative ronde (@mipmap/ic_launcher_round).',
    content: `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
`,
  },
  {
    id: 'github-actions-apk',
    name: 'build-apk.yml',
    path: '.github/workflows/build-apk.yml',
    language: 'yaml',
    category: 'Build APK & Ressources',
    summary: 'Workflow GitHub Actions clé en main : génère automatiquement le fichier ChargeGuard100-debug.apk dans le cloud sans installer Android Studio.',
    content: `name: Compiler ChargeGuard 100% APK

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build-apk:
    runs-on: ubuntu-latest

    steps:
      - name: Récupérer le code source
        uses: actions/checkout@v4

      - name: Configurer JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'

      - name: Configurer Gradle 8.10.2
        uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: 8.10.2

      - name: Compiler l'APK Debug
        run: gradle assembleDebug --stacktrace

      - name: Publier l'APK téléchargeable
        uses: actions/upload-artifact@v4
        with:
          name: ChargeGuard100-APK
          path: app/build/outputs/apk/debug/app-debug.apk
`,
  },
  {
    id: 'readme-apk',
    name: 'README-APK.md',
    path: 'README-APK.md',
    language: 'text',
    category: 'Build APK & Ressources',
    summary: 'Guide complet pour convertir le projet en fichier .apk installable (GitHub Actions, Android Studio ou ligne de commande).',
    content: `# ChargeGuard 100% — Guide de conversion en APK

Vous disposez de tous les droits pour compiler, signer et installer librement ce projet Android en fichier .apk.

## Méthode 1 — Sans installer Android Studio (GitHub Actions gratuit)
1. Créez un dépôt GitHub (public ou privé) et importez le contenu de ce dossier.
2. Ouvrez l'onglet **Actions** → **Compiler ChargeGuard 100% APK** → **Run workflow**.
3. Téléchargez l'artefact **ChargeGuard100-APK** contenant \`app-debug.apk\` et transférez-le sur votre téléphone Android.

## Méthode 2 — Avec Android Studio
1. Ouvrez ce dossier dans Android Studio (JDK 17).
2. Attendez la synchronisation Gradle.
3. Cliquez sur **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
4. L'APK prêt à installer se trouve dans : \`app/build/outputs/apk/debug/app-debug.apk\`.

## Méthode 3 — En ligne de commande (Gradle)
\`\`\`bash
gradle assembleDebug
# ou pour une version Release signée :
gradle assembleRelease
\`\`\`

## Installation sur téléphone Android
Transférez \`app-debug.apk\` sur votre smartphone, appuyez dessus, puis autorisez **Installer des applications inconnues** si Android vous le demande.
`,
  },
];
