import { Redirect } from 'expo-router';

/** The old reader test is now the Sorting; your House lives at /house. */
export default function Quiz() {
  return <Redirect href="/house" />;
}
