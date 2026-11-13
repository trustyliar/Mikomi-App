// Kana tables and the N5/N4 course map.
const ROWS = [
  ['a','あいうえお','アイウエオ','a i u e o'], ['ka','かきくけこ','カキクケコ','ka ki ku ke ko'],
  ['sa','さしすせそ','サシスセソ','sa shi su se so'], ['ta','たちつてと','タチツテト','ta chi tsu te to'],
  ['na','なにぬねの','ナニヌネノ','na ni nu ne no'], ['ha','はひふへほ','ハヒフヘホ','ha hi fu he ho'],
  ['ma','まみむめも','マミムメモ','ma mi mu me mo'], ['ya','やゆよ','ヤユヨ','ya yu yo'],
  ['ra','らりるれろ','ラリルレロ','ra ri ru re ro'], ['wa','わをん','ワヲン','wa wo n']
];
const V = {a:'अ',i:'इ',u:'उ',e:'ए',o:'ओ'}, M = {a:'',i:'ि',u:'ु',e:'े',o:'ो'};
const C = {k:'क',s:'स',t:'त',n:'न',h:'ह',m:'म',y:'य',r:'र',w:'व'};
const SP = {shi:'शि',chi:'चि',tsu:'त्सु',fu:'फ़ु',wo:'ओ/वो',n:'न्'};
// Devanagari sound guide for a romaji syllable.
export function deva(ro){ return SP[ro] || V[ro] || (C[ro[0]] + M[ro[1]]); }

export const KANA = [];
export const KROWS = { h:[], k:[] };
for (const [name, hi, ka, ro] of ROWS) {
  const r = ro.split(' ');
  for (const [s, str] of [['h',hi],['k',ka]]) {
    const items = [...str].map((ch,i) => ({ id:s+':'+ch, ch, ro:r[i], script:s, row:name }));
    KANA.push(...items); KROWS[s].push({ name, items });
  }
}

// [title, grammar focus]
export const UNITS = {
  n5: [
    ['Greetings and introducing yourself','〜は 〜です'], ['This, that and whose','これ・それ・あれ, の'],
    ['Places and where things are','ここ・そこ・あそこ, どこ'], ['Time and daily routine','〜ます, 〜に (time)'],
    ['Going and coming','〜へ いきます, で (transport)'], ['Eating, drinking, doing','〜を, 〜で (place)'],
    ['Giving and receiving','あげます・もらいます, に'], ['Describing things','い-adjectives, な-adjectives'],
    ['Likes, skills and reasons','〜が すきです, から'], ['Where it is','あります・います, 〜の うえ'],
    ['Counting things','counters, 〜つ, 〜にん'], ['Past and comparison','〜でした, 〜より, いちばん'],
    ['Wants and purposes','〜たいです, 〜に いきます'], ['The て-form','〜て ください, 〜て います'],
    ['Permission and rules','〜ても いいです, 〜ては いけません'], ['Joining sentences','〜て、〜て, 〜てから'],
    ['The ない-form','〜ないで ください, 〜なければ なりません'], ['Dictionary form and ability','〜ことが できます, まえに'],
    ['The た-form and experience','〜たことが あります, 〜たり'], ['Plain style and review','ふつうけい, N5 revision']
  ],
  n4: [
    ['Plain-style conversation','〜んです, casual speech'], ['Potential verbs','〜られます, 〜ように なります'],
    ['Doing two things','〜ながら, 〜し、〜し'], ['States and results','〜て あります, 〜て おきます'],
    ['Intentions and plans','volitional, 〜つもりです, 〜よていです'], ['Advice','〜たほうが いいです, 〜でしょう'],
    ['Commands and prohibitions','めいれいけい, 〜な, 〜と いう いみ'], ['As instructed','〜とおりに, 〜あとで'],
    ['Reasons','〜ので, 〜のに'], ['Conditionals 1','〜ば, 〜なら'],
    ['Conditionals 2','〜たら, 〜と'], ['Goals and change','〜ように, 〜ように します'],
    ['Passive','うけみ'], ['Nominalising','〜のは, 〜のが, 〜のを'],
    ['Cause and feeling','〜て (reason), 〜ので'], ['Embedded questions','〜か どうか, 〜か'],
    ['Giving and receiving favours','〜て あげます・くれます・もらいます'], ['Purpose','〜ために, 〜のに'],
    ['Appearance and hearsay','〜そうです, 〜ようです, 〜らしい'], ['Too much, easy, hard','〜すぎます, 〜やすい, 〜にくい'],
    ['Causative','しえき, 〜させて ください'], ['Respect language','そんけいご, けんじょうご, N4 revision']
  ]
};
