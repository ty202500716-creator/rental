import {useMemo,useState} from 'react';
import {api,fileUrl} from '../../services/api.js';
import {useApi} from '../../hooks/useApi.js';
import {DataTable} from '../../components/DataTable.jsx';
import {Do,FormModal,ModalBtn,Tag} from '../../components';

const photos=value=>{
 let paths=value;
 if(typeof paths==='string'){try{paths=JSON.parse(paths)}catch{paths=[]}}
 if(!Array.isArray(paths)||!paths.length)return '—';
 return <div className="oversight-photos">{paths.slice(0,4).map((path,index)=><a key={`${path}-${index}`} href={fileUrl(path)} target="_blank" rel="noreferrer" aria-label={`Open photo ${index+1}`}><img src={fileUrl(path)} alt="" loading="lazy"/></a>)}</div>;
};
const noticeChange=()=>window.dispatchEvent(new Event('ars:admin-property-change'));

export default function PropertyOversight(){
 const{d:buildingData,e:buildingError,load:loadBuildings}=useApi('buildings');
 const{d:unitData,e:unitError,load:loadUnits}=useApi('units');
 const[status,setStatus]=useState('All');
 const[landlord,setLandlord]=useState(()=>new URLSearchParams(window.location.search).get('property_oversight_landlord')||'All');
 const[error,setError]=useState('');
 const refresh=async()=>{setError('');await Promise.all([loadBuildings(),loadUnits()])};
 const buildingRows=buildingData?.rows||[];
 const unitRows=unitData?.rows||[];
 const landlordOptions=useMemo(()=>{
  const choices=new Map();
  buildingRows.forEach(row=>choices.set(String(row.landlord_id),row.landlord||`Landlord ${row.landlord_id}`));
  return [...choices.entries()].sort((a,b)=>a[1].localeCompare(b[1]));
 },[buildingRows]);
 const matches=row=>(landlord==='All'||String(row.landlord_id)===landlord)&&
  (status==='All'||(status==='Deactivated'?Number(row.deactivated_by_admin)===1||Number(row.building_deactivated_by_admin)===1:row.status===status||row.building_status===status));
 const buildings=buildingRows.filter(matches);
 const units=unitRows.filter(matches);
 const updateStatus=async(route,payload)=>{setError('');try{await api(route,payload);await refresh();noticeChange()}catch(x){setError(x.message)}};
 const filterBar=<div className="admin-filter"><label>Landlord<select aria-label="Filter properties by landlord" value={landlord} onChange={event=>{
  const value=event.target.value;setLandlord(value);
  const params=new URLSearchParams(window.location.search);
  if(value==='All')params.delete('property_oversight_landlord');else params.set('property_oversight_landlord',value);
  const query=params.toString();window.history.replaceState(null,'',`${window.location.pathname}${query?`?${query}`:''}${window.location.hash}`);
 }}>{<option value="All">All landlords</option>}{landlordOptions.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label>Status<select aria-label="Filter properties by status" value={status} onChange={event=>setStatus(event.target.value)}>{['All','Active','Inactive','Deactivated'].map(value=><option key={value} value={value}>{value==='All'?'All statuses':value}</option>)}</select></label></div>;
 if(buildingError||unitError)return <div className="tenant-message tenant-error" role="alert"><div><b>Property data could not be loaded.</b><p>{buildingError||unitError}</p></div><button className="btn out sm" type="button" onClick={refresh}>Try again</button></div>;
 if(!buildingData||!unitData)return <div className="generic-loading" role="status"><span/>Loading properties…</div>;
 return <section className="property-oversight">
  <header className="admin-section-heading"><div><p className="tenant-eyebrow">PLATFORM PROPERTY REVIEW</p><h2>Property Oversight</h2><p>Review every building and unit. Administrative actions are limited to deactivation and reactivation.</p></div><button className="btn out sm" type="button" onClick={refresh}>Refresh</button></header>
  {error&&<div className="tenant-feedback tenant-feedback-error" role="alert">{error}</div>}
  <section className="oversight-section"><div className="oversight-section-heading"><h3>Buildings</h3><span>{buildings.length} buildings</span></div>
   <DataTable rows={buildings} bar={filterBar} searchLabel="Search buildings" empty="No buildings match these filters." cols={[
    ['Building','building_name'],['Address','complete_address'],['Landlord','landlord'],['Landlord account','landlord_account_status',value=><Tag s={value}/>],
    ['Status','status',(_,row)=><Tag s={Number(row.deactivated_by_admin)===1?'Deactivated by Admin':row.status}/>],
    ['Occupancy','occupied_units',(_,row)=><span>{Number(row.occupied_units)||0} occupied · {Number(row.vacant_units)||0} available · {Number(row.units)||0} total</span>],
    ['Photos','photos',photos]
    ]} mobileCards act={row=>row.status==='Inactive'?
    <Do label="Reactivate" cls="ok" confirm="Reactivate this building?" run={()=>updateStatus('buildings/status',{building_id:row.building_id,status:'Active'})}/>:
    <ModalBtn label="Deactivate" cls="bad">{close=><FormModal danger title="Deactivate building" sub={`${row.building_name} · ${row.landlord}`} route="buildings/status" extra={{building_id:row.building_id,status:'Inactive'}} fields={[{k:'reason',l:'Deactivation reason (required, up to 255 characters)',type:'textarea',maxLength:255}]} submit="Confirm deactivation" onDone={async()=>{await refresh();noticeChange()}} onClose={close}/>}</ModalBtn>}/>
  </section>
  <section className="oversight-section"><div className="oversight-section-heading"><h3>Units</h3><span>{units.length} units</span></div>
   <DataTable rows={units} searchLabel="Search units" empty="No units match these filters." cols={[
    ['Building','building_name'],['Unit','unit_number'],['Landlord','landlord'],['Occupant','current_tenant'],['Availability','availability_status',(_,row)=><Tag s={Number(row.deactivated_by_admin)===1||Number(row.building_deactivated_by_admin)===1?'Deactivated by Admin':row.availability_status}/>],
    ['Admin status','deactivated_by_admin',(_,row)=>Number(row.deactivated_by_admin)===1?<span>Unit · {row.deactivation_reason||'No reason provided.'}</span>:Number(row.building_deactivated_by_admin)===1?<span>Building · {row.building_deactivation_reason||'No reason provided.'}</span>:'—'],
    ['Photos','photos',photos]
   ]} mobileCards act={row=>Number(row.deactivated_by_admin)===1?
    <Do label="Reactivate" cls="ok" confirm="Reactivate this unit?" run={()=>updateStatus('units/status',{unit_id:row.unit_id,status:'Active'})}/>:
    <ModalBtn label="Deactivate" cls="bad">{close=><FormModal danger title="Deactivate unit" sub={`${row.building_name} · Unit ${row.unit_number}`} route="units/status" extra={{unit_id:row.unit_id,status:'Deactivated'}} fields={[{k:'reason',l:'Deactivation reason (required, up to 255 characters)',type:'textarea',maxLength:255}]} submit="Confirm deactivation" onDone={async()=>{await refresh();noticeChange()}} onClose={close}/>}</ModalBtn>}/>
  </section>
 </section>;
}
