import sys, math, json, random, subprocess
import numpy as np, cairo
S=sys.argv[1]; OUT=sys.argv[2]; ONLY=[float(x) for x in sys.argv[3:]]  # optional preview times
W,H,FPS=1080,1920,30
O=0.8; SP=1.06; T=lambda t: O+t/SP
END=63.5
SERIF="Caladea"; SANS="Inter"; MONO="JetBrains Mono"
RED=(0.78,0.24,0.20)
def ease(x): x=min(max(x,0),1); return x*x*(3-2*x)
def lerp(a,b,u): return a+(b-a)*u
def clamp(x,a=0,b=1): return max(a,min(b,x))
# ---------------- captions ----------------
words=[w for w in json.load(open(f"{S}/audio/words.json"))["words"] if w["type"]=="word" and not w["text"].startswith("[") and not w["text"].endswith("]")]
REP={"zweihundertzwölf":"212","zweihundertsieben.":"207.","Drei":"3:14","Uhr":"Uhr","vierzehn.":"","vier":"4:02","zwei.":"Uhr."}
phr=[];cur=[]
for i,w in enumerate(words):
    tx=w["text"]
    if tx=="…":
        if cur: cur[-1]["text"]+=" …"
        elif phr: phr[-1][-1]["text"]+=" …"
        continue
    w=dict(w)
    cur.append(w)
    L=sum(len(x["text"])+1 for x in cur)
    nxt=words[i+1]["text"] if i+1<len(words) else ""
    if tx[-1] in ".:" or (nxt=="…" and L>14) or L>60:
        phr.append(cur);cur=[]
if cur: phr.append(cur)
CAPS=[]
for k,p in enumerate(phr):
    txt=" ".join(x["text"] for x in p)
    txt=(txt.replace("zweihundertzwölf","212").replace("Bild zweihundertsieben.","Bild 207.")
            .replace("Drei Uhr vierzehn.","3:14 Uhr.").replace("von vier Uhr zwei.","von 4:02 Uhr."))
    st=T(p[0]["start"]); en=T(p[-1]["end"])+0.45
    if k+1<len(phr): en=min(en,T(phr[k+1][0]["start"])-0.03)
    CAPS.append((st,en,txt))
CAPS=[c for c in CAPS if c[0]>5.4]   # hook is shown as title instead
# ---------------- drawing helpers ----------------
def rgb(c): return (c[0]/255,c[1]/255,c[2]/255) if max(c)>1 else c
def lin_grad(ctx,x0,y0,x1,y1,stops):
    g=cairo.LinearGradient(x0,y0,x1,y1)
    for o,c in stops: g.add_color_stop_rgba(o,*rgb(c[:3]),c[3] if len(c)>3 else 1)
    return g
def glow(ctx,x,y,r,c,a):
    g=cairo.RadialGradient(x,y,0,x,y,r); c=rgb(c)
    g.add_color_stop_rgba(0,*c,a); g.add_color_stop_rgba(0.4,*c,a*0.35); g.add_color_stop_rgba(1,*c,0)
    ctx.set_source(g); ctx.arc(x,y,r,0,2*math.pi); ctx.fill()
def text_center(ctx,txt,y,size,font=SERIF,bold=False,color=(0.88,0.86,0.82),alpha=1,spacing=0,x=W/2):
    ctx.select_font_face(font,cairo.FONT_SLANT_NORMAL,cairo.FONT_WEIGHT_BOLD if bold else cairo.FONT_WEIGHT_NORMAL)
    ctx.set_font_size(size)
    if spacing:
        widths=[ctx.text_extents(ch).x_advance+spacing for ch in txt]; tw=sum(widths)-spacing
        xx=x-tw/2
        for ch,wd in zip(txt,widths):
            ctx.move_to(xx,y); ctx.set_source_rgba(*color,alpha); ctx.show_text(ch); xx+=wd
        return
    e=ctx.text_extents(txt); ctx.move_to(x-e.x_advance/2,y)
    ctx.set_source_rgba(*color,alpha); ctx.show_text(txt)
def wrap(ctx,txt,size,maxw,font=SERIF,bold=False):
    ctx.select_font_face(font,cairo.FONT_SLANT_NORMAL,cairo.FONT_WEIGHT_BOLD if bold else cairo.FONT_WEIGHT_NORMAL); ctx.set_font_size(size)
    lines=[[]]
    for wd in txt.split():
        trial=" ".join(lines[-1]+[wd])
        if ctx.text_extents(trial).x_advance>maxw and lines[-1]: lines.append([wd])
        else: lines[-1].append(wd)
    return [" ".join(l) for l in lines]
def shadow_text(ctx,txt,y,size,alpha,bold=False,color=(0.9,0.88,0.84),font=SERIF):
    for dx,dy,a in ((0,4,0.55),(0,2,0.4)):
        text_center(ctx,txt,y+dy,size,font,bold,(0,0,0),alpha*a)
    text_center(ctx,txt,y,size,font,bold,color,alpha)
rnd=random.Random(4)
# shapes
def palm(ctx,x,y,h,lean=0.15,sway=0.0,col=(0.03,0.035,0.04)):
    ctx.set_source_rgb(*col)
    tx,ty=x+lean*h,y-h
    ctx.set_line_width(h*0.035); ctx.move_to(x,y); ctx.curve_to(x+lean*h*0.2,y-h*0.5,tx-lean*h*0.2,ty+h*0.2,tx,ty); ctx.stroke()
    for i in range(13):
        a=-math.pi/2+(i-6)*0.42+sway*math.sin(i)
        L=h*(0.30+0.06*math.sin(i*1.7))
        ex=tx+L*math.cos(a); ey=ty+L*math.sin(a)+L*0.35*abs(math.cos(a))
        nx,ny=-math.sin(a),math.cos(a)
        ctx.move_to(tx,ty)
        ctx.curve_to(tx+L*0.5*math.cos(a)+nx*h*0.03,ty+L*0.5*math.sin(a)-h*0.02+ny*h*0.03,ex,ey-L*0.15,ex,ey)
        ctx.curve_to(ex,ey-L*0.1,tx+L*0.5*math.cos(a)-nx*h*0.02,ty+L*0.5*math.sin(a),tx,ty)
        ctx.fill()
def palmetto(ctx,x,y,s,col,sway=0.0,t=0):
    ctx.set_source_rgb(*col)
    for i in range(15):
        a=-math.pi+0.12+i*(math.pi-0.24)/14 + sway*math.sin(t*1.3+i)
        L=s*(0.75+0.25*math.sin(i*2.1))
        ex=x+L*math.cos(a); ey=y+L*math.sin(a)
        nx,ny=-math.sin(a)*s*0.035,math.cos(a)*s*0.035
        ctx.move_to(x+nx,y+ny); ctx.line_to(ex,ey); ctx.line_to(x-nx,y-ny); ctx.close_path(); ctx.fill()
def grass(ctx,x0,x1,y,hmax,col,seed=1,t=0):
    r=random.Random(seed); ctx.set_source_rgb(*col)
    x=x0
    while x<x1:
        h=r.uniform(0.3,1)*hmax; w=r.uniform(4,9); lean=r.uniform(-6,6)+2*math.sin(t*1.5+x*0.02)
        ctx.move_to(x,y); ctx.line_to(x+w/2+lean,y-h); ctx.line_to(x+w,y); ctx.close_path(); ctx.fill(); x+=w*0.7
def can(ctx,x,y,s,ang=0,lid=True,col=(0.05,0.06,0.06),lidoff=(0,0,0)):
    ctx.save(); ctx.translate(x,y); ctx.rotate(ang)
    w,h=60*s,84*s
    ctx.set_source_rgb(*col)
    ctx.move_to(-w/2,-h); ctx.line_to(w/2,-h); ctx.line_to(w/2*0.88,0); ctx.line_to(-w/2*0.88,0); ctx.close_path(); ctx.fill()
    ctx.set_source_rgba(1,1,1,0.05)
    for k in (-0.25,0,0.25): ctx.rectangle(k*w-1.5*s,-h+10*s,3*s,h-16*s); ctx.fill()
    ctx.restore()
    if lid:
        ctx.save(); ctx.translate(x+lidoff[0],y+lidoff[1]); ctx.rotate(ang+lidoff[2])
        ctx.set_source_rgb(*col); ctx.rectangle(-w/2-5*s,-h-10*s,w+10*s,11*s); ctx.fill(); ctx.rectangle(-10*s,-h-17*s,20*s,8*s); ctx.fill()
        ctx.restore()
def eyes(ctx,x,y,s,openness,col=(1.0,0.86,0.55),gl=1.0,gap=26):
    if openness<=0.02: return
    for dx in (-gap*s/2,gap*s/2):
        glow(ctx,x+dx,y,40*s*gl,col,0.55*openness)
        ctx.save(); ctx.translate(x+dx,y); ctx.scale(1,max(0.08,openness)); ctx.arc(0,0,5*s,0,2*math.pi)
        ctx.set_source_rgba(1,0.97,0.9,openness); ctx.fill(); ctx.restore()
def creature(ctx,x,y,s,breath=0,col=(0.02,0.018,0.016),hair=None,lean=0.0):
    """front view hunched, x,y = bottom center, ~ 520*s tall"""
    ctx.save(); ctx.translate(x,y); ctx.scale(s,s*(1+0.012*breath)); ctx.rotate(lean)
    ctx.set_source_rgb(*col)
    # shoulders/body
    ctx.move_to(-230,0); ctx.curve_to(-250,-180,-220,-330,-120,-380); ctx.curve_to(-70,-420,70,-420,120,-380)
    ctx.curve_to(220,-330,250,-180,230,0); ctx.close_path(); ctx.fill()
    # head
    ctx.arc(0,-420,78,0,2*math.pi); ctx.fill()
    # arms hanging
    for sg in (-1,1):
        ctx.move_to(sg*170,-330); ctx.curve_to(sg*290,-240,sg*300,-60,sg*270,40); ctx.line_to(sg*215,40); ctx.curve_to(sg*230,-80,sg*210,-200,sg*130,-280); ctx.fill()
    # shaggy fringe
    r=random.Random(9)
    ctx.set_line_width(5)
    for i in range(160):
        a=r.uniform(-math.pi*0.95,-math.pi*0.05)
        rx=r.uniform(-300,300); ry=r.uniform(-470,0)
        pass
    pts=[]
    for i in range(70):
        u=i/69; xx=-260+520*u
        top=-380-60*math.cos((u-0.5)*math.pi)  # approx outline
        L=r.uniform(12,34)
        ctx.move_to(xx,top+r.uniform(-10,30)); ctx.line_to(xx+r.uniform(-8,8),top+L+30); ctx.stroke()
    if hair:
        ctx.set_source_rgba(*hair,0.55); ctx.set_line_width(3)
        for i in range(260):
            xx=r.uniform(-240,240); yy=r.uniform(-470,-10)
            if abs(xx)<240-abs(yy+250)*0.1:
                ctx.move_to(xx,yy); ctx.line_to(xx+r.uniform(-6,6),yy+r.uniform(18,46)); ctx.stroke()
    ctx.restore()
def woman(ctx,x,y,s,phase,pose="walk",col=(0.03,0.03,0.035)):
    ctx.save(); ctx.translate(x,y+(-abs(math.sin(phase))*4*s if pose=="walk" else 0)); ctx.scale(s,s)
    ctx.set_source_rgb(*col)
    sw=math.sin(phase) if pose=="walk" else 0
    # legs
    ctx.set_line_width(13)
    for sg in (-1,1):
        ctx.move_to(sg*12,-95); ctx.line_to(sg*12+sw*sg*22,0); ctx.stroke()
    # robe
    ctx.move_to(-34,-250); ctx.line_to(34,-250); ctx.line_to(52,-80); ctx.line_to(-52,-80); ctx.close_path(); ctx.fill()
    # arms
    ctx.set_line_width(14); ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    if pose=="nose":
        ctx.move_to(-30,-240); ctx.line_to(-48,-150); ctx.stroke(); ctx.move_to(30,-240); ctx.line_to(40,-290); ctx.line_to(8,-292); ctx.stroke()
    elif pose=="carry":
        ctx.move_to(-30,-240); ctx.line_to(-20,-185); ctx.line_to(40,-185); ctx.stroke(); ctx.move_to(30,-240); ctx.line_to(40,-185); ctx.stroke()
    else:
        for sg in (-1,1):
            ctx.move_to(sg*30,-240); ctx.line_to(sg*(40)+sw*sg*-16,-150); ctx.stroke()
    # neck/head + curls
    ctx.arc(0,-292,30,0,2*math.pi); ctx.fill()
    r=random.Random(3)
    for i in range(14):
        a=r.uniform(-math.pi*1.05,0.05); ctx.arc(34*math.cos(a)*0.95,-300+30*math.sin(a),13,0,2*math.pi); ctx.fill()
    ctx.restore()
def raccoon(ctx,x,y,s,phase,col=(0.03,0.03,0.035),eyeglow=1):
    ctx.save(); ctx.translate(x,y-abs(math.sin(phase))*6*s); ctx.scale(s,s); ctx.set_source_rgb(*col)
    ctx.save(); ctx.scale(1,0.55); ctx.arc(0,-80,70,0,2*math.pi); ctx.restore(); ctx.fill()
    ctx.arc(70,-60,30,0,2*math.pi); ctx.fill()
    ctx.move_to(55,-80); ctx.line_to(62,-102); ctx.line_to(74,-84); ctx.fill(); ctx.move_to(78,-84); ctx.line_to(90,-100); ctx.line_to(94,-78); ctx.fill()
    ctx.move_to(-60,-50); ctx.curve_to(-110,-60,-140,-30,-150,-10); ctx.set_line_width(22); ctx.stroke()
    ctx.set_line_width(12)
    for k,xx in enumerate((-35,-10,25,45)):
        sw=math.sin(phase+k*math.pi)*14; ctx.move_to(xx,-40); ctx.line_to(xx+sw,0); ctx.stroke()
    ctx.restore()
    for dx in (62,82):
        glow(ctx,x+dx*s,y-64*s-abs(math.sin(phase))*6*s,14*s,(0.9,1,0.85),0.6*eyeglow)
        ctx.arc(x+dx*s,y-64*s-abs(math.sin(phase))*6*s,3*s,0,2*math.pi); ctx.set_source_rgba(0.95,1,0.9,eyeglow); ctx.fill()
def house(ctx,x,y,w,h,col,winlight=1.0,t=0):
    ctx.set_source_rgb(*col)
    ctx.rectangle(x,y-h,w,h); ctx.fill()
    ctx.move_to(x-30,y-h); ctx.line_to(x+w/2,y-h-h*0.55); ctx.line_to(x+w+30,y-h); ctx.close_path(); ctx.fill()
    if winlight>0:
        wx,wy,ww,wh=x+w*0.62,y-h*0.72,w*0.22,h*0.38
        ctx.set_source_rgba(0.95,0.72,0.38,0.85*winlight); ctx.rectangle(wx,wy,ww,wh); ctx.fill()
        ctx.set_source_rgb(*col); ctx.rectangle(wx+ww/2-3,wy,6,wh); ctx.fill(); ctx.rectangle(wx,wy+wh/2-3,ww,6); ctx.fill()
        glow(ctx,wx+ww/2,wy+wh/2,ww*1.6,(1,0.7,0.35),0.25*winlight)
def trash_bits(ctx,cx,cy,spread,seed,col=(0.07,0.07,0.075)):
    r=random.Random(seed); ctx.set_source_rgb(*col)
    for i in range(22):
        x=cx+r.uniform(-spread,spread); y=cy+r.uniform(-14,18); w=r.uniform(10,34); h=r.uniform(6,18); a=r.uniform(0,3)
        ctx.save(); ctx.translate(x,y); ctx.rotate(a); ctx.rectangle(-w/2,-h/2,w,h); ctx.fill(); ctx.restore()
    for i in range(3):
        x=cx+r.uniform(-spread,spread)*0.7; ctx.save(); ctx.translate(x,cy); ctx.scale(1.4,0.7); ctx.arc(0,-20,34,0,2*math.pi); ctx.restore(); ctx.fill()
def frame_panel(ctx,x0,y0,x1,y1,top,bot,r=0):
    ctx.rectangle(x0,y0,x1-x0,y1-y0); ctx.set_source(lin_grad(ctx,0,y0,0,y1,[(0,top),(1,bot)])); ctx.fill()
def noise_overlay(arr,amt,seed):
    rng=np.random.default_rng(seed); n=rng.normal(0,amt,(H//2,W//2,1)).repeat(2,0).repeat(2,1)
    arr[...,:3]=np.clip(arr[...,:3].astype(np.int16)+n.astype(np.int16),0,255).astype(np.uint8)
# ---------------- scenes ----------------
IX0,IY0,IX1,IY1=110,430,970,1250   # illustration panel
FLY=[(random.uniform(0,6.28),random.uniform(0.6,1.4)) for _ in range(12)]
FF=[(random.uniform(IX0,IX1),random.uniform(IY0+200,IY1-80),random.uniform(0,6.28)) for _ in range(22)]
def clip_panel(ctx):
    ctx.rectangle(IX0,IY0,IX1-IX0,IY1-IY0); ctx.clip()
def sc_hook(ctx,t):
    # title
    lines=["SEIT DREI WOCHEN","WIRD IHR MÜLL","VERWÜSTET."]
    for i,l in enumerate(lines):
        a=ease((t-0.25-i*0.35)/0.5); shadow_text(ctx,l,470+i*96,86,a,bold=True)
    a=ease((t-T(3.6)+0.15)/0.4); shadow_text(ctx,"JEDE NACHT.",470+3*96+10,86,a,bold=True,color=RED)
    # scene: lamp glow and cans
    gy=1420
    glow(ctx,760,1040,520,(0.85,0.62,0.32),0.42)
    ctx.set_source_rgb(0.02,0.02,0.022); ctx.rectangle(0,gy,W,H-gy); ctx.fill()
    # lamp post
    ctx.set_source_rgb(0.02,0.02,0.022); ctx.rectangle(840,960,10,460); ctx.fill(); ctx.rectangle(800,955,60,10); ctx.fill()
    ctx.arc(805,975,11,0,2*math.pi); ctx.set_source_rgba(1,0.85,0.55,1); ctx.fill(); glow(ctx,805,975,90,(1,0.8,0.5),0.7)
    # creature shadow passes 1.4-3.6 behind, then knocks can
    tip=T(3.6)-0.1
    cx=lerp(1250,720,ease((t-1.0)/(tip-1.0)))
    if t>tip: cx=lerp(720,-200,ease((t-tip-0.6)/1.6))
    creature(ctx,cx,gy-6,0.42,col=(0.012,0.011,0.01))
    if 1.6<t<tip+1.6: eyes(ctx,cx,gy-6-0.42*430,0.42,ease((t-1.8)/0.3)*(1 if int(t*3)%5 else 0.1),gap=34)
    u=clamp((t-tip)/0.45); ang=-1.45*ease(u)
    bounce=abs(math.sin(clamp((t-tip-0.45)/0.3)*math.pi))*10*(t>tip+0.45 and t<tip+0.75)
    can(ctx,600,gy-bounce,1.05,ang,lid=True,lidoff=(-90*ease(clamp((t-tip)/0.7)),-10,-2.5*ease(clamp((t-tip)/0.7))))
    can(ctx,470,gy,1.05,0)
    if t>tip+0.2: trash_bits(ctx,520,gy+10,110*ease(clamp((t-tip-0.2)/0.4)),3)
def sc_glades(ctx,t,dur):
    clip_panel(ctx)
    frame_panel(ctx,IX0,IY0,IX1,IY1,(14,20,34),(28,36,44))
    mx,my=700,620; glow(ctx,mx,my,260,(0.85,0.88,1),0.25); ctx.arc(mx,my,48,0,2*math.pi); ctx.set_source_rgb(0.92,0.92,0.86); ctx.fill()
    wy=980
    ctx.rectangle(IX0,wy,IX1-IX0,IY1-wy); ctx.set_source(lin_grad(ctx,0,wy,0,IY1,[(0,(16,24,34)),(1,(6,8,12))])); ctx.fill()
    for k in range(14):
        yy=wy+12+k*14; w_=60-k*2+12*math.sin(t*2+k)
        ctx.set_source_rgba(0.92,0.92,0.86,0.5-k*0.03); ctx.rectangle(mx-w_/2+8*math.sin(t*1.7+k*0.8),yy,w_,3); ctx.fill()
    ctx.set_source_rgb(0.02,0.025,0.03); ctx.rectangle(IX0,wy-14,IX1-IX0,16); ctx.fill()
    pan=-30*ease(t/dur)
    for x,h,l in ((190,420,0.1),(330,330,-0.08),(860,470,-0.12),(980,360,0.05),(520,250,0.06)):
        palm(ctx,x+pan,wy,h,l,0.05*math.sin(t))
    for x in range(IX0,IX1,70): palmetto(ctx,x+pan*1.5,wy+4,70,(0.02,0.025,0.03))
    for fx,fy,ph in FF:
        b=0.5+0.5*math.sin(t*2.3+ph)
        if fy<wy: glow(ctx,fx+10*math.sin(t*0.6+ph),fy+6*math.cos(t*0.5+ph),12,(0.85,1,0.4),0.7*b)
def sc_morning(ctx,t,dur,T0):
    clip_panel(ctx)
    frame_panel(ctx,IX0,IY0,IX1,IY1,(96,104,112),(150,146,138))
    gy=1110
    for x,h,l in ((180,430,0.05),(900,380,-0.1)): palm(ctx,x,gy,h,l,0.03*math.sin(t),(0.16,0.18,0.19))
    house(ctx,560,gy,360,190,(0.12,0.13,0.14),winlight=0.8)
    ctx.set_source_rgb(0.08,0.085,0.09); ctx.rectangle(IX0,gy,IX1-IX0,IY1-gy); ctx.fill()
    can(ctx,420,gy+40,0.9,-1.5,lid=False,col=(0.05,0.055,0.06)); trash_bits(ctx,480,gy+50,150,7,(0.05,0.05,0.055))
    # stink lines
    ctx.set_line_width(5); ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    for k,x0 in enumerate((420,500,580)):
        ph=(t*0.6+k*0.33)%1
        ctx.set_source_rgba(0.55,0.75,0.35,0.7*math.sin(ph*math.pi))
        y0=gy+20-ph*170
        ctx.move_to(x0,y0)
        for j in range(1,8): ctx.line_to(x0+14*math.sin(j*1.2+t*3+k),y0-j*14)
        ctx.stroke()
    for ph,sp in FLY:
        fx=480+120*math.sin(t*sp*2.2+ph)+30*math.sin(t*7+ph*2); fy=gy-40+40*math.cos(t*sp*1.7+ph)
        ctx.arc(fx,fy,3,0,2*math.pi); ctx.set_source_rgb(0.02,0.02,0.02); ctx.fill()
    # woman walks in
    wx=lerp(IX0-60,700,ease((t-0.3)/2.6)); walking=t<2.9
    pose="nose" if t>T(13.3)-T0 else ("walk" if walking else "stand")
    woman(ctx,wx,gy+70,0.85,t*7 if walking else 0,pose)
def sc_raccoon(ctx,t,dur):
    clip_panel(ctx)
    frame_panel(ctx,IX0,IY0,IX1,IY1,(70,78,86),(120,118,112))
    gy=1150
    ctx.set_source_rgb(0.08,0.085,0.09); ctx.rectangle(IX0,gy,IX1-IX0,IY1-gy); ctx.fill()
    # big tipped can, opening facing right
    ctx.save(); ctx.translate(430,gy-40); ctx.set_source_rgb(0.05,0.055,0.06)
    ctx.move_to(-230,-110); ctx.line_to(80,-150); ctx.line_to(80,90); ctx.line_to(-230,40); ctx.close_path(); ctx.fill()
    ctx.save(); ctx.translate(80,-30); ctx.scale(0.35,1); ctx.arc(0,0,120,0,2*math.pi); ctx.restore(); ctx.set_source_rgb(0.01,0.01,0.012); ctx.fill()
    ctx.restore()
    trash_bits(ctx,640,gy+30,160,11,(0.05,0.05,0.055))
    run=clamp((t-1.0)/1.3)
    if t<1.0:
        for dx in (-12,12): glow(ctx,510+dx,gy-70,16,(0.9,1,0.85),0.8*(0.5+0.5*math.sin(t*9))) ; 
        for dx in (-12,12): ctx.arc(510+dx,gy-70,3.5,0,2*math.pi); ctx.set_source_rgb(0.95,1,0.9); ctx.fill()
    else:
        raccoon(ctx,lerp(520,1150,ease(run)),gy+40,1.1,t*14)
def sc_fence(ctx,t,dur,T0):
    clip_panel(ctx)
    frame_panel(ctx,IX0,IY0,IX1,IY1,(110,130,150),(170,170,160))
    for x,h in ((260,380),(820,440)): palm(ctx,x,1000,h,0.06,0.03*math.sin(t),(0.22,0.26,0.27))
    ftop=880
    for i,x in enumerate(range(IX0-10,IX1+10,74)):
        ctx.set_source_rgb(0.10,0.095,0.09) if i%2 else ctx.set_source_rgb(0.12,0.112,0.105)
        ctx.move_to(x,IY1); ctx.line_to(x,ftop+12); ctx.line_to(x+35,ftop-6); ctx.line_to(x+70,ftop+12); ctx.line_to(x+70,IY1); ctx.close_path(); ctx.fill()
    ctx.set_source_rgb(0.07,0.065,0.06); ctx.rectangle(IX0,ftop+120,IX1-IX0,16); ctx.fill(); ctx.rectangle(IX0,ftop+300,IX1-IX0,16); ctx.fill()
    # flying can: launch T(21.2)
    tl=T(21.0)-T0; u=(t-tl)/1.0
    if 0<=u<=1:
        x=lerp(250,720,u); y=1300-u*700+u*u*620
        can(ctx,x,y,0.9,u*6.5,lid=True,col=(0.04,0.045,0.05))
    if u>1:
        # dust puff above fence
        p=clamp((u-1)/0.9)
        for k in range(9):
            a=k/9*math.pi; r_=40+120*p
            ctx.arc(720+r_*math.cos(a)*1.3,ftop-10-r_*math.sin(a)*0.5,26*(1-p)+6,0,2*math.pi); ctx.set_source_rgba(0.5,0.47,0.42,0.6*(1-p)); ctx.fill()
    # claw marks appear
    a=ease((t-(T(22.9)-T0))/0.8)
    if a>0:
        ctx.set_line_width(9); ctx.set_line_cap(cairo.LINE_CAP_ROUND)
        for k in range(4):
            ctx.set_source_rgba(0.03,0.025,0.02,0.9*a)
            x0=600+k*30; ctx.move_to(x0,ftop+40); ctx.line_to(x0-20+k*4,ftop+40+260*a); ctx.stroke()
def sc_camera(ctx,t,dur):
    clip_panel(ctx)
    frame_panel(ctx,IX0,IY0,IX1,IY1,(70,40,90),(230,120,60))
    for x,h in ((700,360),(900,300)): palm(ctx,x,1180,h,-0.05,0.04*math.sin(t),(0.06,0.04,0.06))
    for x in range(IX0,IX1,80): palmetto(ctx,x,1210,90,(0.05,0.035,0.05),0.02,t)
    # trunk
    tx=320
    ctx.set_source_rgb(0.09,0.06,0.06); ctx.rectangle(tx-120,IY0,240,IY1-IY0); ctx.fill()
    ctx.set_source_rgba(0,0,0,0.35); ctx.set_line_width(5)
    for yy in range(IY0-40,IY1,46):
        ctx.move_to(tx-120,yy); ctx.line_to(tx,yy+30); ctx.line_to(tx+120,yy); ctx.stroke()
    # camera slides in
    u=ease((t-0.4)/1.4); cy=lerp(1400,860,u)
    ctx.set_source_rgb(0.05,0.05,0.04); ctx.rectangle(tx-150,cy-10,300,20); ctx.fill()  # strap
    ctx.set_source_rgb(0.16,0.17,0.12); ctx.rectangle(tx-70,cy-95,140,190); ctx.fill()
    ctx.set_source_rgb(0.1,0.11,0.08)
    for (a,b,c_) in ((tx-60,cy-80,40),(tx+20,cy+30,46),(tx-40,cy+50,30)): ctx.arc(a,b,c_/2,0,2*math.pi); ctx.fill()
    ctx.arc(tx,cy-30,30,0,2*math.pi); ctx.set_source_rgb(0.02,0.02,0.02); ctx.fill()
    ctx.arc(tx-8,cy-38,8,0,2*math.pi); ctx.set_source_rgba(0.6,0.7,0.9,0.5); ctx.fill()
    ctx.set_source_rgb(0.05,0.05,0.05); ctx.rectangle(tx-40,cy+20,80,40); ctx.fill()
    if u>0.98 and int(t*2.2)%2==0:
        ctx.arc(tx+45,cy+65,7,0,2*math.pi); ctx.set_source_rgb(1,0.15,0.1); ctx.fill(); glow(ctx,tx+45,cy+65,40,(1,0.15,0.1),0.6)
def sc_laptop(ctx,t,dur,T0):
    clip_panel(ctx)
    frame_panel(ctx,IX0,IY0,IX1,IY1,(18,20,26),(10,10,12))
    # window light
    ctx.set_source_rgba(0.6,0.65,0.75,0.12); ctx.rectangle(640,520,240,280); ctx.fill()
    sx0,sy0,sx1,sy1=250,700,830,1060
    glow(ctx,540,880,520,(0.55,0.7,1),0.22)
    ctx.set_source_rgb(0.04,0.045,0.05); ctx.rectangle(sx0-18,sy0-18,sx1-sx0+36,sy1-sy0+36); ctx.fill()
    ctx.set_source_rgb(0.08,0.1,0.13); ctx.rectangle(sx0,sy0,sx1-sx0,sy1-sy0); ctx.fill()
    ctx.set_source_rgb(0.03,0.035,0.04); ctx.move_to(sx0-60,sy1+18); ctx.line_to(sx1+60,sy1+18); ctx.line_to(sx1+110,sy1+70); ctx.line_to(sx0-110,sy1+70); ctx.close_path(); ctx.fill()
    # thumbnails
    cols,rows=6,4; tw,th=82,60; gx=(sx1-sx0-cols*tw)/(cols+1)
    shown=int(clamp((t-0.3)/2.6)*cols*rows)+0
    for i in range(cols*rows):
        if i>=shown: break
        c_,r_=i%cols,i//cols; x=sx0+gx+c_*(tw+gx); y=sy0+60+r_*(th+16)
        ctx.set_source_rgb(0.02,0.025,0.02); ctx.rectangle(x,y,tw,th); ctx.fill()
        rr=random.Random(i); ctx.set_source_rgba(0.35,0.5,0.3,0.6)
        for k in range(5): a=rr.uniform(3.4,5.8); ctx.move_to(x+tw*0.7,y+th); ctx.line_to(x+tw*0.7+40*math.cos(a),y+th+40*math.sin(a)); ctx.set_line_width(3); ctx.stroke()
    n=int(clamp((t-0.3)/2.6)*212)
    ctx.select_font_face(MONO); ctx.set_font_size(26); ctx.set_source_rgba(0.75,0.85,1,0.9); ctx.move_to(sx0+20,sy0+38); ctx.show_text(f"SD-KARTE  ·  {n:03d} / 212")
def sc_viewer(ctx,t,dur,label,stamp,content,T0):
    # fullscreen viewer in panel
    clip_panel(ctx)
    ctx.set_source_rgb(0,0,0); ctx.rectangle(IX0,IY0,IX1-IX0,IY1-IY0); ctx.fill()
    content(ctx,t)
    ctx.select_font_face(MONO); ctx.set_font_size(24)
    ctx.set_source_rgba(0,0,0,0.6); ctx.rectangle(IX0,IY0,IX1-IX0,44); ctx.fill(); ctx.rectangle(IX0,IY1-44,IX1-IX0,44); ctx.fill()
    ctx.set_source_rgba(0.9,0.9,0.9,0.9); ctx.move_to(IX0+18,IY0+30); ctx.show_text(label)
    ctx.set_source_rgba(1,0.75,0.3,0.95); ctx.move_to(IX0+18,IY1-14); ctx.show_text(stamp)
def fronds(ctx,t,lit=(0.62,0.72,0.55),dark=False):
    for (x,y,s,ph) in ((260,1300,380,0),(820,1320,420,1.3),(560,1350,300,2.2),(980,1150,300,3.1),(120,1180,260,4)):
        palmetto(ctx,x,y,s,lit if not dark else (0.05,0.06,0.05),0.025,t+ph)
def sc_207load(ctx,t):
    p=clamp(t/2.6)
    if p<1:
        ctx.set_source_rgba(1,1,1,0.15); ctx.rectangle(IX0+200,850,(IX1-IX0-400),8); ctx.fill()
        ctx.set_source_rgba(1,0.75,0.3,0.9); ctx.rectangle(IX0+200,850,(IX1-IX0-400)*p,8); ctx.fill()
        text_center(ctx,"LADE BILD …",820,28,MONO,False,(0.8,0.8,0.8),0.8)
    else:
        fronds(ctx,t)
def sc_reveal(ctx,t,T0):
    rise=ease(t/3.0); br=math.sin(t*1.6)
    creature(ctx,560,1300+80*(1-rise),1.05,breath=br,col=(0.09,0.07,0.06),hair=(0.24,0.2,0.16))
    fronds(ctx,t)
    op=ease((t-(T(44.0)-T0))/0.6)
    base=0.12+0.06*math.sin(t*3)
    eyes(ctx,560,1300+80*(1-rise)-1.05*420*(1+0.012*br),1.05,max(base,op),col=(1,0.92,0.95),gl=1.2,gap=50)
    fl=max(0,1-t/0.35)
    if fl>0: ctx.set_source_rgba(1,1,1,fl); ctx.paint()
def sc_last(ctx,t,T0):
    grab=T(50.5)-T0
    if t<grab:
        fronds(ctx,t)
    else:
        u=(t-grab)
        ctx.save(); ctx.translate(540,840); ctx.rotate(min(3.14,u*3.2)); ctx.translate(-540,-840); fronds(ctx,t); ctx.restore()
        if u<0.9:
            hx=lerp(1200,560,ease(u/0.35)); 
            ctx.save(); ctx.translate(hx,820); ctx.scale(2.2,2.2); creature_hand(ctx); ctx.restore()
        if u>0.9: ctx.set_source_rgba(0,0,0,clamp((u-0.9)/0.5)); ctx.paint()
def creature_hand(ctx):
    ctx.set_source_rgb(0.06,0.05,0.045)
    ctx.arc(0,0,90,0,2*math.pi); ctx.fill(); ctx.rectangle(0,-60,400,140); ctx.fill()
    ctx.set_line_cap(cairo.LINE_CAP_ROUND); ctx.set_line_width(34)
    for a in (-2.5,-2.9,3.0,2.6):
        ctx.move_to(0,0); ctx.line_to(170*math.cos(a),170*math.sin(a)); ctx.stroke()
    ctx.set_source_rgb(0.75,0.72,0.66)
    for a in (-2.5,-2.9,3.0,2.6): ctx.arc(190*math.cos(a),190*math.sin(a),9,0,2*math.pi); ctx.fill()
def sc_window(ctx,t,T0):
    clip_panel(ctx)
    ctx.set_source_rgb(0.05,0.05,0.05); ctx.paint()
    # house siding
    ctx.set_source_rgb(0.18,0.2,0.19); ctx.rectangle(IX0,IY0,IX1-IX0,IY1-IY0); ctx.fill()
    ctx.set_source_rgba(0,0,0,0.25)
    for y in range(IY0,IY1,34): ctx.rectangle(IX0,y,IX1-IX0,4); ctx.fill()
    fx0,fy0,fx1,fy1=210,520,870,1150
    ctx.set_source_rgb(0.85,0.84,0.8); ctx.rectangle(fx0-26,fy0-26,fx1-fx0+52,fy1-fy0+52); ctx.fill()
    frame_panel(ctx,fx0,fy0,fx1,fy1,(30,32,44),(20,18,22))
    # bed + sleeping shape
    ctx.set_source_rgb(0.12,0.1,0.12); ctx.rectangle(fx0+40,fy1-230,fx1-fx0-80,170); ctx.fill()
    ctx.set_source_rgb(0.6,0.58,0.56); ctx.save(); ctx.translate(320,fy1-235); ctx.scale(1.5,0.6); ctx.arc(0,0,55,0,2*math.pi); ctx.restore(); ctx.fill()
    ctx.arc(330,fy1-262,40,0,2*math.pi); ctx.set_source_rgb(0.78,0.68,0.48); ctx.fill()
    br=math.sin(t*1.4)*5
    ctx.save(); ctx.translate(590,fy1-215); ctx.scale(1,0.38); ctx.arc(0,-br*2,250,math.pi,2*math.pi); ctx.restore(); ctx.set_source_rgb(0.46,0.32,0.38); ctx.fill()
    ctx.set_source_rgb(0.85,0.84,0.8); ctx.rectangle((fx0+fx1)/2-10,fy0,20,fy1-fy0); ctx.fill(); ctx.rectangle(fx0,(fy0+fy1)/2-10,fx1-fx0,20); ctx.fill()
    # muddy handprint sliding down the glass
    a=ease((t-0.6)/0.5); slide=60*ease((t-1.1)/2.0)
    if a>0:
        hx,hy=690,fy0+150+slide*0.3
        ctx.set_source_rgba(0.28,0.19,0.1,0.8*a)
        ctx.save(); ctx.translate(hx,hy); ctx.scale(1,1.15); ctx.arc(0,0,62,0,2*math.pi); ctx.restore(); ctx.fill()
        ctx.set_line_cap(cairo.LINE_CAP_ROUND)
        for k,(dx,L) in enumerate(((-52,90),(-18,115),(18,118),(52,95))):
            ctx.set_line_width(28); ctx.move_to(hx+dx*0.8,hy-40); ctx.line_to(hx+dx*1.25,hy-40-L); ctx.stroke()
        ctx.set_line_width(26); ctx.move_to(hx-55,hy+10); ctx.line_to(hx-110,hy-30); ctx.stroke()
        ctx.set_line_width(8)
        for k in range(5):
            x0=hx-40+k*20; ctx.move_to(x0,hy+60); ctx.line_to(x0+3,hy+60+slide*(1.5+k%2)); ctx.stroke()
    glow(ctx,300,600,260,(1,1,1),0.5)
    fl=max(0,1-t/0.35)
    if fl>0: ctx.set_source_rgba(1,1,1,fl); ctx.paint()
def sc_plate(ctx,t,T0,dur):
    clip_panel(ctx)
    frame_panel(ctx,IX0,IY0,IX1,IY1,(40,24,52),(16,10,20))
    gl=0.8+0.2*(1 if math.sin(t*9)+math.sin(t*4.3)>-1.2 else 0.3)
    glow(ctx,300,640,480,(1,0.72,0.36),0.45*gl)
    for x in range(IX0+300,IX1+60,90): palmetto(ctx,x,1080,150,(0.015,0.012,0.02),0.02,t)
    palm(ctx,880,1000,420,-0.08,0.03*math.sin(t),(0.02,0.015,0.025))
    # porch / steps
    ctx.set_source_rgb(0.1,0.07,0.06)
    ctx.rectangle(IX0,560,240,520); ctx.fill()
    for k in range(4): ctx.rectangle(IX0,1080+k*44,420-k*40,44); ctx.fill(); ctx.set_source_rgb(0.14,0.1,0.08) if k%2==0 else ctx.set_source_rgb(0.1,0.07,0.06)
    ctx.arc(300,640,14,0,2*math.pi); ctx.set_source_rgba(1,0.85,0.5,gl); ctx.fill()
    # plate with chicken
    px,py=330,1074
    ctx.save(); ctx.translate(px,py); ctx.scale(1,0.32); ctx.arc(0,0,90,0,2*math.pi); ctx.restore(); ctx.set_source_rgb(0.85,0.84,0.8); ctx.fill()
    ctx.save(); ctx.translate(px,py-22); ctx.scale(1,0.6); ctx.arc(0,0,52,0,2*math.pi); ctx.restore(); ctx.set_source_rgb(0.62,0.36,0.16); ctx.fill()
    for dx in (-48,48): ctx.arc(px+dx,py-30,12,0,2*math.pi); ctx.fill()
    # eyes in palmettos
    o=ease((t-1.2)/0.6)
    blink=(T(58.0)-T0)<t<(T(58.0)-T0)+0.15
    near=ease((t-(dur-1.6))/1.6)
    s=lerp(0.9,1.6,near); ex,ey=lerp(760,640,near),lerp(960,900,near)
    eyes(ctx,ex,ey,s,0 if blink else o,gl=1.0)
    fx=lerp(1,0,ease((t-(dur-0.5))/0.5))
    if fx<1: ctx.set_source_rgba(0,0,0,1-fx); ctx.paint()
# ---------------- timeline ----------------
SC=[("hook",0,T(5.1)),("glades",T(5.1),T(8.0)),("morning",T(8.0),T(16.2)),("raccoon",T(16.2),T(18.6)),
    ("fence",T(18.6),T(24.6)),("camera",T(24.6),T(29.1)),("laptop",T(29.1),T(34.6)),("v207",T(34.6),T(38.2)),
    ("reveal",T(38.2),T(47.0)),("last",T(47.0),T(52.9)),("window",T(52.9),T(56.3)),("plate",T(56.3),60.4),
    ("black",60.4,60.9),("scare",60.9,61.3),("end",61.3,END)]
def draw(t):
    surf=cairo.ImageSurface(cairo.FORMAT_ARGB32,W,H); ctx=cairo.Context(surf)
    ctx.set_source_rgb(0.035,0.035,0.04); ctx.paint()
    g=cairo.RadialGradient(W/2,H*0.47,50,W/2,H*0.47,1100); g.add_color_stop_rgba(0,0.11,0.1,0.1,1); g.add_color_stop_rgba(1,0.02,0.02,0.025,1)
    ctx.set_source(g); ctx.paint()
    name,t0,t1=[s for s in SC if s[1]<=t<s[2]][0]; lt=t-t0; dur=t1-t0
    ctx.save()
    if name=="hook": sc_hook(ctx,lt)
    elif name=="glades": sc_glades(ctx,lt,dur)
    elif name=="morning": sc_morning(ctx,lt,dur,t0)
    elif name=="raccoon": sc_raccoon(ctx,lt,dur)
    elif name=="fence": sc_fence(ctx,lt,dur,t0)
    elif name=="camera": sc_camera(ctx,lt,dur)
    elif name=="laptop": sc_laptop(ctx,lt,dur,t0)
    elif name=="v207": sc_viewer(ctx,lt,dur,"IMG_0207.JPG          207/212","CAM-01   23°C   03:14:08",sc_207load,t0)
    elif name=="reveal": sc_viewer(ctx,lt,dur,"IMG_0207.JPG          207/212","CAM-01   23°C   03:14:08",lambda c,tt: sc_reveal(c,tt,t0),t0)
    elif name=="last": sc_viewer(ctx,lt,dur,"IMG_0212.JPG          212/212","CAM-01   23°C   04:02:51",lambda c,tt: sc_last(c,tt,t0),t0)
    elif name=="window": sc_window(ctx,lt,t0)
    elif name=="plate": sc_plate(ctx,lt,t0,dur)
    elif name=="scare":
        ctx.set_source_rgb(0,0,0); ctx.paint(); creature(ctx,540,1700,2.2,col=(0.05,0.04,0.035),hair=(0.18,0.15,0.12)); eyes(ctx,540,1700-2.2*420,2.2,1,col=(1,0.92,0.95),gl=1.5,gap=50)
    elif name=="end":
        a=ease(lt/0.6)
        for i,l in enumerate(["DAMIT ES","NICHT HUNGRIG","WIRD."]): shadow_text(ctx,l,820+i*100,90,a,bold=True,color=RED if i==1 else (0.9,0.88,0.84))
    ctx.restore()
    # soft panel edge vignette
    vg=cairo.RadialGradient(W/2,H/2,600,W/2,H/2,1250); vg.add_color_stop_rgba(0,0,0,0,0); vg.add_color_stop_rgba(1,0,0,0,0.75)
    ctx.set_source(vg); ctx.paint()
    # top label
    if name not in ("black","scare"):
        text_center(ctx,"FIKTION, INSPIRIERT VON SKUNK-APE-LEGENDEN AUS FLORIDA",300,25,SANS,False,(0.45,0.45,0.45),1,spacing=1.2)
    # captions
    for st,en,txt in CAPS:
        if st<=t<en and name not in ("black","scare","end"):
            a=ease((t-st)/0.18)*ease((en-t)/0.18)
            lines=wrap(ctx,txt,68,900)
            for i,l in enumerate(lines): shadow_text(ctx,l,1370+i*82,68,a)
    if name=="black": ctx.set_source_rgb(0,0,0); ctx.paint()
    buf=np.ndarray((H,W,4),np.uint8,surf.get_data())
    return buf[...,[2,1,0]].copy()
if ONLY:
    from PIL import Image
    ims=[Image.fromarray(draw(t)).resize((270,480)) for t in ONLY]
    sheet=Image.new("RGB",(270*len(ims),480))
    for i,im in enumerate(ims): sheet.paste(im,(270*i,0))
    sheet.save(OUT); sys.exit()
proc=subprocess.Popen(["ffmpeg","-hide_banner","-loglevel","error","-y","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-r",str(FPS),"-i","-","-c:v","libx264","-preset","medium","-crf","16","-pix_fmt","yuv420p",OUT],stdin=subprocess.PIPE)
for n in range(int(END*FPS)):
    proc.stdin.write(draw(n/FPS).tobytes())
    if n%300==0: print(n/FPS,flush=True)
proc.stdin.close(); proc.wait(); print("done")
