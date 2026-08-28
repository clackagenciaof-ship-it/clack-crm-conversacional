"use client";

import { useEffect, useRef } from 'react';

declare global { interface Window { L?: any; } }

type Point={id:string;lat:number;lng:number;title:string;subtitle?:string;kind?:'territory'|'contact'};

function loadLeaflet(){
  return new Promise<any>((resolve,reject)=>{
    if(window.L)return resolve(window.L);
    if(!document.querySelector('link[data-clack-leaflet]')){
      const link=document.createElement('link');link.rel='stylesheet';link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';link.setAttribute('data-clack-leaflet','1');document.head.appendChild(link);
    }
    const existing=document.querySelector('script[data-clack-leaflet]') as HTMLScriptElement|null;
    if(existing){existing.addEventListener('load',()=>resolve(window.L),{once:true});existing.addEventListener('error',reject,{once:true});return;}
    const script=document.createElement('script');script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';script.async=true;script.setAttribute('data-clack-leaflet','1');
    script.onload=()=>resolve(window.L);script.onerror=reject;document.body.appendChild(script);
  });
}

export function LeafletMap({points,selectedId,onSelect}:{points:Point[];selectedId?:string;onSelect?:(id:string)=>void}){
  const el=useRef<HTMLDivElement|null>(null);
  const mapRef=useRef<any>(null);

  useEffect(()=>{
    let cancelled=false;
    loadLeaflet().then((L:any)=>{
      if(cancelled||!el.current)return;
      if(mapRef.current){mapRef.current.remove();mapRef.current=null;}
      const selected=points.find(p=>p.id===selectedId)||points[0];
      const center=selected?[selected.lat,selected.lng]:[-14.235,-51.9253];
      const map=L.map(el.current,{zoomControl:true,scrollWheelZoom:true}).setView(center,selected?9:4);
      mapRef.current=map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:19,attribution:'&copy; OpenStreetMap contributors'
      }).addTo(map);

      const bounds:any[]=[];
      points.forEach(point=>{
        const marker=L.marker([point.lat,point.lng]).addTo(map);
        marker.bindPopup(`<strong>${point.title}</strong><br/><span>${point.subtitle||''}</span>`);
        marker.on('click',()=>onSelect?.(point.id));
        bounds.push([point.lat,point.lng]);
        if(point.id===selectedId)marker.openPopup();
      });
      if(bounds.length>1)map.fitBounds(bounds,{padding:[34,34],maxZoom:11});
      setTimeout(()=>map.invalidateSize(),120);
    }).catch(()=>{if(el.current)el.current.innerHTML='<div class="empty">Não foi possível carregar o mapa interativo.</div>';});
    return()=>{cancelled=true;if(mapRef.current){mapRef.current.remove();mapRef.current=null;}};
  },[points,selectedId,onSelect]);

  return <div ref={el} className="leaflet-map" aria-label="Mapa interativo Leaflet e OpenStreetMap"/>;
}
