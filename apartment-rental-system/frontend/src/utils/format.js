export const php = n => '₱' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const money = v => php(v);
export const gmail = e => /^[a-z0-9._%+-]+@gmail\.com$/i.test(e);
export const phoneOk = p => /^9\d{9}$/.test(p);   // stored as +63 + 10 digits
export const isSupportedImage = file => ['image/jpeg','image/png','image/webp'].includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
