import * as Clipboard from 'expo-clipboard';
import { Platform, Share } from 'react-native';

import { toast } from './toast';

/**
 * Opens the system share sheet. Browsers without one (most desktops) get the
 * text copied instead, so the button never fails silently.
 */
export async function shareText(message: string) {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && !navigator.share) throw new Error('no share sheet');
    await Share.share({ message });
  } catch (e) {
    if (Platform.OS !== 'web' && (e as Error)?.message !== 'no share sheet') return;
    try {
      await Clipboard.setStringAsync(message);
      toast('Copied to share');
    } catch {
      toast('Sharing is not available here');
    }
  }
}
