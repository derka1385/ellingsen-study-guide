"""Integrate concept sheets only; preserve original numbered HTML and all existing IDs."""
from pathlib import Path
import html,json,re
ROOT=Path(__file__).resolve().parent.parent
path=ROOT/'ellingsen.html'
s=path.read_text()
# This builder only replaces its own marked additions.
for tag in ['HTML','NAV']:
 s=re.sub(r'<!-- CONCEPTS:'+tag+r':START -->[\s\S]*?<!-- CONCEPTS:'+tag+r':END -->\n?', '',s)
for tag in ['REGISTRY','CSS','RUNTIME']:
 s=re.sub(r'/\* CONCEPTS:'+tag+r':START \*/[\s\S]*?/\* CONCEPTS:'+tag+r':END \*/\n?', '',s)
registry={}
base=re.search(r'window.IOE_TEXT_IDS = (\{[^\n]+\});',s)
assert base
registry.update(json.loads(base.group(1)))
for m in re.finditer(r'Object.assign\(window.IOE_TEXT_IDS, (\{[^\n]+\})\);',s):registry.update(json.loads(m.group(1)))
next_id=max(map(int,registry.values()))+1
added={};translations={'en':{},'uk':{}}
def register(t):
 global next_id
 assert set(t)=={'fr','en','uk'} and all(t.values())
 source=t['fr']
 if source not in registry:
  ident=str(next_id);next_id+=1;registry[source]=ident;added[source]=ident
  for lang in translations:translations[lang][ident]=t[lang]
 return source
UI=[
('Concepts','Concepts','Поняття'),
('Une notion à la fois','One concept at a time','Одне поняття за раз'),
('Choisis une notion, comprends son idée, puis essaie le mini-cas avant de lire la réponse.','Choose a concept, understand the idea, then try the mini-case before reading the answer.','Обери поняття, зрозумій його ідею, а потім спробуй розібрати мініситуацію, перш ніж читати відповідь.'),
('36 fiches courtes sur les notions essentielles des chapitres 1 à 13. Les exemples sont inventés pour apprendre : ce ne sont ni des citations du livre ni des corrigés officiels.','36 short guides to essential concepts from chapters 1 to 13. The examples are invented for learning: they are neither quotations from the book nor official answers.','36 коротких пояснень ключових понять розділів 1–13. Приклади створені для навчання: це не цитати з книги й не офіційні відповіді.'),
('Chercher une notion','Find a concept','Знайти поняття'),
('ex. Nash, sacrifice, engagement…','e.g. Nash, sacrifice, commitment…','напр. Неш, жертва, зобов’язання…'),
('Tous les chapitres','All chapters','Усі розділи'),
('Effacer les filtres','Clear filters','Скинути фільтри'),
('{0} / {1} notions','{0} / {1} concepts','{0} / {1} понять'),
('Aucune fiche ne correspond. Essaie un autre terme ou efface les filtres.','No matching guide. Try another term or clear the filters.','Відповідних пояснень немає. Спробуй інший термін або скинь фільтри.'),
('L’idée en quelques mots','The idea in a few words','Ідея кількома словами'),
('À toi de jouer','Try it yourself','Спробуй самостійно'),
('Voir la réponse expliquée','Show the explained answer','Показати відповідь із поясненням'),
('La confusion à éviter','The confusion to avoid','Що не слід плутати'),
('Approfondir au chapitre','Explore in chapter','Докладніше в розділі'),
('S’entraîner avec les flashcards','Practise with flashcards','Попрактикуватися з картками'),
('Source partielle : fiche fondée sur les supports de cours, pas sur le texte intégral du chapitre.','Partial source: this guide draws on course materials, not the full chapter text.','Неповне джерело: пояснення спирається на матеріали курсу, а не на повний текст розділу.'),
('Tu cherches un autre terme ?','Looking for another term?','Шукаєш інший термін?'),
('Le lexique rassemble les 213 termes de la fiche, avec leurs définitions et traductions. Les chapitres développent les raisonnements complets.','The glossary collects the guide’s 213 terms, with definitions and translations. The chapters develop the full reasoning.','Глосарій містить 213 термінів посібника з визначеннями та перекладами. Повні міркування розгорнуто в розділах.'),
('Ouvrir le lexique','Open the glossary','Відкрити глосарій'),
('Prendre en main les concepts','Get to grips with the concepts','Опанувати поняття'),
]
labels={row[0]:register(dict(zip(['fr','en','uk'],row))) for row in UI}
items=json.loads((ROOT/'authoring/concepts.json').read_text())
assert len(items)==36 and len({x['id'] for x in items})==36
records=[]
for item in items:
 assert 1<=item['ch']<=13
 record={'id':item['id'],'ch':item['ch'],'en':item['title']['en']}
 for key in ['title','idea','question','answer','pitfall']:record[key]=register(item[key])
 records.append(record)
def esc(x):return html.escape(str(x),quote=True)
def ui(tag,source,attrs=''):
 assert source in registry,source
 return f'<{tag} data-ui="{esc(source)}"{(" "+attrs) if attrs else ""}>{html.escape(source)}</{tag}>'
body='<section class="view tool-view no-help" id="concepts" aria-labelledby="concepts-title">\n<header class="hero">'+ui('h1','Une notion à la fois','id="concepts-title"')+ui('p','Choisis une notion, comprends son idée, puis essaie le mini-cas avant de lire la réponse.','class="sub"')+'</header>\n'
body+=ui('p','36 fiches courtes sur les notions essentielles des chapitres 1 à 13. Les exemples sont inventés pour apprendre : ce ne sont ni des citations du livre ni des corrigés officiels.','class="concept-intro"')
body+='<div class="bar filters concept-filters"><div class="filter-field grow">'+ui('label','Chercher une notion','for="concept-q"')+'<input type="search" id="concept-q" autocomplete="off" placeholder="ex. Nash, sacrifice, engagement…" data-ui-attr=\''+json.dumps({'placeholder':'ex. Nash, sacrifice, engagement…'},ensure_ascii=False)+'\'></div><div class="filter-field">'+ui('label','Chapitre','for="concept-ch"')+'<select id="concept-ch">'+ui('option','Tous les chapitres','value="all"')+'</select></div>'+ui('button','Effacer les filtres','type="button" class="btn ghost" id="concept-reset"')+'</div>\n<p id="concept-count" role="status" aria-live="polite" aria-atomic="true"></p>\n<div id="concept-list"></div>\n'+ui('p','Aucune fiche ne correspond. Essaie un autre terme ou efface les filtres.','id="concept-empty" hidden')
body+='<div class="concept-footer">'+ui('h2','Tu cherches un autre terme ?')+ui('p','Le lexique rassemble les 213 termes de la fiche, avec leurs définitions et traductions. Les chapitres développent les raisonnements complets.')+ui('a','Ouvrir le lexique','href="#lexique" class="btn ghost"')+'</div></section>'
marker='<!-- ============ FLASHCARDS ============ -->'
s=s.replace(marker,'<!-- CONCEPTS:HTML:START -->\n'+body+'\n<!-- CONCEPTS:HTML:END -->\n'+marker)
nav='<!-- CONCEPTS:NAV:START -->\n<ul><li>'+ui('a','Concepts','href="#concepts"')+'</li></ul>\n<!-- CONCEPTS:NAV:END -->\n'
# Visible beside the book map, before the chapter list, rather than buried after the tools.
anchor='    <h2 data-i="3">';assert anchor in s
s=s.replace(anchor,nav+anchor,1)
code='Object.assign(window.IOE_TEXT_IDS, '+json.dumps(added,ensure_ascii=False)+');\nconst CONCEPT_GUIDES = '+json.dumps(records,ensure_ascii=False)+';'
s=s.replace('(() => {','/* CONCEPTS:REGISTRY:START */\n'+code.replace('</script','<\\/script')+'\n/* CONCEPTS:REGISTRY:END */\n(() => {',1)
css=(ROOT/'authoring/concepts.css').read_text()
s=s.replace('</style>','/* CONCEPTS:CSS:START */\n'+css+'/* CONCEPTS:CSS:END */\n</style>',1)
runtime=(ROOT/'authoring/concepts_runtime.js').read_text()
anchor='/* ---------- penseurs ---------- */';assert anchor in s
s=s.replace(anchor,runtime.rstrip()+'\n'+anchor,1)
s=s.replace("['#lex-ch', '#fc-ch', '#qz-ch']", "['#lex-ch', '#fc-ch', '#qz-ch', '#concept-ch']")
if 'renderLex(); renderConcepts(); renderTL();' not in s:s=s.replace('renderLex(); renderTL();','renderLex(); renderConcepts(); renderTL();')
route="  let target = document.getElementById(id);"
if '  prepareConceptRoute(id);\n'+route not in s:s=s.replace(route,'  prepareConceptRoute(id);\n'+route)
path.write_text(s)
for lang in translations:
 p=ROOT/'i18n'/f'{lang}.js';catalog=p.read_text()
 catalog=re.sub(r'/\* CONCEPTS:CATALOG:START \*/[\s\S]*?/\* CONCEPTS:CATALOG:END \*/\n?', '',catalog)
 catalog+='/* CONCEPTS:CATALOG:START */\nObject.assign(window.IOE_I18N.'+lang+', '+json.dumps(translations[lang],ensure_ascii=False,indent=2)+');\n/* CONCEPTS:CATALOG:END */\n'
 p.write_text(catalog)
(ROOT/'authoring/concepts-manifest.json').write_text(json.dumps({'concepts':len(items),'ids':added,'chapters':sorted({x['ch'] for x in items})},ensure_ascii=False,indent=2)+'\n')
print(f'Integrated {len(items)} concepts; {len(added)} catalog entries per language')
