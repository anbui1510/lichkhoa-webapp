import { useCallback, useEffect, useRef, useState } from 'react';
import { hospitalCatalogEnabled } from '../../config/hospitalCatalog';
import { hasSheetPreviewSession } from '../account/previewSession';
import { getSpreadsheetId } from './sheetStorage';
import { discoverAllAccessibleKhoas } from './khoaDiscoveryClient';
import { getGoogleIdToken } from './googleIdToken';

/**
 * F-306 — sau login Google, quét catalog → khoa user được phép.
 */
export function useKhoaDiscovery({ syncAuthReady, accountEmail, onPickKhoa, onEmpty, onError }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const ranRef = useRef(false);

  const runDiscover = useCallback(async (force = false) => {
    if (!hospitalCatalogEnabled() || !syncAuthReady || !getGoogleIdToken()) return;
    if (hasSheetPreviewSession()) return;
    if (!force && ranRef.current) return;
    ranRef.current = true;
    setLoading(true);
    setError('');
    try {
      const list = await discoverAllAccessibleKhoas();
      setEntries(list);
      const hasStoredSheet = Boolean(getSpreadsheetId());
      const fromQuery = Boolean(new URLSearchParams(window.location.search).get('sheet'));
      if (!list.length) {
        onEmpty?.();
        setError('Email chưa có trong NhanSu của khoa nào (tab danh mục KhoaCatalog).');
        return;
      }
      if (!hasStoredSheet && !fromQuery) {
        if (list.length === 1) {
          onPickKhoa?.(list[0]);
        } else {
          setPickerOpen(true);
        }
      }
    } catch (err) {
      const msg = err?.message || 'Không quét được danh mục khoa.';
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  }, [onEmpty, onError, onPickKhoa, syncAuthReady]);

  useEffect(() => {
    if (!hospitalCatalogEnabled() || !syncAuthReady || !accountEmail) return undefined;
    runDiscover(false);
    return undefined;
  }, [syncAuthReady, accountEmail, runDiscover]);

  useEffect(() => {
    ranRef.current = false;
    setEntries([]);
    setPickerOpen(false);
    setError('');
  }, [accountEmail]);

  return {
    catalogEntries: entries,
    catalogLoading: loading,
    catalogPickerOpen: pickerOpen,
    setCatalogPickerOpen: setPickerOpen,
    catalogError: error,
    refreshCatalog: () => {
      ranRef.current = false;
      return runDiscover(true);
    },
  };
}