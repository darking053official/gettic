import http from 'http';

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
  res.end('<h1>localhosttan liminin ve wroxynin amina girim</h1>');
});

server.listen(3000, () => {
  console.log('burdan liminin ve wroxynin amina girim');
});

