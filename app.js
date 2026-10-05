const cfg=window.EPS_GAMES_CONFIG||{},$=s=>document.querySelector(s);
let currentPlayer=null,currentState=null,deferredPrompt=null,oneSignalReady=false;
function esc(v=""){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function setStatus(el,msg="",ok=true){el.textContent=msg;el.className="status "+(msg?(ok?"ok":"err"):"")}
function endpoint(a){return `${cfg.supabaseUrl}/functions/v1/api?action=${encodeURIComponent(a)}`}
async function api(a,b={}){const r=await fetch(endpoint(a),{method:"POST",headers:{"Content-Type":"application/json","apikey":cfg.supabaseAnonKey,"Authorization":`Bearer ${cfg.supabaseAnonKey}`},body:JSON.stringify(b)});const d=await r.json();if(!d.ok)throw new Error(d.error||"Something went wrong.");return d}
function view(id){document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));$("#"+id).classList.add("active");document.querySelector(`.nav-btn[data-view="${id}"]`)?.classList.add("active")}
document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>view(b.dataset.view));
document.querySelectorAll(".gameOpen").forEach(b=>b.onclick=()=>view("play"));

function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)}function isAndroid(){return /android/i.test(navigator.userAgent)}function standalone(){return matchMedia("(display-mode: standalone)").matches||navigator.standalone===true}
function installHelp(){if(standalone()){$("#installBtn").classList.add("hidden");return}const box=$("#installHelp");if(isIOS()){box.innerHTML="<strong>iPhone:</strong> Safari → Share → Add to Home Screen. Open the new icon, then enable alerts.";box.classList.remove("hidden")}else if(isAndroid()){box.innerHTML="<strong>Android:</strong> Chrome menu → Install app / Add to Home screen.";box.classList.remove("hidden")}}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e});
$("#installBtn").onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null}else installHelp()};
function initPush(){if(!cfg.oneSignalAppId)return;window.OneSignalDeferred=window.OneSignalDeferred||[];window.OneSignalDeferred.push(async O=>{await O.init({appId:cfg.oneSignalAppId,serviceWorkerPath:"onesignal/OneSignalSDKWorker.js",serviceWorkerParam:{scope:"./"},notifyButton:{enable:false}});oneSignalReady=true})}
$("#alertsBtn").onclick=()=>{if(isIOS()&&!standalone()){installHelp();return}if(!oneSignalReady)return alert("Notification service is still loading.");window.OneSignalDeferred.push(async O=>{await O.Notifications.requestPermission();alert(O.User.PushSubscription.optedIn?"Alerts enabled.":"Notifications were not enabled.")})};

async function loadPublic(){
  try{const s=await api("publicState");currentState=s;$("#activeTitle").textContent=s.copy.title;$("#activeSubtitle").textContent=s.copy.subtitle;$("#activeCount").textContent=s.activeCount;$("#roundStatus").textContent=s.gameFinished?"Finished":s.gameStarted?"Live":s.signupsOpen?"Sign-ups":"Waiting";$("#signupBtn").disabled=!s.signupsOpen;$("#feedTitle").textContent=s.activeGame==="curse"?"The curse spreads":"Latest casualties";
  $("#feedList").innerHTML=(s.feed||[]).length?s.feed.map(e=>`<div class="feed-item"><strong>${s.activeGame==="curse"?"Another staff member has fallen under the curse…":"Another player has fallen…"}</strong><br>${s.activeGame==="curse"?`A charm was completed in <b>${esc(e.location)}</b>.`:`Eliminated with <b>${esc(e.item)}</b> in <b>${esc(e.location)}</b>.`}<small>${esc(e.createdAt)}</small></div>`).join(""):'<div class="feed-item">Nothing to report yet.</div>';
  }catch(e){console.error(e)}
}
$("#signupBtn").onclick=async()=>{try{const d=await api("signup",{name:$("#signupName").value,pin:$("#signupPin").value});setStatus($("#signupStatus"),d.message,true);$("#loginName").value=$("#signupName").value;$("#loginPin").value=$("#signupPin").value}catch(e){setStatus($("#signupStatus"),e.message,false)}}
$("#loginBtn").onclick=login;
async function login(){try{const name=$("#loginName").value,pin=$("#loginPin").value,d=await api("login",{name,pin});currentPlayer={name,pin,...d.player};renderMission(d);setStatus($("#loginStatus"),"Assignment opened.",true)}catch(e){setStatus($("#loginStatus"),e.message,false)}}
function renderMission(d){$("#playerArea").classList.remove("hidden");const c=d.copy;$("#missionKicker").textContent=d.copy.title;$("#missionTitle").textContent=d.player.name+"'s assignment";$("#actorLabel").firstChild.textContent=d.copy.title==="The Curse"?"Who cursed you?":"Who got you?";$("#itemUsedLabel").firstChild.textContent=c.itemLabel+" used";$("#confirmHeading").textContent=d.copy.title==="The Curse"?"Confirm that you've been cursed":"Declare your death";
  if(d.player.status!==c.activeStatus){$("#missionCards").innerHTML=`<div class="notice">Your file is closed. Status: ${esc(d.player.status)}.</div>`;return}
  if(!d.gameStarted){$("#missionCards").innerHTML='<div class="notice">You are signed in. Your assignment will appear when the Game Master starts the round.</div>';return}
  $("#missionCards").innerHTML=`<div class="mission-cards"><div class="mission-card"><span>${esc(c.targetLabel)}</span><strong>${esc(d.player.targetName||"—")}</strong></div><div class="mission-card"><span>${esc(c.itemLabel)}</span><strong>${esc(d.player.item||"—")}</strong></div><div class="mission-card"><span>${esc(c.locationLabel)}</span><strong>${esc(d.player.location||"—")}</strong></div></div>`;
}
$("#confirmEventBtn").onclick=async()=>{if(!currentPlayer)return setStatus($("#eventStatus"),"Log in first.",false);try{const d=await api("confirmEvent",{name:currentPlayer.name,pin:currentPlayer.pin,actorName:$("#actorName").value,itemUsed:$("#itemUsed").value,locationUsed:$("#locationUsed").value,note:$("#eventNote").value});setStatus($("#eventStatus"),d.message,true);await login();await loadPublic()}catch(e){setStatus($("#eventStatus"),e.message,false)}}
$("#rerollBtn").onclick=async()=>{if(!currentPlayer)return setStatus($("#rerollStatus"),"Log in first.",false);try{const d=await api("requestReroll",{name:currentPlayer.name,pin:currentPlayer.pin,rerollItem:$("#rerollItem").checked,rerollLocation:$("#rerollLocation").checked,reason:$("#rerollReason").value});setStatus($("#rerollStatus"),d.message,true)}catch(e){setStatus($("#rerollStatus"),e.message,false)}}

$("#adminLoginBtn").onclick=adminLogin;
async function adminLogin(){try{const d=await api("adminLogin",{pin:$("#adminPin").value});renderAdmin(d);setStatus($("#adminStatus"),"Game Master access granted.",true)}catch(e){setStatus($("#adminStatus"),e.message,false)}}
function renderAdmin(d){
 const map=Object.fromEntries((d.players||[]).map(p=>[p.id,p.name]));
 const prows=(d.players||[]).map(p=>`<tr><td>${esc(p.name)}</td><td><span class="badge">${esc(p.status)}</span></td><td>${esc(map[p.current_target_id]||"")}</td><td>${esc(p.mission_item||"")}</td><td>${esc(p.mission_location||"")}</td></tr>`).join("")||'<tr><td colspan="5">No players yet.</td></tr>';
 const rrows=(d.rerolls||[]).filter(r=>r.status==="Pending").map(r=>`<tr><td>${esc(r.player_name)}</td><td>${r.reroll_item?"Item ":""}${r.reroll_location?"Location":""}</td><td>${esc(r.reason||"")}</td><td><button class="btn ghost approve" data-id="${r.id}">Approve</button> <button class="btn decline" data-id="${r.id}">Decline</button></td></tr>`).join("")||'<tr><td colspan="4">No pending requests.</td></tr>';
 $("#adminDashboard").classList.remove("hidden");
 $("#adminDashboard").innerHTML=`
 <div class="toolbar"><select id="gameSelect"><option value="christmas" ${d.settings.active_game==="christmas"?"selected":""}>Christmas Cluedo</option><option value="curse" ${d.settings.active_game==="curse"?"selected":""}>The Curse</option><option value="easter" ${d.settings.active_game==="easter"?"selected":""}>Golden Egg Hunt</option></select><button id="setGame" class="btn ghost">Set active game</button><button id="toggleSignup" class="btn ghost">${d.settings.signups_open?"Close":"Open"} sign-ups</button><button id="startGame" class="btn">Start game</button><button id="resetRound" class="btn danger">Reset round</button></div>
 <div class="admin-grid"><div class="card-inset"><h3>Players & assignments</h3><div class="table-wrap"><table><thead><tr><th>Player</th><th>Status</th><th>${esc(d.copy.targetLabel)}</th><th>${esc(d.copy.itemLabel)}</th><th>${esc(d.copy.locationLabel)}</th></tr></thead><tbody>${prows}</tbody></table></div></div>
 <div class="card-inset"><h3>${esc(d.copy.itemLabel)} bank</h3><textarea id="itemBank" rows="8">${esc((d.items||[]).map(x=>x.label).join("\n"))}</textarea><button id="saveItems" class="btn ghost full">Save bank</button><h3 style="margin-top:18px">Location bank</h3><textarea id="locationBank" rows="8">${esc((d.locations||[]).map(x=>x.label).join("\n"))}</textarea><button id="saveLocations" class="btn ghost full">Save locations</button></div></div>
 <div class="card-inset" style="margin-top:18px"><h3>Pending rerolls</h3><div class="table-wrap"><table><thead><tr><th>Player</th><th>Request</th><th>Reason</th><th></th></tr></thead><tbody>${rrows}</tbody></table></div></div>`;
 $("#setGame").onclick=async()=>{if(!confirm("Switching game resets the current round. Continue?"))return;await adminAction("setGame",{gameKey:$("#gameSelect").value})};
 $("#toggleSignup").onclick=()=>adminAction("toggleSignups",{open:!d.settings.signups_open});
 $("#startGame").onclick=()=>confirm("Generate all assignments and start the game?")&&adminAction("startGame",{});
 $("#resetRound").onclick=()=>confirm("Reset this round?")&&adminAction("resetRound",{});
 $("#saveItems").onclick=()=>saveList("replaceItems","#itemBank");
 $("#saveLocations").onclick=()=>saveList("replaceLocations","#locationBank");
 document.querySelectorAll(".approve").forEach(b=>b.onclick=()=>adminAction("resolveReroll",{requestId:b.dataset.id,approve:true}));
 document.querySelectorAll(".decline").forEach(b=>b.onclick=()=>adminAction("resolveReroll",{requestId:b.dataset.id,approve:false}));
}
async function adminAction(action,extra){try{const r=await api(action,{pin:$("#adminPin").value,...extra});setStatus($("#adminStatus"),r.message,true);await adminLogin();await loadPublic()}catch(e){setStatus($("#adminStatus"),e.message,false)}}
function saveList(action,sel){const items=$(sel).value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);adminAction(action,{items})}
installHelp();initPush();loadPublic();
