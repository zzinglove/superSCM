import Link from 'next/link';
import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';
import Badge from '@/components/ui/badge';
import EmptyValue from '@/components/ui/empty-value';
import DataTable, { type DataColumn } from '@/components/ui/data-table';
import { getPurchaseRecommendations } from '@/lib/scm';
import type { PurchaseRecommendation } from '@/lib/scm-model';

export const dynamic = 'force-dynamic';
const number = (value: number | null, suffix = '') => value === null ? <EmptyValue reason="CALCULATION_UNAVAILABLE" /> : `${value.toLocaleString()}${suffix}`;
const status = (row: PurchaseRecommendation) => <Badge status={row.riskStatus}>{row.riskStatus}</Badge>;
const columns: DataColumn<PurchaseRecommendation>[] = [
  { key: 'itemId', label: 'SKU', render: (row) => <Link href={`/analysis/purchase-recommendation/${encodeURIComponent(row.itemId)}`}>{row.itemId}</Link> },
  { key: 'itemName', label: 'Item Name' }, { key: 'riskStatus', label: 'Risk', render: status },
  { key: 'forecastQty', label: 'Forecast', align: 'right', render: (row) => number(row.forecastQty, '개') },
  { key: 'confirmedOrderQty', label: 'Confirmed Order', align: 'right', render: (row) => number(row.confirmedOrderQty, '개') },
  { key: 'availableInventory', label: 'Inventory', align: 'right', render: (row) => number(row.availableInventory, '개') },
  { key: 'safetyStock', label: 'Safety Stock', align: 'right', render: (row) => number(row.safetyStock, '개') },
  { key: 'stockoutDate', label: 'Stockout Date', render: (row) => row.stockoutDate ?? <EmptyValue reason={row.reasonCode ?? 'NO_STOCKOUT_DATE'} /> },
  { key: 'requiredQty', label: 'Required Qty', align: 'right', render: (row) => number(row.requiredQty, '개') },
  { key: 'moq', label: 'MOQ', align: 'right', render: (row) => number(row.moq, '개') },
  { key: 'packSize', label: 'Pack Size', align: 'right', render: (row) => number(row.packSize, '개') },
  { key: 'recommendedQty', label: 'Recommended Qty', align: 'right', render: (row) => row.recommendedQty === null ? <EmptyValue reason={row.reasonCode ?? 'CALCULATION_UNAVAILABLE'} /> : `${row.recommendedQty.toLocaleString()}개` },
  { key: 'recommendedOrderDate', label: 'Recommended Order Date', render: (row) => <>{row.recommendedOrderDate ?? <EmptyValue reason={row.reasonCode ?? 'NO_ORDER_DATE'} />}{row.orderTimingStatus === 'IMMEDIATE' || row.orderTimingStatus === 'OVERDUE' ? <><br /><Badge status="CRITICAL">{row.orderTimingStatus}</Badge></> : null}</> },
];

export default async function PurchaseRecommendationPage() {
  const { rows, error } = await getPurchaseRecommendations();
  if (error) return <><PageHeader title="Purchase Recommendation" description="Safety Stock 기반 발주추천을 조회합니다." /><Panel><p className="value-critical">조회에 실패했습니다.</p><p className="muted">{error}</p></Panel></>;
  if (rows.length === 0) return <><PageHeader title="Purchase Recommendation" description="Safety Stock 기반 발주추천을 조회합니다." /><Panel><p className="muted">표시할 데이터가 없습니다.</p></Panel></>;
  return <><PageHeader title="Purchase Recommendation" description="Forecast Accuracy, Inventory Projection, Safety Stock, MOQ, Pack Size를 반영한 발주추천입니다." actions={<Badge status="SAFE">SUPABASE LIVE</Badge>} /><Panel title="SKU별 발주추천" meta={`${rows.length}건`}><DataTable columns={columns} rows={rows} empty="표시할 데이터가 없습니다." /></Panel></>;
}
