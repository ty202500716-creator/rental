import {useState} from 'react';
import Listings from '../units/Listings.jsx';
import TenantBookings from './TenantBookings.jsx';
import {useBookings} from '../../hooks/useBookings.js';

export default function MyBooking({onNavigate}){
  const[tab,setTab]=useState(0);
  const{bookings}=useBookings();
  const handleTabKey=event=>{
    const tabs=[...event.currentTarget.parentElement.querySelectorAll('[role="tab"]')];
    let next=tab;
    if(event.key==='ArrowRight')next=(tab+1)%tabs.length;
    else if(event.key==='ArrowLeft')next=(tab+tabs.length-1)%tabs.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=tabs.length-1;
    else return;
    event.preventDefault();
    setTab(next);
    tabs[next].focus();
  };
  return <section className="my-booking-shell">
    <div className="booking-segmented" role="tablist" aria-label="My Booking sections">
      <button id="booking-tab-browse" type="button" role="tab" aria-controls="booking-panel" tabIndex={tab===0?0:-1} aria-selected={tab===0} className={tab===0?'active':''} onKeyDown={handleTabKey} onClick={()=>setTab(0)}>Browse Apartments</button>
      <button id="booking-tab-list" type="button" role="tab" aria-controls="booking-panel" tabIndex={tab===1?0:-1} aria-selected={tab===1} className={tab===1?'active':''} onKeyDown={handleTabKey} onClick={()=>setTab(1)}>My Bookings<span className="booking-count" aria-label={`${bookings.length} bookings`}>{bookings.length}</span></button>
    </div>
    <div id="booking-panel" role="tabpanel" aria-labelledby={tab===0?'booking-tab-browse':'booking-tab-list'} tabIndex={0}>{tab===0?<Listings onViewBookings={()=>setTab(1)} onViewRental={()=>onNavigate?.('My Rental')}/>:<TenantBookings/>}</div>
  </section>;
}
