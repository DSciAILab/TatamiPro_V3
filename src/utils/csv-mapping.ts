
import { supabase } from "@/integrations/supabase/client";

/**
 * Generates a SHA-256 hash from the CSV headers.
 * Headers are normalized (trimmed, lowercase) and sorted to ensure inconsistent column ordering
 * doesn't affect the hash, as we map by header name not position.
 */
async function generateHeadersHash(headers: string[]): Promise<string> {
  const normalized = headers
    .filter(h => h && h.trim() !== '') // Remove empty headers
    .map(h => h.trim().toLowerCase())
    .sort()
    .join('|');
    
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Fetches the stored column mapping for a given file type and header set.
 */
export async function getStoredMapping(fileType: 'division' | 'registration', headers: string[]) {
  try {
    const hash = await generateHeadersHash(headers);
    const { data, error } = await supabase
      .from('import_column_mappings')
      .select('mapping')
      .eq('file_type', fileType)
      .eq('headers_hash', hash)
      .maybeSingle();

    if (error) {
      console.error('[CSV Mapping] Error fetching mapping:', error);
      return null;
    }
    return data?.mapping || null;
  } catch (err) {
    console.error('[CSV Mapping] Error in getStoredMapping:', err);
    return null;
  }
}

/**
 * Saves or updates variable column mapping for future use.
 */
export async function saveStoredMapping(
  fileType: 'division' | 'registration', 
  headers: string[], 
  mapping: Record<string, string | undefined>
) {
  try {
     const hash = await generateHeadersHash(headers);
     
     // Filter out undefined/null/empty values from mapping to keep it clean
     const cleanedMapping = Object.fromEntries(
       Object.entries(mapping).filter(([_, v]) => v != null && v !== '')
     );

     if (Object.keys(cleanedMapping).length === 0) return;

     const { error } = await supabase
       .from('import_column_mappings')
       .upsert({
         file_type: fileType,
         headers_hash: hash,
         mapping: cleanedMapping,
         updated_at: new Date().toISOString()
       }, {
         onConflict: 'file_type,headers_hash'
       });

     if (error) {
       console.error('[CSV Mapping] Error saving mapping:', error);
     } else {
       console.log('[CSV Mapping] Mapping saved successfully');
     }
  } catch (err) {
    console.error('[CSV Mapping] Error in saveStoredMapping:', err);
  }
}
