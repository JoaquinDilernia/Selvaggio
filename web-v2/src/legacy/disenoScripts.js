// Interacciones del diseño original (vanilla JS) portadas tal cual: operan sobre
// el DOM de las secciones generadas, que React no vuelve a renderizar.
import { MARIDAJES as MZ } from '../data/maridajes.js';

export function initMaridaje() {
var ON="display: inline-flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 18px; border: 1px solid #440A33; background: #440A33; color: #EDE9E2; font-family: Lora, Georgia, serif; font-size: 15px; cursor: pointer;",OFF="display: inline-flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 18px; border: 1px solid rgba(68,10,51,.25); background: #FFFFFF; color: #2A0B20; font-family: Lora, Georgia, serif; font-size: 15px; cursor: pointer;";document.querySelectorAll(".mzchip").forEach(function(c){c.addEventListener("click",function(){var m=MZ[+c.dataset.i];document.querySelectorAll(".mzchip").forEach(function(o){o.setAttribute("style",o===c?ON:OFF);o.setAttribute("aria-pressed",o===c?"true":"false")});["name","type","desc","tip","dato"].forEach(function(k){document.getElementById("mz-"+k).textContent=m[{name:"n",type:"t",desc:"d",tip:"tip",dato:"dato"}[k]]});document.getElementById("mz-dot").style.background=m.c;var it=document.querySelectorAll(".mzi");for(var j=0;j<3;j++)it[j].textContent=m.i[j];});});
}

export function initPresupuesto() {
var ON='display: inline-flex; align-items: center; min-height: 44px; padding: 0 18px; border: 1px solid #440A33; background: #440A33; color: #EDE9E2; font-family: Lora, Georgia, serif; font-size: 15px; cursor: pointer;';
var OFFS=document.querySelector('.chip')?document.querySelector('.chip').getAttribute('style'):'';var sel={};
function low(x){return x.charAt(0).toLowerCase()+x.slice(1)}
function upd(){var n=document.getElementById('presu-name').value.trim(),t=document.getElementById('presu-tel').value.trim();
var lugar=sel.lugar==='Lo que nos recomienden'?'Selvaggio':(sel.lugar||'___');var tipo=sel.tipo?(sel.tipo==='Otro tipo de evento'?'un evento':(sel.tipo==='Mi fin de año'?'mi fin de año':low(sel.tipo))):'___';
var cu=sel.cuando?(sel.cuando==='Todavía no sé'?'sin fecha definida todavía':low(sel.cuando)):'___';var pe=sel.pers?sel.pers.toLowerCase():'___';
var m='¡Hola! Soy '+(n||'___')+'.\nQuiero organizar '+tipo+' en '+lugar+'.\nSomos '+pe+'.\nLo pensamos '+cu+'.\n¿Me pasan una propuesta?';
document.getElementById('presu-msg').textContent=m;document.getElementById('presu-btn').href='https://wa.me/5491166864692?text='+encodeURIComponent(m+(t?'\nMi WhatsApp: '+t:''));}
document.querySelectorAll('.chip').forEach(function(c){c.addEventListener('click',function(){var g=c.dataset.g;sel[g]=c.dataset.v;document.querySelectorAll('.chip[data-g="'+g+'"]').forEach(function(o){o.setAttribute('style',o===c?ON:OFFS);o.setAttribute('aria-pressed',o===c?'true':'false');});upd();});});
document.getElementById('presu-name').addEventListener('input',upd);document.getElementById('presu-tel').addEventListener('input',upd);document.getElementById('presu-form').addEventListener('submit',function(e){e.preventDefault()});var M=document.getElementById('presu-modal');function op(e){e.preventDefault();M.style.display='flex';}document.querySelectorAll('a[href="#presupuesto"]').forEach(function(a){a.addEventListener('click',op)});document.getElementById('presu-close').addEventListener('click',function(){M.style.display='none'});M.addEventListener('click',function(e){if(e.target===M)M.style.display='none'});document.addEventListener('keydown',function(e){if(e.key==='Escape')M.style.display='none'});upd();

}
