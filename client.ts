/// <reference path="interfaces.d.ts" />

const host = window.document.location.host.replace(/:.*/, '');
const ws = new WebSocket('ws://' + host + ':4080');
ws.onmessage = (event) => {
  console.log(event);
  const result: Result = JSON.parse(event.data);

  switch (result.type) {
    case 'query':
      console.log(result.data);
      break;
    case 'range':
      console.log(result.ranges);
      break;
  }
};

ws.onopen = () => {
  ws.send('message');
};
