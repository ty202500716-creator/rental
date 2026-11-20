import {useState} from 'react';
import {AuthProvider,useAuth} from './context/AuthContext.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import AdminPanel from './pages/admin/AdminPanel.jsx';
import LandlordPanel from './pages/landlord/LandlordPanel.jsx';
import TenantPanel from './pages/tenant/TenantPanel.jsx';
const PANELS={Admin:AdminPanel,Landlord:LandlordPanel,Tenant:TenantPanel};
function Routes(){const{user,setUser,logout,sessionError,syncSession,loginMessage,clearLoginMessage}=useAuth();const[mo,setMo]=useState(null);
 if(user===undefined)return <div className="pg">{sessionError?<div className="err" role="alert">{sessionError} <button type="button" className="btn sm out" onClick={syncSession}>Retry</button></div>:'Loading…'}</div>;
 if(user){const P=PANELS[user.role];return <>{sessionError&&<div className="err" role="alert" style={{padding:'10px 16px',background:'#fff0ee'}}>{sessionError}</div>}<P user={user} out={logout}/></>}
 return <><Home onLogin={()=>setMo('login')} onReg={()=>{clearLoginMessage();setMo('reg')}}/>{(mo==='login'||loginMessage)&&<Login message={loginMessage} onClose={()=>{setMo(null);clearLoginMessage()}} onReg={()=>{clearLoginMessage();setMo('reg')}} onLogin={u=>{setUser(u);setMo(null);clearLoginMessage()}}/>}{mo==='reg'&&<Register onClose={()=>setMo(null)} onDone={()=>setMo('login')}/>}</>}
export default function App(){return <AuthProvider><Routes/></AuthProvider>}
