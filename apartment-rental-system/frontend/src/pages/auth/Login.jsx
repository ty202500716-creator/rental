import {FormModal} from '../../components';
export default function Login({onClose,onLogin,onReg,message}){return <FormModal title="Welcome back" sub="Log in to your ARS account" route="auth/login" submit="Log In" onClose={onClose} keepOpen head={message&&<div className="err" role="alert">{message}</div>} onDone={r=>onLogin(r.user)}
 fields={[{k:'email',l:'Gmail Address',type:'email',full:true},{k:'password',l:'Password',type:'password',full:true}]}
 note={<>No account? <a href="#" onClick={e=>{e.preventDefault();onReg()}}>Create one</a></>}/>}
