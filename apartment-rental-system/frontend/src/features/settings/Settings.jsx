import {useState} from 'react';
import Profile from '../../components/Profile.jsx';
import Users from '../../pages/admin/Users.jsx';
import Announcements from '../notifications/Announcements.jsx';

export default function Settings({role}){
 const sections=role==='Admin'?['Profile','Create Admin Account']:['Profile','Announcements'];
 const[section,setSection]=useState(sections[0]);
 const descriptions={
  Profile:role==='Landlord'?'Keep your landlord contact details and profile information current for tenants.':'Keep your account details and contact information up to date.',
  'Create Admin Account':'Create administrator accounts. User access and registration reviews are managed in User Management.',
  Announcements:role==='Admin'?'Publish updates for tenants and landlords.':'Share property updates and important notices with tenants connected to your rentals.'
 };
 return <section className="combined-module">
  <header className="settings-heading"><div><span className="utility-eyebrow">{role==='Landlord'?'LANDLORD ACCOUNT':'ACCOUNT & PREFERENCES'}</span><h2>{role==='Landlord'?'Account & tenant communication settings':'Settings'}</h2><p>{role==='Landlord'?'Update how tenants identify and contact you, and manage notices for your properties.':'Update your account and create administrator accounts.'}</p></div></header>
  <div className="settings-layout">
   <nav className="settings-nav" role="tablist" aria-label="Settings sections">
    {sections.map(tab=><button key={tab} id={`settings-tab-${sections.indexOf(tab)}`} type="button" role="tab" aria-selected={section===tab} aria-controls="settings-panel" className={section===tab?'on':''} onClick={()=>setSection(tab)}><span>{role==='Landlord'&&tab==='Profile'?'My Landlord Profile':role==='Landlord'&&tab==='Announcements'?'Tenant Announcements':tab}</span><span aria-hidden="true">›</span></button>)}
   </nav>
   <section className="settings-panel" id="settings-panel" role="tabpanel" aria-labelledby={`settings-tab-${sections.indexOf(section)}`}>
    <div className="settings-panel-heading"><h3>{section}</h3><p>{descriptions[section]}</p></div>
    {section==='Profile'?<Profile/>:
     section==='Create Admin Account'?<Users/>:
     <Announcements role={role}/>}
   </section>
  </div>
 </section>;
}
