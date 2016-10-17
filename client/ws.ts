
const host = window.document.location.host.replace(/:.*/, '');
const ws = new WebSocket('ws://' + host + ':4080');

const callbacks = {};

ws.onmessage = (event) => {
  const result: Result = JSON.parse(event.data);
  callbacks[result.id] ? callbacks[result.id](result) : null;
}

const connection = {
  onOpen: (callback) => {
    ws.onopen = callback;
  },

  send: (message: Request, callback: Function) => {
    callbacks[message.id] = callback;
    ws.send(JSON.stringify(message));
  }
}


export default connection;
