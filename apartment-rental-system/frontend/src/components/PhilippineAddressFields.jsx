import {useEffect,useMemo,useRef,useState} from 'react';
import {api} from '../services/api.js';

function useLocationOptions(level,parent){
  const [result,setResult]=useState({parent:null,rows:[],loading:false,error:''});
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    if(level!=='regions'&&!parent){setResult({parent,rows:[],loading:false,error:''});return undefined}
    let active=true;
    setResult({parent,rows:[],loading:true,error:''});
    const query=`locations&level=${level}${parent?`&parent_code=${encodeURIComponent(parent)}`:''}`;
    api(query).then(data=>{if(active)setResult({parent,rows:data.rows,loading:false,error:''})}).catch(failure=>{if(active)setResult({parent,rows:[],loading:false,error:failure.message})});
    return ()=>{active=false};
  },[level,parent,attempt]);
  const current=result.parent===parent;
  return {
    rows:current?result.rows:[],
    loading:current?result.loading:level==='regions'||!!parent,
    error:current?result.error:'',
    retry:()=>setAttempt(value=>value+1)
  };
}

function LocationCombobox({id,label,placeholder,options,selectedCode,disabled,required,onSelect}){
  const [open,setOpen]=useState(false);
  const [search,setSearch]=useState('');
  const [active,setActive]=useState(0);
  const inputRef=useRef(null);
  const selected=options.rows.find(row=>row.code===selectedCode);
  const filtered=useMemo(()=>{
    const term=search.trim().toLocaleLowerCase();
    return term?options.rows.filter(row=>row.name.toLocaleLowerCase().includes(term)):options.rows;
  },[options.rows,search]);
  const selectedIndex=filtered.findIndex(row=>row.code===selectedCode);
  const activeIndex=filtered.length?Math.min(active,filtered.length-1):-1;
  const choose=row=>{onSelect(row.code);setOpen(false);setSearch('')};
  const openMenu=()=>{
    if(disabled)return;
    setSearch('');
    setActive(Math.max(0,options.rows.findIndex(row=>row.code===selectedCode)));
    setOpen(true);
  };
  useEffect(()=>{if(open)inputRef.current?.focus()},[open]);
  const keyDown=event=>{
    if(event.key==='ArrowDown'){
      event.preventDefault();
      if(!open){openMenu();return}
      setActive(index=>Math.min(index+1,filtered.length-1));
    }else if(event.key==='ArrowUp'){
      event.preventDefault();
      if(!open){openMenu();return}
      setActive(index=>Math.max(index-1,0));
    }else if((event.key==='Enter'||event.key===' ')&&!open){
      event.preventDefault();
      openMenu();
    }else if(event.key==='Enter'&&open&&activeIndex>=0){
      event.preventDefault();
      choose(filtered[activeIndex]);
    }else if(event.key==='Escape'&&open){
      event.preventDefault();
      setOpen(false);
      setSearch('');
    }else if(event.key==='Home'&&open&&filtered.length){
      event.preventDefault();
      setActive(0);
    }else if(event.key==='End'&&open&&filtered.length){
      event.preventDefault();
      setActive(filtered.length-1);
    }
  };
  return <div className={`ph-address-control${disabled?' is-disabled':''}`} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false)}}>
    <label htmlFor={id}>{label}{required&&<span aria-hidden="true">*</span>}</label>
    <div className={`ph-address-combobox${open?' is-open':''}${options.error?' has-error':''}`}>
      <button
        id={id}
        type="button"
        className="ph-address-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-required={required}
        disabled={disabled}
        onClick={()=>open?setOpen(false):openMenu()}
        onKeyDown={keyDown}
      ><span className={selected?'':'is-placeholder'}>{selected?.name||placeholder}</span>{options.loading?<span className="ph-address-spinner" role="status" aria-label={`Loading ${label.toLocaleLowerCase()}`}/>:<span className="ph-address-chevron" aria-hidden="true"/>}</button>
      {open&&!disabled&&<div className="ph-address-dropdown">
        <div className="ph-address-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg><input ref={inputRef} type="search" role="searchbox" aria-label={`Search ${label.toLocaleLowerCase()}`} placeholder={placeholder} autoComplete="off" value={search} onChange={event=>{setSearch(event.target.value);setActive(0)}} onKeyDown={keyDown}/></div>
        {options.loading?<div className="ph-address-option-message" role="status">Loading {label.toLocaleLowerCase()}…</div>:
          options.error?<div className="ph-address-option-message" role="alert">{options.error}</div>:
          filtered.length?<div id={`${id}-listbox`} className="ph-address-options" role="listbox" aria-label={`${label} options`}>
            {filtered.map((row,index)=><button
              type="button"
              id={`${id}-option-${row.code}`}
              key={row.code}
              role="option"
              aria-selected={row.code===selectedCode}
              className={`${index===activeIndex?'is-active':''}${row.code===selectedCode?' is-selected':''}`}
              onMouseDown={event=>event.preventDefault()}
              onMouseEnter={()=>setActive(index)}
              onClick={()=>choose(row)}
            ><span>{row.name}</span>{row.code===selectedCode&&<span className="ph-address-check" aria-hidden="true">✓</span>}</button>)}
          </div>:<div className="ph-address-option-message" role="status">No matching {label.toLocaleLowerCase()} found.</div>}
      </div>}
    </div>
    {options.error&&<div className="ph-address-error" role="alert">{options.error}<button type="button" className="btn sm out" onClick={options.retry}>Retry</button></div>}
  </div>;
}

export default function PhilippineAddressFields({value={},onChange,legacyAddress,name='address',required=true,postalCode,onPostalCodeChange}){
  const regions=useLocationOptions('regions','');
  const provinces=useLocationOptions('provinces',value.region_code);
  const noProvinceBranch=provinces.rows.find(row=>row.code.startsWith('no-province:'));
  const specialCities=useLocationOptions('cities-municipalities',noProvinceBranch?.code||'');
  const selectedCityHasNoProvince=!!value.city_municipality_code&&specialCities.rows.some(row=>row.code===value.city_municipality_code);
  const provinceNotApplicable=!!value.region_code&&!provinces.loading&&!provinces.error&&(provinces.rows.length===0||selectedCityHasNoProvince);
  const cityParent=provinces.rows.length===0&&provinceNotApplicable?value.region_code:(selectedCityHasNoProvince?noProvinceBranch?.code:value.province_code);
  const cities=useLocationOptions('cities-municipalities',cityParent);
  const barangays=useLocationOptions('barangays',value.city_municipality_code);
  const select=(key,code)=>{
    const next={...value,[key]:code};
    if(key==='region_code'){next.province_code='';next.city_municipality_code='';next.barangay_code=''}
    if(key==='province_code'){next.city_municipality_code='';next.barangay_code=''}
    if(key==='city_municipality_code')next.barangay_code='';
    onChange(next);
  };
  const unresolved=
    (value.region_code&&!regions.loading&&!regions.rows.some(row=>row.code===value.region_code))||
    (value.province_code&&!provinceNotApplicable&&!provinces.loading&&!provinces.rows.some(row=>row.code===value.province_code))||
    (value.city_municipality_code&&!cities.loading&&!cities.rows.some(row=>row.code===value.city_municipality_code))||
    (value.barangay_code&&!barangays.loading&&!barangays.rows.some(row=>row.code===value.barangay_code));
  const incomplete=!!(value.region_code||value.province_code||value.city_municipality_code||value.barangay_code)&&
    (!value.region_code||(!provinceNotApplicable&&!value.province_code)||!value.city_municipality_code||!value.barangay_code);
  const preserveSavedAddress=!!legacyAddress&&(unresolved||incomplete||(!value.region_code&&!value.city_municipality_code&&!value.barangay_code));
  const fields=[
    {key:'region_code',label:'Region',placeholder:'Search or select a region',options:regions,disabled:false},
    {key:'province_code',label:'Province',placeholder:'Search or select a province',options:provinces,disabled:!value.region_code},
    {key:'city_municipality_code',label:'City/Municipality',placeholder:'Search or select a city or municipality',options:cities,disabled:!cityParent},
    {key:'barangay_code',label:'Barangay',placeholder:'Search or select a barangay',options:barangays,disabled:!value.city_municipality_code}
  ];
  return <div className="ph-address-fields" aria-label="Complete Address">
    {fields.map(field=><div className="ph-address-grid-item" key={field.key}>
      {field.key==='province_code'&&provinceNotApplicable&&!provinces.rows.length?
      <div className="ph-address-control ph-address-not-applicable"><label htmlFor={`${name}-${field.key}-na`}>Province</label><div id={`${name}-${field.key}-na`} aria-label="Province not applicable for this location">Not applicable for this location</div></div>:
        <LocationCombobox
          id={`${name}-${field.key}`}
          label={field.label}
          placeholder={field.placeholder}
          options={field.options}
          selectedCode={field.key==='province_code'&&selectedCityHasNoProvince?noProvinceBranch.code:(value[field.key]||'')}
          disabled={field.disabled||!!field.options.error}
          required={required}
          onSelect={code=>select(field.key,code)}
        />}
    </div>)}
    <div className={`ph-address-control ph-address-street${onPostalCodeChange?'':' ph-address-street-wide'}`}>
      <label htmlFor={`${name}-street`}>Street / House Number / Building Name <span className="mut">(optional)</span></label>
      <input id={`${name}-street`} maxLength={180} value={value.street_address||''} placeholder="e.g. 12 Mabini Street, Unit 4" onChange={event=>onChange({...value,street_address:event.target.value})}/>
    </div>
    {onPostalCodeChange&&<div className="ph-address-control ph-address-postal"><label htmlFor={`${name}-postal`}>Postal Code <span className="mut">(optional)</span></label><input id={`${name}-postal`} maxLength={10} value={postalCode||''} onChange={event=>onPostalCodeChange(event.target.value)}/></div>}
    {preserveSavedAddress&&<div className="ph-address-legacy" role="note">Saved address: {legacyAddress}. It will be kept as-is unless you select a new location.</div>}
  </div>;
}

export function PhilippineAddressDisplay({address,className=''}){
  const text=typeof address==='string'?address.trim():'';
  return <span className={`ph-address-display${className?` ${className}`:''}`}>{text||'—'}</span>;
}
