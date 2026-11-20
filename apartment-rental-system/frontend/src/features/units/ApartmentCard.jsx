import {useEffect,useState} from 'react';
import {php} from '../../utils/format.js';
import {fileUrl} from '../../services/api.js';
import {PhilippineAddressDisplay} from '../../components/PhilippineAddressFields.jsx';

function Icon({type}){const paths={pin:'M12 22s8-7.2 8-13a8 8 0 1 0-16 0c0 5.8 8 13 8 13zm0-10a3 3 0 1 0 0-6 3 3 0 0 0 0 6',bed:'M3 19V7m0 8h18v4M3 10h8a3 3 0 0 1 3 3v2m0-4h4a3 3 0 0 1 3 3v1',bath:'M3 12h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zm3 0V6a3 3 0 0 1 6 0v1',area:'M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z'};return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[type]}/></svg>}
function Photo({unit,index=0}){const paths=[...(unit.photos||[]),...(unit.building_photos||[])];const path=paths[index]||'';const[failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[path]);if(path&&!failed)return <img src={/^https?:\/\//i.test(path)?path:fileUrl(path)} crossOrigin={/^https?:\/\//i.test(path)?undefined:'use-credentials'} alt={`${unit.b} apartment`} onError={()=>setFailed(true)}/>;return <div className="apartment-image-fallback" aria-label="Apartment photo unavailable"><span aria-hidden="true">⌂</span><small>{unit.b}</small></div>}
export function ApartmentPhoto({unit,index}){return <Photo unit={unit} index={index}/>}
export default function ApartmentCard({unit,favorite,onFavorite,onDetails,onBook,bookingPending}){
  const amenities=(unit.am||'').split(/[,;|]/).map(item=>item.trim()).filter(Boolean).slice(0,4);
  return <article className="apartment-card">
    <div className="apartment-card-image"><Photo unit={unit}/><span className="availability-pill">Available</span><button type="button" className={`favorite-button${favorite?' saved':''}`} onClick={()=>onFavorite(unit.id)} aria-label={favorite?'Remove from saved apartments':'Save apartment'} aria-pressed={favorite}>{favorite?'♥':'♡'}</button></div>
    <div className="apartment-card-body">
      <div className="apartment-title-row"><h3>{unit.b} <span>· Unit {unit.u}</span></h3></div>
      <p className="apartment-location"><Icon type="pin"/><PhilippineAddressDisplay address={unit.address||[unit.city,unit.province].filter(Boolean).join(', ')}/></p>
      <div className="apartment-facts"><span><Icon type="bed"/>{unit.bed===0?'Studio':`${unit.bed} BR`}</span><span><Icon type="bath"/>{unit.bath} Bath</span>{unit.sqm&&<span><Icon type="area"/>{Number(unit.sqm)} sqm</span>}</div>
      <p className="apartment-description">{unit.description||unit.building_description||'A comfortable home in a convenient location. Contact the landlord for more details.'}</p>
      {amenities.length>0?<div className="apartment-amenities">{amenities.map(amenity=><span key={amenity}>{amenity}</span>)}</div>:<div className="apartment-amenities muted-amenity">Amenities not listed</div>}
      <div className="apartment-landlord"><span className="landlord-avatar">{(unit.ll||'L').trim().charAt(0).toUpperCase()}</span><span><small>Listed by</small><b>{unit.ll||'Landlord'}</b></span></div>
      <div className="apartment-card-bottom"><div className="apartment-price"><b>{php(unit.rent)}</b><span>/ month</span></div><div className="apartment-card-actions"><button type="button" className="btn out sm" onClick={()=>onDetails(unit)}>View Details</button><button type="button" className="btn sm" disabled={bookingPending} onClick={()=>onBook(unit)}>{bookingPending?'Request pending':'Book Now'}</button></div></div>
    </div>
  </article>;
}
