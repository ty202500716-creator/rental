import {useRef,useState} from 'react';
import {List,FormModal,ModalBtn,Do,Modal,KV,Tag,money} from '../../components';
import {api} from '../../services/api.js';

const agreementFields=[
 {k:'booking_id',l:'Approved Booking',type:'select',from:'bookings/approved',map:x=>({...x,label:`${x.label} · Move-in ${x.move_in}${x.move_out?` · Preferred lease end ${x.move_out}`:' · No preferred lease end'}`}),onChange:(value,form,options)=>{const booking=options.find(option=>String(option.value)===String(value));return booking?{start_date:booking.move_in||form.start_date,end_date:booking.move_out||''}:{}},full:true},
 {k:'start_date',l:'Move-in Date',type:'date'},
 {k:'end_date',l:'Lease End Date',type:'date'},
 {k:'monthly_rent',l:'Monthly Rent (₱)',type:'number',min:0.01},
 {k:'security_deposit',l:'Security Deposit (₱)',type:'number',min:0,opt:true},
 {k:'due_day',l:'Rent Due Day (1–31)',type:'number',min:1,max:31,opt:true},
 {k:'terms',l:'Terms and Conditions',type:'textarea',opt:true}
];
const editFields=agreementFields.slice(1);

export default function Rentals({role}){
 const L=role==='Landlord';
 const[history,setHistory]=useState(null);
 const[editing,setEditing]=useState(null);
 const reload=useRef(null);
 const st=(row,status)=>api('rentals/status',{rental_id:row.rental_id,status});
 return <>
  <List route="rentals" empty="No rental records yet." mobileCards cols={[
   ['Tenant','tenant'],['Apartment Building','building_name'],['Unit Number','unit_number'],['Rental Periods','rental_count'],
   ['Latest Rental Date','rental_date'],['Monthly Rent','monthly_rent',money],['Move-in Date','start_date'],['Lease End Date','end_date'],
   ['Rental Status','status']
  ]}
  bar={load=>L&&<ModalBtn label="+ Create Rental Agreement">{close=><FormModal wide title="Create Rental Agreement" sub="For an approved booking" route="rentals/create" onDone={load} onClose={close} submit="Save Agreement (Draft)" fields={agreementFields}/>}</ModalBtn>}
  actions={(row,load)=><>
   {reload.current=load}
   <button className="btn sm out" onClick={()=>setHistory(row)}>View History</button>
   {L&&row.status==='Draft'&&<>
    <button className="btn sm out" onClick={()=>setEditing(row)}>Edit Details</button>
    <Do label="Finalize Rental" cls="ok" confirm="Finalize this agreement? The unit becomes Occupied." run={()=>st(row,'Active')} done={load}/>
   </>}
   {L&&row.status==='Active'&&<Do label="Complete Rental" cls="out" confirm="Complete this rental? The unit will remain unavailable until marked ready." run={()=>st(row,'Expired')} done={load}/>}
   {L&&row.status==='Active'&&<Do label="Terminate" cls="bad" confirm="Terminate this rental? The unit will remain unavailable until marked ready." run={()=>st(row,'Terminated')} done={load}/>}
  </>}/>
  {history&&<Modal title="Rental History" sub={`${history.tenant} · ${history.building_name} · Unit ${history.unit_number}`} onClose={()=>setHistory(null)}>
   <p>{history.rental_count} {history.rental_count===1?'rental period':'rental periods'} · Latest status: <Tag s={history.status}/></p>
   <div className="booking-history-list">{history.history.map(item=><article className="tenant-booking-card" key={item.rental_id}>
    <div className="tenant-booking-main"><div><p className="listing-eyebrow">RENTAL #{item.rental_id}{item.booking_id?` · BOOKING #${item.booking_id}`:''}</p><p>{item.rental_date}</p></div><Tag s={item.status}/></div>
    <KV rows={[
     ['Monthly Rent',money(item.monthly_rent)],['Security Deposit',money(item.security_deposit)],
     ['Move-in Date',item.start_date],['Lease End Date',item.end_date],['Rent Due Day',item.due_day],['Terms',item.terms]
    ]}/>{L&&item.status==='Draft'&&<div className="tenant-booking-actions">
     <button className="btn sm out" onClick={()=>{setHistory(null);setEditing(item)}}>Edit Details</button>
     <Do label="Finalize Rental" cls="ok sm" confirm="Finalize this agreement? The unit becomes Occupied." run={()=>st(item,'Active')} done={()=>{setHistory(null);load()}}/>
    </div>}{L&&item.status==='Active'&&<div className="tenant-booking-actions">
     <Do label="Complete Rental" cls="out sm" confirm="Complete this rental? The unit will remain unavailable until marked ready." run={()=>st(item,'Expired')} done={()=>{setHistory(null);load()}}/>
     <Do label="Terminate" cls="bad sm" confirm="Terminate this rental? The unit will remain unavailable until marked ready." run={()=>st(item,'Terminated')} done={()=>{setHistory(null);load()}}/>
    </div>}
   </article>)}</div>
  </Modal>}
  {editing&&<FormModal wide title="Edit Draft Rental Agreement" sub={editing.tenant} route="rentals/update" extra={{rental_id:editing.rental_id}} init={editing} fields={editFields} onDone={()=>{setEditing(null);reload.current?.()}} onClose={()=>setEditing(null)}/>}
 </>;
}
