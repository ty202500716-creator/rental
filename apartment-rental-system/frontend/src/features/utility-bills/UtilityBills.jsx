import {useState} from 'react';
import {DataTable} from '../../components/DataTable.jsx';
import {FormModal,ModalBtn,useApi,money,php} from '../../components';
import Payments from '../rental-payments/Payments.jsx';
import {cashAction,payAction} from '../rental-payments/actions.jsx';

const TYPES=['All','Electricity','Water'];
const STATUSES=['All','Paid','Unpaid','Partially Paid','Overdue'];
const summaryIcons=[
 'M12 2v20m5-15H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
 'M12 3 2.5 20h19L12 3zm0 6v5m0 3h.01',
 'M4 12h16M12 4v16m7-16-2 2m-10 10-2 2',
 'M5 5h14v14H5zM8 9h8m-8 3h8m-8 3h5'
];
const summaryTypes=['electricity','water','combined','open'];

function UtilitySummary({items}){
 return <section className="utility-summary-grid" aria-label="Utility billing summary">{items.map(([label,value,hint],index)=><article className={`utility-summary-card ${summaryTypes[index]}`} key={label}>
  <span className="utility-summary-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d={summaryIcons[index]}/></svg></span>
  <span className="utility-summary-copy"><span>{label}</span><b>{value}</b><small>{hint}</small></span>
 </article>)}</section>;
}

export default function UtilityBills({role}){
 const L=role==='Landlord',A=role==='Admin';
 const{d,e,load}=useApi('utility-bills');
 const[type,setType]=useState('All');
 const[status,setStatus]=useState('All');
 if(e)return <div className="tenant-message tenant-error" role="alert"><div><b>Utility bills could not be loaded.</b><p>{e}</p></div><button className="btn out sm" type="button" onClick={load}>Try again</button></div>;
 if(!d)return <div className="generic-loading" role="status"><span/>Loading utility bills…</div>;
 const rows=d.rows||[];
 const sum=billType=>rows.filter(row=>row.type===billType).reduce((total,row)=>total+Number(row.balance||0),0);
 const filtered=rows.filter(row=>(type==='All'||row.type===type)&&(status==='All'||row.status===status));
 const reset=()=>{setType('All');setStatus('All')};
 const createBill=load=><ModalBtn label="+ Create Utility Bill">{close=><FormModal wide title="Create Utility Bill" sub="Electricity and water are billed separately" route="utility-bills/create" onDone={load} onClose={close} note="Consumption and total are calculated automatically: (current − previous) × rate." fields={[
  {k:'rental_id',l:'Active Rental',type:'select',from:'rentals/active',map:x=>({value:x.value,label:x.label}),full:true},
  {k:'bill_type',l:'Bill Type',type:'select',opts:['Electricity','Water']},
  {k:'rate_per_unit',l:'Rate per kWh / m³ (₱)',type:'number',min:0},
  {k:'period_start',l:'Period Start',type:'date'},
  {k:'period_end',l:'Period End',type:'date'},
  {k:'previous_reading',l:'Previous Reading',type:'number',min:0},
  {k:'current_reading',l:'Current Reading',type:'number',min:0},
  {k:'due_date',l:'Due Date',type:'date',full:true}
 ]}/>}</ModalBtn>;
 const columns=[
  ['Utility type','type'],...(role!=='Tenant'?[['Tenant','tenant']]:[]),
  ...(L||A?[['Building / unit','unit']]:[]),
  ...(!A?[['Previous reading','previous_reading'],['Current reading','current_reading']]:[]),
  ['Billing period','billing_period_start',(value,row)=>`${value||'—'} – ${row.billing_period_end||'—'}`],
  ['Usage','consumption'],...(!A?[['Rate','rate',money]]:[]),
  ['Amount due','amount_due',money],['Balance','balance',money],['Due date','due_date'],['Status','status']
 ];
 return <>
  <div className="utility-heading"><div><span className="utility-eyebrow">SEPARATE BILLS, CLEAR RECORDS</span><h2>Utility bills</h2><p>Review electricity and water usage, balances, and payment activity.</p></div><button className="btn out sm" type="button" onClick={load}>Refresh</button></div>
  <UtilitySummary items={[
   ['Electricity balance',php(sum('Electricity')),'Outstanding electricity charges'],
   ['Water balance',php(sum('Water')),'Outstanding water charges'],
   ['Combined balance',php(sum('Electricity')+sum('Water')),'Total utilities outstanding'],
   ['Open bills',rows.filter(row=>Number(row.balance)>0).length,'Bills with a remaining balance']
  ]}/>
  <section className="utility-bills-panel">
   <div className="utility-bills-header"><div><h3>Bill register</h3><p>Each utility bill and payment is tracked independently.</p></div>{L&&createBill(load)}</div>
   <div className="utility-filters"><label>Utility type<select aria-label="Filter by utility type" value={type} onChange={event=>setType(event.target.value)}>{TYPES.map(value=><option key={value}>{value}</option>)}</select></label><label>Bill status<select aria-label="Filter by bill status" value={status} onChange={event=>setStatus(event.target.value)}>{STATUSES.map(value=><option key={value}>{value}</option>)}</select></label>{(type!=='All'||status!=='All')&&<button className="btn out sm" type="button" onClick={reset}>Reset filters</button>}<span>{filtered.length} {filtered.length===1?'bill':'bills'}</span></div>
   <DataTable rows={filtered} cols={columns} searchLabel="Search utility bills" empty="No utility bills match these filters." mobileCards act={A?null:row=>L?cashAction('Utility',row,load):payAction('Utility')(row,load)}/>
  </section>
  {L&&<section className="utility-payments-panel"><div className="utility-bills-header"><div><h3>Submitted utility payments</h3><p>Review electricity and water payments separately.</p></div></div><Payments role={role} cats={['Electricity','Water']} mobileCards/></section>}
 </>;
}
