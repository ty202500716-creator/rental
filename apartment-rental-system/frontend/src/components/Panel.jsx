import {useEffect,useRef,useState} from 'react';
import {useApi} from '../hooks/useApi.js';
import {api,fileUrl} from '../services/api.js';
import Avatar from './Avatar.jsx';

function ProfileIcon(){return <svg className="sidebar-profile-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2c-4.42 0-8 2.24-8 5v1.5h16V19c0-2.76-3.58-5-8-5Z"/></svg>}
function NotificationIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8.27 12a2.25 2.25 0 0 0 4.54 0h-4.54Z"/></svg>}
const NAV_ICONS={
  Dashboard:'M3 3h8v8H3zm10 0h8v5h-8zm0 7h8v11h-8zm-10 3h8v8H3z',
  'My Booking':'M6 2h12a2 2 0 0 1 2 2v16H4V4a2 2 0 0 1 2-2Zm2 4v2h8V6zm0 4v2h8v-2zm0 4v2h5v-2z',
  'My Rental':'M3 10 12 3l9 7v11h-6v-6H9v6H3zm7 9h4v-6h-4z',
  'Rental Payments':'M3 5h18v14H3zm2 3v2h5V8zm0 5v3h14v-3z',
  'Utility Bills':'M12 2 4 13h6l-1 9 11-13h-7z',
  'Maintenance Requests':'M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4L14 12l-2-2z',
  'Apartment Building Management':'M4 21V3h16v18M8 7h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2M10 21v-3h4v3',
  'Tenant Management':'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8-3a4 4 0 0 1 0 7m3 6v-2a4 4 0 0 0-3-3.87',
  'User Management':'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8-3a4 4 0 0 1 0 7m3 6v-2a4 4 0 0 0-3-3.87',
  'Property Oversight':'M4 21V3h16v18M8 7h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2M10 21v-3h4v3',
  'Announcements':'M3 11v2h3l11 6V5L6 11zm3 2 2 7h3l-2-6m12-6 2-2m-2 10 2 2m-2-6h3',
  'Audit Log':'M4 4h16v16H4zm4 4h8m-8 4h8m-8 4h5',
  'Booking & Rental Management':'M6 2v4m12-4v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2z',
  'Notifications':'M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0',
  Reports:'M4 19V5m0 14h17M7 15l4-5 3 3 6-7',
  Settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8m0-6v3m0 14v3M4.2 4.2l2.1 2.1m11.4 11.4 2.1 2.1M2 12h3m14 0h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
  'Log Out':'M10 17l5-5-5-5m5 5H3m9-9h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7'
};
function NavIcon({name}){return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={NAV_ICONS[name]||'M4 4h16v16H4z'}/></svg>}
function ChevronIcon({collapsed}){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={collapsed?'m9 18 6-6-6-6':'m15 18-6-6 6-6'}/></svg>}

export default function Panel({title,user,modules,out,bottomItem,hidePageHeadingFor=[],showNotificationNav=false}){
  const[m,setM]=useState(0);
  const[o,setO]=useState(false);
  const[collapsed,setCollapsed]=useState(false);
  const[notificationOpen,setNotificationOpen]=useState(false);
  const[userOpen,setUserOpen]=useState(false);
  const[markingNotifications,setMarkingNotifications]=useState(false);
  const[notificationActionError,setNotificationActionError]=useState('');
  const{d:profileData,load:loadProfile}=useApi('profile');
  const{d:notificationData,e:notificationError,load:loadNotifications}=useApi('notifications');
  const previousModule=useRef(m);
  useEffect(()=>{
    window.addEventListener('ars:notifications:read',loadNotifications);
    return ()=>window.removeEventListener('ars:notifications:read',loadNotifications);
  },[loadNotifications]);
  useEffect(()=>{
    if(previousModule.current!==m)loadNotifications();
    previousModule.current=m;
    const timer=setInterval(loadNotifications,60000);
    return()=>clearInterval(timer);
  },[m,loadNotifications]);
  const bottomActive=Boolean(bottomItem&&m===modules.length);
  const C=bottomActive?bottomItem[1]:modules[m][1];
  const activeTitle=bottomActive?bottomItem[0]:modules[m][0];
  const photo=profileData?.profile?.profile_photo;
  const notificationIndex=modules.findIndex(([name])=>name==='Notifications');
  const unreadCount=notificationData?.rows?.filter(notification=>Number(notification.is_read)===0).length||0;
  const selectModule=index=>{if(index!==m){const event=new Event('ars:before-module-change',{cancelable:true});window.dispatchEvent(event);if(event.defaultPrevented)return;setM(index)}setO(false)};
  const openProfile=()=>selectModule(modules.length);
  const openSettings=()=>{const index=modules.findIndex(([name])=>name==='Settings');if(index>=0)selectModule(index);else openProfile()};
  const markAllNotificationsRead=async()=>{setMarkingNotifications(true);setNotificationActionError('');try{await api('notifications/read',{});await loadNotifications();window.dispatchEvent(new Event('ars:notifications:read'))}catch(error){setNotificationActionError(error.message)}finally{setMarkingNotifications(false)}};
  useEffect(()=>{
    const closeMenus=event=>{if(event.key==='Escape'){setNotificationOpen(false);setUserOpen(false);setO(false)}};
    window.addEventListener('keydown',closeMenus);
    return ()=>window.removeEventListener('keydown',closeMenus);
  },[]);
  const logOut=()=>{Promise.resolve(out()).catch(error=>window.alert(`Could not complete server logout: ${error.message}`))};
  return <div className="app">
    {o&&<button type="button" className="side-overlay" aria-label="Close navigation" onClick={()=>setO(false)}/>}
    <aside className={`side${o?' open':''}${collapsed?' collapsed':''}`}>
      <div className="side-brand"><div className="logo">ARS<span>.</span>{!collapsed&&` ${title}`}</div><button type="button" className="side-collapse" aria-label={collapsed?'Expand navigation':'Collapse navigation'} title={collapsed?'Expand navigation':'Collapse navigation'} onClick={()=>setCollapsed(value=>!value)}><ChevronIcon collapsed={collapsed}/></button></div>
      <nav className="side-nav" aria-label={`${title} navigation`}>
        {modules.map(([name],i)=>name==='Notifications'&&!showNotificationNav?null:<button type="button" key={name} title={collapsed?name:undefined} aria-label={collapsed?name:undefined} className={m===i?'on':''} aria-current={m===i?'page':undefined} onClick={()=>selectModule(i)}><NavIcon name={name}/><span className="nav-label">{name}</span></button>)}
      </nav>
      {bottomItem&&<div className="side-bottom">
        <button type="button" className="side-user" aria-label="Open My Profile" onClick={openProfile}><Avatar src={photo?fileUrl(photo):''} name={user.name}/><span>{user.name}</span></button>
        <button type="button" title={collapsed?bottomItem[0]:undefined} className={`side-profile${bottomActive?' on':''}`} aria-current={bottomActive?'page':undefined} onClick={openProfile}><ProfileIcon/><span className="nav-label">{bottomItem[0]}</span></button>
        <button type="button" className="side-logout" onClick={logOut}><NavIcon name="Log Out"/><span className="nav-label">Log Out</span></button>
      </div>}
    </aside>
    <div className="main">
      <div className="top">
        <button type="button" className="menu" onClick={()=>setO(!o)} aria-label="Toggle navigation">☰</button>
        <b style={{color:'#0b2447'}}>{activeTitle}</b>
        <span className="top-user">
          {notificationIndex>=0&&<div className="header-menu">
            <button type="button" className={`top-notifications${m===notificationIndex?' on':''}`} onClick={()=>{setNotificationOpen(value=>!value);setUserOpen(false)}} aria-expanded={notificationOpen} aria-label={notificationError?'Notifications (unread count unavailable)':`Notifications${unreadCount?`, ${unreadCount} unread`:''}`} title="Notifications">
              <NotificationIcon/>{unreadCount>0&&<span className="notification-badge">{unreadCount>99?'99+':unreadCount}</span>}
            </button>
            {notificationOpen&&<div className="header-dropdown notification-dropdown">
              <div className="dropdown-heading"><b>Notifications</b><span>{unreadCount?`${unreadCount} unread`:'You’re all caught up'}</span></div>
              {notificationError?<p className="dropdown-empty">Could not load notifications.</p>:!notificationData?<p className="dropdown-empty">Loading notifications…</p>:notificationData.rows.length?notificationData.rows.slice(0,5).map((notification,index)=><button type="button" className={`notification-item${Number(notification.is_read)===0?' unread':''}`} key={`${notification.created_at}-${index}`} onClick={()=>{selectModule(notificationIndex);setNotificationOpen(false)}}><b>{notification.title}</b><span>{notification.message}</span><small>{notification.created_at}</small></button>):<p className="dropdown-empty">No notifications yet.</p>}
              {notificationActionError&&<p className="dropdown-action-error" role="alert">{notificationActionError}</p>}
              {unreadCount>0&&<button type="button" className="dropdown-link" disabled={markingNotifications} onClick={markAllNotificationsRead}>{markingNotifications?'Updating…':`Mark all ${unreadCount} as read`}</button>}
              <button type="button" className="dropdown-link" onClick={()=>{selectModule(notificationIndex);setNotificationOpen(false)}}>View all notifications</button>
            </div>}
          </div>}
          {bottomItem&&<div className="header-menu"><button type="button" className="top-profile" aria-expanded={userOpen} onClick={()=>{setUserOpen(value=>!value);setNotificationOpen(false)}}><Avatar src={photo?fileUrl(photo):''} name={user.name}/><span className="mut">{user.name}</span></button>{userOpen&&<div className="header-dropdown user-dropdown"><button type="button" onClick={()=>{openProfile();setUserOpen(false)}}>My Profile</button><button type="button" onClick={()=>{openSettings();setUserOpen(false)}}>Settings</button></div>}</div>}
        </span>
      </div>
      <div className="pg">{!hidePageHeadingFor.includes(activeTitle)&&<div className="page-heading"><h2>{activeTitle}</h2>{activeTitle==='My Booking'&&<p>Find and book your next home.</p>}</div>}<C key={m} onProfileChange={loadProfile} onNavigate={name=>{const index=modules.findIndex(([moduleName])=>moduleName===name);if(index>=0)selectModule(index)}}/></div>
    </div>
  </div>
}
