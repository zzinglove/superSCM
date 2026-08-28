export const DEMAND_TYPE_CODES = ['SMOOTH','INTERMITTENT','ERRATIC','LUMPY'] as const;
export type DemandType = typeof DEMAND_TYPE_CODES[number];
export type DemandProfile = {
  itemId:string; itemName:string|null; nPeriods:number|null; nNonzeroPeriods:number|null;
  adi:number|null; cv:number|null; cvSquared:number|null; zeroDemandRate:number|null;
  trend:number|null; recentChangeRate:number|null; peakPeriod:string|null;
  demandType:DemandType|null; seasonality:boolean|null; reasonCode:string|null; stability:string|null;
};
function value(row:Record<string,unknown>,keys:string[]){for(const key of keys){if(row[key]!==undefined&&row[key]!==null&&row[key]!=='')return row[key];}return null;}
function numberValue(row:Record<string,unknown>,keys:string[]){const raw=value(row,keys);if(raw===null)return null;const parsed=Number(raw);return Number.isFinite(parsed)?parsed:null;}
export function normalizeDemandProfile(row:Record<string,unknown>):DemandProfile{
  const type=String(value(row,['demand_type'])??'');
  return {itemId:String(value(row,['item_id'])??'미정'),itemName:value(row,['item_name'])===null?null:String(value(row,['item_name'])),
    nPeriods:numberValue(row,['n_periods']),nNonzeroPeriods:numberValue(row,['n_nonzero_periods']),adi:numberValue(row,['adi']),
    cv:numberValue(row,['cv']),cvSquared:numberValue(row,['cv_squared']),zeroDemandRate:numberValue(row,['zero_demand_rate']),
    trend:numberValue(row,['trend']),recentChangeRate:numberValue(row,['recent_change_rate']),
    peakPeriod:value(row,['peak_period'])===null?null:String(value(row,['peak_period'])),
    demandType:(DEMAND_TYPE_CODES as readonly string[]).includes(type)?type as DemandType:null,
    seasonality:typeof row.seasonality==='boolean'?row.seasonality:null,
    reasonCode:value(row,['reason_code'])===null?null:String(value(row,['reason_code'])),
    stability:value(row,['stability'])===null?null:String(value(row,['stability']))};
}
