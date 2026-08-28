import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ColumnMapping, ImportType } from './types.ts';
import { inferColumnMapping } from './schema.ts';
export type ParsedFile = { headers:string[]; originalRows:Record<string,unknown>[]; rows:Record<string,unknown>[]; mapping:ColumnMapping[]; fileName:string };
export async function parseImportFile(file:File, importType:ImportType, savedMapping?:ColumnMapping[]):Promise<ParsedFile>{
  const name=file.name.toLowerCase(); let originalRows:Record<string,unknown>[];
  if(name.endsWith('.csv')){const result=Papa.parse<Record<string,unknown>>(await file.text(),{header:true,skipEmptyLines:true,dynamicTyping:false});if(result.errors.length)throw new Error('PARSE_ERROR');originalRows=result.data;}
  else if(name.endsWith('.xlsx')){const workbook=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false,raw:true});if(!workbook.SheetNames.length)throw new Error('EMPTY_WORKBOOK');originalRows=XLSX.utils.sheet_to_json<Record<string,unknown>>(workbook.Sheets[workbook.SheetNames[0]],{defval:null,raw:true});}
  else throw new Error('UNSUPPORTED_FILE');
  const headers=originalRows.length?Object.keys(originalRows[0]):[];
  const mapping=savedMapping?.length?savedMapping.filter((entry)=>headers.includes(entry.source)):inferColumnMapping(headers,importType);
  const rows=originalRows.map((row)=>Object.fromEntries(mapping.map(({source,target})=>[target,row[source]])));
  return {headers,originalRows,rows,mapping,fileName:file.name};
}
