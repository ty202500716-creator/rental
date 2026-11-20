import {useApi} from './useApi.js';
export function useApartments(query){
  const{d,e,load}=useApi(`listings&${query}`);
  return{units:d?.units||[],buildings:d?.buildings||[],cities:d?.cities||[],loading:!d&&!e,error:e,retry:load};
}
