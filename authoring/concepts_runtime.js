/* CONCEPTS:RUNTIME:START */
var conceptSearchIndex, conceptReviewOnly = false;
function conceptIsChecked(id) { return fc.ratings['concept:' + id] === 2; }
function paintConceptChecklist() {
  const count = CONCEPT_GUIDES.filter(item => conceptIsChecked(item.id)).length;
  $('#concept-progress').value = count;
  $('#concept-progress-label').textContent = `${count} / ${CONCEPT_GUIDES.length} understood`;
  $('#concept-review-only').setAttribute('aria-pressed', String(conceptReviewOnly));
  $$('#concept-list [data-concept-check]').forEach(input => {
    input.checked = conceptIsChecked(input.dataset.conceptCheck);
    input.disabled = cloudState.loading;
  });
}
function searchConcepts(query, chapter) {
  if (!conceptSearchIndex) conceptSearchIndex = CONCEPT_GUIDES.map(item => makeSearchDocument(
    item,
    [item.en,item.title,tr(item.title,'uk')].join(' '),
    (CONCEPT_ALIASES[item.id] || []).join(' '),
    ['idea','question','answer','pitfall'].flatMap(key => [item[key],tr(item[key],'en'),tr(item[key],'uk')]).join(' ')
  ));
  const documents = conceptSearchIndex.filter(doc => chapter === 'all' || doc.item.ch === +chapter);
  return searchNormal(query).length < 2 ? documents.map(doc => doc.item) : smartSearch(query, documents);
}
function renderConcepts() {
  const container = $('#concept-list');
  if (!container) return;
  const open = new Set($$('details.concept-sheet[open]').map(el => el.id));
  const answers = new Set($$('details.concept-sheet').filter(el => el.querySelector('.concept-answer[open]')).map(el => el.id));
  const query = norm($('#concept-q').value.trim()), chapter = $('#concept-ch').value;
  const candidates = searchConcepts(query, chapter);
  const matching = conceptReviewOnly ? candidates.filter(item => !conceptIsChecked(item.id)) : candidates;
  // Concepts follow the book's language, independently of the reader's page preference.
  const titleLang = 'en';
  const conceptRoot = $('#concepts'); conceptRoot.lang = 'en';
  $$('#concepts [data-ui]').forEach(el => { el.textContent = tr(el.dataset.ui, 'en'); el.lang = 'en'; });
  $$('#concepts [data-ui-attr]').forEach(el => Object.entries(JSON.parse(el.dataset.uiAttr)).forEach(([attr, source]) => el.setAttribute(attr, tr(source, 'en'))));
  CH_T.forEach((title, i) => { const option = $('#concept-ch').querySelector(`option[value="${i + 1}"]`); if (option) option.textContent = `${i + 1}. ${tr(title, 'en')}`; });
  const conceptHelp = source => `<span class="i18n-help" role="group" aria-label="Translation help">${[['fr','French'],['uk','Ukrainian']].map(([lang,label]) => `<button type="button" data-help="${textIds[source]}" data-to="${lang}" aria-label="Read this passage in ${label}">${lang.toUpperCase()}</button>`).join('')}</span>`;
  const prose = source => `${esc(tr(source, 'en'))}${conceptHelp(source)}`;
  container.innerHTML = matching.map(item => {
    const id = 'concept-' + item.id;
    const title = item.en;
    return `<div class="concept-entry"><label class="concept-check"><input type="checkbox" data-concept-check="${item.id}" aria-label="Mark ${esc(item.en)} as understood"${conceptIsChecked(item.id) ? ' checked' : ''}${cloudState.loading ? ' disabled' : ''}><span>Got it</span></label><details class="concept-sheet" id="${id}"${open.has(id) || (searchNormal(query).length >= 2 && matching.length === 1) ? ' open' : ''}>
      <summary><span class="concept-name" lang="${titleLang}">${esc(title)}</span><span class="concept-ch">${esc(tr('Chapitre', 'en'))} ${item.ch}</span></summary>
      <div class="concept-body">
        ${item.ch > 10 ? `<p class="muted" lang="en">${esc(tr('Source partielle : fiche fondée sur les supports de cours, pas sur le texte intégral du chapitre.', 'en'))} <a href="#sources">${esc(tr('Sources', 'en'))}</a></p>` : ''}
        <h3>${esc(tr('L’idée en quelques mots', 'en'))}</h3><p lang="en">${prose(item.idea)}</p>
        <h3>${esc(tr('À toi de jouer', 'en'))}</h3><p class="concept-question" lang="${titleLang}">${prose(item.question,titleLang)}</p>
        <details class="concept-answer"${answers.has(id) ? ' open' : ''}><summary>${esc(tr('Voir la réponse expliquée', 'en'))}</summary><p class="expl" lang="en">${prose(item.answer)}</p></details>
        <h3>${esc(tr('La confusion à éviter', 'en'))}</h3><p class="concept-pitfall" lang="en">${prose(item.pitfall)}</p>
        <div class="concept-actions"><a href="#ch${item.ch}">${esc(tr('Approfondir au chapitre', 'en'))} ${item.ch}</a><a href="#flashcards" data-study-deck="application" data-study-ch="${item.ch}">${esc(tr('S’entraîner avec les flashcards', 'en'))}</a></div>
      </div></details></div>`;
  }).join('');
  $('#concept-count').textContent = tr('{0} / {1} notions', 'en').replace('{0}', matching.length).replace('{1}', CONCEPT_GUIDES.length);
  $('#concept-empty').hidden = matching.length > 0;
  if (!matching.length && conceptReviewOnly && candidates.length) $('#concept-empty').textContent = 'All matching concepts are checked. Turn off “To review only” to see them.';
  paintConceptChecklist();
}
let conceptSearchTimer;
$('#concept-q').addEventListener('input',() => { clearTimeout(conceptSearchTimer); conceptSearchTimer = setTimeout(renderConcepts, 120); });
$('#concept-q').addEventListener('keydown',e => { if (e.key === 'Escape') { clearTimeout(conceptSearchTimer); e.currentTarget.value = ''; renderConcepts(); } });
$('#concept-ch').addEventListener('change',renderConcepts);
$('#concept-reset').addEventListener('click',() => {
  clearTimeout(conceptSearchTimer); conceptReviewOnly = false; $('#concept-q').value = ''; $('#concept-ch').value = 'all'; renderConcepts(); $('#concept-q').focus();
});
$('#concept-review-only').addEventListener('click',() => { conceptReviewOnly = !conceptReviewOnly; renderConcepts(); });
$('#concept-list').addEventListener('change',e => {
  const input = e.target.closest('[data-concept-check]');
  if (!input) return;
  if (cloudState.loading) { paintConceptChecklist(); return; }
  fc.ratings['concept:' + input.dataset.conceptCheck] = input.checked ? 2 : 1;
  store.set('ioe-cards', fc.ratings);
  if (conceptReviewOnly) { renderConcepts(); $('#concept-review-only').focus(); }
  else paintConceptChecklist();
});
function prepareConceptRoute(id) {
  if (!id.startsWith('concept-') || !CONCEPT_GUIDES.some(item => 'concept-' + item.id === id)) return;
  // Deep links stay usable after a search/filter has hidden the requested sheet.
  if (!document.getElementById(id)) {
    conceptReviewOnly = false; $('#concept-q').value = ''; $('#concept-ch').value = 'all'; renderConcepts();
  }
}
/* CONCEPTS:RUNTIME:END */
