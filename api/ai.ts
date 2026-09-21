function send(res:any,status:number,body:unknown){res.status(status).json(body)}
export default async function handler(req:any,res:any){
 if(req.method!=='POST') return send(res,405,{error:'Méthode non autorisée.'});
 const key=process.env.GEMINI_API_KEY||process.env.GOOGLE_AI_API_KEY;
 if(!key) return send(res,500,{error:'GEMINI_API_KEY est absente côté serveur.'});
 const b=typeof req.body==='string'?JSON.parse(req.body):req.body;
 if(!b?.prompt) return send(res,400,{error:'Prompt requis.'});
 const model=process.env.GEMINI_MODEL||'gemini-2.5-flash';
 const parts:any[]=[{text:b.prompt}];
 if(b.mode==='vision'&&b.imageData) parts.push({inline_data:{mime_type:b.mimeType||'image/jpeg',data:String(b.imageData).replace(/^data:[^;]+;base64,/,'')}});
 try{
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts}],generationConfig:{temperature:0.2,responseMimeType:'application/json'}})});
  const p=await r.json();
  if(!r.ok) return send(res,r.status>=500?502:r.status,{error:p?.error?.message||'Erreur fournisseur IA.'});
  const text=p?.candidates?.[0]?.content?.parts?.map((x:any)=>x.text||'').join('')||'';
  if(!text) return send(res,502,{error:'Réponse IA vide.'});
  return send(res,200,{text,model,provider:'gemini'});
 }catch(e){return send(res,502,{error:e instanceof Error?e.message:'Erreur réseau IA.'})}
}
