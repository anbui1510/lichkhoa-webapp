/** Pin license; v14+ CDN cần key hợp lệ (v19 trên /latest từ chối evaluation trên domain prod). */
export const HANDSONTABLE_LICENSE_KEY =
  String(import.meta.env.VITE_HANDSONTABLE_LICENSE_KEY || '').trim() ||
  'non-commercial-and-evaluation';