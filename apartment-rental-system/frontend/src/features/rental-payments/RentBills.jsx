import {List,FormModal,ModalBtn,money} from '../../components';
import Payments from './Payments.jsx';
import {cashAction,payAction} from './actions.jsx';
export default function RentBills({role}){const L=role==='Landlord';
 return <><List route="rental-bills" cols={[...(L?[['Tenant','tenant'],['Unit','unit']]:[]),['Month','billing_month'],['Due','due_date'],['Amount','amount_due',money],['Paid','amount_paid',money],['Balance','balance',money],['Status','status']]}
 bar={load=>L&&<ModalBtn label="+ Create Rent Bill">{close=><FormModal title="Create Rent Bill" route="rental-bills/create" onDone={load} onClose={close} fields={[{k:'rental_id',l:'Active Rental',type:'select',from:'rentals/active',map:x=>({value:x.value,label:x.label}),full:true},{k:'billing_month',l:'Billing Month',type:'date'},{k:'due_date',l:'Due Date',type:'date'},{k:'amount_due',l:'Amount (₱)',type:'number',min:0.01,full:true}]}/>}</ModalBtn>}
 actions={(r,load)=>L?cashAction('Rental',r,load):payAction('Rental')(r,load)}/>
 {L&&<><h3 className="sec2">Submitted Rental Payments</h3><Payments role={role} cats={['Rental']}/></>}</>}
