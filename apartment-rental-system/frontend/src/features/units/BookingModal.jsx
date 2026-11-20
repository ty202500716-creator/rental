import {useState} from 'react';
import {Modal} from '../../components/Modal.jsx';
import {api} from '../../services/api.js';
import {php} from '../../utils/format.js';

function addMonths(value,months){const date=new Date(`${value}T12:00:00`);const day=date.getDate();date.setMonth(date.getMonth()+months);if(date.getDate()<day)date.setDate(0);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
export default function BookingModal({unit,onClose,onSuccess,onViewBookings,onViewRental}){
  const[today]=useState(()=>{const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`});
  const[step,setStep]=useState(1);
  const[moveIn,setMoveIn]=useState('');
  const[months,setMonths]=useState(12);
  const[message,setMessage]=useState('');
  const[accepted,setAccepted]=useState(false);
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  const[reference,setReference]=useState('');
  const[existing,setExisting]=useState(null);
  const moveOut=moveIn?addMonths(moveIn,months):'';
  const submit=async()=>{
    if(!accepted){setError('Please accept the booking terms to continue.');return}
    setBusy(true);setError('');
    try{
      const result=await api('bookings/create',{unit_id:unit.id,move_in:moveIn,move_out:moveOut,remarks:[`Requested lease: ${months} months.`,message.trim()].filter(Boolean).join(' ').slice(0,255)});
      onSuccess?.(result);
      if(result.duplicate){setExisting(result);setStep(5);return}
      const bookingReference=result.booking_reference||result.booking_id||result.id||'submitted';
      setReference(String(bookingReference));setStep(4);
    }catch(requestError){setError(requestError.message)}
    finally{setBusy(false)}
  };
  return <Modal title={step===5?'Existing request found':step===4?'Request sent':'Book this apartment'} sub={`${unit.b} · Unit ${unit.u} · ${php(unit.rent)} / month`} wide onClose={onClose}>
    {step<4&&<div className="booking-steps" aria-label={`Step ${step} of 3`}>{['Choose dates','Review','Confirm'].map((label,index)=><span className={index+1<=step?'current':''} key={label}><b>{index+1}</b>{label}</span>)}</div>}
    {step===1&&<div className="booking-step-content"><p>Tell the landlord when you’d like to move in and how long you expect to rent.</p><label>Preferred move-in date<input type="date" min={today} value={moveIn} onChange={event=>setMoveIn(event.target.value)}/></label><label>Preferred lease length<select value={months} onChange={event=>setMonths(Number(event.target.value))}><option value="6">6 months</option><option value="12">12 months</option></select></label>{moveOut&&<p className="note">Preferred lease end: <b>{moveOut}</b>. The landlord will confirm the final dates.</p>}<button type="button" className="btn" disabled={!moveIn||moveIn<today} onClick={()=>setStep(2)}>Continue to review</button></div>}
    {step===2&&<div className="booking-step-content"><h3>Booking summary</h3><div className="booking-cost-row"><span>Monthly rent</span><b>{php(unit.rent)}</b></div><div className="booking-cost-row"><span>Preferred lease</span><b>{months} months</b></div><div className="booking-cost-row"><span>Preferred move-in</span><b>{moveIn}</b></div><div className="booking-cost-row"><span>Deposit &amp; advance</span><b>Set in rental agreement</b></div><div className="booking-cost-total"><span>Due now</span><b>{php(0)}</b></div><p className="mut">Submitting an application does not charge you. The landlord will confirm any deposit, advance, and final lease terms in the rental agreement.</p><div className="booking-step-buttons"><button type="button" className="btn out" onClick={()=>setStep(1)}>Back</button><button type="button" className="btn" onClick={()=>setStep(3)}>Continue</button></div></div>}
    {step===3&&<div className="booking-step-content"><p>Review your request and leave an optional note for the landlord.</p><div className="booking-cost-row"><span>Home</span><b>{unit.b} · Unit {unit.u}</b></div><div className="booking-cost-row"><span>Preferred dates</span><b>{moveIn} to {moveOut}</b></div><label>Message to landlord (optional)<textarea rows={3} maxLength={180} value={message} onChange={event=>setMessage(event.target.value)} placeholder="Share anything the landlord should know."/></label><label className="booking-terms"><input type="checkbox" checked={accepted} onChange={event=>setAccepted(event.target.checked)}/><span>I understand this is a booking request, not a confirmed lease or payment.</span></label>{error&&<div className="err" role="alert">{error}</div>}<div className="booking-step-buttons"><button type="button" className="btn out" onClick={()=>setStep(2)} disabled={busy}>Back</button><button type="button" className="btn" onClick={submit} disabled={!accepted||busy}>{busy?'Sending…':'Submit request'}</button></div></div>}
    {step===4&&<div className="booking-success"><span aria-hidden="true">✓</span><h3>Request sent to the landlord</h3><p>You can follow its status in My Bookings. No payment has been taken.</p><b>Reference #{reference}</b><button type="button" className="btn" onClick={onClose}>Done</button></div>}
    {step===5&&<div className="booking-success"><h3>{existing?.active_rental?'You already rent this unit':'You already have a booking request for this unit'}</h3><p>{existing?.message}</p>{existing?.existing_booking&&<div className="booking-cost-row"><span>Booking #{existing.existing_booking.booking_id}</span><b>Status: {existing.existing_booking.status}</b></div>}{existing?.existing_booking?.move_in&&<div className="booking-cost-row"><span>Preferred move-in</span><b>{existing.existing_booking.move_in}</b></div>}{existing?.active_rental&&<div className="booking-cost-row"><span>Active rental #{existing.active_rental.rental_id}</span><b>{existing.active_rental.start_date} to {existing.active_rental.end_date}</b></div>}<div className="booking-step-buttons">{existing?.existing_booking&&<button type="button" className="btn out" onClick={()=>{onClose();onViewBookings?.()}}>View My Bookings</button>}{existing?.active_rental&&<button type="button" className="btn out" onClick={()=>{onClose();onViewRental?.()}}>View My Rental</button>}<button type="button" className="btn" onClick={onClose}>Done</button></div></div>}
  </Modal>;
}
