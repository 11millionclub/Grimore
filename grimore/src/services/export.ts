import { Platform, Share } from 'react-native';

import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

/**
 * Everything the reader has put into Grimore, as JSON. On the web it is
 * downloaded as a file; on phones it opens the share sheet so it can be saved
 * to Files, Drive or sent by email (no extra native module needed).
 */
export async function exportMyData(): Promise<number> {
  const data = unwrap(await supabase.rpc('export_my_data'));
  const json = JSON.stringify(data, null, 2);
  const name = `grimore-data-${new Date().toISOString().slice(0, 10)}.json`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } else {
    await Share.share({ title: name, message: json });
  }
  return json.length;
}
