import { Alert, Platform } from 'react-native';

/** A yes/no question before something that cannot be undone. Resolves true when confirmed. */
export function confirmAction(title: string, body: string, confirm = 'Delete', destructive = true): Promise<boolean> {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') return resolve(globalThis.confirm?.(`${title}\n\n${body}`) ?? false);
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirm, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}
