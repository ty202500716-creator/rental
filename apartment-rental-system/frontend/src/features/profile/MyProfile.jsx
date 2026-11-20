import {useEffect,useState} from 'react';
import {Avatar,FormModal,KV,ModalBtn,Tag} from '../../components';
import {PhilippineAddressDisplay} from '../../components/PhilippineAddressFields.jsx';
import {useApi} from '../../hooks/useApi.js';
import {api,fileUrl} from '../../services/api.js';

const strip = value => (value || '').replace('+63','');
const date = value => value ? new Date(value.replace(' ','T')).toLocaleString() : '—';

export default function MyProfile({onProfileChange}){
  const {d,e,load}=useApi('profile');
  const [tab,setTab]=useState('Personal Information');
  const [photo,setPhoto]=useState(null);
  const [preview,setPreview]=useState('');
  const [photoBusy,setPhotoBusy]=useState(false);
  const [photoMessage,setPhotoMessage]=useState('');
  const [photoError,setPhotoError]=useState('');
  useEffect(()=>{
    if(!photo){setPreview('');return undefined}
    const url=URL.createObjectURL(photo);
    setPreview(url);
    return ()=>URL.revokeObjectURL(url);
  },[photo]);
  if(e)return <div className="err">{e}</div>;
  if(!d)return <div className="mut">Loading…</div>;
  const p=d.profile;
  const isTenant=p.role==='Tenant';
  const documents=p.identity_documents||[];
  const infoFields=[
    {k:'first_name',l:'First Name'},
    {k:'middle_name',l:'Middle Name',opt:true},
    {k:'last_name',l:'Last Name'},
    {k:'phone',l:'Phone Number',type:'phone'},
    ...(isTenant||p.role==='Landlord'?[{k:'address',l:'Home Address',type:'philippine-address',full:true,legacyAddress:p.complete_address},{k:'occupation',l:'Occupation'}]:[]),
    ...(isTenant?[{k:'ec_name',l:'Emergency Contact Name'},{k:'ec_phone',l:'Emergency Contact Number',type:'phone'}]:[]),
  ];
  const infoInit={
    ...p,
    phone:strip(p.contact_number),
    address:isTenant||p.role==='Landlord'?{
      region_code:p.region_code||'',
      province_code:p.province_code||'',
      city_municipality_code:p.city_municipality_code||'',
      barangay_code:p.barangay_code||'',
      street_address:p.street_address||''
    }:p.complete_address,
    ec_name:p.emergency_contact_name,
    ec_phone:strip(p.emergency_contact_number)
  };
  const status=p.verification_status||'Unverified';
  const savePhoto=async()=>{
    if(!photo)return;
    setPhotoBusy(true);setPhotoMessage('');setPhotoError('');
    try{
      const payload=new FormData();
      payload.append('profile_photo',photo);
      await api('profile/photo',payload);
      await load();
      onProfileChange?.();
      setPhoto(null);
      setPhotoMessage('Profile photo saved.');
    }catch(error){setPhotoError(error.message)}
    finally{setPhotoBusy(false)}
  };
  const removePhoto=async()=>{
    setPhotoBusy(true);setPhotoMessage('');setPhotoError('');
    try{
      await api('profile/photo/remove',{});
      await load();
      onProfileChange?.();
      setPhoto(null);
      setPhotoMessage('Profile photo removed.');
    }catch(error){setPhotoError(error.message)}
    finally{setPhotoBusy(false)}
  };

  return <section className="my-profile">
    <div className="tabs" role="tablist" aria-label="Profile sections">
      {['Personal Information',...(isTenant?['Identity Verification']:[]),'Account Security'].map(label=>
        <button key={label} type="button" className={tab===label?'on':''} role="tab" aria-selected={tab===label} onClick={()=>setTab(label)}>{label}</button>
      )}
    </div>
    {tab==='Personal Information'&&<>
      <div className="profile-photo-wrap">
        <Avatar className="profile-photo" src={preview|| (p.profile_photo?fileUrl(p.profile_photo):'')} name={p.first_name}/>
        <div className="photo-controls">
          <label htmlFor="tenant-profile-photo">Profile Photo</label>
          <input id="tenant-profile-photo" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" disabled={photoBusy} onChange={event=>{
            const file=event.target.files?.[0]||null;
            event.target.value='';
            setPhotoMessage('');setPhotoError('');
            if(file&&(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)){
              setPhotoError(file.size>5*1024*1024?'Photo must be 5MB or smaller.':'Choose a JPG, PNG or WEBP image.');
              return;
            }
            setPhoto(file);
          }}/>
          <div className="mut">JPG, PNG or WEBP, up to 5MB. The selected image previews before saving.</div>
          <div className="bar">
            <button type="button" className="btn sm" disabled={!photo||photoBusy} onClick={savePhoto}>{photoBusy?'Saving…':'Save Photo'}</button>
            {photo&&<button type="button" className="btn sm out" disabled={photoBusy} onClick={()=>setPhoto(null)}>Cancel</button>}
            {p.profile_photo&&!photo&&<button type="button" className="btn sm out" disabled={photoBusy} onClick={removePhoto}>{photoBusy?'Please wait…':'Remove Photo'}</button>}
          </div>
          {photoMessage&&<div className="photo-success" role="status">{photoMessage}</div>}
          {photoError&&<div className="err" role="alert">{photoError}</div>}
        </div>
      </div>
      <KV rows={[
        ['Full Name',[p.first_name,p.middle_name,p.last_name].filter(Boolean).join(' ')],
        ['Email Address',p.email],
        ['Phone Number',p.contact_number],
        ['Home Address',<PhilippineAddressDisplay address={p.complete_address}/>],
        ['Profile Photo',p.profile_photo?'Uploaded':'Not set'],
        ['Occupation',p.occupation],
        ['Emergency Contact',p.emergency_contact_name?`${p.emergency_contact_name} (${p.emergency_contact_number})`:null]
      ]}/>
      <div className="bar" style={{marginTop:14}}>
        <ModalBtn label="Edit Personal Information">{close=><FormModal title="Edit Personal Information" fields={infoFields} init={infoInit} route="profile" onDone={load} onClose={close} submit="Save Changes" note="Profile photos must be JPG or PNG and within the upload size limit."/>}</ModalBtn>
      </div>
    </>}
    {isTenant&&tab==='Identity Verification'&&<>
      <KV rows={[
        ['ID Type',p.id_type],
        ['ID Number',p.id_number],
        ['Verification Status',<Tag s={status}/>],
        ['Rejection Reason',status==='Rejected'?p.rejection_reason:null],
        ['Verification Date',date(p.verified_at)]
      ]}/>
      <div className="note">Identity verification is separate from booking approval. Only authorized Admins or Landlords can review your submitted documents. Use only a fictional ID marked “SAMPLE – NOT A VALID ID”.</div>
      <div className="bar" style={{marginTop:14}}>
        <ModalBtn label={status==='Rejected'?'Resubmit Identity Document':'Submit / Update ID'}>{close=><FormModal title="Submit Identification" route="tenants/identity" onDone={load} onClose={close} fields={[{k:'id_type',l:'ID Type',type:'select',opts:['National ID','Driver’s License','Passport','UMID','Postal ID']},{k:'id_number',l:'ID Number'},{k:'id_file',l:'Sample ID Document',type:'file'}]} note="Uploads are preserved as part of your identity verification history."/>}</ModalBtn>
      </div>
      <h3 className="sec2">Submitted Documents</h3>
      {documents.length?<div className="tw"><table><thead><tr><th>Document</th><th>Status</th><th>Rejection Reason</th><th>Submitted</th><th>Reviewed</th><th>Action</th></tr></thead><tbody>
        {documents.map(doc=><tr key={doc.document_id}><td>{doc.original_filename||doc.document_type||'Identity document'}</td><td><Tag s={doc.review_status}/></td><td>{doc.review_remarks||'—'}</td><td>{date(doc.uploaded_at)}</td><td>{date(doc.reviewed_at)}</td><td>{/\.(jpe?g|png|webp)$/i.test(doc.file_path)?<a href={fileUrl(doc.file_path)} target="_blank" rel="noreferrer"><img className="identity-preview" src={fileUrl(doc.file_path)} crossOrigin="use-credentials" alt={`Preview of ${doc.original_filename||'identity document'}`}/><span>Open</span></a>:<a href={fileUrl(doc.file_path)} target="_blank" rel="noreferrer">View document</a>}</td></tr>)}
      </tbody></table></div>:<div className="empty">No identity documents submitted yet.</div>}
    </>}
    {tab==='Account Security'&&<>
      <h3 className="sec2">Account Credentials</h3>
      <KV rows={ [['Username',p.username],['Email Address',p.email]] }/>
      <div className="bar" style={{marginTop:14}}>
        <ModalBtn label="Update Credentials">{close=><FormModal title="Update Account Credentials" route="account/credentials" onClose={close} submit="Save Credentials" fields={[{k:'current_password',l:'Current Password',type:'password',full:true},{k:'email',l:'New Email Address',type:'email',opt:true},{k:'username',l:'New Username',opt:true}]} note="Enter at least one new credential. Your current password is required."/>}</ModalBtn>
        <ModalBtn label="Change Password" cls="out">{close=><FormModal title="Change Password" route="password" onClose={close} submit="Update Password" fields={[{k:'current',l:'Current Password',type:'password',full:true},{k:'new',l:'New Password',type:'password',min:8,full:true},{k:'cp',l:'Confirm New Password',type:'password',same:'new',skip:true,full:true}]}/>}</ModalBtn>
      </div>
    </>}
  </section>;
}
