
const COUNTRY_DEFAULT = {
  ES:'es',AD:'ca',FR:'fr',DE:'de',AT:'de',CH:'de',IT:'it',PT:'pt',BR:'pt',NL:'nl',
  BE:'nl',PL:'pl',RU:'ru',UA:'uk',TR:'tr',SA:'ar',AE:'ar',IL:'he',CN:'zh',TW:'zh',
  JP:'ja',KR:'ko',IN:'hi',MX:'es',AR:'es',CL:'es',CO:'es',PE:'es'
};

function firstAcceptedLanguage(header='') {
  return header.split(',')
    .map(part => {
      const [tag, qraw] = part.trim().split(';q=');
      return {tag:String(tag||'').trim(), q:qraw ? Number(qraw) : 1};
    })
    .filter(x => x.tag && x.tag !== '*' && Number.isFinite(x.q))
    .sort((a,b) => b.q-a.q)[0]?.tag || null;
}

export async function onRequestGet(context) {
  const request = context.request;
  const country = request.cf?.country || null;
  const accepted = firstAcceptedLanguage(request.headers.get('accept-language') || '');
  const language = accepted || COUNTRY_DEFAULT[country] || 'en';
  return Response.json(
    {language, country, source: accepted ? 'accept-language' : country ? 'edge-country' : 'fallback'},
    {headers:{'cache-control':'private, max-age=300','vary':'accept-language'}}
  );
}
