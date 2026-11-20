import {useCallback,useState} from 'react';
import Tenants from './Tenants.jsx';
import Landlords from './Landlords.jsx';

export default function UserManagement({onNavigate}){
 const[tab,setTab]=useState('Tenants');
 const[tenantPending,setTenantPending]=useState(0);
 const[landlordPending,setLandlordPending]=useState(0);
 const updateTenantPending=useCallback(value=>setTenantPending(value),[]);
 const updateLandlordPending=useCallback(value=>setLandlordPending(value),[]);
 const openProperties=useCallback(landlordId=>{
  const params=new URLSearchParams(window.location.search);
  params.set('property_oversight_landlord',String(landlordId));
  window.history.replaceState(null,'',`${window.location.pathname}?${params.toString()}${window.location.hash}`);
  onNavigate?.('Property Oversight');
 },[onNavigate]);
 return <section className="admin-user-management">
  <header className="admin-section-heading"><div><p className="tenant-eyebrow">PLATFORM ACCOUNTS</p><h2>User Management</h2><p>Review tenant identities and landlord registrations, and manage account access.</p></div></header>
  <div className="admin-user-tabs" role="tablist" aria-label="User management">
   <button id="admin-users-tenants-tab" type="button" role="tab" aria-selected={tab==='Tenants'} aria-controls="admin-users-panel" className={tab==='Tenants'?'on':''} onClick={()=>setTab('Tenants')}>Tenants <span className="admin-pending-count">{tenantPending}</span></button>
   <button id="admin-users-landlords-tab" type="button" role="tab" aria-selected={tab==='Landlords'} aria-controls="admin-users-panel" className={tab==='Landlords'?'on':''} onClick={()=>setTab('Landlords')}>Landlords <span className="admin-pending-count">{landlordPending}</span></button>
  </div>
  <div id="admin-users-panel" role="tabpanel" aria-labelledby={`admin-users-${tab.toLowerCase()}-tab`}>
   {tab==='Tenants'?<Tenants role="Admin" onPendingCount={updateTenantPending}/>:<Landlords onPendingCount={updateLandlordPending} onPropertyOversight={openProperties}/>}
  </div>
 </section>;
}
