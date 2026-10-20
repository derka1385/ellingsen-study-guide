/* Local, deterministic search: multilingual terms, idea aliases and bounded typo matching. */
function searchNormal(value) {
  return String(value).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
const SEARCH_STOP = new Set(searchNormal('a an the of to for from with by in on at is are be do does how why what when can could would should it its this that and or about explain understand understanding learn learning tell show concept concepts me my i not le la les un une des du de d l au aux en dans sur avec pour par est sont etre comment pourquoi quoi quel quelle quels quelles peut peux tu je moi mon ma mes ce cette ces et ou ne pas non expliquer explique comprendre savoir veux voudrais faire notion notions qui que qu se я ти ми ви він вона вони це як чому що коли де про для до за на у в з із та і й або не чи бути поясни мені').split(' '));
const CONCEPT_ALIASES = {
  sacrifice: ['giving helping others costly help', 'donner aider autrui cout personnel', 'жертва допомога іншим власні витрати'],
  cooperation: ['working together cooperate cooperating mutual benefit collective action', 'entraide cooperer agir ensemble benefice mutuel', 'співпраця спільні дії взаємна вигода'],
  coercion: ['force compel threat sanctions fine', 'forcer contraindre menace sanctions amende', 'примус погроза санкції штраф'],
  'social-dilemma': ['collective action nobody contributes individual collective interests', 'personne ne contribue interet individuel collectif', 'ніхто не робить внесок індивідуальний спільний інтерес'],
  'free-rider': ['free riding free rider freeloading benefit without contributing', 'passager clandestin profiter sans contribuer', 'безбілетник користуватися без внеску'],
  rationality: ['rational selfish rationality preferences beliefs', 'rationnel egoiste preferences croyances', 'раціональність егоїзм уподобання переконання'],
  'expected-utility': ['uncertainty probability risk expected utility lottery', 'incertitude probabilite risque loterie utilite esperee', 'невизначеність імовірність ризик очікувана корисність'],
  externality: ['pollution noise spillover affects others', 'pollution bruit effet sur les autres', 'забруднення шум зовнішній ефект'],
  pareto: ['efficiency fairness inequality improve without hurting', 'efficacite justice inegalite ameliorer sans nuire', 'ефективність справедливість нерівність покращення без шкоди'],
  'situation-game': ['money versus utility payoffs preferences game form', 'argent utilite gains preferences forme jeu', 'гроші корисність виграші уподобання форма гри'],
  altruism: ['care about others generous generosity alpha', 'se soucier des autres generosite altruisme alpha', 'альтруїзм щедрість турбота про інших'],
  'internalized-norm': ['honesty conscience guilt duty nobody watching', 'honnetete conscience culpabilite devoir personne regarde', 'чесність совість провина обовязок ніхто не бачить'],
  institutions: ['rules of the game prescribed behaviour institutions organizations', 'regles comportement prescrit institutions organisations', 'правила поведінки інституції організації'],
  'descriptive-prescriptive': ['what people do versus ought should norms', 'ce que gens font doivent faire normes', 'що люди роблять повинні робити норми'],
  'formal-real': ['written unwritten effective rules laws customs', 'regles ecrites non ecrites lois coutumes respectees', 'писані неписані дієві правила закони звичаї'],
  dominance: ['dominant dominated always better whatever opponent', 'dominante dominee toujours meilleur choix adverse', 'домінантна домінована завжди краща стратегія'],
  'best-response': ['best reply optimal action given opponent', 'meilleure reponse choix optimal adversaire', 'найкраща відповідь оптимальна дія суперника'],
  nash: ['equilibrium unilateral deviation no incentive to deviate', 'equilibre deviation unilaterale personne change seul', 'рівновага Неша одностороннє відхилення'],
  'subgame-perfect': ['backward induction credible threat non credible threat sequential game', 'induction rebours menace non credible jeu sequentiel', 'зворотна індукція недостовірна погроза послідовна гра'],
  anarchy: ['no state no government arms production Hobbes', 'sans etat gouvernement armes production Hobbes', 'без держави уряду зброя виробництво Гоббс'],
  'property-rights': ['ownership investment protection confiscation property', 'propriete investissement protection confiscation', 'власність інвестиція захист конфіскація'],
  reciprocity: ['reward punish good bad actions repay gratitude revenge', 'recompenser punir rendre pareille gratitude vengeance', 'взаємність винагорода покарання вдячність помста'],
  'hold-up': ['hold up holdup broken promise cannot trust promised payment irreversible investment', 'promesse non tenue renier promesse investissement irreversible', 'порушена невиконана обіцянка не заплатить незворотна інвестиція'],
  commitment: ['bind hands credible promise enforceable penalty', 'lier mains engagement promesse credible penalite', 'звязати руки зобовязання достовірна обіцянка штраф'],
  coordination: ['stag hunt strategic risk fear other cooperate coordination failure', 'chasse cerf risque strategique peur autre coopere coordination', 'полювання оленя стратегічний ризик страх співпраця координація'],
  'cheap-talk': ['cheap talk communication costless message empty words', 'parole gratuite communication message sans engagement', 'дешеві розмови необовязкові повідомлення комунікація'],
  'common-awareness': ['everyone knows everyone knows public announcement common knowledge', 'tout monde sait tout monde sait annonce publique connaissance commune', 'усі знають усі знають публічне оголошення спільне знання'],
  'nominal-real-authority': ['boss leader title obedience actual power', 'chef dirigeant titre obeissance pouvoir reel', 'керівник посада виконання наказів реальна влада'],
  'limited-authority': ['limits power independent courts credible government promise', 'limites pouvoir tribunaux independants promesse gouvernement', 'обмеження влади незалежні суди обіцянка уряду'],
  'repeated-game': ['repeated game future relationships cooperation selfish', 'jeu repete futur relations cooperation cooperer egoistes', 'повторювана гра майбутнє відносини співпраця егоїзм'],
  delta: ['discount patience continuation probability future value delta', 'actualisation patience probabilite continuation avenir delta', 'дисконтування терпіння імовірність продовження майбутнє дельта'],
  renegotiation: ['renegotiation punishment forgiveness atonement grim trigger', 'renegociation sanction pardon reparation rupture definitive', 'перегляд покарання прощення відшкодування розрив'],
  'professional-enforcement': ['third party punishment professional police mafia many clients', 'tiers punition professionnel police mafia nombreux clients', 'третя сторона покарання професіонал поліція мафія клієнти'],
  'public-reputation': ['public reputation enforcer information clients know failure', 'reputation publique protecteur information clients manquement', 'публічна репутація захисник інформація клієнти відмова'],
  extortion: ['extortion racket tribute threats power abuse', 'extorsion racket tribut menaces abus pouvoir', 'вимагання данина погрози зловживання владою'],
  'multilateral-agreement': ['coalition participation outsiders public good pivotal member', 'coalition participation non participants bien public membre decisif', 'коаліція участь сторонні суспільне благо вирішальний учасник']
};
function makeSearchDocument(item, title, aliases, body) {
  const fields = [[title, 12], [aliases, 7], [body, 2]].map(([value, weight]) => {
    const text = searchNormal(value); return {text, words: [...new Set(text.split(' ').filter(Boolean))], weight};
  });
  return {item, fields};
}
function searchDistance(a, b, limit) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = Array.from({length: b.length + 1}, (_, i) => i), beforePrevious = null;
  for (let i = 1; i <= a.length; i++) {
    const row = [i]; let minimum = i;
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] !== b[j - 1]));
      if (beforePrevious && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) row[j] = Math.min(row[j], beforePrevious[j - 2] + 1);
      minimum = Math.min(minimum, row[j]);
    }
    if (minimum > limit) return limit + 1;
    beforePrevious = previous; previous = row;
  }
  return previous[b.length];
}
function smartSearch(query, documents) {
  const phrase = searchNormal(String(query).slice(0, 200));
  const allWords = [...new Set(phrase.split(' ').filter(Boolean))].slice(0, 16);
  const words = allWords.filter(word => !SEARCH_STOP.has(word));
  if (!words.length) return [];
  const ranked = documents.map(document => {
    let score = 0, matched = 0;
    for (const word of words) {
      let best = 0;
      for (const field of document.fields) {
        if (field.words.includes(word)) { best = Math.max(best, field.weight); continue; }
        if (word.length >= 4 && field.words.some(candidate => candidate.startsWith(word) || (candidate.length >= 4 && word.startsWith(candidate)))) best = Math.max(best, field.weight * .8);
        if (word.length >= 4 && word.length <= 24 && best < field.weight * .6) {
          const limit = word.length >= 8 ? 2 : 1;
          if (field.words.some(candidate => candidate.length >= 4 && Math.abs(candidate.length - word.length) <= limit && searchDistance(word, candidate, limit) <= limit)) best = Math.max(best, field.weight * .6);
        }
      }
      if (best) { matched++; score += best; }
    }
    const exactTitle = document.fields[0].text === phrase;
    if (phrase.length >= 3 && document.fields[0].text.includes(phrase)) score += 24;
    if (exactTitle) score += 36;
    if (matched < Math.ceil(words.length * .6)) return null;
    return {document, score: score * matched / words.length};
  }).filter(result => result && result.score > 0).sort((a,b) => b.score - a.score);
  const minimum = (ranked[0]?.score || 0) * .3;
  return ranked.filter(result => result.score >= minimum).map(result => result.document.item);
}
