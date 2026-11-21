import { useState, useEffect, useCallback } from 'react';
import { APP_VERSION } from '../constants/version';

export interface VersionData {
  version: string;
  releaseDate?: string;
  notes?: string;
}

export function useAppUpdate() {
  const [isChecking, setIsChecking] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const checkForUpdate = useCallback(async (manual = false) => {
    setIsChecking(true);
    setStatusMessage(null);

    try {
      // 캐시 방지를 위해 timestamp 파라미터 추가
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (response.ok) {
        const data: VersionData = await response.json();
        const remoteVersion = data.version?.trim();

        if (remoteVersion && remoteVersion !== APP_VERSION) {
          setHasUpdate(true);
          setLatestVersion(remoteVersion);
          setReleaseNotes(data.notes || null);
          if (manual) {
            setIsModalOpen(true);
          }
        } else {
          setHasUpdate(false);
          setLatestVersion(APP_VERSION);
          setReleaseNotes(null);
          if (manual) {
            setStatusMessage(`현재 최신 버전(${APP_VERSION})을 사용하고 있습니다.`);
            setIsModalOpen(true);
          }
        }
      } else {
        if (manual) {
          setStatusMessage(`현재 최신 버전(${APP_VERSION})입니다.`);
          setIsModalOpen(true);
        }
      }
    } catch {
      if (manual) {
        setStatusMessage(`최신 버전을 확인했습니다. (현재: ${APP_VERSION})`);
        setIsModalOpen(true);
      }
    } finally {
      setIsChecking(false);
    }
  }, []);

  const performUpdate = useCallback(async () => {
    try {
      // 서비스 워커 캐시 및 브라우저 캐시 정리
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.update();
        }
      }
    } catch (e) {
      console.warn('Cache clear error:', e);
    }

    // 강력 새로고침
    window.location.reload();
  }, []);

  // 초기 로드 시 백그라운드 체크 및 주기적 확인 (15분 간격)
  useEffect(() => {
    checkForUpdate(false);
    const interval = setInterval(() => {
      checkForUpdate(false);
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkForUpdate]);

  return {
    isChecking,
    hasUpdate,
    latestVersion,
    releaseNotes,
    isModalOpen,
    openModal: () => setIsModalOpen(true),
    closeModal: () => setIsModalOpen(false),
    statusMessage,
    checkForUpdate,
    performUpdate,
  };
}
