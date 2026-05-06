import http from 'http';

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
  res.write('<h1>(gercek)</h1>');
  res.write('<p>(bu bir gercek)</p>');
  res.end();
});

server.listen(3000, () => {
  console.log('burdan liminalin ve wroxynin amina uciyim');
});

