import {useState} from 'react';
import {DataTable} from '../../components/DataTable.jsx';
import {Tag} from '../../components/Display.jsx';
import {useApi} from '../../hooks/useApi.js';
import {api} from '../../services/api.js';

export default function Notifications(){
  const{d,e,load}=useApi('notifications');
  const[busy,setBusy]=useState(false);
  const[actionError,setActionError]=useState('');
  if(e)return <div className="err" role="alert">{e}</div>;
  if(!d)return <div className="mut" role="status">Loading notifications…</div>;
  const unread=d.rows.filter(row=>Number(row.is_read)===0).length;
  const markAllRead=async()=>{
    setBusy(true);setActionError('');
    try{
      await api('notifications/read',{});
      await load();
      window.dispatchEvent(new Event('ars:notifications:read'));
    }catch(error){setActionError(error.message)}
    finally{setBusy(false)}
  };
  return <>
    <div className="bar">
      {unread>0&&<button type="button" className="btn sm" disabled={busy} onClick={markAllRead}>{busy?'Updating…':`Mark all ${unread} as read`}</button>}
      {actionError&&<span className="err" role="alert">{actionError}</span>}
    </div>
    <DataTable rows={d.rows} empty="You’re all caught up." cols={[
      ['Status','is_read',value=><Tag s={Number(value)===0?'Unread':'Read'}/>],
      ['Type','type'],['Title','title'],['Message','message'],['Date','created_at']
    ]}/>
  </>;
}
