import {useEffect,useState} from 'react';
import {api} from '../../services/api.js';
import {Tag} from '../../components/Display.jsx';

const PAGE_SIZE=25;
export default function AuditLog(){
 const[rows,setRows]=useState([]);
 const[actions,setActions]=useState([]);
 const[filters,setFilters]=useState({action:'',from:'',to:''});
 const[page,setPage]=useState(1);
 const[total,setTotal]=useState(0);
 const[error,setError]=useState('');
 const[busy,setBusy]=useState(false);
 const load=async(nextPage=page,nextFilters=filters)=>{
  setBusy(true);setError('');
  try{
   const params=new URLSearchParams({page:String(nextPage),per_page:String(PAGE_SIZE)});
   if(nextFilters.action)params.set('action',nextFilters.action);
   if(nextFilters.from)params.set('from',nextFilters.from);
   if(nextFilters.to)params.set('to',nextFilters.to);
   const result=await api(`admin/audit-log&${params.toString()}`);
   setRows(result.rows||[]);setTotal(Number(result.total)||0);setPage(Number(result.page)||nextPage);
   setActions(result.actions||[]);
  }catch(x){setError(x.message)}
  finally{setBusy(false)}
 };
 useEffect(()=>{load(1,filters)},[]);
 const update=(key,value)=>{const next={...filters,[key]:value};setFilters(next);setPage(1);load(1,next)};
 const pageCount=Math.max(1,Math.ceil(total/PAGE_SIZE));
 return <section className="admin-audit-log">
  <header className="admin-section-heading"><div><p className="tenant-eyebrow">ADMINISTRATIVE ACTIVITY</p><h2>Audit Log</h2><p>Review system actions recorded by the platform.</p></div><button className="btn out sm" type="button" disabled={busy} onClick={()=>load(page)}>Refresh</button></header>
  <div className="admin-audit-filters">
   <label>Action<select value={filters.action} onChange={event=>update('action',event.target.value)}><option value="">All actions</option>{actions.map(action=><option key={action} value={action}>{action}</option>)}</select></label>
   <label>From<input type="date" value={filters.from} onChange={event=>update('from',event.target.value)}/></label>
   <label>To<input type="date" value={filters.to} onChange={event=>update('to',event.target.value)}/></label>
   <button className="btn out sm" type="button" onClick={()=>{setFilters({action:'',from:'',to:''});setPage(1);load(1,{action:'',from:'',to:''})}}>Clear filters</button>
  </div>
  {error&&<div className="tenant-feedback tenant-feedback-error" role="alert"><span>{error}</span><button className="btn out sm" type="button" onClick={()=>load(page)}>Retry</button></div>}
  <div className="tw data-table-table-view"><table><thead><tr>{['Date','Action','Actor','Record','Client IP','Change details'].map(title=><th key={title}>{title}</th>)}</tr></thead><tbody>
   {rows.map(row=><tr key={row.audit_id}><td>{row.created_at}</td><td><Tag s={row.action}/></td><td>{row.actor||'System'}</td><td>{row.table_name||'—'}{row.record_id?` #${row.record_id}`:''}</td><td>{row.ip_address||'—'}</td><td>{row.new_value?(()=>{try{return <pre className="audit-json">{JSON.stringify(JSON.parse(row.new_value),null,2)}</pre>}catch{return row.new_value}})():'—'}</td></tr>)}
  </tbody></table>{!rows.length&&<div className="empty">{busy?'Loading audit events…':'No audit events match these filters.'}</div>}</div>
  <div className="tenant-pagination"><span>{total} events · Page {page} of {pageCount}</span><div className="tenant-page-buttons"><button className="btn out sm" type="button" disabled={page<=1||busy} onClick={()=>load(page-1)}>Previous</button><button className="btn out sm" type="button" disabled={page>=pageCount||busy} onClick={()=>load(page+1)}>Next</button></div></div>
 </section>;
}
