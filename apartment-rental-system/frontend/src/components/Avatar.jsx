import {useEffect,useState} from 'react';

export default function Avatar({src,name,className=''}){
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[src]);
  if(src&&!failed)return <img className={`avatar ${className}`} src={src} crossOrigin="use-credentials" alt={`${name||'User'} profile`} onError={()=>setFailed(true)}/>;
  return <span className={`avatar avatar-default ${className}`} aria-label={`${name||'User'} default avatar`}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2c-4.42 0-8 2.24-8 5v1.5h16V19c0-2.76-3.58-5-8-5Z"/></svg>
  </span>;
}
