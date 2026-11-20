import {useState} from 'react';
import {List,FormModal,ModalBtn,Do,Modal,KV,Tag,money} from '../../components';
import {api} from '../../services/api.js';

export default function Bookings({role}){
 const[bookingGroup,setBookingGroup]=useState(null);
 const columns=[
  ...(role!=='Tenant'?[['Tenant','tenant']]:[]),
  ...(role==='Landlord'?[['Identity Verification','tenant_verification']]:[]),
  ['Apartment Building','building_name'],['Unit Number','unit_number'],
  ['Total Bookings','booking_count'],['Latest Booking Date','booking_date'],['Latest Requested Move-in','move_in'],
  ...(role==='Tenant'?[['Monthly Rent','monthly_rent',money]]:[]),
  ['Booking Status','status']
 ];
 return <div className="booking-records">
  <List route="bookings" cols={columns} empty="No booking requests yet."
   mobileCards
   actions={(row,load)=><>
    <button className="btn sm out" onClick={()=>setBookingGroup(row)}>View History</button>
    {row.status==='Pending'&&role==='Landlord'&&<>
     <Do label="Approve" cls="ok" run={()=>api('bookings/decide',{booking_id:row.booking_id,decision:'Approved'})} done={load}/>
     <ModalBtn label="Reject" cls="bad">{close=><FormModal danger title="Reject Booking" sub={row.tenant} route="bookings/decide" extra={{booking_id:row.booking_id,decision:'Rejected'}} fields={[{k:'reason',l:'Reason (required)',type:'textarea'}]} submit="Confirm Rejection" onDone={load} onClose={close}/>}</ModalBtn>
    </>}
    {row.status==='Pending'&&role==='Tenant'&&<Do label="Cancel" cls="bad" confirm="Cancel this booking?" run={()=>api('bookings/cancel',{booking_id:row.booking_id})} done={load}/>}
   </>}/>
  {bookingGroup&&<Modal title="Booking History" sub={`${bookingGroup.tenant} · ${bookingGroup.building_name} · Unit ${bookingGroup.unit_number}`} onClose={()=>setBookingGroup(null)}>
   <p>{bookingGroup.booking_count} {bookingGroup.booking_count===1?'booking':'bookings'} · Latest status: <Tag s={bookingGroup.status}/></p>
   <div className="booking-history-list">{bookingGroup.history.map(item=><article className="tenant-booking-card" key={item.booking_id}>
    <div className="tenant-booking-main"><div><p className="listing-eyebrow">BOOKING #{item.booking_id}</p><p>{item.booking_date}</p></div><Tag s={item.status}/></div>
    <KV rows={[
     ...(role!=='Tenant'?[['Tenant',item.tenant],['Tenant Email',item.email],['Contact Number',item.contact_number],['Identity Verification',<Tag s={item.tenant_verification}/>]]:[]),
     ['Requested Move-in Date',item.move_in],['Preferred Move-out / Lease End Date',item.move_out||'Not specified'],
     ['Monthly Rent',money(item.monthly_rent)],['Tenant Remarks',item.remarks],['Rejection Reason',item.rejection_reason]
    ]}/>{item.status==='Pending'&&role==='Landlord'&&<div className="tenant-booking-actions">
     <Do label="Approve" cls="ok sm" run={()=>api('bookings/decide',{booking_id:item.booking_id,decision:'Approved'})} done={()=>{setBookingGroup(null);load()}}/>
     <ModalBtn label="Reject" cls="bad">{close=><FormModal danger title="Reject Booking" sub={item.tenant} route="bookings/decide" extra={{booking_id:item.booking_id,decision:'Rejected'}} fields={[{k:'reason',l:'Reason (required)',type:'textarea'}]} submit="Confirm Rejection" onDone={()=>{setBookingGroup(null);load()}} onClose={close}/>}</ModalBtn>
    </div>}{item.status==='Pending'&&role==='Tenant'&&<div className="tenant-booking-actions"><Do label="Cancel request" cls="bad sm" confirm="Cancel this booking?" run={()=>api('bookings/cancel',{booking_id:item.booking_id})} done={()=>{setBookingGroup(null);load()}}/></div>}
   </article>)}</div>
  </Modal>}
 </div>;
}
