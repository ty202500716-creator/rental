import {useEffect,useMemo,useRef,useState} from 'react';
import {api,fileUrl} from '../../services/api.js';
import {useApi} from '../../hooks/useApi.js';
import {isSupportedImage,php} from '../../utils/format.js';
import {Modal} from '../../components/Modal.jsx';
import PhilippineAddressFields,{PhilippineAddressDisplay} from '../../components/PhilippineAddressFields.jsx';
import UnitManagement from '../units/UnitManagement.jsx';

const AMENITY_OPTIONS=['Wi-Fi','Parking','Security','CCTV','Elevator','Laundry','Water supply','Generator','Garden','Common area'];
const FILTER_DEFAULTS={q:'',city:'',landlord:'',status:'',occupancy:'',stat:'',sort:'building_name:asc',page:'1',size:'10',view:'grid'};
const FILTER_KEYS=Object.keys(FILTER_DEFAULTS);
const COLUMNS=[['building','Building'],['address','Address'],['city','City'],['units','Total units'],['occupancy','Occupancy'],['revenue','Monthly revenue'],['status','Status'],['updated','Last updated']];
const dateLabel=value=>{if(!value)return '—';const date=new Date(String(value).replace(' ','T'));return Number.isNaN(date.getTime())?value:date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})};
const occupancy=b=>Number(b.units)>0?Math.round(Number(b.occupied_units)*100/Number(b.units)):0;
const buildingStatus=b=>Number(b.deactivated_by_admin)===1?'Deactivated by Admin':b.status==='Inactive'?'Inactive':Number(b.units)>0&&Number(b.maintenance_units)===Number(b.units)?'Under Maintenance':'Active';
const occupancyGroup=b=>!Number(b.occupied_units)?'vacant':Number(b.occupied_units)>=Number(b.units)&&Number(b.units)>0?'full':'partial';
const inputParams=()=>{
 const p=new URLSearchParams(location.search),value=Object.fromEntries(FILTER_KEYS.map(k=>[k,p.get(`property_${k}`)??FILTER_DEFAULTS[k]]));
 if(!['building_name:asc','building_name:desc','units:desc','vacant_units:desc','monthly_revenue:desc','updated_at:desc'].includes(value.sort))value.sort=FILTER_DEFAULTS.sort;
 if(!['10','25','50'].includes(value.size))value.size='10';
 if(!['table','grid'].includes(value.view))value.view=FILTER_DEFAULTS.view;
 if(!['','Active','Inactive','Under Maintenance','Deactivated by Admin'].includes(value.status))value.status='';
 if(!['','full','partial','vacant'].includes(value.occupancy))value.occupancy='';
 if(!['','all','occupied','vacant'].includes(value.stat))value.stat='';
 value.page=String(Math.max(1,Number(value.page)||1));
 return value;
};
const iconPaths={building:'M4 21V3h16v18M8 7h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2M10 21v-3h4v3',units:'M3 5h8v6H3zm10 0h8v6h-8zM3 13h8v6H3zm10 0h8v6h-8z',occupancy:'M4 19V5m0 14h16M8 15l3-4 3 2 5-7',vacant:'M3 10 12 3l9 7v11h-6v-6H9v6H3z',search:'m20 20-4.5-4.5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0',more:'M5 12h.01M12 12h.01M19 12h.01',pin:'M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0'};
function Icon({name}){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={iconPaths[name]||iconPaths.building}/></svg>}
function Photo({building,className=''}){const photos=Array.isArray(building.photos)?building.photos:[];const src=photos[0];return src?<img className={className} src={/^https?:\/\//i.test(src)?src:fileUrl(src)} crossOrigin={/^https?:\/\//i.test(src)?undefined:'use-credentials'} alt={`${building.building_name} building`}/>:<div className={`pm-photo-fallback ${className}`} aria-label="No building photo"><Icon name="building"/></div>}
function Toast({message,onClose,onUndo,disabled}){useEffect(()=>{if(!message)return;const t=setTimeout(onClose,5500);return()=>clearTimeout(t)},[message,onClose]);return message?<div className="pm-toast" role="status">{message}{onUndo&&<button type="button" className="pm-toast-undo" disabled={disabled} onClick={onUndo}>Undo</button>}<button type="button" aria-label="Dismiss notification" onClick={onClose}>×</button></div>:null}
function Skeleton(){return <div className="pm-skeleton-grid" role="status" aria-label="Loading buildings">{[1,2,3,4].map(n=><div key={n}/>)}</div>}
function Empty({onAdd}){return <div className="pm-empty"><span aria-hidden="true">⌂</span><h3>No buildings yet</h3><p>Add your first property to start managing units and tenants.</p><button className="btn" type="button" onClick={onAdd}>Add your first building</button></div>}

export default function PropertyManagement({role='Landlord'}){
 const[section,setSection]=useState('Buildings');
 const[selected,setSelected]=useState('');
 const[filters,setFilters]=useState(inputParams);
 const[searchDraft,setSearchDraft]=useState(filters.q);
 const[search,setSearch]=useState(filters.q);
 const[sortKey,sortDir]=filters.sort.split(':');
 const[selectedIds,setSelectedIds]=useState([]);
 const[columnsOpen,setColumnsOpen]=useState(false);
 const[visibleColumns,setVisibleColumns]=useState(()=>{try{return JSON.parse(localStorage.getItem('ars:building-columns')||'null')||COLUMNS.map(([id])=>id)}catch{return COLUMNS.map(([id])=>id)}});
 const[drawer,setDrawer]=useState(null);
 const[editor,setEditor]=useState(null);
 const[confirm,setConfirm]=useState(null);
 const[toast,setToast]=useState('');
 const[undoRows,setUndoRows]=useState(null);
 const[busy,setBusy]=useState(false);
 const[openAddUnit,setOpenAddUnit]=useState(false);
 const buildings=useApi('buildings');
 const units=useApi('units');
 useEffect(()=>{const t=setTimeout(()=>{setSearch(searchDraft);setFilters(f=>({...f,q:searchDraft,page:'1'}))},300);return()=>clearTimeout(t)},[searchDraft]);
 useEffect(()=>{const p=new URLSearchParams(location.search);FILTER_KEYS.forEach(k=>{const v=filters[k];if(v&&v!==FILTER_DEFAULTS[k])p.set(`property_${k}`,v);else p.delete(`property_${k}`)});const qs=p.toString();history.replaceState(null,'',`${location.pathname}${qs?`?${qs}`:''}${location.hash}`)},[filters]);
 useEffect(()=>()=>{const p=new URLSearchParams(location.search);FILTER_KEYS.forEach(k=>p.delete(`property_${k}`));const qs=p.toString();history.replaceState(null,'',`${location.pathname}${qs?`?${qs}`:''}${location.hash}`)},[]);
 useEffect(()=>{try{localStorage.setItem('ars:building-columns',JSON.stringify(visibleColumns))}catch{}},[visibleColumns]);
 useEffect(()=>{const fn=e=>{if(e.key==='Escape'){setDrawer(null);setColumnsOpen(false)}};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn)},[]);
 const allBuildings=buildings.d?.rows||[];
 const cities=[...new Set(allBuildings.map(b=>b.city).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
 const landlords=[...new Map(allBuildings.map(b=>[String(b.landlord_id),{id:String(b.landlord_id),name:b.landlord}])).values()].filter(item=>item.id&&item.name).sort((a,b)=>a.name.localeCompare(b.name));
 const filtered=useMemo(()=>allBuildings.filter(b=>{
   const text=`${b.building_name} ${b.complete_address||''} ${b.street_address||''} ${b.barangay||''} ${b.city||''} ${b.province||''}`.toLowerCase();
   return (!search||text.includes(search.toLowerCase()))&&(!filters.city||b.city===filters.city)&&(!filters.landlord||String(b.landlord_id)===filters.landlord)&&(!filters.status||buildingStatus(b)===filters.status)&&(!filters.occupancy||occupancyGroup(b)===filters.occupancy)&&
    (filters.stat!=='vacant'||Number(b.vacant_units)>0)&&(filters.stat!=='occupied'||Number(b.occupied_units)>0);
 }),[allBuildings,search,filters.city,filters.landlord,filters.status,filters.occupancy,filters.stat]);
 const sorted=useMemo(()=>[...filtered].sort((a,b)=>{const x=a[sortKey]??'',y=b[sortKey]??'';const result=typeof x==='number'||!Number.isNaN(Number(x))?Number(x)-Number(y):String(x).localeCompare(String(y),undefined,{numeric:true,sensitivity:'base'});return sortDir==='asc'?result:-result}),[filtered,sortKey,sortDir]);
 const pageSize=Number(filters.size)||10;
 const pageCount=Math.max(1,Math.ceil(sorted.length/pageSize));
 const page=Math.min(Number(filters.page)||1,pageCount);
 const pageRows=sorted.slice((page-1)*pageSize,page*pageSize);
 const allUnits=units.d?.rows||[];
 const totalUnits=allBuildings.reduce((n,b)=>n+Number(b.units||0),0);
 const occupiedUnits=allBuildings.reduce((n,b)=>n+Number(b.occupied_units||0),0);
 const vacantUnits=allBuildings.reduce((n,b)=>n+Number(b.vacant_units||0),0);
 const occupancyRate=totalUnits?Math.round(occupiedUnits*100/totalUnits):0;
 const setFilter=(key,value)=>setFilters(f=>({...f,[key]:value,page:'1'}));
 const resetFilters=()=>{setSearchDraft('');setSearch('');setFilters(FILTER_DEFAULTS)};
 const refresh=async()=>{await Promise.all([buildings.load(),units.load()])};
 const notify=message=>{setUndoRows(null);setToast(message)};
 const openUnits=(buildingId,add=false)=>{setSelected(String(buildingId||''));setDrawer(null);setSection('Units');if(add)setOpenAddUnit(true)};
 const runAction=async(action,rows)=>{
   setBusy(true);
   try{
    if(action==='archive'){for(const row of rows)await api('buildings/status',{building_id:row.building_id,status:'Inactive'});setUndoRows(rows);setToast(`${rows.length} building${rows.length===1?'':'s'} archived.`)}
    else if(action==='delete'){for(const row of rows)await api('buildings/delete',{building_id:row.building_id});notify(`${rows.length} building${rows.length===1?'':'s'} deleted.`)}
    await refresh();setSelectedIds([]);setConfirm(null);setDrawer(null);
   }catch(error){notify(error.message)}
   finally{setBusy(false)}
 };
 const exportCsv=(rows=sorted)=>{
   const fields=['building_name','complete_address','postal_code','city','province','units','occupied_units','vacant_units','monthly_revenue','status','updated_at'];
   const csv=[fields.join(','),...rows.map(row=>fields.map(k=>`"${String(row[k]??'').replace(/"/g,'""')}"`).join(','))].join('\r\n');
   const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='buildings.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 const sortBy=key=>setFilter('sort',`${key}:${sortKey===key&&sortDir==='asc'?'desc':'asc'}`);
 const setView=view=>setFilter('view',view);
 if(buildings.e)return <main className="property-management"><div className="pm-error" role="alert"><b>Properties could not be loaded.</b><p>{buildings.e}</p><button className="btn out" onClick={refresh}>Try again</button></div></main>;
 return <main className="property-management">
  <div className="pm-heading">
   <div><div className="pm-breadcrumb"><span>Home</span><span>/</span><b>{role==='Admin'?'Property management':'My Buildings'}</b></div><h1>{role==='Admin'?'Apartment Building Management':'My Buildings'}</h1><p>{role==='Admin'?'Review registered buildings and manage their units.':'Manage your buildings, availability, and units in one place.'}</p></div>
   <button className="btn pm-add-building" type="button" onClick={()=>setEditor({mode:'create'})}>＋ Add Building</button>
  </div>
  {!buildings.d?<Skeleton/>:<>
   <section className="pm-stats" aria-label="Property summary">
    {[
      ['Total Buildings',allBuildings.length,'building','all'],
      ['Total Units',totalUnits,'units','units'],
      ['Occupancy Rate',`${occupancyRate}%`,'occupancy','occupied'],
      ['Vacant Units',vacantUnits,'vacant','vacant']
    ].map(([label,value,icon,filter])=><button type="button" className={`pm-stat${filters.stat===filter?' selected':''}`} key={label} onClick={()=>filter==='units'?setSection('Units'):filter==='all'?resetFilters():setFilters(f=>({...f,stat:f.stat===filter?'':filter,page:'1'}))}><span className="pm-stat-icon"><Icon name={icon}/></span><span><small>{label}</small><b>{value}</b></span></button>)}
   </section>
   <div className="pm-tabs" role="tablist" aria-label="Property management views">
    <button role="tab" aria-selected={section==='Buildings'} className={section==='Buildings'?'active':''} onClick={()=>setSection('Buildings')}>Building Management</button>
    <button role="tab" aria-selected={section==='Units'} className={section==='Units'?'active':''} onClick={()=>setSection('Units')}>Unit Management</button>
   </div>
   {section==='Buildings'?<section className="pm-panel" role="tabpanel">
    <div className="pm-toolbar">
     <label className="pm-search"><Icon name="search"/><input aria-label="Search buildings" placeholder="Search buildings or address" value={searchDraft} onChange={e=>setSearchDraft(e.target.value)}/>{searchDraft&&<button type="button" aria-label="Clear search" onClick={()=>setSearchDraft('')}>×</button>}</label>
     <select aria-label="Filter by city" value={filters.city} onChange={e=>setFilter('city',e.target.value)}><option value="">All cities</option>{cities.map(city=><option key={city}>{city}</option>)}</select>
     {role==='Admin'&&<select aria-label="Filter by landlord" value={filters.landlord} onChange={e=>setFilter('landlord',e.target.value)}><option value="">All landlords</option>{landlords.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>}
     <select aria-label="Filter by status" value={filters.status} onChange={e=>setFilter('status',e.target.value)}><option value="">All statuses</option><option>Active</option><option>Inactive</option><option>Under Maintenance</option><option>Deactivated by Admin</option></select>
     <select aria-label="Filter by occupancy" value={filters.occupancy} onChange={e=>setFilter('occupancy',e.target.value)}><option value="">Any occupancy</option><option value="full">Full</option><option value="partial">Partial</option><option value="vacant">Vacant</option></select>
     <select aria-label="Sort buildings" value={filters.sort} onChange={e=>setFilter('sort',e.target.value)}><option value="building_name:asc">Name A–Z</option><option value="building_name:desc">Name Z–A</option><option value="units:desc">Most units</option><option value="vacant_units:desc">Most available units</option><option value="monthly_revenue:desc">Revenue high to low</option><option value="updated_at:desc">Recently updated</option></select>
     <button className="btn out pm-reset" type="button" onClick={resetFilters}>Reset filters</button>
     <div className="pm-column-menu"><button className="btn out" type="button" aria-expanded={columnsOpen} onClick={()=>setColumnsOpen(v=>!v)}>Columns ▾</button>{columnsOpen&&<div className="pm-column-options">{COLUMNS.map(([id,label])=><label key={id}><input type="checkbox" checked={visibleColumns.includes(id)} onChange={e=>setVisibleColumns(v=>e.target.checked?[...v,id]:v.filter(x=>x!==id))}/>{label}</label>)}</div>}</div>
     <button className="btn out" type="button" onClick={()=>exportCsv()}>Export CSV</button>
     <div className="pm-view-toggle" role="group" aria-label="Choose building view"><button type="button" aria-pressed={filters.view==='table'} className={filters.view==='table'?'active':''} onClick={()=>setView('table')} aria-label="Table view">☷</button><button type="button" aria-pressed={filters.view==='grid'} className={filters.view==='grid'?'active':''} onClick={()=>setView('grid')} aria-label="Grid view">▦</button></div>
    </div>
    {selectedIds.length>0&&<div className="pm-bulkbar"><b>{selectedIds.length} selected</b><button type="button" onClick={()=>runAction('archive',allBuildings.filter(b=>selectedIds.includes(String(b.building_id))))} disabled={busy||allBuildings.some(b=>selectedIds.includes(String(b.building_id))&&Number(b.deactivated_by_admin)===1)} title={allBuildings.some(b=>selectedIds.includes(String(b.building_id))&&Number(b.deactivated_by_admin)===1)?'A building deactivated by Admin cannot be changed here':''}>Archive</button><button type="button" onClick={()=>exportCsv(allBuildings.filter(b=>selectedIds.includes(String(b.building_id))))}>Export selected</button><button type="button" className="danger-text" disabled={allBuildings.some(b=>selectedIds.includes(String(b.building_id))&&(Number(b.units)>0||Number(b.deactivated_by_admin)===1))} title={allBuildings.some(b=>selectedIds.includes(String(b.building_id))&&(Number(b.units)>0||Number(b.deactivated_by_admin)===1))?'Buildings with units or an Admin deactivation cannot be deleted':''} onClick={()=>setConfirm({action:'delete',rows:allBuildings.filter(b=>selectedIds.includes(String(b.building_id)))})}>Delete</button><button type="button" onClick={()=>setSelectedIds([])}>Clear</button></div>}
    {buildings.loading?<Skeleton/>:!sorted.length?<Empty onAdd={()=>setEditor({mode:'create'})}/>:<>
     {filters.view==='grid'?<div className="pm-building-grid">{pageRows.map(b=><BuildingCard key={b.building_id} building={b} onOpen={()=>setDrawer(b)} onUnits={()=>openUnits(b.building_id)} onEdit={()=>setEditor({mode:'edit',building:b})} onArchive={()=>setConfirm({action:b.status==='Inactive'?'restore':'archive',rows:[b]})}/>)}</div>:<>
      <div className="pm-table-wrap"><table className="pm-table"><thead><tr><th><input type="checkbox" aria-label="Select all visible buildings" checked={pageRows.length>0&&pageRows.every(b=>selectedIds.includes(String(b.building_id)))} onChange={e=>setSelectedIds(e.target.checked?[...new Set([...selectedIds,...pageRows.map(b=>String(b.building_id))])]:selectedIds.filter(id=>!pageRows.some(b=>String(b.building_id)===id)))}/></th>{COLUMNS.filter(c=>visibleColumns.includes(c[0])).map(([key,label])=><th key={key}><button type="button" className="pm-sort-heading" onClick={()=>sortBy(key==='building'?'building_name':key==='revenue'?'monthly_revenue':key==='updated'?'updated_at':key)}>{label}<span>{sortKey===(key==='building'?'building_name':key==='revenue'?'monthly_revenue':key==='updated'?'updated_at':key)?sortDir==='asc'?'↑':'↓':'↕'}</span></button></th>)}<th>Actions</th></tr></thead><tbody>
      {pageRows.map(b=><BuildingRow key={b.building_id} building={b} selected={selectedIds.includes(String(b.building_id))} columns={visibleColumns} onSelect={checked=>setSelectedIds(ids=>checked?[...ids,String(b.building_id)]:ids.filter(id=>id!==String(b.building_id)))} onOpen={()=>setDrawer(b)} onUnits={()=>openUnits(b.building_id)} onAddUnit={()=>openUnits(b.building_id,true)} onEdit={()=>setEditor({mode:'edit',building:b})} onArchive={()=>setConfirm({action:b.status==='Inactive'?'restore':'archive',rows:[b]})} onDelete={()=>setConfirm({action:'delete',rows:[b]})}/>)}
      </tbody></table></div>
      <div className="pm-mobile-cards">{pageRows.map(b=><BuildingCard key={b.building_id} building={b} onOpen={()=>setDrawer(b)} onUnits={()=>openUnits(b.building_id)} onEdit={()=>setEditor({mode:'edit',building:b})} onArchive={()=>setConfirm({action:b.status==='Inactive'?'restore':'archive',rows:[b]})}/>)}</div>
     </>}
     <div className="pm-pagination"><span>Showing {sorted.length?((page-1)*pageSize+1):0}–{Math.min(page*pageSize,sorted.length)} of {sorted.length}</span><label>Rows per page <select value={filters.size} onChange={e=>setFilter('size',e.target.value)}><option>10</option><option>25</option><option>50</option></select></label><div><button type="button" disabled={page<=1} onClick={()=>setFilter('page',String(page-1))}>Previous</button><b>{page} / {pageCount}</b><button type="button" disabled={page>=pageCount} onClick={()=>setFilter('page',String(page+1))}>Next</button></div></div>
    </>}
   </section>:<UnitManagement role={role} buildingId={selected} onBuildingChange={setSelected} onDataChanged={refresh} addUnitRequested={openAddUnit} onAddUnitOpened={()=>setOpenAddUnit(false)} onAddBuilding={()=>{setSection('Buildings');setEditor({mode:'create'})}}/>}
  </>}
  {drawer&&<BuildingDrawer building={drawer} units={allUnits.filter(u=>String(u.building_id)===String(drawer.building_id))} onClose={()=>setDrawer(null)} onEdit={()=>{setEditor({mode:'edit',building:drawer});setDrawer(null)}} onUnits={()=>openUnits(drawer.building_id)} onAddUnit={()=>openUnits(drawer.building_id,true)}/>}
  {editor&&<BuildingEditor role={role} mode={editor.mode} building={editor.building} onClose={()=>setEditor(null)} onSaved={async message=>{setEditor(null);notify(message);await refresh()}}/>}
  {confirm&&<Modal title={confirm.action==='delete'?'Delete building?':confirm.action==='restore'?'Restore building?':'Archive building?'} sub={confirm.rows.map(b=>b.building_name).join(', ')} onClose={()=>!busy&&setConfirm(null)}><p>{confirm.action==='delete'?'This permanently removes the selected empty building. Buildings with units cannot be deleted.':confirm.action==='restore'?'This will make the building active again.':'Archived buildings are hidden from tenant apartment browsing. Existing rental records are preserved.'}</p><div className="pm-modal-actions"><button className="btn out" type="button" onClick={()=>setConfirm(null)} disabled={busy}>Cancel</button><button className={`btn${confirm.action==='delete'?' bad':''}`} type="button" disabled={busy} onClick={()=>confirm.action==='restore'?api('buildings/status',{building_id:confirm.rows[0].building_id,status:'Active'}).then(refresh).then(()=>{setConfirm(null);notify('Building restored.')}).catch(e=>notify(e.message)):runAction(confirm.action,confirm.rows)}>{busy?'Working…':confirm.action==='restore'?'Restore':confirm.action==='delete'?'Delete':'Archive'}</button></div></Modal>}
  <Toast message={toast} onClose={()=>{setToast('');setUndoRows(null)}} disabled={busy} onUndo={undoRows?async()=>{setBusy(true);try{for(const row of undoRows)await api('buildings/status',{building_id:row.building_id,status:row.status});await refresh();setToast('Archive undone.');setUndoRows(null)}catch(error){setToast(error.message);setUndoRows(null)}finally{setBusy(false)}}:null}/>
 </main>;
}

function BuildingCard({building,onOpen,onUnits,onEdit,onArchive}){
 const rate=occupancy(building);
 const adminDeactivated=Number(building.deactivated_by_admin)===1;
 return <article className="pm-building-card">
  <div className="pm-card-photo"><Photo building={building}/><StatusPill value={buildingStatus(building)}/></div>
  <div className="pm-card-content"><h3>{building.building_name}</h3><p><Icon name="pin"/><PhilippineAddressDisplay address={building.complete_address||[building.street_address,building.barangay,building.city,building.province].filter(Boolean).join(', ')}/></p><p className="pm-card-landlord">Landlord: <b>{building.landlord||'—'}</b></p>{adminDeactivated&&<p className="pm-admin-deactivation" role="note">Deactivated by Admin. Reason: {building.deactivation_reason||'No reason provided.'}</p>}<div className="pm-card-stat-grid"><span><small>Total units</small><b>{building.units||0}</b></span><span><small>Available</small><b>{building.vacant_units||0}</b></span><span><small>Occupied</small><b>{building.occupied_units||0}</b></span><span><small>Maintenance</small><b>{building.maintenance_units||0}</b></span></div><div className="pm-progress-label"><span>Occupancy</span><b>{building.occupied_units||0} / {building.units||0} units</b></div><div className="pm-progress"><span style={{width:`${rate}%`}}/></div><div className="pm-card-actions"><small>{rate}% occupied</small><div><button type="button" className="btn out sm" onClick={onOpen}>Details</button> <button type="button" className="btn out sm" onClick={onUnits}>View Units</button></div></div><div className="pm-card-management"><button type="button" className="btn out sm" disabled={adminDeactivated} title={adminDeactivated?'Deactivated by Admin; editing is unavailable':''} onClick={onEdit}>Edit building</button><button type="button" className="btn out sm" disabled={adminDeactivated} title={adminDeactivated?'Deactivated by Admin; you cannot reactivate it':''} onClick={onArchive}>{building.status==='Inactive'?'Restore':'Archive'}</button></div></div>
 </article>;
}
function StatusPill({value}){return <span className={`pm-status ${String(value).toLowerCase().replaceAll(' ','-')}`}>{value}</span>}
function BuildingRow({building,selected,columns,onSelect,onOpen,onUnits,onAddUnit,onEdit,onArchive,onDelete}){
 const[menu,setMenu]=useState(false);
 const adminDeactivated=Number(building.deactivated_by_admin)===1;
 const data={
  building:<span className="pm-building-cell"><Photo building={building}/><span><b>{building.building_name}</b><small>{building.floor_count||1} floors</small></span></span>,
  address:<PhilippineAddressDisplay address={building.complete_address||[building.street_address,building.barangay,building.city,building.province].filter(Boolean).join(', ')}/>,
  city:building.city,
  units:building.units||0,
  occupancy:<span className="pm-occupancy-cell"><span className="pm-progress"><span style={{width:`${occupancy(building)}%`}}/></span><small>{building.occupied_units||0} / {building.units||0} units · {occupancy(building)}%</small></span>,
  revenue:php(building.monthly_revenue||0),
  status:<span><StatusPill value={buildingStatus(building)}/>{adminDeactivated&&<small className="pm-admin-deactivation">{building.deactivation_reason||'No reason provided.'}</small>}</span>,
  updated:dateLabel(building.updated_at)
 };
 return <tr onClick={onOpen} onKeyDown={event=>{if(event.target===event.currentTarget&&(event.key==='Enter'||event.key===' ')){event.preventDefault();onOpen()}}} tabIndex={0} className="pm-clickable-row"><td onClick={e=>e.stopPropagation()}><input type="checkbox" aria-label={`Select ${building.building_name}`} checked={selected} onChange={e=>onSelect(e.target.checked)}/></td>{COLUMNS.filter(c=>columns.includes(c[0])).map(([id])=><td key={id}>{data[id]}</td>)}<td className="pm-actions-cell" onClick={e=>e.stopPropagation()}><button type="button" className="btn out sm" onClick={onUnits}>View Units</button><div className="pm-row-menu"><button type="button" className="pm-kebab" aria-label={`Actions for ${building.building_name}`} aria-expanded={menu} onClick={()=>setMenu(v=>!v)}><Icon name="more"/></button>{menu&&<div className="pm-row-menu-list"><button type="button" onClick={onOpen}>View Details</button><button type="button" onClick={onUnits}>View Units</button><button type="button" disabled={adminDeactivated} title={adminDeactivated?building.deactivation_reason||'Deactivated by Admin':''} onClick={onEdit}>Edit</button><button type="button" disabled={adminDeactivated} title={adminDeactivated?building.deactivation_reason||'Deactivated by Admin':''} onClick={onAddUnit}>Add Unit</button><button type="button" disabled={adminDeactivated} title={adminDeactivated?'You cannot reactivate a building deactivated by Admin':''} onClick={onArchive}>{building.status==='Inactive'?'Restore':'Archive'}</button><button type="button" className="danger-text" disabled={Number(building.units)>0||adminDeactivated} title={adminDeactivated?building.deactivation_reason||'Deactivated by Admin':Number(building.units)>0?'Buildings with units must be archived':'Delete empty building'} onClick={onDelete}>Delete</button></div>}</div></td></tr>;
}

function BuildingDrawer({building,units,onClose,onEdit,onUnits,onAddUnit}){
 const closeRef=useRef(null),drawerRef=useRef(null),onCloseRef=useRef(onClose);
 onCloseRef.current=onClose;
 useEffect(()=>{
  const old=document.activeElement;closeRef.current?.focus();
  const keydown=event=>{
   if(event.key==='Escape'){event.stopPropagation();onCloseRef.current();return}
   if(event.key!=='Tab')return;
   const items=drawerRef.current?.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled])')||[];
   if(!items.length)return;
   if(event.shiftKey&&document.activeElement===items[0]){event.preventDefault();items[items.length-1].focus()}
   else if(!event.shiftKey&&document.activeElement===items[items.length-1]){event.preventDefault();items[0].focus()}
  };
  window.addEventListener('keydown',keydown);
  return()=>{window.removeEventListener('keydown',keydown);old?.focus?.()};
 },[]);
 return <div className="pm-drawer-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><aside ref={drawerRef} className="pm-drawer" role="dialog" aria-modal="true" aria-labelledby="pm-drawer-title">
  <div className="pm-drawer-header"><div><small>BUILDING DETAILS</small><h2 id="pm-drawer-title">{building.building_name}</h2></div><button ref={closeRef} type="button" aria-label="Close building details" onClick={onClose}>×</button></div>
  <div className="pm-drawer-scroll"><div className="pm-drawer-gallery"><Photo building={building}/>{(building.photos||[]).length>1&&<div>{building.photos.slice(1).map((photo,i)=><img key={i} src={/^https?:\/\//i.test(photo)?photo:fileUrl(photo)} crossOrigin={/^https?:\/\//i.test(photo)?undefined:'use-credentials'} alt={`${building.building_name} photo ${i+2}`}/>)}</div>}</div>
  <div className="pm-drawer-status"><StatusPill value={buildingStatus(building)}/><span>Registered {dateLabel(building.created_at)} · Updated {dateLabel(building.updated_at)}</span></div>
  {Number(building.deactivated_by_admin)===1&&<p className="pm-admin-deactivation" role="note">Deactivated by Admin. Reason: {building.deactivation_reason||'No reason provided.'} You cannot edit or reactivate this building.</p>}
  <h3>Landlord</h3><p>{building.landlord||'Landlord information unavailable'}</p>
   <h3>Address</h3><p><PhilippineAddressDisplay address={[building.complete_address||[building.street_address,building.barangay,building.city,building.province].filter(Boolean).join(', '),building.postal_code].filter(Boolean).join(', ')}/></p><div className="pm-map"><Icon name="pin"/><span>{building.city}<small>Map preview</small></span></div>
   <h3>About this property</h3><p>{building.description||'No description added yet.'}</p><div className="pm-amenity-chips">{(building.amenities||'').split(',').map(a=>a.trim()).filter(Boolean).map(a=><span key={a}>{a}</span>)}</div>
   <div className="pm-drawer-stats"><div><small>Total units</small><b>{building.units||0}</b></div><div><small>Available</small><b>{building.vacant_units||0}</b></div><div><small>Occupied</small><b>{building.occupied_units||0}</b></div><div><small>Maintenance</small><b>{building.maintenance_units||0}</b></div></div>
   <h3>Units in this building</h3>{units.length?<div className="pm-mini-units">{units.map(u=><div key={u.unit_id}><span><b>Unit {u.unit_number}</b><small>{Number(u.bedrooms)===0?'Studio':`${u.bedrooms} bed`} · {u.bathrooms} bath · {php(u.monthly_rent)}/mo</small><small>{u.current_tenant?`Tenant: ${u.current_tenant}`:'No active tenant'}</small></span><StatusPill value={u.availability_status==='Available'?'Vacant':u.availability_status==='Unavailable'?'Maintenance':u.availability_status}/></div>)}</div>:<p>No units have been added to this building.</p>}
  </div><div className="pm-drawer-actions"><button className="btn out" disabled={Number(building.deactivated_by_admin)===1} onClick={onEdit}>Edit</button><button className="btn out" disabled={Number(building.deactivated_by_admin)===1} onClick={onAddUnit}>Add Unit</button><button className="btn" onClick={onUnits}>View Units</button></div>
 </aside></div>;
}

function BuildingEditor({role,mode,building,onClose,onSaved}){
 const isEdit=mode==='edit';
 const initial={
  building_name:building?.building_name||'',address:{region_code:building?.region_code||'',province_code:building?.province_code||'',city_municipality_code:building?.city_municipality_code||'',barangay_code:building?.barangay_code||'',street_address:building?.street_address||''},postal_code:building?.postal_code||'',floor_count:String(building?.floor_count||1),description:building?.description||'',amenities:(building?.amenities||'').split(',').map(v=>v.trim()).filter(Boolean),status:building?.status||'Active',landlord_id:String(building?.landlord_id||'')
 };
 const[form,setForm]=useState(initial);
 const[photos,setPhotos]=useState([]);
 const[previews,setPreviews]=useState([]);
 const[removedPhotos,setRemovedPhotos]=useState([]);
 const[landlords,setLandlords]=useState([]);
 const[error,setError]=useState('');
 const[photoError,setPhotoError]=useState('');
 const[busy,setBusy]=useState(false);
 const[dirty,setDirty]=useState(false);
 const firstField=useRef(null);
 const existingPhotos=(building?.photos||[]).filter(photo=>!removedPhotos.includes(photo));
 const keepExistingAddress=isEdit&&!!(building?.complete_address||building?.street_address||building?.barangay||building?.city||building?.province)&&JSON.stringify(form.address)===JSON.stringify(initial.address);
 useEffect(()=>{firstField.current?.focus();if(role==='Admin')api('landlords').then(d=>setLandlords(d.rows||[])).catch(e=>setError(e.message))},[role]);
 useEffect(()=>{const urls=photos.map(photo=>URL.createObjectURL(photo));setPreviews(urls);return()=>urls.forEach(URL.revokeObjectURL)},[photos]);
 useEffect(()=>{
  if(!dirty)return undefined;
  const beforeUnload=event=>{event.preventDefault();event.returnValue=''};
  const beforeModuleChange=event=>{if(!window.confirm('You have unsaved building changes or selected photos. Leave this page and discard them?'))event.preventDefault()};
  window.addEventListener('beforeunload',beforeUnload);
  window.addEventListener('ars:before-module-change',beforeModuleChange);
  return()=>{window.removeEventListener('beforeunload',beforeUnload);window.removeEventListener('ars:before-module-change',beforeModuleChange)};
 },[dirty]);
 const close=()=>{if(dirty&&!window.confirm('Discard your unsaved building changes?'))return;onClose()};
 const set=(key,value)=>{setDirty(true);setForm(f=>({...f,[key]:value}))};
 const toggleAmenity=value=>set('amenities',form.amenities.includes(value)?form.amenities.filter(a=>a!==value):[...form.amenities,value]);
 const choosePhotos=files=>{const selected=Array.from(files||[]);const remaining=Math.max(0,8-existingPhotos.length-photos.length);const invalid=selected.filter(file=>!isSupportedImage(file));if(invalid.length){setPhotoError(`Photos must be JPG, PNG or WEBP: ${invalid.map(file=>file.name).join(', ')}`);return}const oversized=selected.filter(file=>file.size>5*1024*1024);if(oversized.length){setPhotoError(`Each photo must be 5 MB or smaller: ${oversized.map(file=>file.name).join(', ')}`);return}if(selected.length>remaining){setPhotoError(`You can upload up to ${remaining} more photo${remaining===1?'':'s'}. Remove an existing photo to make room.`);return}setPhotoError('');setError('');if(selected.length){setPhotos(current=>[...current,...selected]);setDirty(true)}};
 const removeExistingPhoto=photo=>{if(!window.confirm('Remove this photo from the building? This change is saved with the form.'))return;setRemovedPhotos(current=>[...current,photo]);setDirty(true)};
 const replaceExistingPhoto=(oldPhoto,file)=>{if(!isSupportedImage(file)){setPhotoError(`Photos must be JPG, PNG or WEBP: ${file.name}`);return}if(file.size>5*1024*1024){setPhotoError(`Each photo must be 5 MB or smaller: ${file.name}`);return}if(!window.confirm('Replace this saved photo? The replacement will be uploaded when you save.'))return;setRemovedPhotos(current=>current.includes(oldPhoto)?current:[...current,oldPhoto]);setPhotos(current=>[...current,file]);setPhotoError('');setError('');setDirty(true)};
 const removeNewPhoto=index=>{if(!window.confirm('Remove this selected photo?'))return;setPhotos(current=>current.filter((_,photoIndex)=>photoIndex!==index));setDirty(true)};
 const submit=async event=>{
  event.preventDefault();setError('');
  if(!form.building_name.trim()){setError('Building name is required.');return}
  if(!keepExistingAddress&&(!form.address.region_code||!form.address.city_municipality_code||!form.address.barangay_code)){setError('Select a region, city or municipality, and barangay.');return}
  if(!/^\d+$/.test(form.floor_count)||Number(form.floor_count)<1||Number(form.floor_count)>200){setError('Number of floors must be from 1 to 200.');return}
  if(role==='Admin'&&!form.landlord_id){setError('Select an assigned landlord.');return}
  setBusy(true);
  try{
   const data=new FormData();
   Object.entries(form).forEach(([key,value])=>{
    if(key==='address'){if(!keepExistingAddress)['region_code','province_code','city_municipality_code','barangay_code','street_address'].forEach(field=>data.append(`address[${field}]`,value[field]||''))}
    else data.append(key,key==='amenities'?value.join(', '):value);
   });
   if(isEdit)data.append('building_id',building.building_id);
   if(isEdit)data.append('removed_photos',JSON.stringify(removedPhotos));
   data.append('building_photo_count',String(photos.length));
   photos.forEach(photo=>data.append('building_photos[]',photo));
   await api(isEdit?'buildings/update':'buildings/create',data);
   setDirty(false);await onSaved(isEdit?'Building updated successfully.':'Building added successfully.');
  }catch(e){setError(e.message)}
  finally{setBusy(false)}
 };
 return <Modal title={isEdit?'Edit building':'Add building'} sub="Manage property details, address, amenities, and photos." wide stickyLayout className="pm-building-modal" onClose={close} closeOnBackdrop={false} closeOnEscape={false}>
  <form className="pm-building-form" onSubmit={submit}>
   <div className="pm-building-scroll">
    <section className="pm-form-section">
     <div className="pm-form-section-heading"><span>01</span><div><h3>Building information</h3><p>Identify the property and its assigned owner.</p></div></div>
     <div className="pm-form-grid">
      {role==='Admin'&&<label className="full">Assigned landlord *<select value={form.landlord_id} onChange={e=>set('landlord_id',e.target.value)}><option value="">Select a landlord</option>{landlords.map(l=><option key={l.landlord_id} value={l.landlord_id}>{l.name} ({l.email})</option>)}</select></label>}
      <label className="full">Building name *<input ref={firstField} maxLength={120} value={form.building_name} onChange={e=>set('building_name',e.target.value)} placeholder="e.g. Mabini Residences"/></label>
      <label className="full">Building description<textarea rows={3} value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Share useful details about the building and its facilities."/></label>
     </div>
    </section>
    <section className="pm-form-section">
     <div className="pm-form-section-heading"><span>02</span><div><h3>Property address</h3><p>Use the Philippine location hierarchy to set a precise address.</p></div></div>
     <PhilippineAddressFields name="building-address" value={form.address} legacyAddress={building?.complete_address||[building?.street_address,building?.barangay,building?.city,building?.province].filter(Boolean).join(', ')} postalCode={form.postal_code} onPostalCodeChange={value=>set('postal_code',value)} onChange={value=>set('address',value)}/>
    </section>
    <section className="pm-form-section">
     <div className="pm-form-section-heading"><span>03</span><div><h3>Building details</h3><p>Set the building's floors and availability status.</p></div></div>
     <div className="pm-form-grid">
      <label>Number of floors *<input type="number" min="1" max="200" value={form.floor_count} onChange={e=>set('floor_count',e.target.value)}/><small className="pm-field-help">Enter a number from 1 to 200.</small></label>
      {isEdit&&<label>Building status<select value={form.status} onChange={e=>set('status',e.target.value)}><option>Active</option><option>Inactive</option></select></label>}
     </div>
    </section>
    <section className="pm-form-section">
     <div className="pm-form-section-heading"><span>04</span><div><h3>Amenities and facilities</h3><p>Select the features available at this property.</p></div></div>
     <div className="pm-amenity-options">{AMENITY_OPTIONS.map(a=><button key={a} type="button" className={form.amenities.includes(a)?'selected':''} aria-pressed={form.amenities.includes(a)} onClick={()=>toggleAmenity(a)}>{form.amenities.includes(a)&&<span aria-hidden="true">✓ </span>}{a}</button>)}</div>
    </section>
    <section className="pm-form-section">
     <div className="pm-form-section-heading"><span>05</span><div><h3>Building photos</h3><p>Upload up to 8 JPG, PNG, or WEBP images. Each file must be 5 MB or smaller.</p></div></div>
     <label className="pm-upload" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();choosePhotos(e.dataTransfer.files)}}><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>{choosePhotos(e.target.files);e.target.value=''}}/><span className="pm-upload-icon" aria-hidden="true">↑</span><span><b>Choose photos</b> or drag them here<small>JPG, PNG, WEBP · max 5 MB each · up to 8 total</small></span></label>
     {photoError&&<p className="pm-form-error" role="alert">{photoError}</p>}
     {(existingPhotos.length>0||previews.length>0)&&<div className="pm-photo-grid">
      {existingPhotos.map((photo,index)=><figure className="pm-photo-item" key={`existing-${photo}`}><img src={/^https?:\/\//i.test(photo)?photo:fileUrl(photo)} crossOrigin={/^https?:\/\//i.test(photo)?undefined:'use-credentials'} alt={`Building photo ${index+1}`}/><figcaption><span>Saved photo</span><div><label className="pm-photo-replace">Replace<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>{const file=event.target.files?.[0];if(file)replaceExistingPhoto(photo,file);event.target.value=''}}/></label><button type="button" className="pm-photo-remove" onClick={()=>removeExistingPhoto(photo)} aria-label={`Remove saved photo ${index+1}`}>Remove</button></div></figcaption></figure>)}
      {previews.map((src,index)=><figure className="pm-photo-item" key={`new-${index}`}><img src={src} alt={`New building photo ${index+1} preview`}/><figcaption><span>New photo · ready to upload</span><button type="button" className="pm-photo-remove" onClick={()=>removeNewPhoto(index)} aria-label={`Remove new photo ${index+1}`}>Remove</button></figcaption></figure>)}
     </div>}
    </section>
   </div>
   <footer className="pm-modal-actions">{error&&<p className="pm-form-error pm-modal-error" role="alert">{error}</p>}<button type="button" className="btn out" onClick={close} disabled={busy}>Cancel</button><button type="submit" className="btn" disabled={busy}>{busy?'Saving…':isEdit?'Save changes':'Add building'}</button></footer>
  </form>
 </Modal>;
}
