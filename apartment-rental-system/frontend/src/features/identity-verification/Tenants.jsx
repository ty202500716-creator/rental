import {useEffect,useMemo,useRef,useState} from 'react';
import {api,tenantDocumentUrl} from '../../services/api.js';
import {PhilippineAddressDisplay} from '../../components/PhilippineAddressFields.jsx';
import {useApi} from '../../hooks/useApi.js';
import {KV,Modal,Tag,FormModal,ModalBtn} from '../../components';

const STATUSES=['All','Unverified','Pending','Verified','Rejected'];
const ACCOUNT_STATUSES=['All','Active','Suspended','Deactivated'];
const PAGE_SIZES=[10,25,50];
const dateLabel=value=>{
 if(!value)return '—';
 const date=new Date(String(value).replace(' ','T'));
 return Number.isNaN(date.getTime())?value:date.toLocaleString();
};
const initials=name=>String(name||'Tenant').trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();

function TenantIdentity({row}){
 return <div className="tenant-person">
  <span className="tenant-avatar" aria-hidden="true">{initials(row.name)}</span>
  <span className="tenant-person-copy"><b>{row.name}</b><span>{row.email}</span></span>
 </div>;
}

function TenantCard({row,onDetails,onVerify,onReject,onReactivate,onRefresh,busy,role}){
 const canReview=row.verification_status==='Pending'&&row.document_available;
 return <article className="tenant-card">
  <div className="tenant-card-head"><TenantIdentity row={row}/><Tag s={row.verification_status}/></div>
  <div className="tenant-card-facts">
   <div><small>Contact</small><span>{row.contact_number||'—'}</span></div>
   <div><small>Property / unit</small><span>{row.associated_building||'—'}{row.unit_numbers?` · ${row.unit_numbers}`:''}</span></div>
   <div><small>Identity document</small><span>{row.id_type||'Not submitted'}{!row.document_available?' · No file':''}</span></div>
   <div><small>Account status</small><span><Tag s={row.account_status}/></span></div>
  </div>
  <div className="tenant-card-actions">
   <button className="btn sm out" type="button" onClick={()=>onDetails(row.tenant_id)}>View details</button>
   {row.document_available&&<a className="btn sm out" href={tenantDocumentUrl(row.tenant_id)} target="_blank" rel="noreferrer">View ID</a>}
   {canReview&&<>
    <button className="btn sm ok" type="button" disabled={busy} onClick={()=>onVerify(row)}>{role==='Admin'?'Verify identity':'Verify'}</button>
    <button className="btn sm bad" type="button" disabled={busy} onClick={()=>onReject(row)}>{role==='Admin'?'Reject identity':'Reject'}</button>
   </>}
   {role==='Admin'&&row.account_status==='Active'&&<ModalBtn label="Suspend" cls="out">{close=><FormModal title="Suspend tenant account" sub={row.name} route="admin/users/status" extra={{user_id:row.user_id,status:'Suspended'}} fields={[{k:'reason',l:'Suspension reason (required)',type:'textarea',maxLength:255}]} submit="Confirm suspension" onDone={async()=>{await onRefresh();window.dispatchEvent(new Event('ars:admin-user-change'))}} onClose={close}/>}</ModalBtn>}
   {role==='Admin'&&row.account_status!=='Active'&&<button className="btn sm ok" type="button" disabled={busy} onClick={()=>onReactivate(row)}>Reactivate</button>}
  </div>
 </article>;
}

export default function Tenants({role,onPendingCount}){
 const{d,e,load}=useApi('tenants');
 const[searchDraft,setSearchDraft]=useState('');
 const[search,setSearch]=useState('');
 const[status,setStatus]=useState('All');
 const[accountStatus,setAccountStatus]=useState('All');
 const[page,setPage]=useState(1);
 const[pageSize,setPageSize]=useState(10);
 const[details,setDetails]=useState(null);
 const[detailsLoading,setDetailsLoading]=useState(false);
 const[detailsError,setDetailsError]=useState('');
 const[showReject,setShowReject]=useState(null);
 const[reason,setReason]=useState('');
 const[busyTenantId,setBusyTenantId]=useState(null);
 const[actionError,setActionError]=useState('');
 const[notice,setNotice]=useState('');
 const detailsRequest=useRef(0);

 useEffect(()=>{
  const timer=setTimeout(()=>{setSearch(searchDraft.trim());setPage(1)},300);
  return()=>clearTimeout(timer);
 },[searchDraft]);

 const openDetails=async tenantId=>{
  const request=++detailsRequest.current;
  setDetails(null);setDetailsError('');setDetailsLoading(true);
  try{
   const result=await api(`tenants/details&tenant_id=${encodeURIComponent(tenantId)}`);
   if(request===detailsRequest.current)setDetails(result.tenant);
  }catch(error){
   if(request===detailsRequest.current)setDetailsError(error.message);
  }finally{
   if(request===detailsRequest.current)setDetailsLoading(false);
  }
 };
 const closeDetails=()=>{
  detailsRequest.current++;
  setDetails(null);setDetailsLoading(false);setDetailsError('');
 };
 const review=async(tenantId,decision,rejectionReason)=>{
  await api('tenants/verify',{tenant_id:tenantId,decision,...(rejectionReason?{reason:rejectionReason}:{})});
 };
 const verifyTenant=async row=>{
  setBusyTenantId(row.tenant_id);setActionError('');setNotice('');
  try{
   await review(row.tenant_id,'Verified');
   setNotice(`${row.name}'s identity was verified.`);
   await load();
   if(details?.tenant_id===row.tenant_id)await openDetails(row.tenant_id);
  }catch(error){setActionError(error.message)}
  finally{setBusyTenantId(null)}
 };
 const rejectTenant=async()=>{
  if(!showReject||!reason.trim())return;
  setBusyTenantId(showReject.tenant_id);setActionError('');setNotice('');
  try{
   await review(showReject.tenant_id,'Rejected',reason.trim());
   setNotice(`${showReject.name}'s identity was rejected.`);
   setShowReject(null);setReason('');
   await load();
  }catch(error){setActionError(error.message)}
  finally{setBusyTenantId(null)}
 };
 const reactivateTenant=async row=>{
  setBusyTenantId(row.tenant_id);setActionError('');setNotice('');
  try{
   await api('admin/users/status',{user_id:row.user_id,status:'Active'});
   setNotice(`${row.name}'s account was reactivated.`);
   await load();
   window.dispatchEvent(new Event('ars:admin-user-change'));
  }catch(error){setActionError(error.message)}
  finally{setBusyTenantId(null)}
 };

 const rows=d?.rows||[];
 const stats=d?.stats||{total:0,verified:0,pending:0,rejected:0};
 useEffect(()=>{if(role==='Admin')onPendingCount?.(Number(stats.pending)||0)},[role,stats.pending,onPendingCount]);
 const visibleRows=useMemo(()=>rows.filter(row=>
  (status==='All'||row.verification_status===status)&&
  (role!=='Admin'||accountStatus==='All'||row.account_status===accountStatus)&&
  Object.values(row).some(value=>String(value??'').toLowerCase().includes(search.toLowerCase()))
 ),[rows,status,accountStatus,role,search]);
 const pageCount=Math.max(1,Math.ceil(visibleRows.length/pageSize));
 const currentPage=Math.min(page,pageCount);
 const pageRows=visibleRows.slice((currentPage-1)*pageSize,currentPage*pageSize);
 const setStatusFilter=value=>{setStatus(value);setPage(1)};
 const resetFilters=()=>{setSearchDraft('');setSearch('');setStatus('All');setAccountStatus('All');setPage(1)};

 if(e)return <div className="tenant-message tenant-error" role="alert"><div><b>Tenant information could not be loaded.</b><p>{e}</p></div><button className="btn out sm" type="button" onClick={load}>Try again</button></div>;
 if(!d)return <div className="tenant-skeleton" role="status" aria-label="Loading tenant management">{[1,2,3].map(item=><div key={item}/>)}</div>;

 return <div className="tenant-management">
  <header className="tenant-heading">
   <div><p className="tenant-eyebrow">PEOPLE &amp; ACCOUNTS</p><h2>Tenant management</h2>
    <p>{role==='Admin'?'Review tenant accounts and identity verification across the system.':'Manage tenants connected to your properties and review their identity documents.'}</p>
   </div>
   <button className="btn out tenant-refresh" type="button" onClick={()=>{setActionError('');load()}} aria-label="Refresh tenant list"><span aria-hidden="true">↻</span> Refresh</button>
  </header>

  <div className="tenant-stat-grid" aria-label="Tenant verification summary">
   {[
    ['All tenants',stats.total,'All','◉'],
    ['Verified',stats.verified,'Verified','✓'],
    ['Awaiting review',stats.pending,'Pending','◷'],
    ['Rejected',stats.rejected,'Rejected','!']
   ].map(([label,value,filter,icon])=><button className={`tenant-stat${status===filter?' selected':''}`} type="button" key={label} onClick={()=>setStatusFilter(filter)} aria-pressed={status===filter}>
    <span className="tenant-stat-icon" aria-hidden="true">{icon}</span><span className="tenant-stat-label">{label}</span><b>{Number(value)||0}</b><span className="tenant-stat-hint">{filter==='All'?'View all tenants':`Show ${filter.toLowerCase()} tenants`}</span>
   </button>)}
  </div>

  {actionError&&<div className="tenant-feedback tenant-feedback-error" role="alert"><span>{actionError}</span><button type="button" aria-label="Dismiss error" onClick={()=>setActionError('')}>×</button></div>}
  {notice&&<div className="tenant-feedback tenant-feedback-success" role="status"><span>{notice}</span><button type="button" aria-label="Dismiss message" onClick={()=>setNotice('')}>×</button></div>}

  <section className="tenant-directory" aria-label="Tenant directory">
   <div className="tenant-toolbar">
    <label className="tenant-search"><span aria-hidden="true">⌕</span><input aria-label="Search tenants" placeholder="Search name, email, property, or unit" value={searchDraft} onChange={event=>setSearchDraft(event.target.value)}/>
     {searchDraft&&<button type="button" aria-label="Clear search" onClick={()=>{setSearchDraft('');setSearch('');setPage(1)}}>×</button>}
    </label>
    <label className="tenant-status-filter"><span>Verification status</span><select aria-label="Filter by verification status" value={status} onChange={event=>setStatusFilter(event.target.value)}>
     {STATUSES.map(value=><option key={value} value={value}>{value==='All'?'All statuses':value}</option>)}
    </select></label>
     {role==='Admin'&&<label className="tenant-status-filter"><span>Account status</span><select aria-label="Filter by account status" value={accountStatus} onChange={event=>{setAccountStatus(event.target.value);setPage(1)}}>{ACCOUNT_STATUSES.map(value=><option key={value} value={value}>{value==='All'?'All accounts':value}</option>)}</select></label>}
     {(searchDraft||status!=='All'||accountStatus!=='All')&&<button className="btn out sm tenant-reset" type="button" onClick={resetFilters}>Reset filters</button>}
   </div>
   <div className="tenant-results"><span><b>{visibleRows.length}</b> {visibleRows.length===1?'tenant':'tenants'}{status!=='All'?` · ${status}`:''}</span><span>Tenant directory</span></div>

   {visibleRows.length===0?
    <div className="tenant-empty"><span aria-hidden="true">⌕</span><h3>{rows.length?'No tenants match your filters':'No tenants to manage yet'}</h3><p>{rows.length?'Try another search or clear the selected status filter.':'Tenants associated with your account will appear here.'}</p>{rows.length>0&&<button className="btn out sm" type="button" onClick={resetFilters}>Reset filters</button>}</div>:
    <>
     <div className="tw tenant-table-wrap"><table className="tenant-table">
      <thead><tr><th>Tenant</th><th>Contact</th><th>Property / unit</th><th>ID document</th><th>Verification</th><th>Account</th><th>Reason</th><th>Actions</th></tr></thead>
      <tbody>{pageRows.map(row=><tr key={row.tenant_id}>
       <td><TenantIdentity row={row}/></td>
       <td>{row.contact_number||'—'}</td>
       <td><span className="tenant-property">{row.associated_building||'—'}</span><small className="tenant-unit">{row.unit_numbers||'No unit linked'}</small></td>
       <td>{row.document_available?<><span className="tenant-id-type">{row.id_type||'Identity document'}</span><a className="tenant-doc-link" href={tenantDocumentUrl(row.tenant_id)} target="_blank" rel="noreferrer">View document</a></>:<span className="tenant-no-doc">Not submitted</span>}</td>
       <td><Tag s={row.verification_status}/></td><td><Tag s={row.account_status}/></td><td>{row.account_status_reason||'—'}</td>
       <td><div className="tenant-actions">
        <button className="btn sm out" type="button" onClick={()=>openDetails(row.tenant_id)}>Details</button>
        {row.verification_status==='Pending'&&row.document_available&&<>
         <button className="btn sm ok" type="button" disabled={busyTenantId===row.tenant_id} onClick={()=>verifyTenant(row)}>{busyTenantId===row.tenant_id?'Saving…':role==='Admin'?'Verify identity':'Verify'}</button>
         <button className="btn sm bad" type="button" disabled={busyTenantId===row.tenant_id} onClick={()=>{setShowReject(row);setReason('');setActionError('')}}>{role==='Admin'?'Reject identity':'Reject'}</button>
        </>}
        {role==='Admin'&&row.account_status==='Active'&&<ModalBtn label="Suspend" cls="out">{close=><FormModal title="Suspend tenant account" sub={row.name} route="admin/users/status" extra={{user_id:row.user_id,status:'Suspended'}} fields={[{k:'reason',l:'Suspension reason (required)',type:'textarea',maxLength:255}]} submit="Confirm suspension" onDone={async()=>{await load();window.dispatchEvent(new Event('ars:admin-user-change'))}} onClose={close}/>}</ModalBtn>}
        {role==='Admin'&&row.account_status!=='Active'&&<button className="btn sm ok" type="button" disabled={busyTenantId===row.tenant_id} onClick={()=>reactivateTenant(row)}>{busyTenantId===row.tenant_id?'Working…':'Reactivate'}</button>}
       </div></td>
      </tr>)}</tbody>
     </table></div>
     <div className="tenant-mobile-list">{pageRows.map(row=><TenantCard key={row.tenant_id} role={role} row={row} onDetails={openDetails} onVerify={verifyTenant} onReject={tenant=>{setShowReject(tenant);setReason('');setActionError('')}} onReactivate={reactivateTenant} onRefresh={load} busy={busyTenantId===row.tenant_id}/>)}</div>
     <div className="tenant-pagination"><span>Showing {((currentPage-1)*pageSize)+1}–{Math.min(currentPage*pageSize,visibleRows.length)} of {visibleRows.length}</span>
      <label>Rows per page<select aria-label="Rows per page" value={pageSize} onChange={event=>{setPageSize(Number(event.target.value));setPage(1)}}>{PAGE_SIZES.map(size=><option value={size} key={size}>{size}</option>)}</select></label>
      <div className="tenant-page-buttons"><button type="button" className="btn out sm" disabled={currentPage===1} onClick={()=>setPage(value=>Math.max(1,value-1))} aria-label="Previous page">‹</button><span>Page {currentPage} of {pageCount}</span><button type="button" className="btn out sm" disabled={currentPage===pageCount} onClick={()=>setPage(value=>Math.min(pageCount,value+1))} aria-label="Next page">›</button></div>
     </div>
    </>}
  </section>

  {detailsLoading&&<Modal title="Tenant details" onClose={closeDetails}><div className="tenant-detail-loading" role="status"><span className="tenant-spinner"/>Loading tenant details…</div></Modal>}
  {detailsError&&<Modal title="Tenant details" onClose={closeDetails}><div className="tenant-feedback tenant-feedback-error" role="alert">{detailsError}</div><button className="btn out" type="button" onClick={closeDetails}>Close</button></Modal>}
  {details&&<Modal title="Tenant details" sub={details.name} wide onClose={closeDetails}>
   {actionError&&<div className="tenant-feedback tenant-feedback-error" role="alert">{actionError}</div>}
   {notice&&<div className="tenant-feedback tenant-feedback-success" role="status">{notice}</div>}
   <h3 className="tenant-detail-heading">Personal information</h3>
   <KV rows={[
    ['Full name',details.name],['Date of birth',details.date_of_birth],['Gender',details.gender],
    ['Occupation',details.occupation],['Email address',details.email],['Contact number',details.contact_number],
    ['Complete address',<PhilippineAddressDisplay address={details.complete_address}/>],['Emergency contact',details.emergency_contact_name],
    ['Emergency contact number',details.emergency_contact_number],['Emergency contact relation',details.emergency_contact_relation],
    ['Apartment / unit',details.associated_unit],    ['Account status',<Tag s={details.account_status}/>],['Account status reason',details.account_status_reason],
    ['ID type',details.id_type],['ID number',details.id_number],
    ['Verification status',<Tag s={details.verification_status}/>],
    ['Rejection reason',details.rejection_reason],['Verification date',dateLabel(details.verified_at)],
    ['Verified by',details.verified_by]
   ]}/>
   <h3 className="tenant-detail-heading">Current rental</h3>
   {details.current_rental?<KV rows={[
    ['Building / unit',details.current_rental.unit],['Landlord',details.current_rental.landlord],
    ['Rental status',<Tag s={details.current_rental.rental_status}/>],['Lease dates',`${details.current_rental.start_date} – ${details.current_rental.end_date}`],
    ['Monthly rent',details.current_rental.monthly_rent]
   ]}/>:<p className="mut">No current rental.</p>}
   <h3 className="tenant-detail-heading">Booking history</h3>
   {details.booking_history?.length?<div className="tenant-booking-history">{details.booking_history.map(booking=><div key={booking.booking_id}><b>{booking.building_name} · Unit {booking.unit_number}</b><Tag s={booking.booking_status}/><small>{booking.created_at} · Landlord: {booking.landlord}</small>{booking.rejection_reason&&<small>Reason: {booking.rejection_reason}</small>}</div>)}</div>:<p className="mut">No booking history.</p>}
   <section className="tenant-document-section"><h3 className="tenant-detail-heading">Identity document</h3>
    {details.document_available?<><a href={tenantDocumentUrl(details.tenant_id)} target="_blank" rel="noreferrer">Open document in a new tab</a>
     <iframe className="tenant-document-frame" title="Tenant identity document" src={tenantDocumentUrl(details.tenant_id)}/></>:<p className="mut">No identity document has been submitted.</p>}
   </section>
   {details.verification_status==='Pending'&&details.document_available&&<div className="tenant-detail-actions">
    <button className="btn ok" type="button" disabled={busyTenantId===details.tenant_id} onClick={()=>verifyTenant(details)}>Verify identity</button>
    <button className="btn bad" type="button" onClick={()=>{setShowReject(details);setReason('');closeDetails()}}>Reject identity</button>
   </div>}
  </Modal>}
  {showReject&&<Modal title="Reject identity verification" sub={showReject.name} onClose={()=>{setShowReject(null);setReason('')}}>
   <label htmlFor="tenant-rejection-reason">Rejection reason <span aria-hidden="true">(required)</span></label>
   <textarea id="tenant-rejection-reason" rows={4} maxLength={255} value={reason} onChange={event=>setReason(event.target.value)} aria-describedby="tenant-rejection-help" required/>
   <small id="tenant-rejection-help" className="tenant-rejection-help">{reason.length}/255 characters. Explain what needs to be corrected.</small>
   {actionError&&<div className="tenant-feedback tenant-feedback-error" role="alert" style={{marginTop:12}}>{actionError}</div>}
   <button className="btn bad" type="button" style={{width:'100%',marginTop:16}} disabled={!reason.trim()||busyTenantId===showReject.tenant_id} onClick={rejectTenant}>{busyTenantId===showReject.tenant_id?'Submitting…':'Confirm rejection'}</button>
  </Modal>}
 </div>;
}
