const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null,{headers:cors});
    if (url.pathname === '/api/health') return Response.json({ok:true,service:'DriveFile Toolkit API',version:'1.0.0'},{headers:cors});
    if (url.pathname === '/') return new Response('DriveFile Toolkit Worker is running.',{headers:{...cors,'Content-Type':'text/plain'}});
    return Response.json({error:'Not found'},{status:404,headers:cors});
  }
};