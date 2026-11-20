import {readFile,rename,writeFile,unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.dirname(fileURLToPath(import.meta.url));
const collections=['regions','provinces','cities-municipalities','barangays'];
const source='https://psgc.gitlab.io/api';
const fail=message=>{throw new Error(message)};
const codePattern=/^\d{9}$/;

function indexRows(rows,name){
  if(!Array.isArray(rows)||!rows.length)fail(`${name} must be a non-empty array.`);
  const index=new Map();
  for(const row of rows){
    if(!row||!codePattern.test(row.code||'')||typeof row.name!=='string'||!row.name.trim())fail(`${name} contains a row with an invalid code or name.`);
    if(index.has(row.code))fail(`${name} contains duplicate code ${row.code}.`);
    index.set(row.code,row);
  }
  return index;
}

function validate(data){
  const regions=indexRows(data.regions,'regions');
  const provinces=indexRows(data.provinces,'provinces');
  const cities=indexRows(data['cities-municipalities'],'cities-municipalities');
  const barangays=indexRows(data.barangays,'barangays');
  for(const province of provinces.values())if(!regions.has(province.regionCode))fail(`Province ${province.code} refers to missing region ${province.regionCode}.`);
  for(const city of cities.values()){
    const region=regions.get(city.regionCode);
    if(!region)fail(`City ${city.code} refers to missing region ${city.regionCode}.`);
    if(city.provinceCode!==null&&city.provinceCode!==undefined){
      const province=provinces.get(city.provinceCode);
      if(!province||province.regionCode!==city.regionCode)fail(`City ${city.code} has an invalid province relationship.`);
    }
  }
  for(const barangay of barangays.values()){
    const city=cities.get(barangay.cityCode);
    if(!city||city.regionCode!==barangay.regionCode||city.provinceCode!==(barangay.provinceCode??null))fail(`Barangay ${barangay.code} has an invalid city, province, or region relationship.`);
  }
  return Object.fromEntries(collections.map(name=>[name,data[name].length]));
}

async function loadLocal(){
  const data={};
  for(const name of collections)data[name]=JSON.parse(await readFile(path.join(root,`${name}.json`),'utf8'));
  return data;
}

async function loadRemote(){
  const entries=await Promise.all(collections.map(async name=>{
    const response=await fetch(`${source}/${name}/`);
    if(!response.ok)fail(`Could not download ${name}: HTTP ${response.status}.`);
    return [name,await response.json()];
  }));
  return Object.fromEntries(entries);
}

async function writeSnapshot(data){
  const staged=[];
  try{
    for(const name of collections){
      const target=path.join(root,`${name}.json`);
      const temporary=`${target}.${process.pid}.tmp`;
      await writeFile(temporary,`${JSON.stringify(data[name],null,2)}\n`,'utf8');
      staged.push({temporary,target});
    }
    for(const file of staged)await rename(file.temporary,file.target);
  }finally{
    await Promise.all(staged.map(file=>unlink(file.temporary).catch(error=>{if(error.code!=='ENOENT')throw error})));
  }
}

try{
  const check=process.argv.includes('--check');
  if(process.argv.slice(2).some(argument=>argument!=='--check'))fail('Usage: node refresh.mjs [--check]');
  const data=check?await loadLocal():await loadRemote();
  const counts=validate(data);
  if(!check)await writeSnapshot(data);
  for(const name of collections)console.log(`${name}: ${counts[name].toLocaleString()} rows`);
  console.log(check?'PSGC snapshot is valid.':'PSGC snapshot refreshed and validated.');
}catch(error){
  console.error(`PSGC update failed: ${error.message}`);
  process.exitCode=1;
}
