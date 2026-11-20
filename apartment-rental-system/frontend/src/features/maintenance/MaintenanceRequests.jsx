import {useState} from 'react';
import {DataTable} from '../../components/DataTable.jsx';
import {Do,FormModal,KV,Modal,ModalBtn,Tag} from '../../components';
import {api} from '../../services/api.js';
import {useApi} from '../../hooks/useApi.js';

export default function MaintenanceRequests({role,onNavigate}){
  const{d,e,load}=useApi('maintenance-requests');
  const[request,setRequest]=useState(null);
  const landlord=role==='Landlord';
  const tenant=role==='Tenant';
  if(e)return <div className="err" role="alert">{e}</div>;
  if(!d)return <div className="mut" role="status">Loading maintenance requests…</div>;
  const actions=row=><>
    <button type="button" className="btn sm out" onClick={()=>setRequest(row)}>View Details</button>
    {landlord&&!['Resolved','Cancelled'].includes(row.status)&&<ModalBtn label="Update Request">{close=><FormModal
      title="Update Maintenance Request" sub={`${row.tenant} · ${row.unit}`} route="maintenance-requests/respond"
      extra={{maintenance_request_id:row.maintenance_request_id}} init={{status:row.status==='Pending'?'In Progress':row.status,landlord_response:row.landlord_response||''}}
      fields={[{k:'status',l:'Status',type:'select',opts:['In Progress','Resolved']},{k:'landlord_response',l:'Message to Tenant',type:'textarea',opt:true}]}
      note="The tenant will receive a notification when you save this update."
      onDone={load} onClose={close} submit="Send Update"
    />}</ModalBtn>}
    {tenant&&row.status==='Pending'&&<Do label="Cancel Request" cls="bad" confirm="Cancel this maintenance request?" run={()=>api('maintenance-requests/cancel',{maintenance_request_id:row.maintenance_request_id})} done={load}/>}
  </>;
  return <>
    <p className="mut">{tenant
      ?'Report a maintenance issue for your active rental. Your landlord will be notified and can post status updates here.'
      :landlord?'Review requests from tenants in your properties and keep them updated as work progresses.'
      :'System-wide maintenance requests submitted by tenants.'}</p>
    {tenant&&d.can_create&&<div className="bar"><ModalBtn label="+ New Maintenance Request">{close=><FormModal
      title="New Maintenance Request" sub="Your landlord will be notified"
      route="maintenance-requests/create" fields={[
        {k:'subject',l:'Issue',min:4,full:true},
        {k:'description',l:'Describe the problem',type:'textarea',min:10,full:true}
      ]}
      note="Include the location, what happened, and when you first noticed the issue. Do not include passwords or payment details."
      onDone={load} onClose={close} submit="Send Request"
    />}</ModalBtn></div>}
    {tenant&&!d.can_create&&<div className="note">Maintenance requests are available after your rental agreement is active. Once you have moved in, submit issues here and your landlord will be notified.{onNavigate&&<button type="button" className="btn sm out" style={{marginLeft:10}} onClick={()=>onNavigate('My Booking')}>View My Booking</button>}</div>}
    <DataTable rows={d.rows} empty={tenant?'No maintenance requests yet. Use “New Maintenance Request” to report an issue.':'No maintenance requests have been submitted yet.'}
      cols={[
        ...(!tenant?[['Tenant','tenant']]:[]),
        ['Unit','unit'],['Issue','subject'],['Status','status',value=><Tag s={value}/>],
        ['Submitted','created_at'],['Updated','updated_at']
      ]} act={actions}/>
    {request&&<Modal title={`Maintenance Request #${request.maintenance_request_id}`} sub={request.subject} wide onClose={()=>setRequest(null)}>
      <KV rows={[
        ...(tenant?[]:[['Tenant',request.tenant]]),['Unit',request.unit],
        ['Status',<Tag s={request.status}/>],['Submitted',request.created_at],
        ['Last landlord update',request.responded_at||'No landlord update yet.'],
        ['Description',request.description],['Landlord Response',request.landlord_response||'No update from the landlord yet.']
      ]}/>
    </Modal>}
  </>;
}
