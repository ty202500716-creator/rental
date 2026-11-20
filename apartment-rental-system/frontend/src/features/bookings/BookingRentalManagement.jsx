import {useState} from 'react';
import Bookings from './Bookings.jsx';
import Rentals from '../rentals/Rentals.jsx';
import Renewals from '../rentals/Renewals.jsx';

const sections=['Booking Requests','Rental Records','Lease Renewals'];
export default function BookingRentalManagement({role}){
 const[section,setSection]=useState(sections[0]);
 const landlord=role==='Landlord';
 const labels=landlord?['Review Requests','Manage Leases','Renewal Requests']:sections;
 const descriptions={
  'Booking Requests':'Review applications, move-in dates, and tenant requests.',
  'Rental Records':'Create agreements for approved bookings and track active leases.',
  'Lease Renewals':'Review requests to extend an existing rental agreement.'
 };
 return <section className={`combined-module booking-rental-module${landlord?' landlord-workflow':''}`}>
  <header className="workflow-heading"><div><span className="utility-eyebrow">{landlord?'LANDLORD WORKSPACE':'TENANCY WORKFLOW'}</span><h2>{landlord?'Bookings & leases':'Booking & rental management'}</h2><p>{landlord?`${labels[sections.indexOf(section)]}: ${descriptions[section]}`:descriptions[section]}</p></div></header>
  {landlord&&<ol className="landlord-lease-steps" aria-label="Landlord leasing workflow">
   {labels.map((label,index)=><li className={index<=sections.indexOf(section)?'current':''} aria-current={index===sections.indexOf(section)?'step':undefined} key={label}><span>{index+1}</span>{label}</li>)}
  </ol>}
  <div className="module-tabs workflow-tabs" role="tablist" aria-label="Booking and rental management sections">
   {sections.map((tab,index)=><button type="button" key={tab} id={`workflow-tab-${index}`} role="tab" aria-controls="workflow-panel" aria-selected={section===tab} className={section===tab?'on':''} onClick={()=>setSection(tab)}><span>{labels[index]}</span><span className="workflow-arrow" aria-hidden="true">→</span></button>)}
  </div>
  <div id="workflow-panel" role="tabpanel" aria-labelledby={`workflow-tab-${sections.indexOf(section)}`}>
   {section===sections[0]?<Bookings role={role}/>:section===sections[1]?<Rentals role={role}/>:<Renewals role={role}/>}
  </div>
 </section>;
}
