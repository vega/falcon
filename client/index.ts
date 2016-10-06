
const host = window.document.location.host.replace(/:.*/, '');
const ws = new WebSocket('ws://' + host + ':4080');
ws.onmessage = function (event) {
  console.log(event);
};

ws.onopen = () => {
  ws.send('message');
};
