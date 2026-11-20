import {useEffect,useMemo,useState} from 'react';
import {useApi} from '../hooks/useApi.js';
import {Tag,isTag} from './Display.jsx';
const PAGE_SIZES=[10,25,50];
const cellValue=(row,column)=>{const value=row[column[1]];return column[2]?column[2](value,row):isTag(value)?<Tag s={value}/>:value??'—'};
export function DataTable({rows=[],cols,act,bar,empty='No records yet.',searchLabel='Search records',mobileCards=false}){const[q,setQ]=useState(''),[search,setSearch]=useState(''),[page,setPage]=useState(1),[pageSize,setPageSize]=useState(10);
  useEffect(()=>{const timer=setTimeout(()=>setSearch(q.trim().toLowerCase()),300);return()=>clearTimeout(timer)},[q]);
  useEffect(()=>setPage(1),[search]);
  const filtered=useMemo(()=>rows.filter(row=>!search||Object.values(row).some(value=>String(value??'').toLowerCase().includes(search))),[rows,search]);
  const pageCount=Math.max(1,Math.ceil(filtered.length/pageSize)),currentPage=Math.min(page,pageCount);
  const visible=filtered.slice((currentPage-1)*pageSize,currentPage*pageSize);
  return <section className="data-table">
    <div className="data-table-toolbar">{bar}<label className="data-table-search"><span aria-hidden="true">⌕</span><input aria-label={searchLabel} placeholder="Search records…" value={q} onChange={event=>setQ(event.target.value)}/>{q&&<button type="button" aria-label="Clear search" onClick={()=>setQ('')}>×</button>}</label></div>
    <div className="data-table-count" aria-live="polite"><span><b>{filtered.length}</b> {filtered.length===1?'result':'results'}</span>{search&&<span>Search: “{q.trim()}”</span>}</div>
    <div className={`tw data-table-table-view${mobileCards?' has-mobile-cards':''}`}><table><thead><tr>{cols.map(c=><th key={c[0]}>{c[0]}</th>)}{act&&<th>Actions</th>}</tr></thead><tbody>
      {visible.map((row,index)=><tr key={row.id??row.booking_id??row.rental_id??row.payment_id??row.payment_transaction_id??row.renewal_id??row.user_id??index}>{cols.map(c=><td key={c[0]}>{cellValue(row,c)}</td>)}{act&&<td><div className="acts">{act(row)}</div></td>}</tr>)}</tbody></table>{!visible.length&&<div className="empty">{empty}</div>}</div>
    {mobileCards&&visible.length>0&&<div className="data-table-card-list">{visible.map((row,index)=><article className="data-table-card" key={row.id??row.booking_id??row.rental_id??row.payment_id??row.payment_transaction_id??row.renewal_id??row.user_id??index}><dl>{cols.map(column=><div key={column[0]}><dt>{column[0]}</dt><dd>{cellValue(row,column)}</dd></div>)}</dl>{act&&<div className="data-table-card-actions">{act(row)}</div>}</article>)}</div>}
    {filtered.length>0&&<div className="data-table-pagination"><span>Showing {((currentPage-1)*pageSize)+1}–{Math.min(currentPage*pageSize,filtered.length)} of {filtered.length}</span><label>Rows per page<select aria-label="Rows per page" value={pageSize} onChange={event=>{setPageSize(Number(event.target.value));setPage(1)}}>{PAGE_SIZES.map(size=><option value={size} key={size}>{size}</option>)}</select></label><div><button className="btn sm out" type="button" aria-label="Previous page" disabled={currentPage===1} onClick={()=>setPage(value=>Math.max(1,value-1))}>‹</button><span>Page {currentPage} of {pageCount}</span><button className="btn sm out" type="button" aria-label="Next page" disabled={currentPage===pageCount} onClick={()=>setPage(value=>Math.min(pageCount,value+1))}>›</button></div></div>}
  </section>}
// Fetches route -> {rows} and shows a table. actions(row,reload), bar(reload)
export function List({route,cols,actions,bar,filter,empty,mobileCards=false}){const{d,e,load}=useApi(route);if(e)return <div className="tenant-message tenant-error" role="alert"><div><b>Records could not be loaded.</b><p>{e}</p></div><button className="btn out sm" type="button" onClick={load}>Try again</button></div>;if(!d)return <div className="generic-loading" role="status"><span/>Loading records…</div>;
  const rows=filter?d.rows.filter(filter):d.rows;return <DataTable rows={rows} cols={cols} empty={empty} bar={bar&&bar(load)} act={actions?r=>actions(r,load):null} mobileCards={mobileCards}/>}
// Dashboard cards. items: [label,key,isMoney]
