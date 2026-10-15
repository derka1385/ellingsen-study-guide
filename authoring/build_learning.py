"""Integrate reviewed learning additions without rebuilding or renumbering the source guide."""
from pathlib import Path
import html,json,re
from learning_labels import UI
ROOT=Path(__file__).resolve().parent.parent
path=ROOT/'ellingsen.html'
s=path.read_text()
data=json.loads((ROOT/'authoring/learning.json').read_text())
# Rebuilding this extension removes only its own marked sections.
s=re.sub(r'[ \t]*<!-- LEARNING:[^:]+:START -->[\s\S]*?<!-- LEARNING:[^:]+:END -->\n*', '',s)
s=re.sub(r'/\* LEARNING:REGISTRY:START \*/[\s\S]*?/\* LEARNING:REGISTRY:END \*/\n*', '',s)
s=re.sub(r'/\* LEARNING:CSS:START \*/[\s\S]*?/\* LEARNING:CSS:END \*/\n*', '',s)
s=re.sub(r'</header>\n+', '</header>\n\n',s)
m=re.search(r'window.IOE_TEXT_IDS = (\{[^\n]+\});',s)
assert m
registry=json.loads(m.group(1)); next_id=max(map(int,registry.values()))+1
added={};catalogs={'en':{},'uk':{}}
def register(t):
 global next_id
 assert set(t)=={'fr','en','uk'} and all(isinstance(t[l],str) and t[l].strip() for l in t)
 source=t['fr']
 if source not in registry:
  ident=str(next_id);next_id+=1;registry[source]=ident;added[source]=ident
  for lang in catalogs:catalogs[lang][ident]=t[lang]
 return source
for t in UI.values():register(t)
for ch in data['chapters']:
 source=re.search(r'<section\b[^>]*id="ch'+str(ch['ch'])+r'"[^>]*>([\s\S]*?)</section>',s).group(1)
 ids=set(map(int,re.findall(r'data-i="(\d+)"',source)))
 assert set(ch['source_ids'])<=ids, ch['ch']
 for k in ['gist','use','nuance','exercise_q','exercise_a','apply_q','apply_a','sentence']:register(ch[k])
 for t in ch['diagram']:register(t)
for exam in data['exams']:
 for k in ['title','prompt']:register(exam[k])
 for step in exam['steps']:register(step['q']);register(step['a'])
def esc(t):return html.escape(str(t),quote=True)
def txt(tag,t,attrs=''):
 source=register(t) if isinstance(t,dict) else t
 assert source in registry, source
 return f'<{tag} data-ui="{esc(source)}"{(" "+attrs) if attrs else ""}>{html.escape(source)}</{tag}>'
def label(tag,key,attrs=''):return txt(tag,UI[key],attrs)
def mark(name,body):return f'<!-- LEARNING:{name}:START -->\n{body}\n<!-- LEARNING:{name}:END -->\n'
cards=[]
for ch in data['chapters']:
 n=ch['ch'];concepts=' · '.join(ch['concepts'])
 diagram='<ol class="learning-diagram no-help">'+''.join('<li>'+txt('span',t)+'</li>' for t in ch['diagram'])+'</ol>'
 origin='Reformulation pédagogique · pas une citation du livre' if n<=10 else 'Support de cours · reconstruction, pas le texte du chapitre'
 body=f'<aside class="box learning-layer" data-learning-ch="{n}" data-source-ids="{",".join(map(str,ch["source_ids"]))}" aria-labelledby="learn-ch{n}">'
 body+=label('p',origin,'class="lab learning-origin"')+label('h2','En gros',f'id="learn-ch{n}" class="no-help"')+txt('p',ch['gist'])
 body+=label('h3','Schéma de lecture','class="no-help"')+diagram
 body+=label('h3','À quoi ça sert ?','class="no-help"')+txt('p',ch['use'])
 body+=label('h3','La nuance à garder','class="no-help"')+txt('p',ch['nuance'],'class="learning-nuance"')
 body+='<details class="learning-practice">'+label('summary','Prise en main : à toi de raisonner','class="no-help"')+label('p','Cherche une réponse avant d’ouvrir la piste. L’exemple est pédagogique, pas une question officielle.','class="muted no-help"')+txt('p',ch['exercise_q'],'class="learning-prompt"')
 body+='<details class="learning-solution">'+label('summary','Voir une piste de réponse','class="no-help"')+txt('p',ch['exercise_a'],'class="expl"')+'</details></details>'
 body+='<details class="learning-practice">'+label('summary','Quel concept mobiliser dans une copie ?','class="no-help"')+txt('p',ch['apply_q'],'class="learning-prompt"')
 body+='<p class="learning-concepts no-help">'+label('b','Ce que tu peux mobiliser :')+' '+esc(concepts)+'</p>'+txt('p',ch['apply_a'],'class="expl"')
 body+=label('h3','Exemple de formulation personnelle','class="no-help"')+txt('p',ch['sentence'],'class="learning-example"')+'</details>'
 body+='<div class="learning-links no-help">'+label('a','Cartes de ce chapitre',f'href="#flashcards" data-study-deck="application" data-study-ch="{n}" class="btn ghost"')
 if n>=11:body+=label('a','Revoir les sources disponibles','href="#sources"')
 body+='</div>'+label('p','Les paragraphes de référence suivent ci-dessous.','class="muted learning-reference no-help"')+'</aside>'
 section=re.search(r'<section\b[^>]*id="ch'+str(n)+r'"[^>]*>[\s\S]*?</header>',s)
 assert section
 pos=section.end();s=s[:pos]+'\n\n'+mark('CH'+str(n),body)+s[pos:]
 for kind,q,a in [('application','apply_q','apply_a'),('practice','exercise_q','exercise_a')]:
  cards.append(dict(id=f'learn:ch{n}:{kind}',type=kind,front=ch[q]['fr'],fr='',back=ch[a]['fr'],ch=n,href=f'#learn-ch{n}'))
# One workshop, using the same reading and disclosure conventions as the guide.
body='<section class="view tool-view" id="atelier" aria-labelledby="atelier-t"><header class="hero no-help">'+label('h1','Du livre à l’examen','id="atelier-t"')+label('p','Comprendre une idée, reconnaître son mécanisme dans un cas, puis l’expliquer sans réciter le cours.','class="sub"')+'</header>'
body+='<ol class="learning-diagram no-help">'+''.join('<li>'+label('span',t)+'</li>' for t in ['Comprendre','Reconnaître','Expliquer','S’entraîner'])+'</ol>'
body+=label('p','Un concept n’est pas un argument à lui seul. Définis-le, montre comment il agit dans le cas, puis indique une condition ou une limite. Les formulations proposées ici sont des paraphrases pédagogiques, jamais des citations exactes d’Ellingsen.')
body+=label('h2','Choisir ton entraînement','class="no-help"')+'<div class="learning-decks no-help">'
for kind,name,desc in [('application','Mobiliser le livre','Des situations pour choisir une idée du livre et expliquer pourquoi elle est pertinente.'),('practice','Prise en main','De petits raisonnements et calculs pour prendre en main les chapitres.'),('exam','Annales décomposées','Les concepts et les limites à retrouver à partir de sujets vérifiés.')]:
 body+='<div>'+label('a',name,f'href="#flashcards" data-study-deck="{kind}" class="btn ghost"')+label('p',desc,'class="muted"')+'</div>'
body+='</div>'+label('h2','Annales décomposées','class="no-help"')
body+=label('p','Questions officielles : résumés très courts. Les sous-questions, pistes et cartes sont des exercices pédagogiques créés pour cette fiche, pas un corrigé de l’examinateur. Ouvre le document original pour lire les énoncés complets.','class="muted no-help"')
body+=label('p','Source officielle : recueil de Tore Ellingsen, octobre 2026. Les années ci-dessous désignent les sessions d’examen.','class="learning-reference no-help"')
for index,exam in enumerate(data['exams']):
 ident=exam['id'];body+=f'<details class="exam-case" id="exam-{ident}"'+(' open' if index==0 else '')+'><summary class="no-help"><span class="exam-ref">'+esc(exam['ref'])+'</span>'+txt('strong',exam['title'])+'</summary>'
 body+='<div class="exam-content">'+label('h3','Résumé du sujet','class="no-help"')+txt('p',exam['prompt'])+label('a','Lire le sujet original',f'href="{esc(exam["source"])}" target="_blank" rel="noopener noreferrer" class="exam-source no-help"')
 body+='<p class="learning-concepts no-help">'+label('b','Ce que tu peux mobiliser :')+' '+esc(' · '.join(exam['concepts']))+'</p>'
 for step,title in zip(exam['steps'],['Repérer les concepts','Expliquer le mécanisme','Poser les limites']):
  body+='<div class="exam-step">'+label('h3',title,'class="no-help"')+txt('p',step['q'],'class="learning-prompt"')+'<details class="learning-solution">'+label('summary','Voir une piste de réponse','class="no-help"')+label('p','Piste pédagogique · plusieurs réponses argumentées sont possibles','class="muted learning-reference no-help"')+txt('p',step['a'],'class="expl"')+'</details></div>'
 body+='<div class="learning-links no-help">'+label('b','Retour aux chapitres')+' '+''.join(f'<a href="#ch{n}">Ch. {n}</a>' for n in exam['chapters'])+label('a','Réviser les cartes d’annales','href="#flashcards" data-study-deck="exam" class="btn ghost"')+'</div></div></details>'
 for step_index,kind in [(0,'concept'),(2,'limit')]:
  q={l:exam['title'][l]+' — '+exam['steps'][step_index]['q'][l] for l in ['fr','en','uk']};register(q)
  cards.append(dict(id=f'exam:{ident}:{kind}',type='exam',front=q['fr'],fr='',back=exam['steps'][step_index]['a']['fr'],ch=exam['ch'],href=f'#exam-{ident}',reference=exam['ref']))
body+='</section>'
marker='<!-- ============ FLASHCARDS ============ -->'
assert marker in s;s=s.replace(marker,mark('WORKSHOP',body)+'\n'+marker)
# Menu and filter additions do not change the original numbered blocks.
nav=mark('NAV','<li>'+label('a','Annales et entraînement','href="#atelier"')+'</li>')
s=s.replace('<li data-i="31">',nav+'      <li data-i="31">')
select=re.search(r'<select id="fc-deck">[\s\S]*?</select>',s).group(0)
options=''.join(label('option',name,f'value="{kind}"') for kind,name in [('application','Mobiliser le livre'),('practice','Prise en main'),('exam','Annales décomposées')])
s=s.replace(select,select.replace('</select>',mark('OPTIONS',options)+'</select>'))
# Source strings used by cards map to the same reviewed numeric catalogs as visible prose.
registry_code='Object.assign(window.IOE_TEXT_IDS, '+json.dumps(added,ensure_ascii=False)+');\nconst STUDY_CARDS = '+json.dumps(cards,ensure_ascii=False)+';'
registry_code=registry_code.replace('</script','<\\/script')
s=s.replace('(() => {', '/* LEARNING:REGISTRY:START */\n'+registry_code+'\n/* LEARNING:REGISTRY:END */\n\n(() => {',1)
# Mark the actual language of newly translated plain-text blocks, including exercise prompts.
old="$$('[data-ui]').forEach(el => el.textContent = tr(el.dataset.ui, el.closest('main') ? blockLanguage(el) : language));"
new="$$('[data-ui]').forEach(el => { const targetLanguage = el.closest('main') ? blockLanguage(el) : language; el.textContent = tr(el.dataset.ui, targetLanguage); if (el.closest('main')) el.lang = targetLanguage; });"
s=s.replace(old,new)
# Idempotent integration of card types and navigation behavior.
base=".concat(LEX.map(([en, fr, def, ch]) => ({ id: 'v:' + en, type: 'vocab', front: en, fr, back: def, ch })))"
if base+';' in s:s=s.replace(base+';',base+'.concat(STUDY_CARDS);')
old="if (!el.closest('main') || el.closest('.no-help')) return language;"
new=old+"\n  if (el.closest('.learning-prompt')) return promptLanguage();"
if new not in s:s=s.replace(old,new)
s=s.replace("!el.matches('.kicker,.lab,.pg,.tag')", "!el.matches('.kicker,.lab,.pg,.tag,summary')")
old="const previousView = views.find(v => !v.hidden);"
new="for (let parent = target; parent && parent !== view; parent = parent.parentElement) { if (parent.tagName === 'DETAILS') parent.open = true; }\n  "+old
if new not in s:s=s.replace(old,new)
old="const fc = {"
new="const cardTypeLabel = type => ({ vocab: 'Vocabulaire', concept: 'Concept', application: 'Mobiliser le livre', practice: 'Prise en main', exam: 'Annales décomposées' }[type] || 'Concept');\nconst fc = {"
if new not in s:s=s.replace(old,new)
s=s.replace("tr(c.type === 'vocab' ? 'Vocabulaire' : 'Concept')", "tr(cardTypeLabel(c.type))")
old="$('#fc-help').innerHTML = helpText(c.type === 'vocab' ? c.fr : c.front, c.back);"
new=old+"\n    if (c.href) $('#fc-help').insertAdjacentHTML('beforeend', `<a class=\"card-reference\" href=\"${esc(c.href)}\">${esc(tr('Ouvrir le passage lié'))}${c.reference ? ' · ' + esc(c.reference) : ''}</a>`);"
if new not in s:s=s.replace(old,new)
needle="$('#fc-deck').addEventListener('change', () => fc.build());"
addition="""document.addEventListener('click', e => {
  const link = e.target.closest('[data-study-deck]');
  if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const type = link.dataset.studyDeck;
  if (!['application', 'practice', 'exam'].includes(type)) return;
  $('#fc-deck').value = type;
  $('#fc-ch').value = /^([1-9]|1[0-3])$/.test(link.dataset.studyCh || '') ? link.dataset.studyCh : 'all';
  fc.build();
});
"""
if addition not in s:s=s.replace(needle,addition+needle)
# Compact additions inherit the paper palette, with native details for active recall.
css=(ROOT/'authoring/learning.css').read_text()
s=s.replace('</style>\n<div class="app"','/* LEARNING:CSS:START */\n'+css+'\n/* LEARNING:CSS:END */\n</style>\n<div class="app"')
path.write_text(s)
for lang,values in catalogs.items():
 p=ROOT/'i18n'/f'{lang}.js';text=p.read_text();text=re.sub(r'// LEARNING:START[\s\S]*?// LEARNING:END\n?', '',text)
 p.write_text(text.rstrip()+'\n// LEARNING:START\nObject.assign(window.IOE_I18N.'+lang+', '+json.dumps(values,ensure_ascii=False,indent=2)+');\n// LEARNING:END\n')
(ROOT/'authoring/learning-manifest.json').write_text(json.dumps({'new_translation_ids':list(added.values()),'new_cards':[c['id'] for c in cards],'chapter_sources':{c['ch']:c['source_ids'] for c in data['chapters']},'exam_source':data['exams'][0]['source'],'exam_collection':'October 2026'},ensure_ascii=False,indent=2)+'\n')
print(f'Integrated {len(data["chapters"])} chapter aids, {len(data["exams"])} verified exam topics, {len(cards)} stable cards and {len(added)} translated strings.')
