import {useState} from 'react';
import {Modal} from '../../components/Modal.jsx';
import {php} from '../../utils/format.js';
import {ApartmentPhoto} from './ApartmentCard.jsx';
import {PhilippineAddressDisplay} from '../../components/PhilippineAddressFields.jsx';

export default function ApartmentDetailsModal({unit,onClose,onBook,bookingPending}){
  const[photo,setPhoto]=useState(0);
  const photos=[...(unit.photos||[]),...(unit.building_photos||[])];
  const amenities=(unit.am||'').split(/[,;|]/).map(item=>item.trim()).filter(Boolean);
  return <Modal title={`${unit.b} · Unit ${unit.u}`} sub={<PhilippineAddressDisplay address={unit.address||[unit.city,unit.province].filter(Boolean).join(', ')}/>} wide onClose={onClose}>
    <div className="apartment-details-gallery"><ApartmentPhoto unit={unit} index={photo}/>{photos.length>1&&<div className="gallery-controls"><button type="button" aria-label="Previous photo" onClick={()=>setPhoto((photo+photos.length-1)%photos.length)}>‹</button><span>{photo+1} / {photos.length}</span><button type="button" aria-label="Next photo" onClick={()=>setPhoto((photo+1)%photos.length)}>›</button></div>}</div>
    <div className="apartment-details-grid"><section><h3>About this home</h3><p>{unit.description||unit.building_description||'The landlord has not added a full description yet. Send a booking request to ask for more details.'}</p><h3>Amenities</h3>{amenities.length?<div className="apartment-amenities">{amenities.map(item=><span key={item}>{item}</span>)}</div>:<p className="mut">No amenities listed yet.</p>}<h3>House rules</h3><p className="mut">House rules and lease conditions will be confirmed in the rental agreement.</p><h3>Location</h3><div className="map-placeholder">⌖ <span><PhilippineAddressDisplay address={unit.address||[unit.city,unit.province].filter(Boolean).join(', ')}/><small>Map preview unavailable</small></span></div><h3>Landlord</h3><p>{unit.ll||'Landlord'}{unit.landlord_contact?` · ${unit.landlord_contact}`:''}</p></section><aside className="booking-summary-card"><span>Monthly rent</span><b>{php(unit.rent)}<small> / month</small></b><span>{unit.bed===0?'Studio':`${unit.bed} bedroom`} · {unit.bath} bathroom · {unit.sqm||'—'} sqm</span><button type="button" className="btn" disabled={bookingPending} onClick={()=>onBook(unit)}>{bookingPending?'Request pending':'Book this apartment'}</button><small>No payment is collected with a booking request.</small></aside></div>
  </Modal>;
}
