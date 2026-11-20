import {useEffect,useId,useRef,useState} from 'react';
export function Modal({title,sub,onClose,children,wide,closeOnBackdrop=true,closeOnEscape=true,stickyLayout=false,className=''}){
  const dialog=useRef(null),closeRef=useRef(onClose),titleId=useId();
  closeRef.current=onClose;
  useEffect(()=>{
    const previous=document.activeElement;
    const panel=dialog.current;
    const focusable=()=>panel?.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')||[];
    focusable()[0]?.focus();
    const keydown=event=>{
      if(event.key==='Escape'&&closeOnEscape){event.stopPropagation();closeRef.current?.();return}
      if(event.key!=='Tab')return;
      const items=focusable();if(!items.length)return;
      const first=items[0],last=items[items.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    };
    window.addEventListener('keydown',keydown);
    return()=>{window.removeEventListener('keydown',keydown);previous?.focus?.()};
  },[]);
  return <div className="ov" onMouseDown={e=>closeOnBackdrop&&e.target===e.currentTarget&&onClose()}><div ref={dialog} className={`modal${wide?' wide':''}${stickyLayout?' modal-sticky-layout':''}${className?` ${className}`:''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>{stickyLayout?<><header className="modal-sticky-header"><div><h2 id={titleId}>{title}</h2>{sub&&<div className="mut">{sub}</div>}</div><button className="x" type="button" aria-label="Close dialog" onClick={onClose}>×</button></header><div className="modal-sticky-content">{children}</div></>:<><button className="x" type="button" aria-label="Close dialog" onClick={onClose}>×</button><h2 id={titleId}>{title}</h2>{sub&&<div className="mut">{sub}</div>}{children}</>}</div></div>
}
// Button that opens a modal: children is (close)=>element
export function ModalBtn({label,cls='',children}){const[o,setO]=useState(false);return <><button className={'btn sm '+cls} onClick={()=>setO(true)}>{label}</button>{o&&children(()=>setO(false))}</>}
// Button that calls the API directly
export function Do({label,cls='',run,done,confirm}){const[b,setB]=useState(false);return <button className={'btn sm '+cls} disabled={b} onClick={async()=>{if(confirm&&!window.confirm(confirm))return;setB(true);try{await run();done&&done()}catch(x){alert(x.message)}setB(false)}}>{label}</button>}
