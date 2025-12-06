// ----------------- CONFIG FIREBASE -----------------
const firebaseConfig = {
  apiKey: "AIzaSyCkmqu60VH5bsHE4c8J0fZesiPGBFJprw0",
  authDomain: "dark-academy-dc5f4.firebaseapp.com",
  databaseURL: "https://dark-academy-dc5f4-default-rtdb.firebaseio.com",
  projectId: "dark-academy-dc5f4",
  storageBucket: "dark-academy-dc5f4.firebasestorage.app",
  messagingSenderId: "182340690460",
  appId: "1:182340690460:web:ee84ca564efb931a7535d9",
  measurementId: "G-66Q9VXG8CE"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ----------------- LOGIN -----------------
function login(){
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    if(!email || !password){ alert("Preencha todos os campos!"); return; }
    database.ref("users").once("value").then(snap=>{
        let loggedIn = false;
        snap.forEach(userSnap=>{
            const user = userSnap.val();
            if(user.email===email && user.password===password){
                loggedIn = true;
                localStorage.setItem("currentUser", userSnap.key);
                localStorage.setItem("currentNick", user.nick);
                window.location.href = "dashboard.html";
            }
        });
        if(!loggedIn){ alert("Email ou senha incorretos!"); }
    });
}

// ----------------- REGISTRO -----------------
function register(){
    const nick = document.getElementById("register-nick").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    if(!nick || !email || !password){ alert("Preencha todos os campos!"); return; }
    const userId = 'user_'+Date.now();
    database.ref("users/" + userId).set({
        nick: nick,
        email: email,
        password: password,
        profilePic: "default-profile.png",
        stats: {}
    }).then(()=>{
        alert("Cadastro realizado com sucesso!");
        localStorage.setItem("currentUser", userId);
        localStorage.setItem("currentNick", nick);
        window.location.href = "dashboard.html";
    }).catch((err)=>{ alert("Erro ao cadastrar: "+err); });
}

// ----------------- DASHBOARD -----------------
let currentUserId = localStorage.getItem("currentUser");
let currentUserNick = localStorage.getItem("currentNick");
let currentMode = "bedwars";
const allowedVideoUsers = ["DARK","ARTHUR","60k"];
const modeContainer = document.getElementById("mode-container");
let chatListener=null;
let chattingWith = null;

if(currentUserId && document.getElementById("welcome")){
    database.ref("users/" + currentUserId).once("value").then(snap=>{
        const user = snap.val();
        if(user){
            document.getElementById("welcome").innerText = `Bem-vindo, ${user.nick}`;
            document.getElementById("profile-pic").src = user.profilePic || "default-profile.png";
            updateRanking();
            loadPendingValidations();
        } else {
            localStorage.removeItem("currentUser");
            window.location.href = "index.html";
        }
    });
}

// ----------------- EDITAR PERFIL -----------------
function editProfile(){
    const newNick = prompt("Digite seu novo nick:", "");
    if(newNick){
        database.ref(`users/${currentUserId}/nick`).set(newNick).then(()=>{
            alert("Nick atualizado!");
            document.getElementById("welcome").innerText = `Bem-vindo, ${newNick}`;
            currentUserNick = newNick;
            updateRanking();
        });
    }
    const newPic = prompt("URL da nova foto de perfil:", "");
    if(newPic){
        database.ref(`users/${currentUserId}/profilePic`).set(newPic).then(()=>{
            document.getElementById("profile-pic").src = newPic;
            alert("Foto de perfil atualizada!");
        });
    }
}

// ----------------- NOTIFICAÇÕES -----------------
function notify(message, color="#00ff00"){
    const container = document.getElementById("notifications");
    const div = document.createElement("div");
    div.style.background=color;
    div.style.color="#000";
    div.style.padding="5px 10px";
    div.style.marginTop="5px";
    div.style.borderRadius="5px";
    div.innerText = message;
    container.appendChild(div);
    setTimeout(()=>container.removeChild(div), 5000);
}

// ----------------- MODOS -----------------
function showMode(mode){
    currentMode = mode;
    modeContainer.innerHTML="";
    const submitBtn = document.createElement("button");
    submitBtn.innerText="Enviar";
    submitBtn.onclick = submitStats;

    if(mode==="freefire"){
        const kills = document.createElement("input"); kills.placeholder="Kills"; kills.id="stat-kills";
        const partidas = document.createElement("input"); partidas.placeholder="Partidas"; partidas.id="stat-partidas";
        const dano = document.createElement("input"); dano.placeholder="Dano"; dano.id="stat-dano";
        const modoInput = document.createElement("select"); modoInput.id="stat-modo";
        ["Rankeado","CS"].forEach(m=>{ const option=document.createElement("option"); option.value=m; option.text=m; modoInput.appendChild(option); });
        const video = document.createElement("input"); video.placeholder="URL do vídeo"; video.id="stat-video";
        modeContainer.append(kills, partidas, dano, modoInput, video, submitBtn);
        return;
    }

    if(mode==="clashroyale"){
        const trofeus = document.createElement("input"); trofeus.placeholder="Troféus"; trofeus.id="stat-trofeus";
        const video = document.createElement("input"); video.placeholder="URL do vídeo"; video.id="stat-video";
        modeContainer.append(trofeus, video, submitBtn);
        return;
    }

    // BedWars / Fortnite
    const kills = document.createElement("input"); kills.placeholder="Kills"; kills.id="stat-kills";
    const wins = document.createElement("input"); wins.placeholder="Vitórias"; wins.id="stat-wins";
    if(mode==="fortnite") wins.style.display="none";
    const partidas = document.createElement("input"); partidas.placeholder="Partidas"; partidas.id="stat-partidas";
    let serverInput=null;
    if(mode==="bedwars"){
        serverInput = document.createElement("select"); serverInput.id="stat-server";
        ["Hylex","Mush","Hypixel"].forEach(s=>{ const option=document.createElement("option"); option.value=s; option.text=s; serverInput.appendChild(option); });
    }
    const video = document.createElement("input"); video.placeholder="URL do vídeo"; video.id="stat-video";
    modeContainer.append(kills, wins.style.display!=="none"?wins:null, partidas);
    if(serverInput) modeContainer.appendChild(serverInput);
    modeContainer.appendChild(video);
    modeContainer.appendChild(submitBtn);
}

// ----------------- ENVIO DE STATS -----------------
function submitStats(){
    let data = {nick: currentUserNick};
    if(currentMode==="freefire"){
        data.kills = Number(document.getElementById("stat-kills").value)||0;
        data.partidas = Number(document.getElementById("stat-partidas").value)||0;
        data.dano = Number(document.getElementById("stat-dano").value)||0;
        data.modo = document.getElementById("stat-modo").value;
        data.video = document.getElementById("stat-video").value||"";
    } else if(currentMode==="clashroyale"){
        data.trofeus = Number(document.getElementById("stat-trofeus").value)||0;
        data.video = document.getElementById("stat-video").value||"";
    } else {
        data.kills = Number(document.getElementById("stat-kills").value)||0;
        const winsEl=document.getElementById("stat-wins"); data.wins = winsEl ? Number(winsEl.value) : 0;
        data.partidas = Number(document.getElementById("stat-partidas").value)||0;
        const serverEl=document.getElementById("stat-server"); data.server = serverEl ? serverEl.value : "";
        data.video = document.getElementById("stat-video").value||"";
    }
    database.ref(`pendingValidations/${currentMode}/${currentUserId}`).set(data).then(()=>{
        alert("Stats enviados para validação!");
        modeContainer.innerHTML="";
    });
}

// ----------------- PENDENTES -----------------
function loadPendingValidations(){
    if(!allowedVideoUsers.includes(currentUserNick)) return;
    let container=document.getElementById("validation-container");
    if(!container){ container=document.createElement("div"); container.id="validation-container"; document.body.appendChild(container); }
    database.ref("pendingValidations").on("value",snap=>{
        container.innerHTML="<h2>Validações Pendentes</h2>";
        snap.forEach(modeSnap=>{
            const mode = modeSnap.key;
            modeSnap.forEach(userSnap=>{
                const data = userSnap.val();
                const div = document.createElement("div");
                div.style.background="#1a001a"; div.style.margin="5px"; div.style.padding="10px"; div.style.borderRadius="10px"; div.style.color="#fff";
                let statsText="";
                if(mode==="clashroyale") statsText = `Troféus: ${data.trofeus}`;
                else if(mode==="freefire") statsText = `Kills: ${data.kills}, Partidas: ${data.partidas}, Dano: ${data.dano}, Modo: ${data.modo}`;
                else statsText = `Kills: ${data.kills}, Vitórias: ${data.wins}, Partidas: ${data.partidas}`;
                div.innerHTML=`
                    <strong>${data.nick}</strong> (${mode}) - ${statsText}
                    <button class="validate-btn">Validar</button>
                    <button class="reject-btn">Não Validado</button>
                    ${data.video ? `<a href="${data.video}" target="_blank">Vídeo</a>` : ""}
                `;

                // VALIDAR
                div.querySelector(".validate-btn").onclick=()=>{
                    database.ref(`users/${userSnap.key}/stats/${mode}`).set(data).then(()=>{
                        database.ref(`pendingValidations/${mode}/${userSnap.key}`).remove();
                        notify(`${data.nick} foi validado e entrou no ranking!`);
                        updateRanking();
                    });
                };

                // NÃO VALIDADO
                div.querySelector(".reject-btn").onclick=()=>{
                    database.ref(`pendingValidations/${mode}/${userSnap.key}`).remove();
                    notify(`${data.nick} NÃO foi validado!`, "#ff0000");
                    updateRanking();
                };

                container.appendChild(div);
            });
        });
    });
}

// ----------------- RANKING -----------------
function updateRanking(){
    const rankingIds = {
        bedwars: "ranking-bedwars",
        fortnite: "ranking-fortnite",
        freefire: "ranking-freefire",
        clashroyale: "ranking-clashroyale"
    };
    Object.values(rankingIds).forEach(id=>{
        const el = document.getElementById(id);
        if(el) el.innerHTML = `<h3>${el.querySelector("h3").innerText}</h3>`; 
    });

    database.ref("users").once("value").then(snap=>{
        snap.forEach(u=>{
            const userData = u.val();
            Object.keys(rankingIds).forEach(mode=>{
                const stats = userData.stats ? userData.stats[mode] : null;
                if(!stats) return;
                const rankingDiv = document.getElementById(rankingIds[mode]);
                if(!rankingDiv) return;
                const div = document.createElement("div");
                div.classList.add("rank-card");
                let statsHTML = "";
                if(mode==="clashroyale") statsHTML=`<span>Troféus: ${stats.trofeus||0}</span>`;
                else if(mode==="freefire") statsHTML=`<span>Kills: ${stats.kills||0}</span><span>Partidas: ${stats.partidas||0}</span><span>Dano: ${stats.dano||0}</span><span>Modo: ${stats.modo||"-"}</span>`;
                else statsHTML=`<span>Kills: ${stats.kills||0}</span><span>Vitórias: ${stats.wins||0}</span><span>Partidas: ${stats.partidas||0}</span>`;
                
                div.innerHTML=`
                    <img class="rank-pic" src="${userData.profilePic||'default-profile.png'}" alt="Foto">
                    <div class="rank-info">
                        <span>${userData.nick}</span>
                        ${statsHTML}
                    </div>
                `;
                div.onclick=()=>openChat(u.key,userData.nick);

                // BOTÃO REMOVER (apenas admins)
                if(allowedVideoUsers.includes(currentUserNick)){
                    const removeBtn = document.createElement("button");
                    removeBtn.innerText = "Remover do Rank";
                    removeBtn.style.marginLeft="10px";
                    removeBtn.onclick=(e)=>{
                        e.stopPropagation();
                        database.ref(`users/${u.key}/stats/${mode}`).remove().then(()=>{
                            notify(`${userData.nick} foi removido do ranking!`, "#ff9900");
                            updateRanking();
                        });
                    };
                    div.appendChild(removeBtn);
                }

                rankingDiv.appendChild(div);
            });
        });
    });
}

// ----------------- CHAT -----------------
function openChat(userId,nick){
    chattingWith=userId;
    document.getElementById("chat-with").innerText=nick;
    document.getElementById("chat-container").style.display="block";

    if(chatListener) chatListener.off();

    const messagesDiv=document.getElementById("chat-messages");
    chatListener=database.ref(`chats/${currentUserId}/${chattingWith}`);
    chatListener.on("value",snap=>{
        messagesDiv.innerHTML="";
        snap.forEach(s=>{
            const m = s.val();
            const div = document.createElement("div");
            div.innerText=`${m.from===currentUserId ? "Você" : "Outro"}: ${m.text}`;
            messagesDiv.appendChild(div);
        });
        messagesDiv.scrollTop=messagesDiv.scrollHeight;
    });
}

function closeChat(){
    if(chatListener) chatListener.off();
    chattingWith=null;
    document.getElementById("chat-container").style.display="none";
}

function sendMessage(){
    const msgInput=document.getElementById("chat-input");
    if(!chattingWith || msgInput.value==="") return;
    const msg={from:currentUserId,text:msgInput.value,timestamp:Date.now()};
    database.ref(`chats/${currentUserId}/${chattingWith}`).push(msg);
    database.ref(`chats/${chattingWith}/${currentUserId}`).push(msg);
    msgInput.value="";
}
