import { Alert } from 'react-native';

import { toAppError } from '@/lib/errors';
import { report, type ReportReason } from '@/services/social';

const REASONS: { reason: ReportReason; label: string }[] = [
  { reason: 'spoiler', label: 'Unmarked spoilers' },
  { reason: 'spam', label: 'Spam' },
  { reason: 'harassment', label: 'Harassment or bullying' },
  { reason: 'hate', label: 'Hateful content' },
  { reason: 'other', label: 'Something else' },
];

/** Native action sheet for reporting. Reports go to the moderation queue (content_reports). */
export function promptReport(target: { reporterId: string; userId?: string; postId?: string; reviewId?: string }) {
  Alert.alert('Report', 'Why are you reporting this? Reports are private.', [
    ...REASONS.map((r) => ({
      text: r.label,
      onPress: () => {
        report({ ...target, reason: r.reason }).then(
          () => Alert.alert('Thank you', 'Our moderators will review it.'),
          (e) => Alert.alert('Could not send report', toAppError(e).message),
        );
      },
    })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}
