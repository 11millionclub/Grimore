import { Redirect } from 'expo-router';

/**
 * The centre tab is an action, not a page: the tab bar opens /add-book as a
 * modal. If this route is ever reached directly, send the reader there.
 */
export default function AddTab() {
  return <Redirect href="/add-book" />;
}
