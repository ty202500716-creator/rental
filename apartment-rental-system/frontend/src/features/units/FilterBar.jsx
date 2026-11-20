function SearchIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>}
export default function FilterBar({filters,setFilter,cities,onReset,activeFilters,resultCount}){
  return <section className="listing-filter-card" aria-label="Apartment filters">
    <div className="listing-filter-grid">
      <label className="listing-search"><span className="sr-only">Search apartments</span><SearchIcon/><input value={filters.q} onChange={event=>setFilter('q',event.target.value)} placeholder="Search by building or location" aria-label="Search by building or location"/>{filters.q&&<button type="button" aria-label="Clear search" onClick={()=>setFilter('q','')}>×</button>}</label>
      <label><span>Min rent (₱)</span><input type="number" min="0" value={filters.min} onChange={event=>setFilter('min',event.target.value)} placeholder="Any"/></label>
      <label><span>Max rent (₱)</span><input type="number" min="0" value={filters.max} onChange={event=>setFilter('max',event.target.value)} placeholder="Any"/></label>
      <label><span>Unit type</span><select value={filters.bedrooms} onChange={event=>setFilter('bedrooms',event.target.value)}><option value="">Any type</option><option value="0">Studio</option><option value="1">1 bedroom</option><option value="2">2 bedrooms</option><option value="3">3+ bedrooms</option></select></label>
      <label><span>Bathrooms</span><select value={filters.bathrooms} onChange={event=>setFilter('bathrooms',event.target.value)}><option value="">Any</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option></select></label>
      <label><span>Min area (sqm)</span><input type="number" min="0" value={filters.min_sqm} onChange={event=>setFilter('min_sqm',event.target.value)} placeholder="Any"/></label>
      <label><span>Max area (sqm)</span><input type="number" min="0" value={filters.max_sqm} onChange={event=>setFilter('max_sqm',event.target.value)} placeholder="Any"/></label>
      <label><span>City</span><select value={filters.city} onChange={event=>setFilter('city',event.target.value)}><option value="">All cities</option>{cities.map(city=><option key={city}>{city}</option>)}</select></label>
      <label><span>Sort by</span><select value={filters.sort} onChange={event=>setFilter('sort',event.target.value)}><option value="price_low">Lowest monthly rent</option><option value="price_high">Highest monthly rent</option><option value="newest">Newest listings</option></select></label>
      <label className="listing-availability-filter"><input type="checkbox" checked={filters.available_only==='1'} onChange={event=>setFilter('available_only',event.target.checked?'1':'0')}/><span>Available units only</span></label>
      <button type="button" className="btn out sm listing-reset" onClick={onReset}>Reset filters</button>
    </div>
    <div className="listing-filter-footer"><div className="filter-chips">{activeFilters.map(([key,label])=><button type="button" key={key} className="filter-chip" onClick={()=>setFilter(key,'')} aria-label={`Remove filter ${label}`}>{label}<span aria-hidden="true"> ×</span></button>)}</div><b>{resultCount} {resultCount===1?'building':'buildings'} found</b></div>
  </section>;
}
