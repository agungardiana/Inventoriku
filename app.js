/* Isi SUPABASE_URL dan SUPABASE_ANON_KEY setelah membuat proyek Supabase.
   Gunakan anon/publishable key saja, jangan pernah menaruh service_role key di browser. */
const SUPABASE_URL = "https://orjwiohtsfpugrnxwbwn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_yNf1LwqdqBl__DISwmcI8w_n7c4hwFp";
const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("GANTI_") && !SUPABASE_ANON_KEY.includes("GANTI_");
const $ = (id) => document.getElementById(id);
let db = null, items = [], currentUser = null;

const money = (n) => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function message(id, text, isError=true){ const el=$(id); el.textContent=text; el.style.color=isError?"#a34c25":"#0f766e"; }
function setBusy(button, busy, label){button.disabled=busy;button.textContent=busy?"Memproses…":label;}
function showAuth(){ $("authView").classList.remove("hidden"); $("appView").classList.add("hidden"); }
function showApp(){ $("authView").classList.add("hidden"); $("appView").classList.remove("hidden"); $("userEmail").textContent=currentUser?.email||""; }
function openItemDialog(item=null){
  $("itemForm").reset(); $("itemId").value=item?.id||"";
  $("dialogTitle").textContent=item?"Ubah barang":"Tambah barang";
  $("itemName").value=item?.name||""; $("sku").value=item?.sku||""; $("category").value=item?.category||"";
  $("quantity").value=item?.quantity??0; $("minStock").value=item?.min_stock??5; $("costPrice").value=item?.cost_price??0;
  $("location").value=item?.location||""; $("notes").value=item?.notes||""; message("formMessage","");
  $("itemDialog").showModal();
}
async function loadItems(){
  const {data,error}=await db.from("inventory_items").select("*").order("name");
  if(error){message("appMessage","Gagal memuat data: "+error.message);return;}
  items=data||[]; render();
}
function render(){
  $("totalKinds").textContent=items.length;
  $("totalUnits").textContent=items.reduce((s,x)=>s+Number(x.quantity||0),0).toLocaleString("id-ID");
  const low=items.filter(x=>Number(x.quantity)<=Number(x.min_stock));
  $("lowStock").textContent=low.length;
  $("stockValue").textContent=money(items.reduce((s,x)=>s+Number(x.quantity||0)*Number(x.cost_price||0),0));
  $("lowStockRows").innerHTML=low.length?low.map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>${escapeHtml(x.sku)}</td><td class="status-low">${Number(x.quantity).toLocaleString("id-ID")}</td><td>${Number(x.min_stock).toLocaleString("id-ID")}</td></tr>`).join(""):`<tr><td colspan="4" class="empty">Tidak ada barang dengan stok menipis.</td></tr>`;
  const q=$("searchInput").value.trim().toLowerCase();
  const filtered=items.filter(x=>[x.name,x.sku,x.category,x.location].some(v=>String(v||"").toLowerCase().includes(q)));
  $("itemCount").textContent=`${filtered.length} barang`;
  $("inventoryRows").innerHTML=filtered.length?filtered.map(x=>`<tr><td><strong>${escapeHtml(x.name)}</strong></td><td>${escapeHtml(x.sku)}</td><td>${escapeHtml(x.category||"—")}</td><td class="${Number(x.quantity)<=Number(x.min_stock)?"status-low":"status-ok"}">${Number(x.quantity).toLocaleString("id-ID")}</td><td>${Number(x.min_stock).toLocaleString("id-ID")}</td><td>${money(x.cost_price)}</td><td>${escapeHtml(x.location||"—")}</td><td><div class="table-actions"><button class="small-btn" data-edit="${x.id}">Edit</button><button class="small-btn delete" data-delete="${x.id}">Hapus</button></div></td></tr>`).join(""):`<tr><td colspan="8" class="empty">Tidak ada data yang cocok.</td></tr>`;
}
function showPage(page){
  $("dashboardPage").classList.toggle("hidden",page!=="dashboard");$("inventoryPage").classList.toggle("hidden",page!=="inventory");
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  $("pageTitle").textContent=page==="dashboard"?"Ringkasan":"Data barang";
}
async function start(){
  if(!configured){showAuth();message("authMessage","Aplikasi belum tersambung. Isi SUPABASE_URL dan SUPABASE_ANON_KEY di app.js terlebih dahulu.");$("loginBtn").disabled=true;$("signupBtn").disabled=true;return;}
  db=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
  const {data:{session}}=await db.auth.getSession();
  if(session){currentUser=session.user;showApp();await loadItems();}else showAuth();
  db.auth.onAuthStateChange((_event,session)=>{setTimeout(async()=>{if(session){currentUser=session.user;showApp();await loadItems();}else{currentUser=null;showAuth();}},0);});
}
$("loginBtn").addEventListener("click",async()=>{
  if(!configured)return;const email=$("email").value.trim(),password=$("password").value;
  if(!email||!password){message("authMessage","Isi email dan kata sandi terlebih dahulu.");return;}
  setBusy($("loginBtn"),true,"Masuk");
  const {error}=await db.auth.signInWithPassword({email,password});
  setBusy($("loginBtn"),false,"Masuk");message("authMessage",error?error.message:"Berhasil masuk.",!!error);
});
$("signupBtn").addEventListener("click",async()=>{
  if(!configured)return;const email=$("email").value.trim(),password=$("password").value;
  if(!email||password.length<6){message("authMessage","Isi email yang valid dan kata sandi minimal 6 karakter.");return;}
  setBusy($("signupBtn"),true,"Buat akun");
  const {data,error}=await db.auth.signUp({email,password});
  setBusy($("signupBtn"),false,"Buat akun");
  message("authMessage",error?error.message:(data.session?"Akun berhasil dibuat.":"Akun dibuat. Periksa email untuk verifikasi jika diminta."),!!error);
});
$("logoutBtn").addEventListener("click",async()=>{const {error}=await db.auth.signOut();if(error)message("appMessage","Gagal keluar: "+error.message);});
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
$("addItemTop").addEventListener("click",()=>openItemDialog());
$("viewInventoryBtn").addEventListener("click",()=>showPage("inventory"));
$("closeDialog").addEventListener("click",()=>$("itemDialog").close());
$("cancelDialog").addEventListener("click",()=>$("itemDialog").close());
$("searchInput").addEventListener("input",render);
$("inventoryRows").addEventListener("click",async e=>{
  const edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-delete]");
  if(edit){const item=items.find(x=>x.id===edit.dataset.edit);if(item)openItemDialog(item);}
  if(del){const item=items.find(x=>x.id===del.dataset.delete);if(!item)return;
    if(!confirm(`Hapus barang "${item.name}"? Tindakan ini tidak dapat dibatalkan.`))return;
    const {error}=await db.from("inventory_items").delete().eq("id",item.id);
    if(error)message("appMessage","Gagal menghapus: "+error.message);else{message("appMessage","Barang berhasil dihapus.",false);await loadItems();}
  }
});
$("itemForm").addEventListener("submit",async e=>{
  e.preventDefault();const id=$("itemId").value;
  const payload={name:$("itemName").value.trim(),sku:$("sku").value.trim(),category:$("category").value.trim()||null,quantity:Number($("quantity").value),min_stock:Number($("minStock").value),cost_price:Number($("costPrice").value),location:$("location").value.trim()||null,notes:$("notes").value.trim()||null};
  if(!payload.name||!payload.sku){message("formMessage","Nama barang dan SKU wajib diisi.");return;}
  setBusy($("saveItemBtn"),true,"Simpan barang");
  const result=id?await db.from("inventory_items").update(payload).eq("id",id):await db.from("inventory_items").insert(payload);
  setBusy($("saveItemBtn"),false,"Simpan barang");
  if(result.error){message("formMessage","Gagal menyimpan: "+result.error.message);return;}
  $("itemDialog").close();message("appMessage",id?"Data barang diperbarui.":"Barang berhasil ditambahkan.",false);await loadItems();
});
start();
