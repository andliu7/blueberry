import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, ChevronLeft, Layers } from "lucide-react";
import { Blueberry } from "@/components/ui/blueberry";
import { SiteFooter } from "@/components/ui/site-footer";
import { PageBackground } from "@/components/ui/page-background";
import { LessonVideo } from "@/components/ui/lesson-video";
import { LessonNav, type NavSection } from "@/components/ui/lesson-nav";
import { ReactionPanel } from "@/components/ui/reaction-panel";
import { LessonBlockEditor } from "@/components/ui/lesson-block-editor";
import { LessonBlocks } from "@/components/ui/lesson-blocks";
import { defaultBlocksFor, parseBlocks, type LessonBlock } from "@/data/lessonBlocks";
import { parseTaReactions, toStagedReaction } from "@/data/taReactions";
import { TopicBanner } from "@/components/ui/topic-banner";
import { Pencil, Plus } from "lucide-react";
import { REACTIONS } from "@/data/reactions";
import { useCourse } from "@/lib/useCourse";
import { useSession } from "@/lib/useSession";
import { StaffSignInNotice } from "@/components/ui/staff-signin-notice";
import { LESSON_TOPICS, SECTION_FAMILIES, type LessonTopic } from "@/data/lessonTopics";


type T=LessonTopic;
/**
 * Stand-in thumbnails for the template video, one per section.
 *
 * Reusing the background photographs rather than adding seven more files: these
 * are placeholders, and shipping real artwork for a video that does not exist
 * is work that gets thrown away.
 */
const POSTERS:Record<string,string>={overview:"forest-misty-forest.webp",addition:"forest-river-through-dense-forest.webp",substitution:"forest-rainforest-waterfall.webp",oxidation:"forest-clouds-through-the-forest.webp",reduction:"forest-little-forest.webp",protection:"forest-water-dripping-from-leaves.webp",enolate:"forest-nature.webp"};
/**
 * A photograph per section, for the banner wall.
 *
 * Chosen to rhyme with the chemistry rather than to be literal: frost for the
 * hydride reductions that live at -78 C, a sunset for oxidation, ice
 * crystallising on a window for the cyclic section. The overview gets the
 * cyclohexane drawing, which is the one image in the set that is actually
 * chemistry.
 *
 * A missing entry is fine -- the banner falls back to the indigo-to-fuchsia
 * wash the folder cards use.
 */
const BANNERS:Record<string,string>={
overview:"backgrounds/diagram-cyclohexane-molecule.webp",
alcohols:"backgrounds/landscape-light-blue-waters.webp",
dienes:"backgrounds/landscape-lightning.webp",
aromatics:"backgrounds/forest-pink-trees.webp",
addition:"backgrounds/landscape-cool-blue-mountains-and-lake.webp",
substitution:"backgrounds/forest-rain-on-a-river.webp",
reduction:"backgrounds/landscape-frosted-tips.webp",
oxidation:"backgrounds/landscape-colorful-red-sunset-over-mountains.webp",
nitrogen:"backgrounds/landscape-desert-moon.webp",
cycles:"backgrounds/landscape-crystallization-of-ice-on-window.webp",
enolate:"backgrounds/landscape-plains-and-beginning-of-sunrise.webp",
amines:"backgrounds/forest-post-rain-fog.webp",
};
const topics:T[]=LESSON_TOPICS;
export function LessonsPage({section,reaction}:{section?:string;reaction?:string}={}){
/* `#/lessons/<id>` opens that section. An id that does not exist falls back to
   the overview rather than rendering an empty page, since a stale link from
   somebody's notes should land somewhere useful. */
const [active,setActive]=useState(()=>section&&LESSON_TOPICS.some(x=>x.id===section)?section:"overview");
/** Null while the written section is being read; a reaction id once one is picked. */
const [child,setChild]=useState<string|null>(reaction??null);
const t=topics.find(x=>x.id===active)||topics[0];
const session=useSession();
const isStaff=session?.role==="admin"||session?.role==="owner";
/* Lesson edits save to Supabase now, so any staff session can write and the
   role is the whole question again. `canWrite` was the workaround for edits
   going to Apps Script, which verifies a Google ID token a Supabase session
   does not have; that path is gone from this page.
   Presentation only regardless: the policy on `course_overrides` is what
   actually decides, and it re-checks on every write. */
const canEdit=isStaff;
const {overrides,refresh}=useCourse();
/* Staff-added reactions, merged in beside the generated ones so a TA's work
   appears where it belongs rather than in a separate list nobody opens. They
   carry an "unchecked" hint in the sidebar and the amber validation box in the
   panel, because they have not been through the conservation pipeline. */
const taReactions=parseTaReactions(overrides?.topics?.find(x=>x.id==="__ta_reactions__")?.blocks).map(toStagedReaction);
const allReactions=[...REACTIONS,...taReactions];
const sections:NavSection[]=topics.map(x=>({id:x.id,label:x.label,children:allReactions.filter(r=>(SECTION_FAMILIES[x.id]??[]).includes(r.family)).map(r=>({id:r.id,label:r.name,hint:r.provenance==="ta-verified"?"unchecked":r.validation.status==="ok"?undefined:"flagged"}))}));
const openReaction=child?allReactions.find(r=>r.id===child)??null:null;
// Staff edits arrive as overrides keyed by the same reaction id, so a note or a
// video saved against `nabh4-reduction` finds it whichever section it sits in.
const override=openReaction?overrides?.reactions?.find(r=>r.id===openReaction.id):undefined;
/* The section's writing: the TA's boxes if they have saved any, otherwise the
   built-in text converted to the same shape. A section nobody has touched must
   read exactly as it did before this feature existed, and a stored value that
   will not parse falls back the same way rather than blanking the page. */
const topicOverride=overrides?.topics?.find(x=>x.id===t.id);
const blocks:LessonBlock[]=parseBlocks(topicOverride?.blocks)??defaultBlocksFor(t);
const [editingPage,setEditingPage]=useState(false);
/* Locally applied on save so the page updates without waiting for a refetch.
   Cleared whenever the section changes, so it can never leak onto another one. */
const [justSaved,setJustSaved]=useState<{id:string;blocks:LessonBlock[]}|null>(null);
const shown=justSaved&&justSaved.id===t.id?justSaved.blocks:blocks;
useEffect(()=>{setEditingPage(false);setJustSaved(null);},[active]);
/* Follow the URL after the first render too.
   `useState` reads its initial value once, so a deep link worked on a cold
   load and did nothing when the hash changed while the page was already
   mounted - which is every click from search. The failure is quiet: the
   address bar updates and the page does not, so it reads as a dead link. */
useEffect(()=>{if(section&&LESSON_TOPICS.some(x=>x.id===section))setActive(section);},[section]);
useEffect(()=>{setChild(reaction??null);},[reaction]);
return <main className="relative min-h-screen text-slate-900 dark:text-stone-100"><PageBackground /><div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8"><a href="#/home" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700 dark:text-stone-300"><ChevronLeft className="size-4"/>Home</a><header className="mt-5 grid gap-5 rounded-3xl border border-indigo-200/80 bg-white/95 p-6 shadow-sm backdrop-blur-sm dark:border-indigo-400/20 dark:bg-stone-950/92 lg:grid-cols-[1fr_270px]"><div><p className="font-mono text-xs font-semibold uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">Lessons / Organic chemistry II</p><h1 className="title-face mt-3 text-5xl leading-none">CHEM241</h1><p className="mt-4 max-w-2xl leading-7 text-slate-700 dark:text-stone-200">The ideas behind the cards, in the order the course takes them. Open a section for the writing, or expand it for every reaction underneath with its reagents, conditions and product.</p></div>{/* The berry reads along with you. `reading` looks down at the page rather
    than out at the room, which is the difference between a mascot that is
    keeping you company and one that is watching you. */}
<div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/70 p-4 dark:border-indigo-400/30 dark:bg-indigo-950/25"><Blueberry mood="reading" interactive onActivate={()=>{window.location.hash="#/home";}} className="h-40 w-40" label="Blueberry, reading along. Press to go home, drag to spin."/><p className="mt-2 text-center text-sm text-indigo-900/75 dark:text-indigo-100/75">{topics.length} sections, {REACTIONS.length} checked reactions. Start with the overview if the carbonyl still looks like one reaction.</p></div></header>{/* Sidebar and content, rather than a row of pills over a single column.

    Seven pills was already a scrolling strip on a laptop, and it gives no sense
    of where a section sits in the whole. A list down the side shows the shape of
    the subject at a glance and has room for the ones still to be written. On
    narrow screens the sidebar becomes a single dropdown, since a fixed column
    on a phone is most of the screen. */}
<div className="mt-5 grid items-start gap-5 lg:grid-cols-[240px_1fr]">
<LessonNav sections={sections} activeSection={active} activeChild={child} onSelectSection={(id)=>{setActive(id);setChild(null);}} onSelectChild={(sectionId,childId)=>{setActive(sectionId);setChild(childId);}}/>
<div className="min-w-0">{openReaction ? <ReactionPanel reaction={openReaction} canEdit={canEdit} idToken={session?.idToken??null} overrides={override?{videoUrl:override.videoUrl,whyThisReagent:override.whyThisReagent}:undefined} onSaved={refresh}/> : editingPage ? <LessonBlockEditor topicId={t.id} topicLabel={t.label} blocks={shown} idToken={session?.idToken??null} onSaved={(next)=>{setJustSaved({id:t.id,blocks:next});setEditingPage(false);refresh();}} onCancel={()=>setEditingPage(false)}/> : <>
<section className="grid gap-5 xl:grid-cols-[1fr_290px]"><article className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur-sm dark:border-stone-800 dark:bg-stone-950/92 sm:p-8"><LessonVideo title={t.title} poster={POSTERS[t.id]||"forest-misty-forest.webp"} className="mb-6"/>
{/* Section label on the left, the staff controls hard right.
    They used to sit at the foot of the article behind a pencil that only grew
    its label on hover, which meant the single most important control for a TA
    was an unlabelled icon below the fold. Top right is where an edit affordance
    is looked for, and it says what it does without being pointed at. */}
<div className="flex items-start justify-between gap-3"><p className="font-mono text-xs font-semibold uppercase tracking-[.16em] text-blue-700 dark:text-blue-300">{t.label}</p>{canEdit&&<div className="flex shrink-0 items-center gap-2"><button type="button" onClick={()=>setEditingPage(true)} className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-from to-brand-to px-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><Pencil className="size-4 shrink-0"/>Edit page</button><a href="#/new-reaction" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition-colors hover:border-indigo-400 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-stone-700 dark:text-stone-200 dark:hover:border-indigo-500 dark:hover:text-indigo-300"><Plus className="size-4 shrink-0"/>Add reaction</a></div>}</div>
<h2 className="title-face mt-3 text-4xl leading-tight">{t.title}</h2>{/* The section's text boxes. The first is rendered as the lead paragraph and
    the rest as titled cards, which is the layout this page already had; the
    difference is that a TA can now add a fourth, reorder them, or take one
    away. */}
{/* One pass, in the TA's order, each box carrying its own width.
    This was two passes - bodies without headings as paragraphs, then every
    heading block as a card - which meant whether a box sat beside another was
    decided by whether it happened to have a heading rather than by anyone
    choosing. See `LessonBlocks`. */}
<LessonBlocks blocks={shown} className="mt-5"/>
{/* Staff whose sign-in cannot write get the reason instead of a button that
    would fail. Renders nothing for anyone else. The controls themselves moved
    to the top right of this card. */}
<StaffSignInNotice session={session} action="Editing this page" backend="supabase" className="mt-6"/>
</article><aside className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur-sm dark:border-stone-800 dark:bg-stone-950/92"><BookOpen className="size-5 text-indigo-600 dark:text-indigo-300"/><h3 className="mt-3 font-semibold">Practice this section</h3><p className="mt-2 text-sm leading-6 text-slate-700 dark:text-stone-200">The matching deck uses these examples as flashcards.</p><a href={"#/deck/"+t.deck} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-brand-from to-brand-to px-4 text-sm font-semibold text-white"><Layers className="size-4"/>Open study deck <ArrowRight className="size-4"/></a></aside></section>
{/* The wall. A sidebar is a good index and a poor front door: twelve words
    in a column say the course has twelve sections and nothing about any of
    them. Shown on the overview, which is where you land. */}
{/* Carded like everything else on this page.
    These two lines were printed straight onto the page background, which is a
    photograph. Dark text on an arbitrary picture is a contrast bet you lose
    somewhere on the image, and this one lands on a bright aurora. */}
{active==="overview"&&!child&&<section className="mt-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur-sm dark:border-stone-800 dark:bg-stone-950/92"><h3 className="font-mono text-xs font-semibold uppercase tracking-[.16em] text-slate-600 dark:text-stone-300">The course</h3><p className="mt-1 text-sm text-slate-700 dark:text-stone-200">Twelve sections, in the order CHEM241 takes them.</p><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{topics.filter(x=>x.id!=="overview").map(x=><TopicBanner key={x.id} id={x.id} label={x.label} blurb={x.title} image={BANNERS[x.id]} count={allReactions.filter(r=>(SECTION_FAMILIES[x.id]??[]).includes(r.family)).length} onSelect={(id)=>{setActive(id);setChild(null);}}/>)}</div></section>}
{t.examples.length>0&&<section className="mt-5"><p className="font-mono text-xs font-semibold uppercase tracking-[.16em] text-slate-600 dark:text-stone-300">Worked examples</p><h2 className="title-face mt-1 text-2xl">Products and conditions</h2><div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{t.examples.map(([a,b,c,d])=><article key={a} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-950"><div className="flex h-36 items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-brand-to/10 p-3 dark:from-indigo-950/35 dark:via-stone-950 dark:to-brand-from/20"><img src={`${import.meta.env.BASE_URL}cards/${d}`} alt={"Product: "+c} className="h-full w-full object-contain" loading="lazy"/></div><div className="p-4"><h3 className="text-sm font-semibold">{a}</h3><p className="mt-1 font-mono text-[.7rem] leading-5 text-indigo-700 dark:text-indigo-300">{b}</p><p className="mt-3 text-sm text-slate-700 dark:text-stone-200"><b>Product:</b> {c}</p></div></article>)}</div></section>}</>}</div></div></div><SiteFooter/></main>}
