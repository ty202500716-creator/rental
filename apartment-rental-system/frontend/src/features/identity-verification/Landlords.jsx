import {useEffect,useState} from 'react';
import {DataTable} from '../../components/DataTable.jsx';
import {Do,FormModal,ModalBtn,Tag,doc} from '../../components';
import {useApi} from '../../hooks/useApi.js';
import {api} from '../../services/api.js';

const STATUSES=['All','Pending','Approved','Rejected','Active','Suspended','Deactivated'];

export default function Landlords({onPropertyOversight,onPendingCount}){
 const{d,e,load}=useApi('landlords');
 const[status,setStatus]=useState('All');
 useEffect(()=>{if(d)onPendingCount?.((d.rows||[]).filter(row=>row.verification_status==='Pending').length)},[d,onPendingCount]);
 if(e)return <div className="tenant-message tenant-error" role="alert"><div><b>Landlords could not be loaded.</b><p>{e}</p></div><button className="btn out sm" type="button" onClick={load}>Try again</button></div>;
 if(!d)return <div className="generic-loading" role="status"><span/>Loading landlords…</div>;
 const rows=(d.rows||[]).filter(row=>status==='All'||row.verification_status===status||row.account_status===status);
 const review=(row,decision)=>api('landlords/review',{landlord_id:row.landlord_id,decision});
 const afterChange=()=>{load();window.dispatchEvent(new Event('ars:admin-user-change'))};
 const statusBar=reload=><div className="admin-filter"><label><span>Registration / account status</span><select value={status} onChange={event=>setStatus(event.target.value)} aria-label="Filter landlords by status">{STATUSES.map(value=><option key={value} value={value}>{value==='All'?'All statuses':value}</option>)}</select></label><button className="btn out sm" type="button" onClick={reload}>Refresh</button></div>;
 const actions=(row)=><>
  {row.verification_status==='Pending'&&<>
   <Do label="Approve" cls="ok" run={()=>review(row,'Approved')} done={afterChange}/>
   <ModalBtn label="Reject" cls="bad">{close=><FormModal danger title="Reject landlord registration" sub={row.name} route="landlords/review" extra={{landlord_id:row.landlord_id,decision:'Rejected'}} fields={[{k:'reason',l:'Rejection reason (required)',type:'textarea',maxLength:255}]} submit="Confirm rejection" onDone={afterChange} onClose={close}/>}</ModalBtn>
  </>}
  {row.verification_status==='Approved'&&row.account_status==='Active'&&
   <ModalBtn label="Suspend" cls="out">{close=><FormModal title="Suspend landlord account" sub={row.name} route="admin/users/status" extra={{user_id:row.user_id,status:'Suspended'}} fields={[{k:'reason',l:'Suspension reason (required)',type:'textarea',maxLength:255}]} submit="Confirm suspension" onDone={afterChange} onClose={close}/>}</ModalBtn>}
  {row.verification_status==='Approved'&&row.account_status!=='Active'&&
   <Do label="Reactivate" cls="ok" confirm="Reactivate this landlord account?" run={()=>api('admin/users/status',{user_id:row.user_id,status:'Active'})} done={afterChange}/>}
  <button className="btn sm out" type="button" onClick={()=>onPropertyOversight?.(row.landlord_id)}>Properties ({Number(row.building_count)||0})</button>
 </>;
 return <section className="admin-landlord-directory">
  <header className="admin-section-heading"><div><p className="tenant-eyebrow">REGISTRATION REVIEW</p><h2>Landlords</h2><p>Review registrations, account status, and managed property totals.</p></div><span className="admin-pending-count">{(d.rows||[]).filter(row=>row.verification_status==='Pending').length} pending</span></header>
  <DataTable rows={rows} cols={[
   ['Name','name'],['Email','email'],['Contact','contact_number'],['ID Type','id_type'],['ID No.','id_number'],
   ['ID Document','document',doc],['Registration','verification_status',value=><Tag s={value}/>],
   ['Account','account_status',value=><Tag s={value}/>],['Reason','account_status_reason'],
   ['Buildings','building_count'],['Units','unit_count'],['Rejection reason','rejection_reason']
  ]} act={actions} bar={statusBar(load)} empty="No landlords match this status." searchLabel="Search landlords" mobileCards/>
 </section>;
}
