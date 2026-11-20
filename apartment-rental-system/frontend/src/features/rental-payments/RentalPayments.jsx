import {useState} from 'react';
import {api,fileUrl} from '../../services/api.js';
import {useApi} from '../../hooks/useApi.js';
import {DataTable} from '../../components/DataTable.jsx';
import {FormModal,ModalBtn,Do,Modal,Stats,KV,Tag,money} from '../../components';
import {cashAction} from './actions.jsx';

const SECTIONS=['Payment Dashboard','Rental Bills','Payment Verification','Payment History'];
const BILL_STATUSES=['All','Outstanding','Paid','Unpaid','Partially Paid','Overdue'];
const PAYMENT_STATUSES=['All','Pending','Verified','Rejected'];
const monthLabel=value=>value?new Date(`${value}-01T00:00:00`).toLocaleDateString(undefined,{month:'short',year:'numeric'}):'—';
const paymentIcons=[
 'M12 2v20m5-15H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
 'M4 5h16M6 3v4m12-4v4M5 9h14v11H5z',
 'M4 12h16M12 4v16m7-16-2 2m-10 10-2 2',
 'M12 3 2.5 20h19L12 3zm0 6v5m0 3h.01'
];
const sectionDescriptions={
 'Payment Dashboard':'Monitor collected rent, outstanding balances, and recent payment activity.',
 'Rental Bills':'Track monthly rent charges and outstanding tenant balances.',
 'Payment Verification':'Review submitted rental payments and issue receipts for verified transactions.',
 'Payment History':'Search rental payment transactions and open their supporting details.'
};

export default function RentalPayments({role}){
 const[section,setSection]=useState(SECTIONS[0]);
 const[initialPaymentStatus,setInitialPaymentStatus]=useState('All');
 const[initialBillStatus,setInitialBillStatus]=useState('All');
 const landlord=role==='Landlord';
 const labels=landlord?['Collection Overview','Rent Bills','Verify Payments','Payment History']:SECTIONS;
 return <section className="combined-module rental-payment-module">
  <header className="workflow-heading"><div><span className="utility-eyebrow">{landlord?'LANDLORD FINANCE':'BILLING & COLLECTIONS'}</span><h2>{landlord?'Rent & payment management':'Rental payments'}</h2><p>{sectionDescriptions[section]}</p></div></header>
  <div className="payment-section-tabs" role="tablist" aria-label="Rental payment sections">
   {SECTIONS.map((tab,index)=><button type="button" key={tab} id={`payments-tab-${index}`} role="tab" aria-controls="payments-panel" aria-selected={section===tab} className={section===tab?'on':''} onClick={()=>setSection(tab)}><span>{labels[index]}</span></button>)}
  </div>
  <div id="payments-panel" role="tabpanel" aria-labelledby={`payments-tab-${SECTIONS.indexOf(section)}`}>
   {section===SECTIONS[0]?<PaymentDashboard role={role} onReviewPending={()=>{setInitialPaymentStatus('Pending');setSection(SECTIONS[2])}} onViewBills={status=>{setInitialBillStatus(status);setSection(SECTIONS[1])}}/>:
    section===SECTIONS[1]?<RentalBills key={section} role={role} initialStatus={initialBillStatus}/>:
    <PaymentTransactions key={section} role={role} verification={section===SECTIONS[2]} initialStatus={initialPaymentStatus}/>}
  </div>
 </section>;
}

function PaymentDashboard({role,onReviewPending,onViewBills}){
 const{d,e,load}=useApi('rental-payments/dashboard');
 if(e)return <ErrorState message={e} retry={load}/>;
 if(!d)return <div className="mut">Loading rental payment dashboard…</div>;
 const s=d.stats;
 const billTotal=Number(s.collected||0)+Number(s.outstanding||0);
 const collectionRate=billTotal?Math.min(100,Math.round(Number(s.collected||0)*100/billTotal)):0;
 return <div className="rental-payment-dashboard">
  {role==='Landlord'?<div className="payment-overview-grid" aria-label="Rental payment overview">
   <PaymentMetric icon={0} label="Rent collected" value={money(s.collected)} hint="Verified payments" tone="success"/>
   <PaymentMetric icon={1} label="Outstanding rent" value={money(s.outstanding)} hint="Remaining balance" tone="navy" action={()=>onViewBills('Outstanding')}/>
   <PaymentMetric icon={2} label="Pending payments" value={s.pending_payments} hint="Awaiting your review" tone="accent" action={()=>onReviewPending()}/>
   <PaymentMetric icon={3} label="Overdue bills" value={s.overdue_bills} hint="Past the due date" tone="warning" action={()=>onViewBills('Overdue')}/>
  </div>:<Stats items={[
    ['Total Rent Collected',money(s.collected)],['Outstanding Rental Balance',money(s.outstanding)],
    ['Paid Bills',s.paid_bills],['Unpaid Bills',s.unpaid_bills],['Pending Payments',s.pending_payments],
    ['Overdue Bills',s.overdue_bills],['Partially Paid Bills',s.partial_bills]
   ]}/>}
  {role==='Landlord'&&<div className="rent-collection-summary"><div><span>Collection rate</span><b>{billTotal?`${collectionRate}%`:'—'}</b><small>Collected against rent billed</small></div><div className="rent-collection-track" role="img" aria-label={`Rent collection rate ${collectionRate}%`}><span style={{width:`${collectionRate}%`}}/></div><span className="rent-collection-caption">{money(s.collected)} collected <span aria-hidden="true">·</span> {money(s.outstanding)} remaining</span></div>}
  {role==='Landlord'&&<aside className={`landlord-payment-actions${Number(s.pending_payments)===0&&Number(s.overdue_bills)===0?' clear':''}`} aria-label="Payment follow-up actions">
   <div><b>{Number(s.pending_payments)===0&&Number(s.overdue_bills)===0?'You’re up to date':'Payment follow-up'}</b><span>{Number(s.pending_payments)>0?`${s.pending_payments} payment${Number(s.pending_payments)===1?'':'s'} need verification.`:''}{Number(s.pending_payments)>0&&Number(s.overdue_bills)>0?' ':''}{Number(s.overdue_bills)>0?`${s.overdue_bills} rent bill${Number(s.overdue_bills)===1?' is':'s are'} overdue.`:''}{Number(s.pending_payments)===0&&Number(s.overdue_bills)===0?'No pending rent payments or overdue rent bills.':''}</span></div>
   <div>{Number(s.pending_payments)>0&&<button className="btn sm" type="button" onClick={onReviewPending}>Review payments</button>}{Number(s.overdue_bills)>0&&<button className="btn sm out" type="button" onClick={()=>onViewBills('Overdue')}>View overdue bills</button>}</div>
  </aside>}
  <section className="payment-panel">
   <div className="payment-panel-heading"><div><h3>Monthly rent collections</h3><p>Verified rental payments over the last six months.</p></div><span className="payment-verified-note">Verified payments only</span></div>
   {(d.monthly||[]).length?<div className="payment-month-grid">{d.monthly.map(item=>{const maximum=Math.max(...d.monthly.map(month=>Number(month.collected)||0),1);const percent=Math.round(Number(item.collected||0)*100/maximum);return <div className="payment-month" key={item.month}><div className="payment-month-heading"><span>{monthLabel(item.month)}</span><small>{item.payments} payment{Number(item.payments)===1?'':'s'}</small></div><b>{money(item.collected)}</b><div className="payment-month-track" role="img" aria-label={`${monthLabel(item.month)}: ${money(item.collected)} collected`}><span style={{width:`${percent}%`}}/></div></div>})}</div>:<p className="empty">No verified rental payments in the last six months.</p>}
  </section>
  <section className="payment-panel">
   <div className="payment-panel-heading"><div><h3>Recent rent payment activity</h3><p>Recent submissions and recorded payments.</p></div><span className="payment-activity-count">{(d.recent||[]).length} latest</span></div>
   <DataTable rows={d.recent||[]} empty="No rental payment activity yet." cols={[
    ['Date','payment_date'],['Tenant','tenant'],['Building / Unit','unit'],
    ['Amount','amount',money],['Method','method'],['Status','status'],['Receipt','receipt_number']
   ]}/>
  </section>
 </div>;
}

function PaymentMetric({icon,label,value,hint,tone,action}){
 const content=<><span className="payment-metric-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d={paymentIcons[icon]}/></svg></span><span className="payment-metric-content"><span>{label}</span><b>{value}</b><small>{hint}</small></span>{action&&<span className="payment-metric-arrow" aria-hidden="true">→</span>}</>;
 return action?<button type="button" className={`payment-metric ${tone}`} onClick={action} aria-label={`${label}: ${value}. ${hint}. View matching bills or payments.`}>{content}</button>:<article className={`payment-metric ${tone}`}>{content}</article>;
}

function RentalBills({role,initialStatus='All'}){
 const{d,e,load}=useApi('rental-bills');
 const[status,setStatus]=useState(initialStatus);
 const[month,setMonth]=useState('');
 const[filters,setFilters]=useState({landlord:'',tenant:'',building:'',unit:''});
 const[details,setDetails]=useState(null);
 const[editing,setEditing]=useState(null);
 if(e)return <ErrorState message={e} retry={load}/>;
 if(!d)return <div className="generic-loading" role="status"><span/>Loading rent bills…</div>;
 const rows=d.rows.filter(row=>
  (status==='All'||(status==='Outstanding'?Number(row.balance)>0:row.status===status))&&(!month||row.billing_month?.slice(0,7)===month)&&
  ['landlord','tenant','building','unit'].every(key=>!filters[key]||String(key==='building'?row.building_name:key==='unit'?row.unit_number:row[key]||'').toLowerCase().includes(filters[key].toLowerCase()))
 );
 const landlord=role==='Landlord';
 const totalDue=rows.reduce((total,row)=>total+Number(row.amount_due||0),0);
 const totalCollected=rows.reduce((total,row)=>total+Number(row.amount_paid||0),0);
 const totalOutstanding=rows.reduce((total,row)=>total+Number(row.balance||0),0);
 const reset=()=>{setStatus('All');setMonth('');setFilters({landlord:'',tenant:'',building:'',unit:''})};
 const createFields=[
  {k:'rental_id',l:'Active Rental',type:'select',from:'rentals/active',map:x=>({value:x.value,label:x.label}),full:true},
  {k:'billing_month',l:'Billing Period',type:'date'},
  {k:'due_date',l:'Due Date',type:'date'},
  {k:'amount_due',l:'Amount (₱)',type:'number',full:true}
 ];
 const editFields=[
  {k:'billing_month',l:'Billing Period',type:'date'},
  {k:'due_date',l:'Due Date',type:'date'},
  {k:'amount_due',l:'Amount (₱)',type:'number'},
  {k:'remarks',l:'Remarks',type:'textarea',opt:true}
 ];
 return <>
  {landlord&&<div className="rent-bill-summary">
   <article><span>Rent billed</span><b>{money(totalDue)}</b><small>{rows.length} bills in current view</small></article>
   <article><span>Collected</span><b>{money(totalCollected)}</b><small>{totalDue?`${Math.round(totalCollected*100/totalDue)}% of billed rent`: 'No rent billed yet'}</small></article>
   <article><span>Outstanding</span><b>{money(totalOutstanding)}</b><small>Remaining tenant balances</small></article>
  </div>}
  <div className="payment-toolbar">
   <select aria-label="Filter rental bills by status" value={status} onChange={event=>setStatus(event.target.value)}>{BILL_STATUSES.map(value=><option key={value}>{value}</option>)}</select>
   <label>Billing period <input type="month" value={month} onChange={event=>setMonth(event.target.value)}/></label>
   {role==='Admin'&&<input aria-label="Filter by landlord" placeholder="Landlord" value={filters.landlord} onChange={event=>setFilters({...filters,landlord:event.target.value})}/>}
   <input aria-label="Filter by tenant" placeholder="Tenant" value={filters.tenant} onChange={event=>setFilters({...filters,tenant:event.target.value})}/>
   <input aria-label="Filter by building" placeholder="Building" value={filters.building} onChange={event=>setFilters({...filters,building:event.target.value})}/>
   <input aria-label="Filter by unit" placeholder="Unit" value={filters.unit} onChange={event=>setFilters({...filters,unit:event.target.value})}/>
   {(status!=='All'||month||Object.values(filters).some(Boolean))&&<button className="btn sm out" type="button" onClick={reset}>Reset filters</button>}
   {role==='Landlord'&&<ModalBtn label="+ Create Rental Bill">{close=><FormModal title="Create Rental Bill" route="rental-bills/create" fields={createFields} onDone={load} onClose={close}/>}</ModalBtn>}
   <button className="btn sm out" onClick={load}>Refresh</button>
  </div>
  <div className="payment-results">{rows.length} {rows.length===1?'bill':'bills'} match the current filters.</div>
  <DataTable rows={rows} empty="No rental bills match the selected filters." cols={[
   ['Tenant','tenant'],['Landlord','landlord'],['Building','building_name'],['Unit','unit_number'],
   ['Billing Period','billing_month',value=>monthLabel(value?.slice(0,7))],['Due Date','due_date'],
   ['Amount Due','amount_due',money],['Paid','amount_paid',money],['Balance','balance',money],['Status','status']
  ]} act={row=><div className="acts">
   <button className="btn sm out" onClick={()=>setDetails(row)}>View Details</button>
   {landlord&&Number(row.balance)>0&&Number(row.pending)===0&&cashAction('Rental',row,load)}
   {landlord&&row.status==='Unpaid'&&Number(row.amount_paid)===0&&Number(row.pending)===0&&<button className="btn sm" onClick={()=>setEditing(row)}>Edit</button>}
  </div>} />
  {details&&<Modal title={`Rental Bill #${details.id}`} sub={details.tenant} onClose={()=>setDetails(null)}>
   <KV rows={[
    ['Landlord',details.landlord],['Tenant',details.tenant],['Tenant Email',details.tenant_email],
    ['Building / Unit',details.unit],['Rental ID',details.rental_id],
    ['Billing Period',monthLabel(details.billing_month?.slice(0,7))],['Due Date',details.due_date],
    ['Amount Due',money(details.amount_due)],['Amount Paid',money(details.amount_paid)],
    ['Outstanding Balance',money(details.balance)],['Status',<Tag s={details.status}/>],
    ['Remarks',details.remarks],['Created',details.created_at],['Payment Transactions',details.payment_count]
   ]}/>
  </Modal>}
  {editing&&<FormModal title="Edit Unpaid Rental Bill" sub={`${editing.tenant} · ${editing.unit}`}
   route="rental-bills/update" extra={{rental_bill_id:editing.id}}
   init={{billing_month:editing.billing_month,due_date:editing.due_date,amount_due:editing.amount_due,remarks:editing.remarks}}
   fields={editFields} onDone={()=>{setEditing(null);load()}} onClose={()=>setEditing(null)}/>}
 </>;
}

function PaymentTransactions({role,verification,initialStatus='All'}){
 const{d,e,load}=useApi('rental-payments/history');
 const[status,setStatus]=useState(initialStatus);
 const[method,setMethod]=useState('All');
 const[date,setDate]=useState('');
 const[filters,setFilters]=useState({landlord:'',tenant:'',building:'',unit:''});
 const[details,setDetails]=useState(null);
 const[rejectPayment,setRejectPayment]=useState(null);
 if(e)return <ErrorState message={e} retry={load}/>;
 if(!d)return <div className="mut">Loading rental payment transactions…</div>;
 const rows=d.rows.filter(row=>
  (status==='All'||row.status===status)&&
  (method==='All'||row.method===method)&&
  (!date||row.payment_date===date)&&
  ['landlord','tenant','building','unit'].every(key=>!filters[key]||String(key==='building'?row.building_name:key==='unit'?row.unit_number:row[key]||'').toLowerCase().includes(filters[key].toLowerCase()))
 );
 const counts={Pending:0,Verified:0,Rejected:0};
 d.rows.forEach(row=>{if(Object.hasOwn(counts,row.status))counts[row.status]++});
 const reset=()=>{setStatus('All');setMethod('All');setDate('');setFilters({landlord:'',tenant:'',building:'',unit:''})};
 return <>
  {verification&&<Stats items={[
   ['Pending Verification',counts.Pending],['Approved Payments',counts.Verified],['Rejected Payments',counts.Rejected]
  ]}/>}
  {verification&&role==='Landlord'&&<div className="payment-review-intro"><div><b>Review tenant submissions</b><p>Open each payment to check the reference and proof before confirming it. Verified payments update the rent bill and issue a receipt automatically.</p></div><span>{counts.Pending} pending</span></div>}
  <div className="payment-toolbar">
   <select aria-label="Filter by payment status" value={status} onChange={event=>setStatus(event.target.value)}>{PAYMENT_STATUSES.map(value=><option key={value}>{value}</option>)}</select>
   <select aria-label="Filter by payment method" value={method} onChange={event=>setMethod(event.target.value)}>{['All','GCash','Bank Transfer','Cash'].map(value=><option key={value}>{value}</option>)}</select>
   <label>Payment date <input type="date" value={date} onChange={event=>setDate(event.target.value)}/></label>
   {role==='Admin'&&<input aria-label="Filter by landlord" placeholder="Landlord" value={filters.landlord} onChange={event=>setFilters({...filters,landlord:event.target.value})}/>}
   <input aria-label="Filter by tenant" placeholder="Tenant" value={filters.tenant} onChange={event=>setFilters({...filters,tenant:event.target.value})}/>
   <input aria-label="Filter by building" placeholder="Building" value={filters.building} onChange={event=>setFilters({...filters,building:event.target.value})}/>
   <input aria-label="Filter by unit" placeholder="Unit" value={filters.unit} onChange={event=>setFilters({...filters,unit:event.target.value})}/>
   {(status!=='All'||method!=='All'||date||Object.values(filters).some(Boolean))&&<button className="btn sm out" type="button" onClick={reset}>Reset filters</button>}
   <button className="btn sm out" onClick={load}>Refresh</button>
  </div>
  <div className="payment-results">{rows.length} {rows.length===1?'payment':'payments'} match the current filters.</div>
  <DataTable rows={rows} empty={verification?'No rental payment verification activities.':'No rental payment history.'} cols={[
   ['Payment ID','payment_id'],['Tenant','tenant'],...(role!=='Landlord'?[['Landlord','landlord']]:[]),['Building','building_name'],['Unit','unit_number'],
   ['Billing Period','billing_month',value=>monthLabel(value?.slice(0,7))],['Payment Date','payment_date'],
   ['Amount','amount',money],['Method','method'],...(role==='Landlord'?[['Proof','proof_file',value=>value?<a className="payment-proof-link" href={fileUrl(value)} target="_blank" rel="noreferrer">View proof</a>:<span className="payment-proof-missing">Missing</span>]]:[]),['Status','status'],['Receipt','receipt_number']
  ]} act={row=><div className="acts">
   <button className="btn sm out" onClick={()=>setDetails(row)}>{verification&&role==='Landlord'&&row.status==='Pending'?'Review':'View Details'}</button>
  </div>} />
  {details&&<PaymentDetails payment={details} role={role} onClose={()=>setDetails(null)} onVerify={()=>{setDetails(null);load()}} onReject={()=>{setRejectPayment(details);setDetails(null)}}/>}
  {rejectPayment&&<FormModal danger title="Reject Rental Payment" sub={`${rejectPayment.tenant} · ${money(rejectPayment.amount)}`} route="payments/decide" extra={{payment_id:rejectPayment.payment_id,decision:'Rejected'}} fields={[{k:'reason',l:'Rejection reason (required)',type:'textarea',min:5,full:true}]} submit="Reject payment" onDone={()=>{setRejectPayment(null);load()}} onClose={()=>setRejectPayment(null)}/>}
 </>;
}

function PaymentDetails({payment,role,onClose,onVerify,onReject}){
 return <Modal title={`Rental Payment #${payment.payment_id}`} sub={payment.tenant} wide onClose={onClose}>
  <div className="printable">
   <KV rows={[
    ['Tenant',payment.tenant],['Tenant Email',payment.tenant_email],['Landlord',payment.landlord],
    ['Building / Unit',payment.unit],['Billing Period',monthLabel(payment.billing_month?.slice(0,7))],
    ['Bill Due Date',payment.due_date],['Payment Date',payment.payment_date],
    ['Amount',money(payment.amount)],['Payment Method',payment.method],['Reference',payment.reference],
    ['Payment Status',<Tag s={payment.status}/>],['Rejection Reason',payment.rejection_reason],
    ['Verified By',payment.verified_by_name],['Verification Date',payment.verified_at],
    ['Receipt Number',payment.receipt_number],['Receipt Issued',payment.receipt_issued_at],
    ['Recorded By',payment.recorded_by_name]
   ]}/>
   {payment.receipt_number&&<div className="payment-receipt">
    <h3>Rental Payment Receipt</h3><b>{payment.receipt_number}</b>
    <p>{payment.tenant} · {payment.unit}</p><p>{payment.payment_date} · {payment.method}</p><strong>{money(payment.receipt_amount||payment.amount)}</strong>
   </div>}
  </div>
  {payment.proof_file&&<section className="payment-proof"><h3>Proof of Payment</h3>
   <a href={fileUrl(payment.proof_file)} target="_blank" rel="noreferrer">Open proof in new tab</a>
   <iframe title="Rental payment proof" src={fileUrl(payment.proof_file)}/>
  </section>}
  {role==='Landlord'&&payment.status==='Pending'&&<div className="payment-review-actions"><Do label="Verify payment & issue receipt" cls="ok" run={()=>api('payments/decide',{payment_id:payment.payment_id,decision:'Verified'})} done={onVerify}/><button type="button" className="btn bad" onClick={onReject}>Reject payment</button></div>}
  {payment.receipt_number&&<button className="btn" style={{marginTop:16}} onClick={()=>window.print()}>Print / Download Receipt</button>}
 </Modal>;
}

function ErrorState({message,retry}){return <div className="tenant-message tenant-error" role="alert"><div><b>Rental payment information could not be loaded.</b><p>{message}</p></div><button className="btn out sm" onClick={retry}>Try again</button></div>}
