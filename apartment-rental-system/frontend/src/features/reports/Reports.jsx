import {useApi} from '../../hooks/useApi.js';
import {php} from '../../utils/format.js';

const isFinancial=report=>/collected|income|php|balance|revenue/i.test(report);
const formatValue=row=>isFinancial(row.report)?php(row.total):Number(row.total||0).toLocaleString();
const iconFor=report=>/tenant|user/i.test(report)?'♙':/building|unit|occupied|available/i.test(report)?'⌂':/booking|rental|lease/i.test(report)?'▤':/water|electricity/i.test(report)?'ϟ':'₱';

function ReportCards({rows}){
 return <div className="report-card-grid">{rows.map(row=><article className="report-card" key={row.report}><span className="report-card-icon" aria-hidden="true">{iconFor(row.report)}</span><div><span className="report-card-label">{row.report}</span><b>{formatValue(row)}</b></div></article>)}</div>;
}

function exportCsv(rows){
 const escape=value=>`"${String(value??'').replaceAll('"','""')}"`;
 const contents=[['Report','Total'],...rows.map(row=>[row.report,row.total])].map(line=>line.map(escape).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob(['\uFEFF',contents],{type:'text/csv;charset=utf-8'}));
 const link=document.createElement('a');
 link.href=url;link.download=`${new Date().toISOString().slice(0,10)}-landlord-report.csv`;
 document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
}

export default function Reports({role}){
 const{d,e,load}=useApi('reports');
 if(e)return <div className="tenant-message tenant-error" role="alert"><div><b>Reports could not be loaded.</b><p>{e}</p></div><button className="btn out sm" type="button" onClick={load}>Try again</button></div>;
 if(!d)return <div className="generic-loading" role="status"><span/>Preparing your reports…</div>;
 const rows=d.rows||[],operational=rows.filter(row=>!isFinancial(row.report)),financial=rows.filter(row=>isFinancial(row.report));
 return <section className="reports-page">
  <div className="printable reports-printable">
  <header className="reports-heading"><div><span className="utility-eyebrow">{role==='Landlord'?'YOUR PORTFOLIO':'PORTFOLIO INSIGHTS'}</span><h2>{role==='Landlord'?'Landlord reports':'Reports'}</h2><p>{role==='Landlord'?'Track unit occupancy, overdue bills, and verified rent and utility collections across your properties.':'A quick overview of property operations and verified collections.'}</p></div><div className="reports-actions"><button className="btn out sm" type="button" onClick={load}>Refresh</button>{role==='Landlord'&&rows.length>0&&<button className="btn out sm" type="button" onClick={()=>exportCsv(rows)}>Export CSV</button>}<button className="btn sm" type="button" onClick={()=>window.print()}>Print report</button></div></header>
  {financial.length>0&&<section className="report-group"><div className="report-group-heading"><div><h3>{role==='Landlord'?'Collections overview':'Financial overview'}</h3><p>{role==='Landlord'?'Verified rent, electricity, and water payments for your properties.':'Verified payment totals grouped by category.'}</p></div><span>{financial.length} metrics</span></div><ReportCards rows={financial}/></section>}
  {operational.length>0&&<section className="report-group"><div className="report-group-heading"><div><h3>{role==='Landlord'?'Property operations':'Operations overview'}</h3><p>{role==='Landlord'?'Occupancy and overdue bill counts for your managed units.':'Current account, property, booking, and rental counts.'}</p></div><span>{operational.length} metrics</span></div><ReportCards rows={operational}/></section>}
  {!rows.length&&<div className="tenant-empty"><span aria-hidden="true">▤</span><h3>No report data yet</h3><p>Reports will appear here as your account records grow.</p></div>}
  <p className="reports-footnote">Financial totals include verified payments only.</p>
  </div>
 </section>;
}
