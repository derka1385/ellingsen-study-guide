/* CONCEPTS:RUNTIME:START */
function conceptMatches(item, query, chapter) {
  return (chapter === 'all' || item.ch === +chapter) && (!query || norm([
    item.en, item.title, item.idea, item.question, item.answer, item.pitfall,
    ...['en','uk'].flatMap(lang => [item.title,item.idea,item.question].map(text => tr(text, lang)))
  ].join(' ')).includes(query));
}
function renderConcepts() {
  const container = $('#concept-list');
  if (!container) return;
  const open = new Set($$('details.concept-sheet[open]').map(el => el.id));
  const answers = new Set($$('details.concept-sheet').filter(el => el.querySelector('.concept-answer[open]')).map(el => el.id));
  const query = norm($('#concept-q').value.trim()), chapter = $('#concept-ch').value;
  const matching = CONCEPT_GUIDES.filter(item => conceptMatches(item, query, chapter));
  const titleLang = promptLanguage();
  const prose = (source, lang = language) => `${esc(tr(source,lang))}${help([textIds[source]],lang)}`;
  container.innerHTML = matching.map(item => {
    const id = 'concept-' + item.id;
    const english = item.en;
    const nativeTitle = titleLang === 'en' ? english : tr(item.title,titleLang);
    const title = titleLang === 'uk' && !norm(nativeTitle).includes(norm(english)) ? `${nativeTitle} (${english})` : nativeTitle;
    const bilingual = titleLang !== 'en' && title !== english && !(titleLang === 'uk' && norm(title).includes(norm(english)));
    return `<details class="concept-sheet" id="${id}"${open.has(id) ? ' open' : ''}>
      <summary><span class="concept-name" lang="${titleLang}">${esc(title)}</span>${bilingual ? `<span class="concept-en" lang="en">${esc(english)}</span>` : ''}<span class="concept-ch">${esc(tr('Chapitre'))} ${item.ch}</span></summary>
      <div class="concept-body">
        ${item.ch > 10 ? `<p class="muted" lang="${language}">${esc(tr('Source partielle : fiche fondée sur les supports de cours, pas sur le texte intégral du chapitre.'))} <a href="#sources">${esc(tr('Sources'))}</a></p>` : ''}
        <h3>${esc(tr('L’idée en quelques mots'))}</h3><p lang="${language}">${prose(item.idea)}</p>
        <h3>${esc(tr('À toi de jouer'))}</h3><p class="concept-question" lang="${titleLang}">${prose(item.question,titleLang)}</p>
        <details class="concept-answer"${answers.has(id) ? ' open' : ''}><summary>${esc(tr('Voir la réponse expliquée'))}</summary><p class="expl" lang="${language}">${prose(item.answer)}</p></details>
        <h3>${esc(tr('La confusion à éviter'))}</h3><p class="concept-pitfall" lang="${language}">${prose(item.pitfall)}</p>
        <div class="concept-actions"><a href="#ch${item.ch}">${esc(tr('Approfondir au chapitre'))} ${item.ch}</a><a href="#flashcards" data-study-deck="application" data-study-ch="${item.ch}">${esc(tr('S’entraîner avec les flashcards'))}</a></div>
      </div></details>`;
  }).join('');
  $('#concept-count').textContent = msg('{0} / {1} notions', [matching.length,CONCEPT_GUIDES.length]);
  $('#concept-empty').hidden = matching.length > 0;
}
$('#concept-q').addEventListener('input',renderConcepts);
$('#concept-ch').addEventListener('change',renderConcepts);
$('#concept-reset').addEventListener('click',() => {
  $('#concept-q').value = ''; $('#concept-ch').value = 'all'; renderConcepts(); $('#concept-q').focus();
});
function prepareConceptRoute(id) {
  if (!id.startsWith('concept-') || !CONCEPT_GUIDES.some(item => 'concept-' + item.id === id)) return;
  // Deep links stay usable after a search/filter has hidden the requested sheet.
  if (!document.getElementById(id)) {
    $('#concept-q').value = ''; $('#concept-ch').value = 'all'; renderConcepts();
  }
}
/* CONCEPTS:RUNTIME:END */
