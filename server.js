const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const rooms = new Map();
const server = http.createServer((req,res)=>{
  const file = req.url === "/" ? "index.html" : path.basename(req.url.split("?")[0]);
  if (file !== "index.html") { res.writeHead(404); return res.end("Not found"); }
  fs.readFile(path.join(__dirname,"index.html"),(err,data)=>{
    if(err){res.writeHead(500);return res.end("No se pudo cargar la aplicación");}
    res.writeHead(200,{"Content-Type":"text/html; charset=utf-8","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","Cache-Control":"no-store"});
    res.end(data);
  });
});
const wss = new WebSocket.Server({server, maxPayload: 64*1024});
function send(ws,obj){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj));}
function members(room){return [...(rooms.get(room)||[])].map(c=>({id:c.id,name:c.name}));}
function broadcast(room,obj,except=null){for(const c of rooms.get(room)||[])if(c!==except)send(c,obj);}
function leave(ws){
  if(!ws.room)return;
  const room=ws.room;const set=rooms.get(room);if(set){set.delete(ws);broadcast(room,{type:"peer-left",id:ws.id,name:ws.name});broadcast(room,{type:"members",members:members(room)});if(!set.size)rooms.delete(room);}
  ws.room=null;
}
wss.on("connection",ws=>{
  ws.id=require("crypto").randomUUID();ws.room=null;ws.name="Invitado";
  ws.on("message",raw=>{
    let m;try{m=JSON.parse(raw.toString());}catch{return send(ws,{type:"error",message:"Mensaje no válido"});}
    if(m.type==="join"){
      if(ws.room)return;
      const room=String(m.room||"").replace(/[^a-z0-9_-]/g,"").slice(0,40);
      if(!room)return send(ws,{type:"error",message:"Nombre de sala no válido"});
      ws.room=room;ws.name=String(m.name||"Invitado").replace(/[<>]/g,"").slice(0,24)||"Invitado";
      if(!rooms.has(room))rooms.set(room,new Set());
      const set=rooms.get(room);const existing=[...set];
      set.add(ws);
      send(ws,{type:"welcome",id:ws.id});
      send(ws,{type:"members",members:members(room)});
      existing.forEach(peer=>send(ws,{type:"peer-joined",id:peer.id,name:peer.name}));
      broadcast(room,{type:"peer-joined",id:ws.id,name:ws.name},ws);
      broadcast(room,{type:"members",members:members(room)});
      return;
    }
    if(!ws.room)return send(ws,{type:"error",message:"Conéctate primero a una sala"});
    if(m.type==="chat"){
      if(!m.payload||typeof m.payload.iv!=="string"||typeof m.payload.data!=="string"||m.payload.data.length>12000)return;
      broadcast(ws.room,{type:"chat",name:ws.name,payload:m.payload},ws);
    } else if(m.type==="signal"){
      const target=[...(rooms.get(ws.room)||[])].find(c=>c.id===m.to);
      if(target&&m.data&&typeof m.data==="object")send(target,{type:"signal",from:ws.id,data:m.data});
    }
  });
  ws.on("close",()=>leave(ws));
  ws.on("error",()=>leave(ws));
});
server.listen(PORT,HOST,()=>console.log(`NEXCHAT escuchando en http://${HOST}:${PORT}`));
