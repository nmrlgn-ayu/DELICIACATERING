(() => {
"use strict";

/* ====== KONFIGURASI SUPABASE ====== */
const SUPABASE_URL = "https://wzcrhtrvpgczfmpbldvo.supabase.co";
const SUPABASE_KEY = "sb_publishable_OnbnzvMW1a7ONfj0he10GQ_HpC52p6o";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLE = {expense:"deli_expenses", category:"deli_categories", supplier:"deli_suppliers", employee:"deli_employees"};
const DBKEY = {expense:"expenses", category:"categories", supplier:"suppliers", employee:"employees"};
let db = {categories:[], suppliers:[], employees:[], expenses:[]};
let editing = null, activeEntity = null, saving = false;

const $ = id => document.getElementById(id);
const rupiah = n => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
const safe = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateText = d => d ? new Date(d+"T00:00:00").toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}) : "-";
const byId = (arr,id) => arr.find(x=>x.id===id);
const categoryName = id => byId(db.categories,id)?.name || "Kategori dihapus";
const supplierName = id => byId(db.suppliers,id)?.name || "Pemasok dihapus";
const employeeName = id => byId(db.employees,id)?.name || "Pegawai dihapus";

function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove("show"),3200);}
function setStatus(text,cls=""){const s=$("dbStatus");s.textContent=text;s.className="status "+cls;}
function idFor(prefix, arr){let n=1;while(arr.some(x=>x.id===`${prefix}-${String(n).padStart(3,"0")}`))n++;return `${prefix}-${String(n).padStart(3,"0")}`;}
function countTransactions(key,id){return db.expenses.filter(e=>e[key]===id).length;}
function emptyRow(cols,msg="Belum ada data."){return `<tr><td colspan="${cols}" class="empty">${safe(msg)}</td></tr>`;}
function actionButtons(entity,id){return `<div class="row-actions"><button class="btn edit" data-edit="${entity}" data-id="${safe(id)}">Edit</button><button class="btn delete" data-delete="${entity}" data-id="${safe(id)}">Hapus</button></div>`;}

/* ====== PEMETAAN BARIS DB <-> OBJEK APLIKASI ====== */
const expenseFromRow = r => ({id:r.id,date:r.date,receipt:r.receipt,description:r.description,categoryId:r.category_id,supplierId:r.supplier_id,employeeId:r.employee_id,method:r.method,amount:Number(r.amount)});
const expenseToRow = e => ({id:e.id,date:e.date,receipt:e.receipt,description:e.description,category_id:e.categoryId,supplier_id:e.supplierId,employee_id:e.employeeId,method:e.method,amount:e.amount});

/* ====== MUAT DATA DARI SUPABASE ====== */
async function loadAll(){
  const [c,s,p,x] = await Promise.all([
    sb.from("deli_categories").select("*").order("id"),
    sb.from("deli_suppliers").select("*").order("id"),
    sb.from("deli_employees").select("*").order("id"),
    sb.from("deli_expenses").select("*").order("date",{ascending:false})
  ]);
  const err = c.error||s.error||p.error||x.error;
  if(err) throw err;
  db.categories=c.data; db.suppliers=s.data; db.employees=p.data; db.expenses=x.data.map(expenseFromRow);
}
async function refresh(){
  try{await loadAll();setStatus("Terhubung ke Supabase","ok");}
  catch(e){console.error(e);setStatus("Gagal terhubung: "+(e.message||"periksa SQL & RLS"),"err");toast("Gagal memuat data: "+(e.message||e));}
  renderAll();
}

function showPage(page){
 document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===page));
 document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
 const titles={dashboard:"Dashboard",pengeluaran:"Transaksi Pengeluaran",kategori:"Data Kategori",pemasok:"Data Pemasok",pegawai:"Data Pegawai"};
 $("pageTitle").textContent=titles[page]||"Dashboard";
 renderAll();
}
function renderDashboard(){
 const total=db.expenses.reduce((s,e)=>s+Number(e.amount||0),0), now=new Date();
 const month=db.expenses.filter(e=>{const d=new Date(e.date+"T00:00:00");return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).reduce((s,e)=>s+Number(e.amount||0),0);
 $("totalPengeluaran").textContent=rupiah(total);$("jumlahTransaksi").textContent=db.expenses.length;$("jumlahPemasok").textContent=db.suppliers.length;$("bulanIni").textContent=rupiah(month);
 $("categorySummary").innerHTML=db.categories.length?db.categories.map(c=>`<div class="summary-item"><p>${safe(c.name)}</p><h3>${rupiah(db.expenses.filter(e=>e.categoryId===c.id).reduce((s,e)=>s+Number(e.amount||0),0))}</h3><p>${countTransactions("categoryId",c.id)} transaksi</p></div>`).join(""):"<p class='empty'>Belum ada kategori.</p>";
 const recent=[...db.expenses].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
 $("recentTable").innerHTML=recent.length?recent.map(e=>`<tr><td>${dateText(e.date)}</td><td><strong>${safe(e.receipt)}</strong></td><td>${safe(e.description)}</td><td><span class="badge">${safe(categoryName(e.categoryId))}</span></td><td>${safe(supplierName(e.supplierId))}</td><td>${safe(employeeName(e.employeeId))}</td><td><strong>${rupiah(e.amount)}</strong></td></tr>`).join(""):emptyRow(7,"Belum ada transaksi.");
}
function renderExpenses(){
 const q=$("searchExpense").value.trim().toLowerCase(), cat=$("filterCategory").value;
 const data=db.expenses.filter(e=>[e.receipt,e.description,categoryName(e.categoryId),supplierName(e.supplierId),employeeName(e.employeeId)].join(" ").toLowerCase().includes(q)&&(!cat||e.categoryId===cat)).sort((a,b)=>b.date.localeCompare(a.date));
 $("expenseTable").innerHTML=data.length?data.map(e=>`<tr><td>${dateText(e.date)}</td><td><strong>${safe(e.receipt)}</strong></td><td>${safe(e.description)}</td><td><span class="badge">${safe(categoryName(e.categoryId))}</span></td><td>${safe(supplierName(e.supplierId))}</td><td>${safe(employeeName(e.employeeId))}</td><td>${safe(e.method)}</td><td><strong>${rupiah(e.amount)}</strong></td><td>${actionButtons("expense",e.id)}</td></tr>`).join(""):emptyRow(9,"Tidak ada transaksi yang cocok.");
}
function renderCategories(){
 $("categoryTable").innerHTML=db.categories.length?db.categories.map(c=>`<tr><td><strong>${safe(c.id)}</strong></td><td>${safe(c.name)}</td><td>${safe(c.description||"-")}</td><td>${countTransactions("categoryId",c.id)}</td><td>${actionButtons("category",c.id)}</td></tr>`).join(""):emptyRow(5);
 const cur=$("filterCategory").value;
 $("filterCategory").innerHTML='<option value="">Semua kategori</option>'+db.categories.map(c=>`<option value="${safe(c.id)}">${safe(c.name)}</option>`).join("");
 $("filterCategory").value=cur;
}
function renderSuppliers(){
 $("supplierTable").innerHTML=db.suppliers.length?db.suppliers.map(s=>`<tr><td><strong>${safe(s.id)}</strong></td><td>${safe(s.name)}</td><td>${safe(s.phone||"-")}</td><td>${safe(s.address||"-")}</td><td>${countTransactions("supplierId",s.id)}</td><td>${actionButtons("supplier",s.id)}</td></tr>`).join(""):emptyRow(6);
}
function renderEmployees(){
 $("employeeTable").innerHTML=db.employees.length?db.employees.map(e=>`<tr><td><strong>${safe(e.id)}</strong></td><td>${safe(e.name)}</td><td>${safe(e.position||"-")}</td><td>${safe(e.phone||"-")}</td><td>${countTransactions("employeeId",e.id)}</td><td>${actionButtons("employee",e.id)}</td></tr>`).join(""):emptyRow(6);
}
function renderAll(){renderDashboard();renderCategories();renderSuppliers();renderEmployees();renderExpenses();}

function field(label,name,type="text",opts={}){
 const full=opts.full?" full":"", required=opts.required===false?"":" required";
 let input="";
 if(type==="select") input=`<select name="${name}"${required}>${opts.options.map(o=>`<option value="${safe(o.value)}">${safe(o.label)}</option>`).join("")}</select>`;
 else if(type==="textarea") input=`<textarea name="${name}" rows="3"${required}></textarea>`;
 else input=`<input name="${name}" type="${type}" ${opts.min!==undefined?`min="${opts.min}"`:""} ${opts.step?`step="${opts.step}"`:""}${required} ${opts.placeholder?`placeholder="${safe(opts.placeholder)}"`:""}>`;
 return `<div class="field${full}"><label>${safe(label)}</label>${input}</div>`;
}
function optionsFor(arr,label){return [{value:"",label:"Pilih "+label.toLowerCase()},...arr.map(x=>({value:x.id,label:x.name}))];}
function openForm(entity,id=null){
 activeEntity=entity;editing=id;
 const expense=entity==="expense", item=id?byId(db[DBKEY[entity]],id):null;
 const title={expense:"Pengeluaran",category:"Kategori",supplier:"Pemasok",employee:"Pegawai"}[entity];
 $("modalTitle").textContent=(id?"Edit ":"Tambah ")+title;
 let fields="";
 if(entity==="expense"){
   if(!db.categories.length||!db.suppliers.length||!db.employees.length){toast("Isi minimal satu kategori, pemasok, dan pegawai terlebih dahulu.");return;}
   fields+=field("Tanggal","date","date");
   fields+=field("Nomor Bukti","receipt","text",{placeholder:"Contoh: KK-006"});
   fields+=field("Keterangan","description","text",{full:true,placeholder:"Contoh: Pembelian bahan baku"});
   fields+=field("Kategori","categoryId","select",{options:optionsFor(db.categories,"Kategori")});
   fields+=field("Pemasok","supplierId","select",{options:optionsFor(db.suppliers,"Pemasok")});
   fields+=field("Pegawai Penanggung Jawab","employeeId","select",{options:optionsFor(db.employees,"Pegawai")});
   fields+=field("Metode Pembayaran","method","select",{options:[{value:"",label:"Pilih metode"},{value:"Kas",label:"Kas"},{value:"Transfer",label:"Transfer"},{value:"QRIS",label:"QRIS"}]});
   fields+=field("Jumlah (Rp)","amount","number",{min:1,step:"1"});
   $("formHint").textContent="Relasi: satu transaksi pengeluaran mengacu pada satu kategori, satu pemasok, dan satu pegawai.";
 }else if(entity==="category"){
   fields+=field("Nama Kategori","name","text",{full:true,placeholder:"Contoh: Perawatan Peralatan"});
   fields+=field("Keterangan","description","textarea",{full:true,required:false});
   $("formHint").textContent="Kategori yang sudah dipakai transaksi tidak bisa dihapus sebelum transaksi terkait diubah atau dihapus.";
 }else if(entity==="supplier"){
   fields+=field("Nama Pemasok","name","text",{full:true,placeholder:"Nama usaha pemasok"});
   fields+=field("Nomor Telepon","phone","tel",{required:false,placeholder:"08xxxxxxxxxx"});
   fields+=field("Alamat","address","textarea",{full:true,required:false});
   $("formHint").textContent="Pemasok yang sudah dipakai transaksi tidak bisa dihapus sebelum transaksi terkait diubah atau dihapus.";
 }else{
   fields+=field("Nama Pegawai","name","text",{full:true,placeholder:"Nama lengkap"});
   fields+=field("Jabatan","position","text",{placeholder:"Contoh: Admin Keuangan",required:false});
   fields+=field("Nomor Telepon","phone","tel",{required:false,placeholder:"08xxxxxxxxxx"});
   $("formHint").textContent="Pegawai yang sudah tercatat pada transaksi tidak bisa dihapus sebelum transaksi terkait diubah atau dihapus.";
 }
 $("formFields").innerHTML=fields;
 const form=$("dataForm");
 form.querySelectorAll("[name]").forEach(el=>{const key=el.name;if(item&&item[key]!==undefined&&item[key]!==null)el.value=item[key];});
 if(expense&&!item){form.elements.date.value=new Date().toISOString().slice(0,10);form.elements.method.value="Kas";}
 $("modal").classList.add("open");$("modal").setAttribute("aria-hidden","false");
}
function closeForm(){$("modal").classList.remove("open");$("modal").setAttribute("aria-hidden","true");$("dataForm").reset();editing=null;activeEntity=null;}

async function handleSubmit(ev){
 ev.preventDefault();if(saving)return;
 const form=$("dataForm");if(!form.reportValidity())return;
 const data=Object.fromEntries(new FormData(form).entries());
 const collection=TABLE[activeEntity];
 if(activeEntity==="expense"){
   data.amount=Number(data.amount);
   if(!Number.isFinite(data.amount)||data.amount<=0){toast("Jumlah pengeluaran harus lebih dari 0.");return;}
   if(db.expenses.some(e=>e.receipt.trim().toLowerCase()===data.receipt.trim().toLowerCase()&&e.id!==editing)){toast("Nomor bukti sudah digunakan. Gunakan nomor yang berbeda.");return;}
 }else{
   if(db[DBKEY[activeEntity]].some(x=>x.name.trim().toLowerCase()===data.name.trim().toLowerCase()&&x.id!==editing)){toast("Nama tersebut sudah terdaftar.");return;}
 }
 saving=true;$("submitBtn").disabled=true;
 try{
   let res;
   if(editing){
     const payload=activeEntity==="expense"?expenseToRow({...data,id:editing}):data;
     delete payload.id;
     res=await sb.from(collection).update(payload).eq("id",editing);
   }else{
     const prefix={expense:"TRX",category:"KAT",supplier:"PMS",employee:"PGW"}[activeEntity];
     data.id=idFor(prefix,db[DBKEY[activeEntity]]);
     const payload=activeEntity==="expense"?expenseToRow(data):data;
     res=await sb.from(collection).insert(payload);
   }
   if(res.error)throw res.error;
   toast(editing?"Data berhasil diperbarui.":"Data berhasil ditambahkan.");
   closeForm();await refresh();
 }catch(e){
   console.error(e);toast("Gagal menyimpan: "+(e.message||e));
 }finally{saving=false;$("submitBtn").disabled=false;}
}

async function deleteRecord(entity,id){
 const collection=TABLE[entity];
 const relation={category:"categoryId",supplier:"supplierId",employee:"employeeId"}[entity];
 if(relation&&db.expenses.some(e=>e[relation]===id)){toast("Tidak bisa dihapus: data masih dipakai transaksi pengeluaran.");return;}
 const item=byId(db[DBKEY[entity]],id);if(!item)return;
 if(!confirm(`Yakin ingin menghapus ${entity==="expense"?"transaksi "+item.receipt:item.name}?`))return;
 const {error}=await sb.from(collection).delete().eq("id",id);
 if(error){console.error(error);toast("Gagal menghapus: "+error.message);return;}
 toast("Data berhasil dihapus.");await refresh();
}

document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
$("quickAdd").addEventListener("click",()=>openForm("expense"));
$("addExpense").addEventListener("click",()=>openForm("expense"));
$("addCategory").addEventListener("click",()=>openForm("category"));
$("addSupplier").addEventListener("click",()=>openForm("supplier"));
$("addEmployee").addEventListener("click",()=>openForm("employee"));
$("closeModal").addEventListener("click",closeForm);$("cancelModal").addEventListener("click",closeForm);
$("modal").addEventListener("click",e=>{if(e.target===$("modal"))closeForm();});
$("dataForm").addEventListener("submit",handleSubmit);
$("searchExpense").addEventListener("input",renderExpenses);$("filterCategory").addEventListener("change",renderExpenses);
document.addEventListener("click",e=>{
 const edit=e.target.closest("[data-edit]");if(edit){openForm(edit.dataset.edit,edit.dataset.id);return;}
 const del=e.target.closest("[data-delete]");if(del)deleteRecord(del.dataset.delete,del.dataset.id);
});
$("today").textContent=new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
renderAll();
refresh();
})();
