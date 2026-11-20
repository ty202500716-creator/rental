import {useState} from 'react';
import {Panel,Stats,useApi,php} from '../../components';
import MyBooking from '../../features/bookings/MyBooking.jsx';
import MyProfile from '../../features/profile/MyProfile.jsx';
import {MyApartment,Agreement} from '../../features/rentals/MyApartment.jsx';
import Renewals from '../../features/rentals/Renewals.jsx';
import RentBills from '../../features/rental-payments/RentBills.jsx';
import UtilityBills from '../../features/utility-bills/UtilityBills.jsx';
import Payments from '../../features/rental-payments/Payments.jsx';
import Receipts from '../../features/rental-payments/Receipts.jsx';
import Announcements from '../../features/notifications/Announcements.jsx';
import Notifications from '../../features/notifications/Notifications.jsx';
import MaintenanceRequests from '../../features/maintenance/MaintenanceRequests.jsx';
const R='Tenant';
const LeaseRenewalTab=()=> <Renewals role={R}/>;
const TenantRentBills=()=> <RentBills role={R}/>;
const TenantPayments=()=> <Payments role={R}/>;
const TenantAnnouncements=()=> <Announcements role={R}/>;
const TenantUtilities=()=> <UtilityBills role={R}/>;
const TenantMaintenance=({onNavigate})=> <MaintenanceRequests role={R} onNavigate={onNavigate}/>;
const RENTAL_TABS=[['My Apartment',MyApartment],['Rental Agreement',Agreement],['Lease Renewal',LeaseRenewalTab]];
const PAYMENT_TABS=[['Rental Bills',TenantRentBills],['Payment History',TenantPayments],['Receipts',Receipts]];
const NOTIFICATION_TABS=[['Notifications',Notifications],['Announcements',TenantAnnouncements]];
function Sections({items}){const[index,setIndex]=useState(0);const Content=items[index][1];return <><div className="tabs module-tabs" role="tablist">{items.map(([label],i)=><button type="button" key={label} role="tab" aria-selected={index===i} className={index===i?'on':''} onClick={()=>setIndex(i)}>{label}</button>)}</div><Content key={index}/></>}
function MyRental(){return <Sections items={RENTAL_TABS}/>}
function RentalPayments(){return <Sections items={PAYMENT_TABS}/>}
function TenantNotifications(){return <Sections items={NOTIFICATION_TABS}/>}
function Dashboard({onNavigate}){const{d,e}=useApi('tenants/dashboard');if(e)return <div className="err">{e}</div>;if(!d)return <div className="mut">Loading…</div>;const s=d.stats;
 return <>
  <Stats items={[['Booking Status',s.booking],['Current Apartment',s.apartment?.a||'None yet'],['Monthly Rent',s.apartment?php(s.apartment.monthly_rent):'—'],['Next Rent Due',s.next_rent?`${s.next_rent.due_date} (${php(s.next_rent.balance)})`:'—'],['Unpaid Utility Bills',`${s.unpaid_utilities.c} (${php(s.unpaid_utilities.total)})`],['Unread Notifications',s.unread]]}/>
  {s.apartment&&(s.apartment.landlord_account_status!=='Active'||Number(s.apartment.building_deactivated_by_admin)===1||Number(s.apartment.unit_deactivated_by_admin)===1)&&<div className="tenant-feedback tenant-feedback-error" role="status">{s.apartment.landlord_account_status!=='Active'&&<p>Your landlord account is {s.apartment.landlord_account_status.toLowerCase()}.{s.apartment.landlord_account_reason?` Reason: ${s.apartment.landlord_account_reason}`:''} Existing rental arrangements remain in place.</p>}{Number(s.apartment.building_deactivated_by_admin)===1&&<p>Your building was deactivated by Admin. {s.apartment.building_deactivation_reason?`Reason: ${s.apartment.building_deactivation_reason}. `:''}Existing rental information remains available.</p>}{Number(s.apartment.unit_deactivated_by_admin)===1&&<p>Your unit was deactivated by Admin. {s.apartment.unit_deactivation_reason?`Reason: ${s.apartment.unit_deactivation_reason}. `:''}Existing rental information remains available.</p>}</div>}
  <section><h3 className="sec2">Quick actions</h3><p className="mut">{s.apartment?'Manage your rental, bills, and home maintenance.':'Browse apartments or check the status of your booking.'}</p><div className="bar">
   {(s.apartment
    ?[['My Rental','View my rental'],['Rental Payments','Pay rent'],['Utility Bills','View utility bills'],['Maintenance Requests','Request maintenance']]
    :[['My Booking','Browse apartments and bookings']]
   ).map(([module,label])=><button type="button" className="btn sm out" key={module} onClick={()=>onNavigate(module)}>{label}</button>)}
  </div></section>
 </>;
}
export default function TenantPanel({user,out}){return <Panel title="Tenant" user={user} out={out} bottomItem={['My Profile',MyProfile]} modules={[
 ['Dashboard',Dashboard],
 ['My Booking',MyBooking],
 ['My Rental',MyRental],
 ['Rental Payments',RentalPayments],
 ['Utility Bills',TenantUtilities],
 ['Maintenance Requests',TenantMaintenance],
 ['Notifications',TenantNotifications]
]}/>}
