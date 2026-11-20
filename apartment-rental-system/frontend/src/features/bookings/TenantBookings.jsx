import {useMemo,useState} from 'react';
import {Modal} from '../../components/Modal.jsx';
import {Tag,KV} from '../../components/Display.jsx';
import {api} from '../../services/api.js';
import {useBookings} from '../../hooks/useBookings.js';
import {php} from '../../utils/format.js';

const STATUSES=['All','Pending','Approved','Completed','Rejected','Cancelled'];
export default function TenantBookings(){
  const{bookings,loading,error,retry}=useBookings();
  const[query,setQuery]=useState('');
  const[status,setStatus]=useState('All');
  const[details,setDetails]=useState(null);
  const[cancelling,setCancelling]=useState(null);
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');
  const[messageError,setMessageError]=useState(false);
  const rows=useMemo(()=>bookings.filter(item=>(status==='All'||item.status===status)&&`${item.building_name} ${item.unit_number} ${item.landlord} ${item.status}`.toLowerCase().includes(query.toLowerCase())),[bookings,status,query]);
  const cancel=async()=>{
    if(!cancelling)return;
    setBusy(true);setMessage('');
    try{await api('bookings/cancel',{booking_id:cancelling.booking_id});setCancelling(null);setMessage('Booking request cancelled.');setMessageError(false);await retry()}
    catch(error){setMessage(error.message);setMessageError(true)}
    finally{setBusy(false)}
  };
  if(loading)return <div className="booking-loading"><span/><span/><span/></div>;
  if(error)return <div className="listing-error" role="alert"><span>We couldn’t load your bookings.</span><p>{error}</p><button className="btn out" onClick={retry}>Try again</button></div>;
  return <section className="tenant-bookings">
    <div className="tenant-bookings-toolbar"><label><span className="sr-only">Search bookings</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search building, unit or landlord"/></label><label><span className="sr-only">Filter by booking status</span><select value={status} onChange={event=>setStatus(event.target.value)}>{STATUSES.map(value=><option key={value}>{value}</option>)}</select></label><span>{rows.length} {rows.length===1?'request':'requests'}</span></div>
    {message&&<div className={messageError?'err':'listing-inline-success'} role={messageError?'alert':'status'}>{message}</div>}
    {!rows.length?<div className="listing-empty"><span aria-hidden="true">⌂</span><h3>{bookings.length?'No bookings match your filters':'No booking requests yet'}</h3><p>{bookings.length?'Try changing your search or status filter.':'Browse apartments and submit a request to get started.'}</p></div>:
      <div className="tenant-booking-list">{rows.map(item=><article className="tenant-booking-card" key={item.booking_id}>
        <div className="tenant-booking-main"><div><p className="listing-eyebrow">BOOKING #{item.booking_id}</p><h3>{item.building_name} · Unit {item.unit_number}</h3><p>{item.landlord?`Landlord: ${item.landlord} · `:''}{php(item.monthly_rent)} / month</p></div><Tag s={item.status}/></div>
        <div className="tenant-booking-facts"><span><small>Requested</small>{item.booking_date||'—'}</span><span><small>Move-in</small>{item.move_in||'—'}</span><span><small>Preferred lease end</small>{item.move_out||'Not specified'}</span></div>
        {item.status==='Rejected'&&item.rejection_reason&&<p className="booking-rejection">Landlord’s response: {item.rejection_reason}</p>}
        <div className="tenant-booking-actions"><button type="button" className="btn out sm" onClick={()=>setDetails(item)}>View details</button>{item.status==='Pending'&&<button type="button" className="btn bad sm" onClick={()=>setCancelling(item)}>Cancel request</button>}</div>
      </article>)}</div>}
    {details&&<Modal title={`Booking #${details.booking_id}`} sub={`${details.building_name} · Unit ${details.unit_number}`} onClose={()=>setDetails(null)}><KV rows={[
      ['Status',<Tag s={details.status}/>],['Landlord',details.landlord],['Monthly rent',php(details.monthly_rent)],['Booking date',details.booking_date],['Preferred move-in',details.move_in],['Preferred move-out',details.move_out||'Not specified'],['Message to landlord',details.remarks||'—'],['Landlord response',details.rejection_reason||'—']
    ]}/></Modal>}
    {cancelling&&<Modal title="Cancel booking request?" sub={`${cancelling.building_name} · Unit ${cancelling.unit_number}`} onClose={()=>!busy&&setCancelling(null)}><p>This only cancels your pending request. You can submit a new request later if the apartment is still available.</p>{messageError&&<div className="err" role="alert">{message}</div>}<div className="booking-step-buttons"><button type="button" className="btn out" disabled={busy} onClick={()=>setCancelling(null)}>Keep request</button><button type="button" className="btn bad" disabled={busy} onClick={cancel}>{busy?'Cancelling…':'Yes, cancel request'}</button></div></Modal>}
  </section>;
}
