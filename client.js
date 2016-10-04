const host = window.document.location.host.replace(/:.*/, '');
const ws = new WebSocket('ws://' + host + ':4080');

ws.onmessage = event => {
  console.log(event);
};

ws.onopen = event => {
  ws.send('Hello world'); 
};
