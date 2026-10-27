const CACHE='daybook-v1';
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const root=new URL('./',self.location.href);
    const response=await fetch(root,{cache:'reload'});
    if(!response.ok)throw new Error('App shell unavailable');
    const html=await response.clone().text();await cache.put(root,response);
    const paths=[...html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css))"/g)].map(m=>new URL(m[1],root).href);
    await cache.addAll([...paths,new URL('icon.svg',root).href,new URL('manifest.webmanifest',root).href]);
  })());
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('daybook-')&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    if(event.request.mode==='navigate'){
      try{const res=await fetch(event.request);if(res.ok)await cache.put(event.request,res.clone());return res;}
      catch{return await cache.match(new URL('./',self.location.href))||Response.error();}
    }
    const found=await cache.match(event.request);if(found)return found;
    const res=await fetch(event.request);if(res.ok)await cache.put(event.request,res.clone());return res;
  })());
});
