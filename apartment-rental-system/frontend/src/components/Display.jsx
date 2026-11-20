import {fileUrl} from '../services/api.js';
import {useApi} from '../hooks/useApi.js';
import {php} from '../utils/format.js';
import {Modal} from './Modal.jsx';
const G=['Verified','Paid','Approved','Active','Available','Published','Completed','Resolved'],Y=['Pending','Unpaid','Partially Paid','Draft','Unverified','In Progress','Unread'],R=['Rejected','Overdue','Suspended','Deactivated','Terminated','Cancelled','Expired','Unavailable','Maintenance'];
export const Tag=({s})=><span className={'tag '+(G.includes(s)?'g':Y.includes(s)?'y':R.includes(s)?'r':'')}>{s}</span>;
export const isTag=v=>typeof v==='string'&&[...G,...Y,...R,'Occupied','Maintenance','Admin','Landlord','Tenant','Electricity','Water','Rental'].includes(v);
export const doc=v=>v?<a href={fileUrl(v)} target="_blank" rel="noreferrer">View</a>:'—';
export const Stats=({items})=><div className="stats">{items.map(([l,v])=><div className="stat" key={l}><b>{v}</b>{l}</div>)}</div>;
export const KV=({rows})=><div className="kv">{rows.map(([k,v])=><><div className="k" key={k}>{k}</div><div>{v??'—'}</div></>)}</div>;
// Generic form modal. fields: {k,l,type(text|email|phone|password|number|date|select|textarea|file),opts,from,map,opt,full,min,same,skip}
export function Dash({route,items}){const{d,e}=useApi(route);if(e)return <div className="err">{e}</div>;if(!d)return <div className="mut">Loading…</div>;return <Stats items={items.map(([l,k,m])=>[l,m?php(d.stats[k]):d.stats[k]])}/>}

export function Print({title,rows,close}){return <Modal title={title} onClose={close}><div className="printable rcpt"><h3>Apartment Rental System (ARS)</h3><KV rows={rows}/></div><button className="btn" style={{marginTop:14}} onClick={()=>window.print()}>Print / Save as PDF</button></Modal>}
