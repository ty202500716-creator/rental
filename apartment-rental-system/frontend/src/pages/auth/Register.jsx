import {useState} from 'react';
import {FormModal,Modal} from '../../components';
const IDS=['National ID','Driver’s License','Passport','UMID','Postal ID'];
export default function Register({onClose,onDone}){const[role,setRole]=useState('Tenant');const[res,setRes]=useState(null);const T=role==='Tenant';
 if(res)return <Modal title="Registration submitted" onClose={onDone}><p>{res.status==='Pending'?'Your landlord account is pending Admin review. You will be able to log in once it is approved.':'Your tenant account is ready. You can now log in and browse apartments.'}</p><button className="btn" onClick={onDone}>Go to Login</button></Modal>;
 return <FormModal key={role} wide title="Create Account" sub="Register as a tenant or landlord" route="auth/register" extra={{role}} submit="Submit Registration" onClose={onClose} keepOpen onDone={setRes}
  head={<div className="tabs">{['Tenant','Landlord'].map(r=><button key={r} className={role===r?'on':''} onClick={()=>setRole(r)}>{r}</button>)}</div>}
  note="Prototype: upload only a fictional ID clearly marked “SAMPLE – NOT A VALID ID”."
  fields={[{k:'first_name',l:'First Name'},{k:'middle_name',l:'Middle Name',opt:true},{k:'last_name',l:'Last Name'},{k:'dob',l:'Date of Birth',type:'date'},{k:'email',l:'Gmail Address',type:'email'},{k:'phone',l:'Mobile Number',type:'phone'},{k:'gender',l:'Gender',type:'select',opts:['Male','Female','Other'],opt:true,ph:'Select…'},{k:'occupation',l:'Occupation',opt:!T},{k:'address',l:'Complete Address',type:'philippine-address',full:true},
   ...(T?[{k:'ec_name',l:'Emergency Contact Name'},{k:'ec_phone',l:'Emergency Contact Number',type:'phone'},{k:'ec_relation',l:'Relationship',opt:true}]:[]),
   {k:'id_type',l:'ID Type',type:'select',opts:IDS},{k:'id_number',l:'ID Number'},{k:'id_file',l:'Upload ID Document (sample only)',type:'file',opt:T},
   {k:'pw',l:'Password',type:'password',min:8},{k:'cp',l:'Confirm Password',type:'password',same:'pw',skip:true}]}/>}
