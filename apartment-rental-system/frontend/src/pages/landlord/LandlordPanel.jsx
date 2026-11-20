import {useState} from 'react';
import {Panel,Tag} from '../../components';
import MyProfile from '../../features/profile/MyProfile.jsx';
import {useApi} from '../../hooks/useApi.js';
import {php} from '../../utils/format.js';
import Tenants from '../../features/identity-verification/Tenants.jsx';
import PropertyManagement from '../../features/buildings/PropertyManagement.jsx';
import BookingRentalManagement from '../../features/bookings/BookingRentalManagement.jsx';
import RentalPayments from '../../features/rental-payments/RentalPayments.jsx';
import UtilityBills from '../../features/utility-bills/UtilityBills.jsx';
import Reports from '../../features/reports/Reports.jsx';
import Notifications from '../../features/notifications/Notifications.jsx';
import Settings from '../../features/settings/Settings.jsx';
const R='Landlord';
const LandlordBuildings=()=> <PropertyManagement role={R}/>;
const LandlordTenants=()=> <Tenants role={R}/>;
const LandlordBookings=()=> <BookingRentalManagement role={R}/>;
const LandlordPayments=()=> <RentalPayments role={R}/>;
const LandlordUtilities=()=> <UtilityBills role={R}/>;
const LandlordReports=()=> <Reports role={R}/>;
const LandlordSettings=()=> <Settings role={R}/>;
const dateLabel=value=>{
 if(!value)return '—';
 const date=new Date(`${value.slice(0,10)}T00:00:00`);
 return Number.isNaN(date.getTime())?value:date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
};
const dashboardIcons=[
 'M4 21V3h16v18M8 7h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2M10 21v-3h4v3',
 'M3 5h8v6H3zm10 0h8v6h-8zM3 13h8v6H3zm10 0h8v6h-8z',
 'M5 12.5 9.5 17 19 7',
 'M4 12h16M12 4v16m7-16-2 2m-10 10-2 2',
 'M12 3 2.5 20h19L12 3zm0 6v5m0 3h.01',
 'M6 3h12v18H6zM9 8h6m-6 4h6m-6 4h4',
 'M3 10 12 3l9 7v11h-6v-6H9v6H3z',
 'M12 2v20m5-15H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
 'M12 3 2.5 20h19L12 3zm0 6v5m0 3h.01'
];
function DashboardIcon({index}){return <span className={`ld-stat-icon ld-stat-icon-${index%4}`} aria-hidden="true"><svg viewBox="0 0 24 24"><path d={dashboardIcons[index]||dashboardIcons[0]}/></svg></span>}
function Dashboard({onNavigate}){
 const{d,e,load}=useApi('landlords/dashboard');
 const[refreshing,setRefreshing]=useState(false);
 const refresh=()=>{setRefreshing(true);load().finally(()=>setRefreshing(false))};
 if(e)return <div className="ld-message ld-error" role="alert"><div><b>Dashboard information could not be loaded.</b><p>{e}</p></div><button className="ld-outline-button" onClick={refresh} disabled={refreshing}>{refreshing?'Retrying…':'Try again'}</button></div>;
 if(!d)return <div className="ld-loading" role="status"><span className="ld-spinner"/> Loading your property overview…</div>;
 const s=d.stats;
 const totalUnits=Number(s.units)||0;
 const unitStatuses=[
  ['Available',Number(s.available_units)||0,'available'],
  ['Occupied',Number(s.occupied_units)||0,'occupied'],
  ['Unavailable / maintenance',Number(s.maintenance_units)||0,'maintenance']
 ];
 const moneyCards=[
  ['Confirmed rental payments',php(s.confirmed_rental_payments)],
  ['Pending rental payments',php(s.pending_rental_payments)],
  ['Confirmed electricity payments',php(s.confirmed_electricity_payments)],
  ['Confirmed water payments',php(s.confirmed_water_payments)],
  ['Outstanding rental balance',php(s.outstanding_rental)],
  ['Outstanding utility balance',php(s.outstanding_utility)]
 ];
 return <div className="ld-dashboard">
  <div className="ld-welcome"><div><span className="ld-eyebrow">LANDLORD OVERVIEW</span><h3>Your portfolio at a glance</h3><p>Live property, tenancy, and payment updates in one place.</p></div><button className="ld-outline-button" onClick={refresh} disabled={refreshing} aria-label="Refresh landlord dashboard">{refreshing?'Refreshing…':'↻ Refresh data'}</button></div>

  <section className="ld-stat-grid" aria-label="Dashboard statistics">
   {[
    ['Total Buildings',s.buildings],['Total Apartment Units',s.units],['Available Units',s.available_units],['Occupied Units',s.occupied_units],['Units Under Maintenance',s.maintenance_units],
    ['Pending Bookings',s.pending_bookings],['Active Rentals',s.active_rentals],['Payments Collected',php(s.payments_collected)],['Outstanding Payments',php(s.outstanding_payments)]
   ].map(([label,value],index)=><article className={`ld-stat ld-stat-${index%4}`} key={label}><DashboardIcon index={index}/><span className="ld-stat-copy"><span>{label}</span><b>{value??0}</b></span></article>)}
  </section>

  <section className="ld-section">
   <div className="ld-section-heading"><div><h3>Property &amp; unit overview</h3><p>Current availability across {totalUnits} unit{totalUnits===1?'':'s'}.</p></div><button className="ld-link" onClick={()=>onNavigate('Apartment Building Management')}>Building and unit management <span aria-hidden="true">→</span></button></div>
   <div className="ld-card ld-units-card">
    <div className="ld-unit-legend">{unitStatuses.map(([label,count,key])=><div className="ld-unit-item" key={key}><span className={`ld-unit-dot ${key}`}/><span>{label}</span><b>{count}</b></div>)}</div>
    <div className="ld-unit-chart" role="img" aria-label={unitStatuses.map(([label,count])=>`${label}: ${count}`).join(', ')}>
     {unitStatuses.map(([label,count,key])=><div className={`ld-unit-bar ${key}`} key={key} style={{width:totalUnits?`${(count/totalUnits)*100}%`:'0%'}} title={`${label}: ${count}`}/>)}
    </div>
    {!totalUnits&&<p className="ld-empty-inline">No apartment units have been added yet.</p>}
   </div>
  </section>

  <section className="ld-section">
   <div className="ld-section-heading"><div><h3>Booking overview</h3><p>Review requests and their latest status.</p></div><button className="ld-link" onClick={()=>onNavigate('Booking & Rental Management')}>Booking management <span aria-hidden="true">→</span></button></div>
   <div className="ld-status-grid">
    {[['Pending',s.pending_bookings,'pending'],['Approved',s.approved_bookings,'approved'],['Rejected',s.rejected_bookings,'rejected']].map(([label,count,key])=><div className={`ld-status-card ${key}`} key={label}><span>{label}</span><b>{count}</b></div>)}
   </div>
   <div className="ld-card ld-table-card"><div className="ld-table-heading"><h4>Recent booking requests</h4><span>Latest 5</span></div>
    <div className="ld-table-scroll"><table className="ld-table"><thead><tr><th>Tenant</th><th>Apartment / Unit</th><th>Booking date</th><th>Status</th></tr></thead><tbody>
     {(d.recent_bookings||[]).map((booking,index)=><tr key={`${booking.tenant}-${booking.booking_date}-${index}`}><td>{booking.tenant}</td><td>{booking.unit}</td><td>{dateLabel(booking.booking_date)}</td><td><Tag s={booking.status}/></td></tr>)}
    </tbody></table>{!(d.recent_bookings||[]).length&&<div className="ld-empty">No booking requests yet.</div>}</div>
   </div>
  </section>

  <section className="ld-section">
   <div className="ld-section-heading"><div><h3>Rental overview</h3><p>Lease status and upcoming expirations in the next 30 days.</p></div><button className="ld-link" onClick={()=>onNavigate('Booking & Rental Management')}>Rental management <span aria-hidden="true">→</span></button></div>
   <div className="ld-status-grid ld-rental-status">
    {[['Active rentals',s.active_rentals],['Expired rentals',s.expired_rentals],['Expiring in 30 days',s.expiring_rentals]].map(([label,count],index)=><div className={`ld-status-card rental-${index}`} key={label}><span>{label}</span><b>{count}</b></div>)}
   </div>
   <div className="ld-card ld-table-card"><div className="ld-table-heading"><h4>Upcoming lease expirations</h4><span>Next 30 days · up to 5</span></div>
    <div className="ld-table-scroll"><table className="ld-table"><thead><tr><th>Tenant</th><th>Unit</th><th>Rental start</th><th>Rental end</th></tr></thead><tbody>
     {(d.upcoming_rentals||[]).map((rental,index)=><tr key={`${rental.tenant}-${rental.end_date}-${index}`}><td>{rental.tenant}</td><td>{rental.unit}</td><td>{dateLabel(rental.start_date)}</td><td>{dateLabel(rental.end_date)}</td></tr>)}
    </tbody></table>{!(d.upcoming_rentals||[]).length&&<div className="ld-empty">No active leases are expiring in the next 30 days.</div>}</div>
   </div>
  </section>

  <section className="ld-section">
   <div className="ld-section-heading"><div><h3>Payment overview</h3><p>Only verified transactions count as collected payments. Electricity and water remain separate.</p></div><div className="ld-payment-links"><button className="ld-link" onClick={()=>onNavigate('Rental Payments')}>Rental payments <span aria-hidden="true">→</span></button><button className="ld-link" onClick={()=>onNavigate('Utility Bills')}>Utility bills <span aria-hidden="true">→</span></button></div></div>
   <div className="ld-card ld-payment-card"><div className="ld-payment-total"><span>Total confirmed payments collected</span><b>{php(s.payments_collected)}</b></div><div className="ld-payment-grid">{moneyCards.map(([label,value])=><div className="ld-payment-item" key={label}><span>{label}</span><b>{value}</b></div>)}</div></div>
  </section>

  <section className="ld-section ld-activity-section">
   <div className="ld-section-heading"><div><h3>Recent activity</h3><p>The latest payment transactions recorded for your properties.</p></div><button className="ld-link" onClick={()=>onNavigate('Rental Payments')}>View all payments <span aria-hidden="true">→</span></button></div>
   <div className="ld-card ld-table-card"><div className="ld-table-heading"><h4>Recent payments</h4><span>Latest 5</span></div>
    <div className="ld-table-scroll"><table className="ld-table"><thead><tr><th>Tenant</th><th>Payment type</th><th>Amount</th><th>Payment date</th><th>Status</th></tr></thead><tbody>
     {(d.recent_payments||[]).map((payment,index)=><tr key={`${payment.tenant}-${payment.payment_date}-${index}`}><td>{payment.tenant}</td><td>{payment.type}</td><td>{php(payment.amount)}</td><td>{dateLabel(payment.payment_date)}</td><td><Tag s={payment.status}/></td></tr>)}
    </tbody></table>{!(d.recent_payments||[]).length&&<div className="ld-empty">No payment transactions yet.</div>}</div>
   </div>
  </section>
 </div>;
}
export default function LandlordPanel({user,out}){return <Panel title="Landlord" user={user} out={out} bottomItem={['My Profile',MyProfile]} hidePageHeadingFor={['Dashboard','Apartment Building Management','Tenant Management','Booking & Rental Management','Rental Payments','Utility Bills','Reports','Settings']} modules={[
 ['Dashboard',Dashboard],
 ['Apartment Building Management',LandlordBuildings],
 ['Tenant Management',LandlordTenants],
 ['Booking & Rental Management',LandlordBookings],
 ['Rental Payments',LandlordPayments],
 ['Utility Bills',LandlordUtilities],
 ['Notifications',Notifications],
 ['Reports',LandlordReports],
 ['Settings',LandlordSettings]]}/>}
