// Relative dimensions traced from the user's latest plan, not measured metres.
// +X east, +Z south. Furniture directions below were confirmed by the user.
export const HOUSE={left:-8.4,right:8.4,rear:-7.2,front:7.2,height:3.15,partitionLeft:-2.8,partitionRight:2.8};
export const ENTRY={x:-.25,z:7.24,width:1.8,height:2.48};
export const YARD={left:-9.8,right:8.4,rear:7.2,front:12.0,wallHeight:1.9,gate:{axis:'x',fixed:12,center:6.9,width:1.8,height:2.15},toilet:{left:-9.8,right:-7.8,rear:10.1,front:12.0,doorDirection:'north'}};
// Separate rooms: the original toilet remains, with a second one to its east.
export const TOILETS=[YARD.toilet,{left:-7.8,right:-5.7,rear:10.1,front:12,doorDirection:'north'}];
export const STAIRS={left:-9.65,right:-8.55,rear:-5.8,front:9.2,height:3.35,steps:48,landing:[-9.65,-8.1,-6.55,-5.72]};
export const BLACK_ROOM={left:-9.8,right:-8.4,rear:-5.6,front:-.4,height:2.03,doorCenter:-1.05,doorWidth:.9};
export const RAMP={left:5.4,right:8.4,rear:12,front:16,top:0,bottom:-.8};
export const START={position:[6.9,.92,15.65],lookAt:[6.9,1.5,10.8]};
export const MAP_BOUNDS=[-10.3,9,-7.8,16.6];
export const ROOM_AREAS=[
 {id:'living',name:'客厅',bounds:[-8.4,-2.8,-.1,7.2],note:'三面沙发，电视在东边。坐下来喝杯茶。'},
 {id:'hall',name:'大堂',bounds:[-2.8,2.8,-1.2,7.2],note:'生日蛋糕已经准备好，进来坐一会儿。'},
 {id:'bedroom',name:'西北卧室',bounds:[-8.4,-2.8,-7.2,-.1],note:'书桌旁的旧相框，留着一家人的时光。'},
 {id:'mine',name:'北侧卧室',bounds:[-2.8,2.8,-7.2,-1.2],note:'床和衣柜，还在记忆里的位置。'},
 {id:'kitchen',name:'厨房',bounds:[2.8,8.4,-7.2,.2],note:'案板上，留一道想一起吃的菜。'},
 {id:'other',name:'东南房间',bounds:[2.8,8.4,.2,7.2],note:'去电脑桌前坐一会儿，或者翻翻相册。'},
 {id:'black-room',name:'黑屋',bounds:[BLACK_ROOM.left,BLACK_ROOM.right,BLACK_ROOM.rear,BLACK_ROOM.front],note:'楼梯下面的黑屋，从西北卧室进来。'}
];
export const PORTALS=[
 {a:'outside',b:'hall',axis:'x',fixed:7.2,center:ENTRY.x,width:ENTRY.width,height:ENTRY.height,main:true},
 {a:'hall',b:'living',axis:'z',fixed:-2.8,center:1.1,width:1.35,height:2.35},
 {a:'living',b:'bedroom',axis:'x',fixed:-.1,center:-3.9,width:1.25,height:2.35},
 {a:'hall',b:'mine',axis:'x',fixed:-1.2,center:1.7,width:1.25,height:2.35},
 {a:'hall',b:'kitchen',axis:'z',fixed:2.8,center:-.55,width:1.05,height:2.35},
 {a:'hall',b:'other',axis:'z',fixed:2.8,center:1.1,width:1.25,height:2.35},
 {a:'bedroom',b:'black-room',axis:'z',fixed:HOUSE.left,center:BLACK_ROOM.doorCenter,width:BLACK_ROOM.doorWidth,height:1.96}
];
export const WINDOWS=[
 {axis:'x',fixed:-7.2,center:-6,width:2.0,bottom:1.05,height:1.35},
 {axis:'x',fixed:-7.2,center:0,width:2.0,bottom:1.05,height:1.35},
 {axis:'x',fixed:-7.2,center:5.8,width:2.0,bottom:1.05,height:1.35},
 {axis:'x',fixed:7.2,center:-5.7,width:2.2,bottom:1.05,height:1.35},
 {axis:'x',fixed:7.2,center:5.5,width:2.2,bottom:1.05,height:1.35}
];
export const FURNITURE={
 livingSofas:[{x:-7.8,z:3.9,angle:Math.PI/2,size:[3.0,1.08,.9]},{x:-6.1,z:.5,angle:0,size:[2.35,1.08,.85]},{x:-5.65,z:6.65,angle:Math.PI,size:[2.75,1.08,.9]}],
 livingTV:{x:-3.2,z:3.95,angle:-Math.PI/2,size:[2.65,.68,.55]},
 livingTea:{x:-5.45,z:3.85,size:[1.15,.52,1.65]},plant:{x:-3.75,z:6.15},porcelain:{x:-7.79,z:6.55,size:[.48,1.02,.48],angle:.2},
 hallSofas:[{x:-2.25,z:4.5,angle:Math.PI/2,size:[2.85,1.08,.88]},{x:2.25,z:4.5,angle:-Math.PI/2,size:[2.85,1.08,.88]}],
 hallTV:{x:-.55,z:-.84,angle:0,size:[2.6,.97,.48]},birthday:{x:0,z:4.25,w:1.3,d:.9},
 northwestBed:{x:-4.02,z:-3.6,angle:-Math.PI/2},northwestDesk:{x:-7.91,z:-5.2,angle:Math.PI/2},northwestWardrobe:{x:-7.94,z:-2.4,angle:Math.PI/2},
 northBed:{x:-.5,z:-2.42,angle:Math.PI},northWardrobe:{x:-2.4,z:-5.2,angle:Math.PI/2},
 southeastBed:{x:4.0,z:4.05,angle:Math.PI/2},southeastDesk:{x:4.35,z:6.65,angle:Math.PI},
 kitchenCounter:{x:7.85,z:-3.5,angle:-Math.PI/2}
};
