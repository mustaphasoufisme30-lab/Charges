export const ACTIVATION_KEY = 'HIBA2026';
export const ACTIVATION_STORAGE_KEY = 'chargeguard_100_activated_v1';

export interface ActivationValidationResult {
  valid: boolean;
  error: string | null;
}

export function normalizeActivationKey(rawInput: string): string {
  return rawInput.trim().toUpperCase();
}

export function validateActivationKey(rawInput: string): ActivationValidationResult {
  const normalized = normalizeActivationKey(rawInput);

  if (normalized.length === 0) {
    return {
      valid: false,
      error: "Veuillez saisir votre clé d'activation pour lancer l'application.",
    };
  }

  if (normalized !== ACTIVATION_KEY) {
    return {
      valid: false,
      error: "Clé d'activation invalide. Vérifiez le code saisi puis réessayez.",
    };
  }

  return {
    valid: true,
    error: null,
  };
}

export function readPersistedActivation(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      return true;
    }
    return window.localStorage.getItem(ACTIVATION_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function savePersistedActivation(activated: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (activated) {
      window.localStorage.setItem(ACTIVATION_STORAGE_KEY, 'true');
    } else {
      window.localStorage.removeItem(ACTIVATION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted browsing contexts
  }
}
