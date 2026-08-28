import { redirect } from 'next/navigation';

export default function LegacyLeadtimePage() {
  redirect('/user/analysis/leadtime');
}
