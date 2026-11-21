import { Redirect } from 'expo-router';

/** The centre tab is an action: the tab bar opens /add as a sheet. */
export default function AddTab() {
  return <Redirect href="/add" />;
}
