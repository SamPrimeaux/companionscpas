// CMS checkout editor — shares the existing dashboard shell and cms_modals source of truth.
// The general donation configuration reuses DonationModalSettingsPanel from Forms Studio.
const CPAS_CHECKOUT_API = "/api/cms/checkout-modals";
const CHECKOUT_DEFAULT = {
  checkout_kind:"registration",mode:"items",campaign_id:"",
  title:"Event registration",eyebrow:"Companions of CPAS",subtitle:"Choose an admission and enter your details.",
  items_title:"Admissions",details_title:"Participant information",submit_label:"Pay {total}",
  success_title:"Thank you for registering",success_message:"Your registration was received.",
  note_prefix:"Event registration",cover_fees:{enabled:true,default:false},
  theme:{accent:"#7c3aed",radius:14,compact:false},
  items:[{key:"driver",label:"Primary admission",price_cents:2000,min:1,max:1,default_qty:1,note:""}],
  fields:[{key:"name",label:"Participant name",type:"text",required:true,placeholder:"First and last name"}],
};
const checkoutCopy = x => JSON.parse(JSON.stringify(x || {}));
const checkoutMoney = c => "$" + (Number(c || 0) / 100).toFixed(2);
const checkoutKey = name => String(name || "registration").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,45) || "registration";
const cpCard = {background:"#fff",border:"1px solid #e5e0ec",borderRadius:16,boxShadow:"0 5px 20px rgba(24,12,46,.05)"};
const cpInput = {width:"100%",minHeight:39,padding:"9px 11px",border:"1px solid #d8d2e1",borderRadius:9,background:"#fff",color:"#261832",fontSize:13,boxSizing:"border-box"};
const cpBtn = {border:"1px solid #d8d2e1",borderRadius:9,background:"#fff",color:"#352646",padding:"9px 12px",fontSize:12,fontWeight:700,cursor:"pointer"};
function CmsCheckoutsView({onNavigate}) {
  const [rows,setRows]=React.useState([]);
  const [campaigns,setCampaigns]=React.useState([]);
  const [selected,setSelected]=React.useState(null);
  const [draft,setDraft]=React.useState(null);
  const [loading,setLoading]=React.useState(true);
  const [saving,setSaving]=React.useState(false);
  const [notice,setNotice]=React.useState("");
  const [search,setSearch]=React.useState("");
  const [tab,setTab]=React.useState("content");
  const [showDonation,setShowDonation]=React.useState(false);
  const [preview,setPreview]=React.useState(true);
  const choose = (row) => {setSelected(row.modal_key);setDraft(checkoutCopy({...row,config:row.config||CHECKOUT_DEFAULT}));setTab("content");};
  const load = React.useCallback(async (focus) => {
    const r=await fetch(CPAS_CHECKOUT_API,{credentials:"include"});
    const d=await r.json();
    if(!r.ok)throw Error(d.error||"Unable to load CMS modals");
    setRows(d.modals||[]);setCampaigns(d.campaigns||[]);
    const target=(d.modals||[]).find(x=>x.modal_key===focus);
    if(target)choose(target);
    else if(!focus && d.modals?.length)choose(d.modals.find(x=>x.modal_key!=="donate_cta")||d.modals[0]);
  },[]);
  React.useEffect(()=>{load().catch(e=>setNotice(e.message)).finally(()=>setLoading(false));},[load]);
  const setRoot=(key,value)=>setDraft(d=>({...d,[key]:value}));
  const setConfig=(key,value)=>setDraft(d=>({...d,config:{...d.config,[key]:value}}));
  const setGroup=(group,key,value)=>setDraft(d=>({...d,config:{...d.config,[group]:{...(d.config[group]||{}),[key]:value}}}));
  const modify=(list,i,key,value)=>setDraft(d=>{const a=checkoutCopy(d.config[list]||[]);a[i][key]=value;return {...d,config:{...d.config,[list]:a}};});
  const remove=(list,i)=>setDraft(d=>({...d,config:{...d.config,[list]:(d.config[list]||[]).filter((_,j)=>j!==i)}}));
  const create=async (copyFrom=null)=>{
    const title=copyFrom ? copyFrom.title+" copy" : "New event registration";
    const key=checkoutKey(title)+"_"+Date.now().toString(36).slice(-5);
    const config=checkoutCopy(copyFrom?.config||CHECKOUT_DEFAULT);
    config.title=title;
    setSaving(true);setNotice("");
    try{
      const r=await fetch(CPAS_CHECKOUT_API,{method:"POST",credentials:"include",headers:{"content-type":"application/json"},body:JSON.stringify({title,modal_key:key,config})});
      const data=await r.json();
      if(!r.ok)throw Error(data.error||"Could not create checkout");
      await load(key);setNotice("Checkout draft created. Edit and publish when ready.");
    }catch(e){setNotice(e.message);}finally{setSaving(false);}
  };
  const save=async (publish)=>{
    if(!draft||draft.modal_key==="donate_cta")return;
    setSaving(true);setNotice("");
    try{
      const next={...draft,is_active:publish??draft.is_active};
      const r=await fetch(CPAS_CHECKOUT_API+"/"+encodeURIComponent(selected),{method:"PUT",credentials:"include",headers:{"content-type":"application/json"},body:JSON.stringify({title:next.title,subtitle:next.subtitle,config:next.config,is_active:next.is_active})});
      const result=await r.json();
      if(!r.ok)throw Error(result.error||"Save failed");
      await load(selected);setNotice(next.is_active?"Checkout published. Republish its event page to expose the button.":"Draft saved.");
    }catch(e){setNotice(e.message);}finally{setSaving(false);}
  };
  const archive=async ()=>{
    if(!draft||draft.modal_key==="donate_cta"||!window.confirm("Archive this checkout? Its existing payment records will remain."))return;
    setSaving(true);
    try{
      const r=await fetch(CPAS_CHECKOUT_API+"/"+encodeURIComponent(selected),{method:"DELETE",credentials:"include"});
      const d=await r.json();if(!r.ok)throw Error(d.error||"Archive failed");
      await load(selected);setNotice("Checkout archived and disabled.");
    }catch(e){setNotice(e.message);}finally{setSaving(false);}
  };
  const items=draft?.config?.items||[];
  const fields=draft?.config?.fields||[];
  const campaign=campaigns.find(c=>c.id===draft?.config?.campaign_id);
  const displayRows=rows.filter(r=>(r.title+" "+r.modal_key).toLowerCase().includes(search.toLowerCase()));
  const label=(title,control,hint)=> <label className="cp-check-field"><span>{title}</span>{control}{hint&&<small>{hint}</small>}</label>;
  const input=(value,onChange,props={})=><input style={cpInput} value={value??""} onChange={e=>onChange(e.target.value)} {...props}/>;
  const textarea=(value,onChange)=><textarea style={{...cpInput,minHeight:70,resize:"vertical"}} value={value??""} onChange={e=>onChange(e.target.value)}/>;
  return <div className="cp-checkouts" style={{maxWidth:1500,margin:"0 auto",padding:"24px clamp(14px,3vw,36px)"}}>
    <style>{".cp-checkouts *{box-sizing:border-box}.cp-check-layout{display:grid;grid-template-columns:minmax(235px,285px) minmax(0,1fr);gap:20px;align-items:start}.cp-check-edit{display:grid;grid-template-columns:minmax(0,1fr) minmax(255px,340px);gap:18px}.cp-check-field{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:700;color:#3c3051;margin-bottom:13px}.cp-check-field small{font-size:11px;font-weight:400;color:#82778e;line-height:1.35}.cp-check-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.cp-check-row3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.cp-check-actions{display:flex;flex-wrap:wrap;gap:8px}.cp-check-btn{transition:background .14s ease}.cp-check-btn:hover{background:#f5f0fa!important}.cp-check-tab{border:0;background:none;padding:9px 11px;color:#716583;font-weight:700;font-size:12px;cursor:pointer;border-bottom:2px solid transparent}.cp-check-tab[aria-selected=true]{color:#672f9b;border-color:#7c3aed}.cp-check-row-item{padding:14px;border:1px solid #e7e2ec;border-radius:11px;margin-bottom:10px;background:#fff}.cp-check-preview{background:#faf8fd;border:1px solid #e1d7ec;border-radius:16px;padding:18px;position:sticky;top:18px}@media(max-width:1100px){.cp-check-edit{grid-template-columns:1fr}.cp-check-preview{position:static}}@media(max-width:760px){.cp-check-layout{grid-template-columns:1fr}.cp-check-row,.cp-check-row3{grid-template-columns:1fr}}"}</style>
    {showDonation && typeof DonationModalSettingsPanel==="function" && React.createElement(DonationModalSettingsPanel,{onClose:()=>setShowDonation(false)})}
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap",marginBottom:24}}>
      <div><div style={{fontSize:11,fontWeight:800,letterSpacing:2,color:"#8668a4"}}>WEBSITE CMS / CONVERSION</div><h1 style={{fontSize:27,fontWeight:800,margin:"6px 0"}}>Modals & Checkout</h1><p style={{margin:0,fontSize:13,color:"#796d85"}}>Manage donation popups and event admissions without editing code.</p></div>
      <div className="cp-check-actions"><button style={cpBtn} onClick={()=>onNavigate("cms-forms")}>Open Forms Studio</button><button style={{...cpBtn,color:"#fff",background:"#6928a1",borderColor:"#6928a1"}} disabled={saving} onClick={()=>create()}>+ New checkout</button></div>
    </div>
    {!!notice && <div role="status" style={{padding:"10px 14px",borderRadius:10,background:"#f7f1ff",border:"1px solid #ddc9ed",fontSize:12,marginBottom:17}}>{notice}</div>}
    <div className="cp-check-layout">
      <aside style={{...cpCard,padding:13}}>
        {input(search,setSearch,{placeholder:"Search modals", "aria-label":"Search checkout modals"})}
        <div style={{marginTop:12,display:"grid",gap:5}}>
          <button className="cp-check-btn" onClick={()=>setShowDonation(true)} style={{...cpBtn,textAlign:"left",padding:13,borderColor:"#dcc7ef",background:"#faf5ff"}}>
            <span style={{display:"block",fontSize:13}}>General donations</span><small style={{fontWeight:400,color:"#766783"}}>Edit the existing one-time and monthly donation modal</small>
          </button>
          {displayRows.filter(r=>r.modal_key!=="donate_cta").map(r=><button key={r.id} className="cp-check-btn" onClick={()=>choose(r)} style={{...cpBtn,textAlign:"left",padding:13,background:selected===r.modal_key?"#f1e8fc":"#fff",borderColor:selected===r.modal_key?"#9868c9":"#e5e0ea"}}>
            <span style={{display:"flex",justifyContent:"space-between",gap:7,fontSize:13}}><span>{r.title}</span><small style={{color:r.is_active?"#11885d":"#9c7385"}}>{r.is_active?"Live":"Draft"}</small></span>
            <small style={{color:"#84758d",fontWeight:400}}>{r.modal_key}</small>
          </button>)}
        </div>
        {loading&&<p style={{color:"#978aa2",fontSize:12}}>Loading saved modals…</p>}
      </aside>
      {!draft||draft.modal_key==="donate_cta"?<div style={{...cpCard,padding:30}}><h2>Manage your checkout experiences</h2><p style={{color:"#756981"}}>Select an event checkout, create a new one, or open the existing general donation editor.</p><button style={cpBtn} onClick={()=>setShowDonation(true)}>Edit donation modal</button></div>:
      <div style={{minWidth:0}}>
        <div style={{...cpCard,padding:16,marginBottom:15}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
            <div><div style={{fontWeight:800,fontSize:17}}>{draft.title}</div><small style={{color:"#93869e"}}>{selected} · {draft.is_active?"Published":"Draft / inactive"}</small></div>
            <div className="cp-check-actions">
              <button style={cpBtn} onClick={()=>create(draft)} disabled={saving}>Duplicate</button>
              <button style={cpBtn} onClick={archive} disabled={saving}>Archive</button>
              <button style={cpBtn} onClick={()=>save(false)} disabled={saving}>{saving?"Saving…":"Save draft"}</button>
              <button style={{...cpBtn,background:"#682aa1",borderColor:"#682aa1",color:"#fff"}} onClick={()=>save(true)} disabled={saving}>{saving?"Saving…":"Save & publish"}</button>
            </div>
          </div>
          {campaign && (!campaign.is_public || campaign.status==="draft") && <div style={{marginTop:12,fontSize:12,color:"#a35d12"}}>This campaign is currently {campaign.status} / nonpublic. Review its publishing state before enabling a live event button.</div>}
          <div style={{display:"flex",flexWrap:"wrap",gap:4,borderTop:"1px solid #eee8f2",marginTop:14,paddingTop:9}}>
            {["content","admissions","fields","appearance"].map(t=><button key={t} className="cp-check-tab" role="tab" aria-selected={tab===t} onClick={()=>setTab(t)}>{({content:"Content",admissions:"Prices & entries",fields:"Form fields",appearance:"Appearance"})[t]}</button>)}
            <button className="cp-check-tab" onClick={()=>setPreview(p=>!p)}>{preview?"Hide preview":"Show preview"}</button>
          </div>
        </div>
        <div className="cp-check-edit" style={{gridTemplateColumns:preview?undefined:"1fr"}}>
          <div style={{...cpCard,padding:18,minWidth:0}}>
            {tab==="content"&&<div>
              {label("Checkout name",input(draft.title,v=>setRoot("title",v)))}
              {label("Subtitle in admin",input(draft.subtitle,v=>setRoot("subtitle",v)))}
              {label("Campaign",<select style={cpInput} value={draft.config.campaign_id||""} onChange={e=>setConfig("campaign_id",e.target.value)}><option value="">General / no campaign</option>{campaigns.map(c=><option value={c.id} key={c.id}>{c.title} ({c.status})</option>)}</select>)}
              <div className="cp-check-row">{label("Eyebrow",input(draft.config.eyebrow,v=>setConfig("eyebrow",v)))}{label("Popup headline",input(draft.config.title,v=>setConfig("title",v)))}</div>
              {label("Description",textarea(draft.config.subtitle,v=>setConfig("subtitle",v)))}
              <div className="cp-check-row">{label("Entries heading",input(draft.config.items_title,v=>setConfig("items_title",v)))}{label("Contact heading",input(draft.config.details_title,v=>setConfig("details_title",v)))}</div>
              <div className="cp-check-row">{label("Pay button (use {total})",input(draft.config.submit_label,v=>setConfig("submit_label",v)))}{label("Order note prefix",input(draft.config.note_prefix,v=>setConfig("note_prefix",v)))}</div>
              <div className="cp-check-row">{label("Success heading",input(draft.config.success_title,v=>setConfig("success_title",v)))}{label("Success message",textarea(draft.config.success_message,v=>setConfig("success_message",v)))}</div>
            </div>}
            {tab==="admissions"&&<div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}><strong>Admission offerings</strong><button style={cpBtn} onClick={()=>setConfig("items",[...items,{key:"entry_"+Date.now().toString(36).slice(-4),label:"New admission",price_cents:1000,min:0,max:5,default_qty:0,note:""}])}>+ Add entry</button></div>
              <p style={{fontSize:12,color:"#84758c",marginTop:0}}>Prices are resolved on the server at payment time. The browser cannot override them.</p>
              {items.map((it,i)=><div key={it.key} className="cp-check-row-item">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><strong style={{fontSize:12}}>{it.key}</strong><button style={{...cpBtn,color:"#a33"}} onClick={()=>remove("items",i)}>Remove</button></div>
                <div className="cp-check-row">{label("Label",input(it.label,v=>modify("items",i,"label",v)))}{label("Price (USD)",input((Number(it.price_cents||0)/100).toFixed(2),v=>modify("items",i,"price_cents",Math.round(Math.max(0,Number(v))*100)),{type:"number",min:"0",step:"0.01"}))}</div>
                {label("Description",input(it.note,v=>modify("items",i,"note",v)))}
                <div className="cp-check-row3">{label("Minimum",input(it.min??0,v=>modify("items",i,"min",Number(v)),{type:"number",min:"0"}))}{label("Maximum",input(it.max??10,v=>modify("items",i,"max",Number(v)),{type:"number",min:"1"}))}{label("Initial quantity",input(it.default_qty??0,v=>modify("items",i,"default_qty",Number(v)),{type:"number",min:"0"}))}</div>
              </div>)}
            </div>}
            {tab==="fields"&&<div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}><strong>Registration fields</strong><button style={cpBtn} onClick={()=>setConfig("fields",[...fields,{key:"detail_"+Date.now().toString(36).slice(-4),label:"New detail",type:"text",required:false,placeholder:""}])}>+ Add field</button></div>
              <p style={{fontSize:12,color:"#84758c"}}>The required field with key <strong>name</strong> identifies the primary participant. Passenger checkouts require a field with key <strong>passenger_name</strong>.</p>
              {fields.map((f,i)=><div key={f.key} className="cp-check-row-item">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><small>Key: {f.key}</small><button style={{...cpBtn,color:"#a33"}} disabled={f.key==="name"} onClick={()=>remove("fields",i)}>Remove</button></div>
                <div className="cp-check-row">{label("Label",input(f.label,v=>modify("fields",i,"label",v)))}{label("Field type",<select style={cpInput} value={f.type} onChange={e=>modify("fields",i,"type",e.target.value)}>{["text","email","tel","number"].map(t=><option key={t} value={t}>{t}</option>)}</select>)}</div>
                {label("Placeholder",input(f.placeholder,v=>modify("fields",i,"placeholder",v)))}
                <label style={{display:"flex",gap:8,fontSize:12}}><input type="checkbox" checked={!!f.required} disabled={f.key==="name"} onChange={e=>modify("fields",i,"required",e.target.checked)}/>Required</label>
              </div>)}
            </div>}
            {tab==="appearance"&&<div>
              <strong style={{display:"block",marginBottom:15}}>Style controls</strong>
              {label("Accent",<div style={{display:"flex",gap:10}}><input type="color" style={{width:45,height:40,border:"none",padding:2}} value={draft.config.theme?.accent||"#7c3aed"} onChange={e=>setGroup("theme","accent",e.target.value)}/>{input(draft.config.theme?.accent||"#7c3aed",v=>setGroup("theme","accent",v))}</div>)}
              {label("Corner radius",<input type="range" style={{width:"100%"}} min="6" max="24" value={draft.config.theme?.radius||14} onChange={e=>setGroup("theme","radius",Number(e.target.value))}/>)}
              <label style={{display:"flex",gap:8,marginBottom:15,fontSize:12}}><input type="checkbox" checked={!!draft.config.theme?.compact} onChange={e=>setGroup("theme","compact",e.target.checked)}/>Compact density</label>
              <hr style={{border:"none",borderTop:"1px solid #eee8f2",margin:"16px 0"}}/>
              <label style={{display:"flex",gap:8,marginBottom:12,fontSize:12}}><input type="checkbox" checked={draft.config.cover_fees?.enabled!==false} onChange={e=>setGroup("cover_fees","enabled",e.target.checked)}/>Allow donors to cover processing fees</label>
              <label style={{display:"flex",gap:8,marginBottom:12,fontSize:12}}><input type="checkbox" checked={!!draft.config.cover_fees?.default} onChange={e=>setGroup("cover_fees","default",e.target.checked)}/>Check the fee option by default</label>
              <p style={{fontSize:12,color:"#84758c"}}>The popup inherits the site styling and applies these scoped checkout controls.</p>
            </div>}
          </div>
          {preview&&<div className="cp-check-preview">
            <div style={{fontWeight:800,fontSize:11,letterSpacing:1,color:"#a090b3",marginBottom:12}}>LIVE CONFIG PREVIEW · NO CHARGE</div>
            <div style={{background:"#fff",border:"1px solid #eae1f0",borderRadius:Number(draft.config.theme?.radius||14),padding:draft.config.theme?.compact?12:20}}>
              <div style={{fontSize:11,color:draft.config.theme?.accent||"#7c3aed",fontWeight:800,textTransform:"uppercase"}}>{draft.config.eyebrow}</div>
              <h3 style={{margin:"6px 0",fontSize:21}}>{draft.config.title||draft.title}</h3>
              <p style={{fontSize:12,color:"#776987",lineHeight:1.5}}>{draft.config.subtitle}</p>
              <div style={{fontSize:12,fontWeight:800,margin:"15px 0 8px"}}>{draft.config.items_title}</div>
              {items.map(it=><div key={it.key} style={{display:"flex",justifyContent:"space-between",gap:8,border:"1px solid #eee8f4",borderRadius:9,padding:10,marginBottom:6,fontSize:12}}><span>{it.label}</span><strong>{checkoutMoney(it.price_cents)}</strong></div>)}
              <div style={{fontSize:12,fontWeight:800,margin:"15px 0 8px"}}>{draft.config.details_title}</div>
              {fields.map(f=><label key={f.key} style={{display:"block",fontSize:11,color:"#675973",marginBottom:9}}>{f.label}{f.required?" *":""}<input style={{...cpInput,marginTop:3,background:"#faf8fc"}} placeholder={f.placeholder} disabled/></label>)}
              <div style={{background:draft.config.theme?.accent||"#7c3aed",color:"#fff",padding:12,borderRadius:9,textAlign:"center",fontWeight:800,fontSize:12,marginTop:14}}>{String(draft.config.submit_label||"Pay {total}").replace("{total}",checkoutMoney(items.reduce((sum,x)=>sum+x.price_cents*(x.default_qty||0),0)))}</div>
              <div style={{fontSize:10,color:"#918598",textAlign:"center",marginTop:7}}>Illustrative preview. Stripe is not initialized here.</div>
            </div>
          </div>}
        </div>
      </div>}
    </div>
  </div>;
}
