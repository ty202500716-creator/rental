import {useApi} from './useApi.js';
export function useBookings(){
  const{d,e,load}=useApi('bookings');
  return{bookings:d?.rows||[],loading:!d&&!e,error:e,retry:load};
}
