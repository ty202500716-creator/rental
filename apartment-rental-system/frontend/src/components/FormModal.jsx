import {useState,useEffect} from 'react';
import {api,fileUrl} from '../services/api.js';
import {gmail,isSupportedImage,phoneOk} from '../utils/format.js';
import {Modal} from './Modal.jsx';
import PhilippineAddressFields from './PhilippineAddressFields.jsx';
export function FormModal({title,sub,fields,init={},route,extra={},submit='Submit',danger,head,note,onDone,onClose,keepOpen,wide}){
  const hasUploadField=fields.some(x=>x.type==='images'||x.type==='file');
  const[f,setF]=useState(()=>{const o={};fields.forEach(x=>o[x.k]=x.type==='images'?{existing:Array.isArray(init[x.k])?init[x.k]:[],files:[]}:(init[x.k]??(x.type==='select'&&!x.from&&!x.ph&&x.opts?.length?(x.opts[0].value??x.opts[0]):'')));return o});
  const[dyn,setDyn]=useState({});const[dynState,setDynState]=useState({});const[dynError,setDynError]=useState({});const[er,setEr]=useState({});const[msg,setMsg]=useState('');const[busy,setBusy]=useState(false);const[visiblePasswords,setVisiblePasswords]=useState({});
  const[imagePreviews,setImagePreviews]=useState({});
  const addressUnchanged=field=>!!field.legacyAddress&&JSON.stringify(f[field.k]||{})===JSON.stringify(init[field.k]||{});
  const optionalAddressEmpty=field=>field.type==='philippine-address'&&(field.opt||field.required===false)&&!Object.values(f[field.k]||{}).some(Boolean);
  const hasUnsavedFiles=()=>fields.some(x=>{if(x.type==='images'){const value=f[x.k]||{existing:[],files:[]};return value.files.length>0||JSON.stringify(value.existing)!==JSON.stringify(Array.isArray(init[x.k])?init[x.k]:[])}return x.type==='file'&&!!f[x.k]});
  const close=()=>{if(hasUnsavedFiles()&&!window.confirm('Discard your selected files?'))return;onClose()};
  useEffect(()=>{
    if(!hasUnsavedFiles())return undefined;
    const beforeUnload=event=>{event.preventDefault();event.returnValue=''};
    const beforeModuleChange=event=>{if(!window.confirm('You have unsaved form changes or selected photos. Leave this page and discard them?'))event.preventDefault()};
    window.addEventListener('beforeunload',beforeUnload);
    window.addEventListener('ars:before-module-change',beforeModuleChange);
    return()=>{window.removeEventListener('beforeunload',beforeUnload);window.removeEventListener('ars:before-module-change',beforeModuleChange)};
  },[f,fields]);
  useEffect(()=>{const next={};const created=[];fields.filter(x=>x.type==='images').forEach(x=>{const value=f[x.k]||{existing:[],files:[]};next[x.k]=[...(value.existing||[]).map(path=>({src:/^https?:\/\//i.test(path)?path:fileUrl(path),existing:path})),...(value.files||[]).map((file,index)=>{const src=URL.createObjectURL(file);created.push(src);return{src,fileIndex:index}})]});setImagePreviews(next);return()=>created.forEach(URL.revokeObjectURL)},[f]);
  const loadOptions=async field=>{
    setDynState(s=>({...s,[field.k]:'loading'}));setDynError(s=>({...s,[field.k]:''}));
    try{const data=await api(field.from);setDyn(s=>({...s,[field.k]:data.rows.map(field.map)}));setDynState(s=>({...s,[field.k]:'ready'}))}
    catch(error){setDynState(s=>({...s,[field.k]:'error'}));setDynError(s=>({...s,[field.k]:error.message}))}
  };
  useEffect(()=>{fields.filter(x=>x.from).forEach(loadOptions)},[]);
  const set=(k,v)=>setF(s=>{
    const next={...s,[k]:v};
    const changes=fields.find(field=>field.k===k)?.onChange?.(v,next,dyn[k]||[]);
    return changes?{...next,...changes}:next;
  });
  const go=async()=>{const e={};
    fields.forEach(x=>{const v=f[x.k];const conditionalRequired=x.requiredIf&&x.requiredIf.values.includes(f[x.requiredIf.field]);if(x.type==='philippine-address'){if(addressUnchanged(x)||optionalAddressEmpty(x))return;if(!v?.region_code||!v?.city_municipality_code||!v?.barangay_code)e[x.k]='Select a region, city or municipality, and barangay.';return}if(v===''||v==null){if(conditionalRequired||!x.opt)e[x.k]='Required';return}
      if(x.type==='email'&&!gmail(v))e[x.k]='Only @gmail.com addresses are allowed.';
      if(x.type==='phone'&&!phoneOk(v))e[x.k]='10 digits starting with 9 (e.g. 9171234567).';
      if(x.type==='number'&&v!==''&&(!Number.isFinite(Number(v))||(x.min!=null&&Number(v)<x.min)||(x.max!=null&&Number(v)>x.max)))e[x.k]=x.min!=null&&Number(v)<x.min?`Must be at least ${x.min}.`:`Enter a valid value${x.max!=null?` no greater than ${x.max}`:''}.`;
      if(x.type!=='number'&&x.min&&String(v).length<x.min)e[x.k]=`At least ${x.min} characters.`;
      if(x.same&&v!==f[x.same])e[x.k]='Does not match.'});
    setEr(e);if(Object.keys(e).length)return;setBusy(true);setMsg('');
    try{const data={...f,...extra};fields.filter(x=>x.skip||addressUnchanged(x)||optionalAddressEmpty(x)).forEach(x=>delete data[x.k]);
      const hasFile=fields.some(x=>x.type==='images'||(x.type==='file'&&f[x.k]));let payload=data;
      if(hasFile){payload=new FormData();Object.entries(data).forEach(([k,v])=>{if(v===''||v==null)return;const field=fields.find(x=>x.k===k);if(field?.type==='images'){payload.append(field.existingKey||'existing_photos',JSON.stringify(v.existing||[]));payload.append(field.countKey||'unit_photo_count',String((v.files||[]).length));(v.files||[]).forEach(file=>payload.append(field.uploadKey||'unit_photos[]',file));}else if(k==='address'&&typeof v==='object'&&!(v instanceof File)){['region_code','province_code','city_municipality_code','barangay_code','street_address'].forEach(part=>payload.append(`address[${part}]`,v[part]||''))}else payload.append(k,v)})}else fields.filter(x=>x.type==='file'||x.type==='images').forEach(x=>delete data[x.k]);
      const res=await api(route,payload);onDone&&onDone(res);if(!keepOpen)onClose()}catch(x){setMsg(x.message)}setBusy(false)};
  const inp=x=>{const v=f[x.k];
    if(x.type==='philippine-address')return <PhilippineAddressFields value={v||{}} legacyAddress={x.legacyAddress} required={x.required??!x.opt} onChange={value=>set(x.k,value)}/>;
    if(x.type==='select'){const o=x.from?(dyn[x.k]||[]):x.opts;return <>{<select value={v} disabled={x.from&&dynState[x.k]!=='ready'} onChange={e=>set(x.k,e.target.value)}>{(x.from||x.ph)&&<option value="">{dynState[x.k]==='loading'?'Loading options…':x.from&&dynState[x.k]==='ready'&&!o.length?'No options available':x.ph||'Select…'}</option>}{o.map(a=>{const val=a.value??a,lab=a.label??a;return <option key={val} value={val}>{lab}</option>})}</select>}{x.from&&dynState[x.k]==='error'&&<div className="err" role="alert">{dynError[x.k]} <button type="button" className="btn sm out" onClick={()=>loadOptions(x)}>Retry</button></div>}</>}
    if(x.type==='textarea')return <textarea rows={3} maxLength={x.maxLength} value={v} onChange={e=>set(x.k,e.target.value)}/>;
    if(x.type==='file')return <input type="file" accept="image/*,.pdf" onChange={e=>set(x.k,e.target.files[0]||'')}/>;
    if(x.type==='images'){const value=v||{existing:[],files:[]};return <><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>{const input=e.currentTarget;const files=Array.from(input.files||[]);input.value='';const selected=value.files||[];const remaining=Math.max(0,(x.maxFiles||8)-value.existing.length-selected.length);const invalid=files.filter(file=>!isSupportedImage(file));if(invalid.length){setEr(s=>({...s,[x.k]:`Photos must be JPG, PNG or WEBP: ${invalid.map(file=>file.name).join(', ')}`}));return}const oversized=files.filter(file=>file.size>5*1024*1024);if(oversized.length){setEr(s=>({...s,[x.k]:`Each photo must be 5 MB or smaller: ${oversized.map(file=>file.name).join(', ')}`}));return}if(files.length>remaining){setEr(s=>({...s,[x.k]:`You can upload up to ${remaining} more photo${remaining===1?'':'s'}.`}));return}setEr(s=>({...s,[x.k]:''}));if(files.length)set(x.k,{...value,files:[...selected,...files]})}}/><div className="form-image-previews">{(imagePreviews[x.k]||[]).map((image,index)=><div key={`${image.src}-${index}`}><img src={image.src} crossOrigin={image.existing!==undefined&&!/^https?:\/\//i.test(image.existing)?'use-credentials':undefined} alt={`${x.l} ${index+1}`}/><button type="button" aria-label={`Remove ${x.l} ${index+1}`} onClick={()=>{if(!window.confirm('Remove this photo from the form?'))return;image.existing!==undefined?set(x.k,{...value,existing:value.existing.filter(path=>path!==image.existing)}):set(x.k,{...value,files:value.files.filter((_,fileIndex)=>fileIndex!==image.fileIndex)})}}>×</button></div>)}</div>{value.files?.length>0&&<p role="status">{value.files.length} new photo{value.files.length===1?'':'s'} selected and previewed. Save the form to upload.</p>}</>}
    if(x.type==='phone')return <div className="phone"><span>+63</span><input value={v} maxLength={10} inputMode="numeric" placeholder="9XX XXX XXXX" onChange={e=>set(x.k,e.target.value.replace(/\D/g,''))}/></div>;
    if(x.type==='password')return <div className="password-input"><input id={`field-${x.k}`} type={visiblePasswords[x.k]?'text':'password'} autoComplete={x.autoComplete||(x.k==='current'||x.k==='password'?'current-password':'new-password')} value={v} onChange={e=>set(x.k,e.target.value)}/><button type="button" className="password-toggle" aria-label={`${visiblePasswords[x.k]?'Hide':'Show'} ${x.l}`} aria-pressed={!!visiblePasswords[x.k]} onClick={()=>setVisiblePasswords(s=>({...s,[x.k]:!s[x.k]}))}>{visiblePasswords[x.k]?'Hide':'Show'}</button></div>;
    return <input type={x.type||'text'} step={x.type==='number'?'any':undefined} min={x.type==='number'?x.min:undefined} max={x.type==='number'?x.max:undefined} value={v} placeholder={x.type==='email'?'name@gmail.com':''} onChange={e=>set(x.k,e.target.value)}/>};
  const optionsUnavailable=fields.some(x=>x.from&&dynState[x.k]!=='ready');
  return <Modal title={title} sub={sub} onClose={close} wide={wide} closeOnBackdrop={!hasUploadField} closeOnEscape={!hasUploadField}>{head}<div className="fg">{fields.map(x=><div key={x.k} className={x.full||x.type==='textarea'||x.type==='file'||x.type==='images'?'full':''}><label htmlFor={x.type==='password'?`field-${x.k}`:undefined}>{x.l}{x.requiredIf?(x.requiredIf.values.includes(f[x.requiredIf.field])?' (required)':' (optional)'):x.opt?' (optional)':''}</label>{inp(x)}{er[x.k]&&<div className="err">{er[x.k]}</div>}</div>)}</div>
    {note&&<div className="note">{note}</div>}{msg&&<div className="err" role="alert" style={{marginTop:10,fontSize:14}}>{msg}</div>}
    <button className={'btn'+(danger?' bad':'')} style={{width:'100%',marginTop:16}} disabled={busy||optionsUnavailable} onClick={go}>{busy?'Please wait…':optionsUnavailable?'Loading options…':submit}</button></Modal>}
// Searchable table. cols: [header,key,render?(value,row)]
