import {useEffect,useMemo,useState} from 'react';
import {api} from '../../services/api.js';
import {php} from '../../utils/format.js';
import {useApartments} from '../../hooks/useApartments.js';
import {useApi} from '../../hooks/useApi.js';
import {useBookings} from '../../hooks/useBookings.js';
import FilterBar from './FilterBar.jsx';
import {ApartmentPhoto} from './ApartmentCard.jsx';
import BookingModal from './BookingModal.jsx';
import {PhilippineAddressDisplay} from '../../components/PhilippineAddressFields.jsx';

const DEFAULTS={q:'',min:'',max:'',bedrooms:'',bathrooms:'',min_sqm:'',max_sqm:'',city:'',sort:'price_low',available_only:'1'};
const FILTER_KEYS=Object.keys(DEFAULTS);
function readFilters(){const params=new URLSearchParams(window.location.search);return Object.fromEntries(FILTER_KEYS.map(key=>[key,params.get(key)??DEFAULTS[key]]))}
function listingQuery(filters,q){const params=new URLSearchParams();Object.entries({...filters,q}).forEach(([key,value])=>{if(value)params.set(key,value)});return params.toString()}
function amenities(value){return Array.isArray(value)?value:(value||'').split(/[,;|]/).map(item=>item.trim()).filter(Boolean)}
function beds(value){return Number(value)===0?'Studio':`${value} bedroom${Number(value)===1?'':'s'}`}
function address(building){return building.complete_address||building.address||[building.city,building.province].filter(Boolean).join(', ')||'Address not provided'}
function PhotoGallery({item,title}) {
  const[photo,setPhoto]=useState(0);
  const photos=[...(item.photos||[]),...(item.building_photos||[])];
  useEffect(()=>setPhoto(0),[item.building_id,item.id,title]);
  return <div className="tenant-gallery">
    <ApartmentPhoto unit={{...item,b:item.building_name||item.b||title}} index={photo}/>
    {photos.length>1&&<div className="gallery-controls"><button type="button" aria-label="Previous photo" onClick={()=>setPhoto((photo+photos.length-1)%photos.length)}>‹</button><span>{photo+1} / {photos.length}</span><button type="button" aria-label="Next photo" onClick={()=>setPhoto((photo+1)%photos.length)}>›</button></div>}
  </div>;
}
function BuildingCard({building,favorite,favoriteBusy,onFavorite,onOpen}){
  return <article className="listing-building-card">
    <div className="listing-building-cover">
      <button type="button" className="listing-building-photo-button" onClick={onOpen} aria-label={`View ${building.building_name}`}>
        <ApartmentPhoto unit={{b:building.building_name,photos:[],building_photos:building.photos||[]}}/>
      </button>
      <button type="button" className={`favorite-button${favorite?' saved':''}`} disabled={favoriteBusy} aria-label={favorite?'Remove building from favorites':'Add building to favorites'} aria-pressed={favorite} onClick={onFavorite}>{favorite?'♥':'♡'}</button>
      <span className="listing-building-count">{building.available_units} of {building.total_units} available</span>
      {building.status==='Inactive'&&<span className="listing-building-archived">Archived</span>}
    </div>
    <div className="listing-building-body">
      <h3>{building.building_name}</h3>
      <p className="apartment-location"><PhilippineAddressDisplay address={address(building)}/></p>
      <p className="apartment-description">{building.description||'No building description provided.'}</p>
      <div className="listing-building-meta"><span>{building.total_units} total units</span><span>{building.available_units} available</span></div>
      <div className="listing-building-meta"><span>Starting rent</span><b>{building.starting_rent===null? 'No available rent':`${php(building.starting_rent)} / month`}</b></div>
      <button type="button" className="btn listing-building-action" onClick={onOpen}>View Details</button>
    </div>
  </article>;
}
function UnitCard({unit,onOpen}){
  const status=unit.st==='Unavailable'?'Maintenance':unit.st;
  return <article className="apartment-card tenant-unit-card">
    <div className="apartment-card-image"><ApartmentPhoto unit={unit}/><span className={`availability-pill tenant-status-${String(status).toLowerCase().replaceAll(' ','-')}`}>{status}</span></div>
    <div className="apartment-card-body">
      <div className="apartment-title-row"><h3>Unit {unit.u}</h3></div>
      <div className="apartment-facts"><span>{beds(unit.bed)}</span><span>{unit.bath} bath</span><span>{unit.floor_number===null?'Floor not specified':`Floor ${unit.floor_number}`}</span>{unit.sqm&&<span>{Number(unit.sqm)} sqm</span>}</div>
      <p className="apartment-description">{unit.description||'No unit description provided.'}</p>
      <div className="apartment-card-bottom"><div className="apartment-price"><b>{php(unit.rent)}</b><span>/ month</span></div><button type="button" className="btn out sm" onClick={onOpen}>View Unit Details</button></div>
    </div>
  </article>;
}
function BuildingDetails({building,units,loading,error,onBack,onUnit}){
  return <section className="tenant-detail-page">
    <button className="btn out tenant-back" type="button" onClick={onBack}>← Back to Browse Apartments</button>
    <PhotoGallery item={{...building,photos:[],b:building.building_name,building_photos:building.photos||[]}} title={building.building_name}/>
    <div className="tenant-detail-heading"><div><p className="listing-eyebrow">APARTMENT BUILDING</p><h2>{building.building_name}</h2><p><PhilippineAddressDisplay address={address(building)}/></p></div><span className={building.status==='Inactive'?'listing-building-archived':'listing-building-count'}>{building.status==='Inactive'?'Archived':`${building.available_units} available units`}</span></div>
    <p>{building.description||'No building description provided.'}</p>
    <div className="tenant-building-stat-grid"><div><small>Total units</small><b>{building.total_units}</b></div><div><small>Available</small><b>{building.available_units}</b></div><div><small>Occupied</small><b>{building.occupied_units}</b></div><div><small>Maintenance</small><b>{building.maintenance_units}</b></div><div><small>Starting rent</small><b>{building.starting_rent===null?'—':php(building.starting_rent)}</b></div></div>
    <h3>Building amenities</h3>{amenities(building.amenities).length?<div className="apartment-amenities">{amenities(building.amenities).map(item=><span key={item}>{item}</span>)}</div>:<p className="mut">No building amenities listed.</p>}
    <div className="tenant-detail-section-heading"><div><h3>Units in this building</h3><p>Unit status and rent are based on current database records.</p></div><b>{units.length} units</b></div>
    {loading?<div className="listing-loading" role="status">Loading units…</div>:error?<div className="listing-error" role="alert"><span>Units could not be loaded.</span><p>{error}</p></div>:units.length?<div className="apartment-grid listing-unit-grid">{units.map(unit=><UnitCard key={unit.id} unit={unit} onOpen={()=>onUnit(unit)}/>)}</div>:<div className="listing-empty"><h3>No units listed</h3><p>This building has no units to display right now.</p></div>}
  </section>;
}
function UnitDetails({unit,building,onBack,onBook,existingBooking,onViewBookings}){
  const unitAmenities=amenities(unit.am);
  return <section className="tenant-detail-page">
    <button className="btn out tenant-back" type="button" onClick={onBack}>← Back to {building.building_name}</button>
    <PhotoGallery item={unit} title={`Unit ${unit.u}`}/>
    <div className="tenant-detail-heading"><div><p className="listing-eyebrow">UNIT DETAILS</p><h2>Unit {unit.u}</h2><p>{building.building_name} · <PhilippineAddressDisplay address={address(building)}/></p></div><span className={`availability-pill tenant-status-${String(unit.st).toLowerCase().replaceAll(' ','-')}`}>{unit.st==='Unavailable'?'Maintenance':unit.st}</span></div>
    <div className="tenant-unit-info-grid"><div><small>Unit type</small><b>{beds(unit.bed)}</b></div><div><small>Floor</small><b>{unit.floor_number===null?'Not specified':unit.floor_number}</b></div><div><small>Monthly rent</small><b>{php(unit.rent)}</b></div><div><small>Size</small><b>{unit.sqm?`${unit.sqm} sqm`:'Not provided'}</b></div></div>
    <h3>About this unit</h3><p>{unit.description||'No unit description provided.'}</p>
    <h3>Unit amenities</h3>{unitAmenities.length?<div className="apartment-amenities">{unitAmenities.map(item=><span key={item}>{item}</span>)}</div>:<p className="mut">No unit amenities listed.</p>}
    <div className="tenant-detail-booking"><div><small>Monthly rent</small><b>{php(unit.rent)} / month</b>{existingBooking&&<small>Existing request: {existingBooking.status}</small>}</div>{unit.st==='Available'&&<button type="button" className="btn" onClick={()=>existingBooking?onViewBookings():onBook(unit)}>{existingBooking?'View booking details':'Request Booking'}</button>}</div>
    {unit.st!=='Available'&&<p className="tenant-unavailable-note">This unit is not available for booking.</p>}
  </section>;
}
function Skeleton(){return <div className="apartment-grid" role="status" aria-label="Loading buildings">{[1,2,3].map(item=><div className="apartment-skeleton" key={item}><div/><span/><span/><span/></div>)}</div>}
function EmptyState({filtered,onReset,onBrowse}){return <div className="listing-empty"><span aria-hidden="true">{filtered?'⌕':'⌂'}</span><h3>{filtered?'No apartments match your filters':'No apartments available yet'}</h3><p>{filtered?'Try removing a filter or broadening your search.':'Please check back soon. New listings will appear here.'}</p>{filtered&&<button type="button" className="btn out" onClick={onReset}>Reset filters</button>}{!filtered&&<button type="button" className="btn out" onClick={onBrowse}>Refresh listings</button>}</div>}

export default function Listings({onViewBookings,onViewRental}){
  const[filters,setFilters]=useState(readFilters);
  const[debouncedSearch,setDebouncedSearch]=useState(filters.q);
  const[selectedBuilding,setSelectedBuilding]=useState(null);
  const[selectedUnit,setSelectedUnit]=useState(null);
  const[buildingUnits,setBuildingUnits]=useState([]);
  const[detailLoading,setDetailLoading]=useState(false);
  const[detailError,setDetailError]=useState('');
  const[booking,setBooking]=useState(null);
  const[visibleCount,setVisibleCount]=useState(9);
  const[showFavorites,setShowFavorites]=useState(false);
  const[favoriteBusy,setFavoriteBusy]=useState('');
  const[toast,setToast]=useState('');
  const{bookings,retry:retryBookings}=useBookings();
  const{buildings,cities,loading,error,retry}=useApartments(useMemo(()=>listingQuery(filters,debouncedSearch),[filters,debouncedSearch]));
  const{d:favoriteData,e:favoriteError,load:loadFavorites}=useApi('favorites');
  const favoriteLoading=!favoriteData&&!favoriteError;
  const favoriteBuildings=favoriteData?.buildings||[];
  const favoriteIds=useMemo(()=>new Set(favoriteBuildings.map(item=>String(item.building_id))),[favoriteBuildings]);
  const sortedBuildings=useMemo(()=>{
    const source=showFavorites?favoriteBuildings:buildings;
    return [...source].sort((a,b)=>{
      if(filters.sort==='newest')return String(b.latest_unit_at||b.created_at||'').localeCompare(String(a.latest_unit_at||a.created_at||''));
      const aRent=Number(filters.sort==='price_high'?a.highest_rent:a.starting_rent);
      const bRent=Number(filters.sort==='price_high'?b.highest_rent:b.starting_rent);
      const fallback=filters.sort==='price_high'?-1:Number.MAX_SAFE_INTEGER;
      const difference=(Number.isFinite(aRent)?aRent:fallback)-(Number.isFinite(bRent)?bRent:fallback);
      return filters.sort==='price_high'?-difference:difference;
    });
  },[buildings,favoriteBuildings,filters.sort,showFavorites]);
  const shownBuildings=sortedBuildings.slice(0,visibleCount);
  const hasFilters=Object.entries(filters).some(([key,value])=>value!==DEFAULTS[key]);
  const activeFilters=useMemo(()=>{
    const labels=[];
    if(filters.q)labels.push(['q',`Search: ${filters.q}`]);
    if(filters.min)labels.push(['min',`From ${php(filters.min)}`]);
    if(filters.max)labels.push(['max',`Up to ${php(filters.max)}`]);
    if(filters.bedrooms)labels.push(['bedrooms',filters.bedrooms==='0'?'Studio':`${filters.bedrooms}${filters.bedrooms==='3'?'+':''} bedrooms`]);
    if(filters.bathrooms)labels.push(['bathrooms',`${filters.bathrooms}+ bathrooms`]);
    if(filters.min_sqm)labels.push(['min_sqm',`${filters.min_sqm}+ sqm`]);
    if(filters.max_sqm)labels.push(['max_sqm',`Up to ${filters.max_sqm} sqm`]);
    if(filters.city)labels.push(['city',filters.city]);
    if(filters.sort!=='price_low')labels.push(['sort','Custom sorting']);
    return labels;
  },[filters]);
  useEffect(()=>{const timer=setTimeout(()=>setDebouncedSearch(filters.q),300);return()=>clearTimeout(timer)},[filters.q]);
  useEffect(()=>{const params=new URLSearchParams();Object.entries(filters).forEach(([key,value])=>{if(value&&value!==DEFAULTS[key])params.set(key,value)});const queryString=params.toString();const next=`${window.location.pathname}${queryString?`?${queryString}`:''}${window.location.hash}`;window.history.replaceState(null,'',next)},[filters]);
  useEffect(()=>{setVisibleCount(9)},[filters,showFavorites]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),3600);return()=>clearTimeout(timer)},[toast]);
  const setFilter=(key,value)=>setFilters(current=>({...current,[key]:value}));
  const reset=()=>{setFilters(DEFAULTS);setShowFavorites(false)};
  const requestFor=id=>bookings.find(item=>String(item.unit_id)===String(id)&&['Pending','Approved'].includes(item.status));
  const toggleFavorite=async buildingId=>{
    const id=String(buildingId);
    setFavoriteBusy(id);
    try{await api(favoriteIds.has(id)?'favorites/remove':'favorites/add',{building_id:buildingId});await loadFavorites()}
    catch(requestError){setToast(requestError.message)}
    finally{setFavoriteBusy('')}
  };
  const openBuilding=async building=>{
    setSelectedBuilding(building);setSelectedUnit(null);setBuildingUnits([]);setDetailError('');setDetailLoading(true);
    try{
      if(building.status==='Inactive'){setBuildingUnits([]);return}
      const result=await api(`listings&building_id=${encodeURIComponent(building.building_id)}&available_only=0`);
      setBuildingUnits(result.units||[]);
      const fresh=result.buildings?.[0];
      if(fresh){
        const prices=(result.units||[]).filter(unit=>unit.st==='Available').map(unit=>Number(unit.rent));
        setSelectedBuilding({...building,...fresh,starting_rent:prices.length?Math.min(...prices):null});
      }
    }catch(requestError){setDetailError(requestError.message)}
    finally{setDetailLoading(false)}
  };
  const goBackToList=()=>{setSelectedUnit(null);setSelectedBuilding(null);setBuildingUnits([])};
  const backToBuilding=()=>setSelectedUnit(null);

  if(selectedUnit&&selectedBuilding)return <section className="my-booking-page"><UnitDetails unit={selectedUnit} building={selectedBuilding} onBack={backToBuilding} onBook={setBooking} existingBooking={requestFor(selectedUnit.id)} onViewBookings={onViewBookings}/>{booking&&<BookingModal unit={booking} onClose={()=>setBooking(null)} onViewBookings={onViewBookings} onViewRental={onViewRental} onSuccess={result=>{if(!result.duplicate)setToast('Your booking request was sent to the landlord.');retryBookings();retry()}}/>}{toast&&<div className="listing-toast" role="status">{toast}</div>}</section>;
  if(selectedBuilding)return <section className="my-booking-page"><BuildingDetails building={selectedBuilding} units={buildingUnits} loading={detailLoading} error={detailError} onBack={goBackToList} onUnit={setSelectedUnit}/>{toast&&<div className="listing-toast" role="status">{toast}</div>}</section>;

  return <section className="my-booking-page">
    <div className="booking-breadcrumbs"><span>Home</span><span aria-hidden="true">/</span><b>My Booking</b><span aria-hidden="true">/</span><span>Browse Apartments</span></div>
    <div className="listing-heading"><div><p className="listing-eyebrow">YOUR NEXT HOME</p><h2>Browse Apartments</h2><p>Explore apartment buildings, compare their available units, and request a booking.</p></div><div className="listing-trust"><span>✓</span> Secure booking requests</div></div>
    <div className="tenant-listing-tabs"><button type="button" className={!showFavorites?'active':''} onClick={()=>setShowFavorites(false)}>All buildings</button><button type="button" className={showFavorites?'active':''} onClick={()=>setShowFavorites(true)}>Favorites <span>{favoriteIds.size}</span></button></div>
    {favoriteError&&<div className="listing-error" role="alert"><span>Favorites could not be loaded.</span><p>{favoriteError}. Check that the tenant favorites endpoint and database migration are installed.</p><button type="button" className="btn out" onClick={loadFavorites}>Retry favorites</button></div>}
    {!showFavorites&&<FilterBar filters={filters} setFilter={setFilter} cities={cities} onReset={reset} activeFilters={activeFilters} resultCount={loading?0:buildings.length}/>}
    {loading&&!showFavorites?<Skeleton/>:error&&!showFavorites?<div className="listing-error" role="alert"><span>We couldn’t load apartments.</span><p>{error}</p><button type="button" className="btn out" onClick={retry}>Try again</button></div>:showFavorites&&favoriteLoading?<Skeleton/>:!showFavorites&&sortedBuildings.length===0?<EmptyState filtered={hasFilters} onReset={reset} onBrowse={retry}/>:showFavorites&&favoriteError?null:showFavorites&&!favoriteBuildings.length?<div className="listing-empty"><span aria-hidden="true">♡</span><h3>No favorite buildings yet</h3><p>Save a building with the heart button and it will appear here.</p><button type="button" className="btn out" onClick={()=>setShowFavorites(false)}>Browse buildings</button></div>:<>
      <div className="apartment-grid listing-building-grid">{shownBuildings.map(building=><BuildingCard key={building.building_id} building={building} favorite={favoriteIds.has(String(building.building_id))} favoriteBusy={favoriteBusy===String(building.building_id)} onFavorite={()=>toggleFavorite(building.building_id)} onOpen={()=>openBuilding(building)}/>)}</div>
      {sortedBuildings.length>visibleCount&&<button type="button" className="btn out listing-load-more" onClick={()=>setVisibleCount(value=>value+9)}>Show more buildings</button>}
    </>}
    {toast&&<div className="listing-toast" role="status">{toast}</div>}
  </section>;
}
