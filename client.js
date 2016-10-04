
var host = window.document.location.host.replace(/:.*/, '');
var ws = new WebSocket('ws://' + host + ':4080');
ws.onmessage = function (event) {
  console.log(event);
};
