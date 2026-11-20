import {Panel,Dash} from '../../components';
import MyProfile from '../../features/profile/MyProfile.jsx';
import UserManagement from '../../features/identity-verification/UserManagement.jsx';
import PropertyOversight from '../../features/buildings/PropertyOversight.jsx';
import Reports from '../../features/reports/Reports.jsx';
import Notifications from '../../features/notifications/Notifications.jsx';
import Settings from '../../features/settings/Settings.jsx';
import Announcements from '../../features/notifications/Announcements.jsx';
import AuditLog from '../../features/audit/AuditLog.jsx';
const R='Admin';
const AdminUserManagement=props=> <UserManagement {...props}/>;
const AdminPropertyOversight=()=> <PropertyOversight/>;
const AdminReports=()=> <Reports/>;
const AdminAnnouncements=()=> <Announcements role={R}/>;
const AdminNotifications=()=> <Notifications/>;
const AdminAuditLog=()=> <AuditLog/>;
const AdminSettings=()=> <Settings role={R}/>;
function AdminDashboard({onNavigate}){
 return <>
  <Dash route="admin/dashboard" items={[
   ['Landlords','landlords'],['Tenants','tenants'],['Buildings','buildings'],['Units','units'],['Available Units','available'],['Occupied Units','occupied'],['Units Under Maintenance','maintenance'],['Pending Registrations','pending_registrations'],['Bookings','bookings'],['Total Collected','collected',1],['Outstanding Balances','outstanding',1]
  ]}/>
  <section><h3 className="sec2">Quick actions</h3><p className="mut">Jump to a common review or platform oversight task.</p><div className="bar">
   {[
    ['User Management','Review tenants and landlords'],
    ['Property Oversight','Review properties'],
    ['Reports','Open reports'],
    ['Announcements','Publish an announcement'],
    ['Audit Log','Review audit history'],
    ['Settings','Create admin accounts']
   ].map(([module,label])=><button type="button" className="btn sm out" key={module} onClick={()=>onNavigate(module)}>{label}</button>)}
  </div></section>
 </>;
}
export default function AdminPanel({user,out}){return <Panel title="Admin" user={user} out={out} showNotificationNav bottomItem={['My Profile',MyProfile]} hidePageHeadingFor={['User Management','Property Oversight','Reports','Announcements','Audit Log','Settings']} modules={[
 ['Dashboard',AdminDashboard],
 ['User Management',AdminUserManagement],
 ['Property Oversight',AdminPropertyOversight],
 ['Reports',AdminReports],
 ['Announcements',AdminAnnouncements],
 ['Notifications',AdminNotifications],
 ['Audit Log',AdminAuditLog],
 ['Settings',AdminSettings]]}/>}
