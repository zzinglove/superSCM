import { redirect } from 'next/navigation';

export default function LegacyStockoutPage() {
  redirect('/user/analysis/stockout');
}
