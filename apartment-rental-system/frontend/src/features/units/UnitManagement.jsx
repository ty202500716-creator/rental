import {useEffect,useMemo,useState} from 'react';
import {api,fileUrl} from '../../services/api.js';
import {useApi} from '../../hooks/useApi.js';
import {Modal} from '../../components/Modal.jsx';
import {FormModal} from '../../components/FormModal.jsx';
import Avatar from '../../components/Avatar.jsx';
import {Tag,KV} from '../../components/Display.jsx';
import {php} from '../../utils/format.js';

const labelStatus=(value,pending=0)=>Number(pending)>0&&value==='Available'?'Reserved':value==='Available'?'Vacant':value==='Unavailable'?'Maintenance':value||'—';
const statuses=['All','Vacant','Occupied','Maintenance','Reserved'];
const fields=[
 {k:'building_id',l:'Building',type:'select',from:'buildings',map:b=>({value:b.building_id,label:b.building_name}),full:true},
 {k:'unit_number',l:'Unit Number'},
 {k:'bedrooms',l:'Bedrooms',type:'number',min:0},
 {k:'bathrooms',l:'Bathrooms',type:'number',min:0},
 {k:'floor_area_sqm',l:'Floor Area (sqm)',type:'number',min:0,opt:true},
 {k:'monthly_rent',l:'Monthly Rent (₱)',type:'number',min:0},
 {k:'amenities',l:'Amenities (comma separated)',type:'textarea',opt:true},
 {k:'description',l:'Description',type:'textarea',opt:true},
 {k:'photos',l:'Unit photos',type:'images',uploadKey:'unit_photos[]',existingKey:'existing_photos',maxFiles:8,opt:true,full:true}
];
const dateLabel=value=>value?new Date(`${String(value).slice(0,10)}T00:00:00`).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'—';
function StatusPill({value}){return <span className={`pm-status ${String(value).toLowerCase().replaceAll(' ','-')}`}>{value}</span>}
export default function UnitManagement({buildingId='',onBuildingChange=()=>{},onDataChanged=async()=>{},addUnitRequested=false,onAddUnitOpened=()=>{},onAddBuilding=()=>{}}){
 const{d,e,load}=useApi('units');
 const buildings=useApi('buildings');
 const params=new URLSearchParams(location.search);
 const initialBuilding=buildingId||params.get('property_unit_building')||'';
 const initialStatus=statuses.includes(params.get('property_unit_status'))?params.get('property_unit_status'):'All';
 const allowedSorts=['building_name:asc','unit_number:asc','monthly_rent:asc','monthly_rent:desc'];
 const initialSort=allowedSorts.includes(params.get('property_unit_sort'))?params.get('property_unit_sort'):'building_name:asc';
 const[building,setBuilding]=useState(initialBuilding);
 const[searchDraft,setSearchDraft]=useState(params.get('property_unit_q')||'');
 const[search,setSearch]=useState(searchDraft);
 const[status,setStatus]=useState(initialStatus);
 const[sort,setSort]=useState(initialSort);
 const[page,setPage]=useState(Math.max(1,Number(params.get('property_unit_page'))||1));
 const initialSize=Number(params.get('property_unit_size'));
 const[size,setSize]=useState([10,25,50].includes(initialSize)?initialSize:10);
 const[editing,setEditing]=useState(null);
 const[creating,setCreating]=useState(false);
 const[details,setDetails]=useState(null);
 const[busyId,setBusyId]=useState(null);
 const[toast,setToast]=useState('');
 useEffect(()=>{if(buildingId!==''&&String(buildingId)!==building)setBuilding(String(buildingId))},[buildingId]);
 useEffect(()=>{if(addUnitRequested){setCreating(true);onAddUnitOpened()}},[addUnitRequested]);
 useEffect(()=>{const t=setTimeout(()=>{setSearch(searchDraft);setPage(1)},300);return()=>clearTimeout(t)},[searchDraft]);
 useEffect(()=>{const p=new URLSearchParams(location.search);const vals={unit_building:building,unit_q:search,unit_status:status,unit_sort:sort,unit_page:String(page),unit_size:String(size)};Object.entries(vals).forEach(([k,v])=>v&&v!==(k==='unit_status'?'All':k==='unit_sort'?'building_name:asc':k==='unit_page'?'1':k==='unit_size'?'10':'')?p.set(`property_${k}`,v):p.delete(`property_${k}`));const q=p.toString();history.replaceState(null,'',`${location.pathname}${q?`?${q}`:''}${location.hash}`)},[building,search,status,sort,page,size]);
 useEffect(()=>()=>{const p=new URLSearchParams(location.search);['unit_building','unit_q','unit_status','unit_sort','unit_page','unit_size'].forEach(k=>p.delete(`property_${k}`));const q=p.toString();history.replaceState(null,'',`${location.pathname}${q?`?${q}`:''}${location.hash}`)},[]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),3600);return()=>clearTimeout(t)},[toast]);
 const rows=useMemo(()=>{let output=(d?.rows||[]).filter(row=>(!building||String(row.building_id)===String(building))&&(!search||`${row.unit_number} ${row.building_name} ${row.current_tenant||''}`.toLowerCase().includes(search.toLowerCase()))&&(status==='All'||labelStatus(row.availability_status,row.pending_bookings)===status));const [key,direction]=sort.split(':');output.sort((a,b)=>{const x=a[key]??'',y=b[key]??'';const n=typeof x==='number'||!Number.isNaN(Number(x))?Number(x)-Number(y):String(x).localeCompare(String(y),undefined,{numeric:true,sensitivity:'base'});return direction==='desc'?-n:n});return output},[d,building,search,status,sort]);
 const buildingRows=buildings.d?.rows||[];
 const selectedBuilding=buildingRows.find(row=>String(row.building_id)===String(building));
 const pageCount=Math.max(1,Math.ceil(rows.length/size));const currentPage=Math.min(page,pageCount);const shown=rows.slice((currentPage-1)*size,currentPage*size);
 const chooseBuilding=value=>{setBuilding(value);onBuildingChange(value);setPage(1)};
 const changeStatus=async(row)=>{setBusyId(row.unit_id);try{const next=row.availability_status==='Available'?'Maintenance':'Available';await api('units/status',{unit_id:row.unit_id,status:next});await Promise.all([load(),onDataChanged()]);setToast(next==='Available'?'Unit marked vacant.':'Unit marked for maintenance.')}catch(error){setToast(error.message)}finally{setBusyId(null)}};
 const deleteUnit=async row=>{if(!window.confirm(`Delete Unit ${row.unit_number}? This cannot be undone.`))return;setBusyId(row.unit_id);try{await api('units/delete',{unit_id:row.unit_id});await Promise.all([load(),onDataChanged()]);setToast('Unit deleted.')}catch(error){setToast(error.message)}finally{setBusyId(null)}};
 const showToast=message=>setToast(message);
 if(e)return <div className="pm-error" role="alert"><b>Units could not be loaded.</b><p>{e}</p><button className="btn out" onClick={load}>Try again</button></div>;
 if(buildings.e)return <div className="pm-error" role="alert"><b>Buildings could not be loaded.</b><p>{buildings.e}</p><button className="btn out" onClick={buildings.load}>Try again</button></div>;
 if(!d||!buildings.d)return <div className="pm-skeleton-grid" role="status" aria-label="Loading units"><div/><div/><div/></div>;
 return <section className="pm-panel pm-unit-panel" role="tabpanel">
  <div className="pm-unit-toolbar">
   <label className="pm-building-select">Building<select aria-label="Select building" value={building} onChange={e=>chooseBuilding(e.target.value)}><option value="">All buildings</option>{buildings.d.rows.map(b=><option key={b.building_id} value={b.building_id}>{b.building_name}{Number(b.deactivated_by_admin)===1?' · Deactivated by Admin':''}</option>)}</select></label>
   <label className="pm-search"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m20 20-4.5-4.5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0"/></svg><input aria-label="Search units" placeholder="Search unit, building or tenant" value={searchDraft} onChange={e=>setSearchDraft(e.target.value)}/>{searchDraft&&<button type="button" aria-label="Clear search" onClick={()=>setSearchDraft('')}>×</button>}</label>
   <select aria-label="Filter units by status" value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}>{statuses.map(s=><option key={s}>{s}</option>)}</select>
   <select aria-label="Sort units" value={sort} onChange={e=>{setSort(e.target.value);setPage(1)}}><option value="building_name:asc">Building A–Z</option><option value="unit_number:asc">Unit number</option><option value="monthly_rent:asc">Rent low to high</option><option value="monthly_rent:desc">Rent high to low</option></select>
   <button className="btn" type="button" disabled={!buildings.d.rows.length} onClick={()=>setCreating(true)}>＋ Add Unit</button>
  </div>
  {selectedBuilding&&Number(selectedBuilding.deactivated_by_admin)===1&&<div className="pm-admin-deactivation" role="note">This building was deactivated by Admin. Reason: {selectedBuilding.deactivation_reason||'No reason provided.'} Its units cannot be edited or reactivated by the landlord.</div>}
  {rows.length?<><div className="pm-table-wrap"><table className="pm-table pm-units-table"><thead><tr>{['Unit','Building','Bedrooms','Bathrooms','Area','Monthly rent','Status','Current tenant','Lease end','Actions'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{shown.map(row=>{const adminDeactivated=Number(row.deactivated_by_admin)===1||Number(row.building_deactivated_by_admin)===1;const reason=row.deactivation_reason||row.building_deactivation_reason;return <tr key={row.unit_id}><td><span className="pm-unit-label">{row.photos?.[0]&&<img src={/^https?:\/\//i.test(row.photos[0])?row.photos[0]:fileUrl(row.photos[0])} crossOrigin={/^https?:\/\//i.test(row.photos[0])?undefined:'use-credentials'} alt={`Unit ${row.unit_number}`}/>}<b>{row.unit_number}</b></span></td><td>{row.building_name}</td><td>{Number(row.bedrooms)===0?'Studio':row.bedrooms}</td><td>{row.bathrooms}</td><td>{row.floor_area_sqm?`${row.floor_area_sqm} sqm`:'—'}</td><td>{php(row.monthly_rent)}</td><td><span><StatusPill value={adminDeactivated?'Deactivated by Admin':labelStatus(row.availability_status,row.pending_bookings)}/>{adminDeactivated&&<small className="pm-admin-deactivation">{reason||'No reason provided.'}</small>}</span></td><td>{row.current_tenant?<span className="pm-tenant"><Avatar src={row.tenant_photo?fileUrl(row.tenant_photo):''} name={row.current_tenant}/>{row.current_tenant}</span>:'—'}</td><td>{dateLabel(row.lease_end_date)}</td><td><div className="pm-unit-actions"><button type="button" className="btn out sm" onClick={async()=>{try{const result=await api(`units/details&unit_id=${row.unit_id}`);setDetails(result.unit)}catch(error){showToast(error.message)}}}>View</button>{!adminDeactivated&&row.availability_status!=='Occupied'&&<><button type="button" className="btn out sm" onClick={()=>setEditing(row)}>Edit</button><button type="button" className="btn out sm" disabled={busyId===row.unit_id} onClick={()=>changeStatus(row)}>{row.availability_status==='Available'?'Maintenance':'Set vacant'}</button><button type="button" className="btn bad sm" disabled={busyId===row.unit_id} onClick={()=>deleteUnit(row)}>Delete</button></>}</div></td></tr>})}</tbody></table></div>
   <div className="pm-mobile-cards">{shown.map(row=>{const adminDeactivated=Number(row.deactivated_by_admin)===1||Number(row.building_deactivated_by_admin)===1;const reason=row.deactivation_reason||row.building_deactivation_reason;return <article className="pm-unit-card" key={row.unit_id}><div className="pm-unit-card-title">{row.photos?.[0]&&<img src={/^https?:\/\//i.test(row.photos[0])?row.photos[0]:fileUrl(row.photos[0])} crossOrigin={/^https?:\/\//i.test(row.photos[0])?undefined:'use-credentials'} alt={`Unit ${row.unit_number}`}/>}<b>Unit {row.unit_number}</b><StatusPill value={adminDeactivated?'Deactivated by Admin':labelStatus(row.availability_status,row.pending_bookings)}/></div><p>{row.building_name}</p>{adminDeactivated&&<p className="pm-admin-deactivation">Deactivated by Admin. Reason: {reason||'No reason provided.'}</p>}<div className="pm-unit-card-facts"><span>{Number(row.bedrooms)===0?'Studio':`${row.bedrooms} bed`}</span><span>{row.bathrooms} bath</span><span>{row.floor_area_sqm||'—'} sqm</span><b>{php(row.monthly_rent)}/mo</b></div><p className="pm-tenant">{row.current_tenant?<><Avatar src={row.tenant_photo?fileUrl(row.tenant_photo):''} name={row.current_tenant}/>{row.current_tenant}</>:'No active tenant'}</p><div className="pm-unit-actions">{!adminDeactivated&&row.availability_status!=='Occupied'&&<><button type="button" className="btn out sm" onClick={()=>setEditing(row)}>Edit</button><button type="button" className="btn out sm" onClick={()=>changeStatus(row)}>{row.availability_status==='Available'?'Maintenance':'Set vacant'}</button></>}</div></article>})}</div>
   <div className="pm-pagination"><span>Showing {(currentPage-1)*size+1}–{Math.min(currentPage*size,rows.length)} of {rows.length}</span><label>Rows per page <select value={size} onChange={e=>{setSize(Number(e.target.value));setPage(1)}}><option value="10">10</option><option value="25">25</option><option value="50">50</option></select></label><div><button disabled={currentPage<=1} onClick={()=>setPage(currentPage-1)}>Previous</button><b>{currentPage} / {pageCount}</b><button disabled={currentPage>=pageCount} onClick={()=>setPage(currentPage+1)}>Next</button></div></div>
  </>:<div className="pm-empty"><span aria-hidden="true">⌂</span><h3>{buildings.d.rows.length===0?'Add a building first':building?'No units in this building yet':'No units found'}</h3><p>{buildings.d.rows.length===0?'Create a building before adding its first apartment unit.':building?'Add a unit to make this building ready for tenants.':'Choose a building or add your first unit.'}</p>{buildings.d.rows.length>0?<button className="btn" onClick={()=>setCreating(true)}>Add Unit</button>:<button className="btn" onClick={onAddBuilding}>Add Building</button>}</div>}
  {creating&&<FormModal title="Add apartment unit" route="units/create" fields={fields} init={{building_id:building||'',bedrooms:1,bathrooms:1}} onDone={async()=>{await Promise.all([load(),onDataChanged()]);setCreating(false);showToast('Unit added successfully.')}} onClose={()=>setCreating(false)}/>}
  {editing&&<FormModal title={`Edit unit ${editing.unit_number}`} route="units/update" extra={{unit_id:editing.unit_id}} init={editing} fields={fields.filter(f=>f.k!=='building_id')} onDone={async()=>{await Promise.all([load(),onDataChanged()]);setEditing(null);showToast('Unit updated successfully.')}} onClose={()=>setEditing(null)}/>}
  {details&&<Modal title={`Unit ${details.unit_number}`} sub={details.building_name} onClose={()=>setDetails(null)}><div className="pm-unit-detail-photos">{(details.photos.length?details.photos:details.building_photos).map((photo,index)=><img key={`${photo}-${index}`} src={/^https?:\/\//i.test(photo)?photo:fileUrl(photo)} crossOrigin={/^https?:\/\//i.test(photo)?undefined:'use-credentials'} alt={`Unit ${details.unit_number} photo ${index+1}`}/>)}</div><KV rows={ [['Building',details.building_name],['Unit Number',details.unit_number],['Bedrooms',Number(details.bedrooms)===0?'Studio':details.bedrooms],['Bathrooms',details.bathrooms],['Area',details.floor_area_sqm?`${details.floor_area_sqm} sqm`:'—'],['Monthly rent',php(details.monthly_rent)],['Amenities',details.amenities||'—'],['Status',<Tag s={labelStatus(details.availability_status)}/>]]}/><h3 className="pm-unit-detail-heading">Rental information</h3>{details.rental?<KV rows={ [['Status',details.rental.rental_status],['Start date',dateLabel(details.rental.start_date)],['End date',dateLabel(details.rental.end_date)],['Agreed monthly rent',php(details.rental.monthly_rent)],['Security deposit',php(details.rental.security_deposit)],['Due day',`Day ${details.rental.due_day}`]]}/>:<p className="mut">No rental record is associated with this unit.</p>}<h3 className="pm-unit-detail-heading">Recent bookings</h3>{details.bookings.length?<div className="pm-unit-bookings">{details.bookings.map(booking=><div key={booking.booking_id}><b>Booking #{booking.booking_id}</b><Tag s={booking.booking_status}/><small>Move-in {dateLabel(booking.preferred_move_in_date)}{booking.preferred_move_out_date?` · Move-out ${dateLabel(booking.preferred_move_out_date)}`:''}</small></div>)}</div>:<p className="mut">No booking records are associated with this unit.</p>}</Modal>}
  {toast&&<div className="pm-toast" role="status">{toast}<button type="button" aria-label="Dismiss notification" onClick={()=>setToast('')}>×</button></div>}
 </section>;
}
