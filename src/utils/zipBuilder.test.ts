import test from 'node:test';
import assert from 'node:assert/strict';
import { ANDROID_PROJECT_FILES } from '../data/androidProjectFiles';
import { buildZipArchive, crc32 } from './zipBuilder';

test('crc32 matches standard IEEE 802.3 vector for "123456789"', () => {
  const bytes = new TextEncoder().encode('123456789');
  assert.equal(crc32(bytes), 0xcbf43926);
});

test('buildZipArchive emits valid PKZip local headers, central directory, and EOCD', () => {
  const archive = buildZipArchive([
    { path: 'AndroidManifest.xml', content: '<manifest />' },
    { path: 'app/build.gradle.kts', content: 'plugins {}' },
  ]);

  const view = new DataView(archive.buffer);
  // First 4 bytes must be PK\x03\x04
  assert.equal(view.getUint32(0, true), 0x04034b50);

  // Last 22 bytes must start with EOCD signature PK\x05\x06 and report 2 entries
  const eocdStart = archive.length - 22;
  assert.equal(view.getUint32(eocdStart, true), 0x06054b50);
  assert.equal(view.getUint16(eocdStart + 10, true), 2);

  // Filenames must be embedded cleanly in UTF-8
  const text = new TextDecoder().decode(archive);
  assert.ok(text.includes('AndroidManifest.xml'));
  assert.ok(text.includes('app/build.gradle.kts'));
});

test('ANDROID_PROJECT_FILES includes all files required for zero-error APK compilation', () => {
  const paths = new Set(ANDROID_PROJECT_FILES.map((f) => f.path));
  const requiredForApk = [
    'app/src/main/AndroidManifest.xml',
    'app/build.gradle.kts',
    'gradle.properties',
    'gradle/wrapper/gradle-wrapper.properties',
    'app/proguard-rules.pro',
    'app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
    'app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml',
    'app/src/main/res/drawable/ic_launcher_foreground.xml',
    '.github/workflows/build-apk.yml',
  ];

  for (const requiredPath of requiredForApk) {
    assert.ok(paths.has(requiredPath), `Missing APK build file: ${requiredPath}`);
  }

  const fullArchive = buildZipArchive(
    ANDROID_PROJECT_FILES.map((f) => ({ path: `ChargeGuard100/${f.path}`, content: f.content }))
  );
  const view = new DataView(fullArchive.buffer);
  const eocdStart = fullArchive.length - 22;
  assert.equal(view.getUint16(eocdStart + 10, true), ANDROID_PROJECT_FILES.length);
});
