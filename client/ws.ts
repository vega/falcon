const host = window.document.location.host.replace(/:.*/, '');
const ws = new WebSocket('ws://' + host + ':4080');

const callbacks: {
  result?: (data: any) => void,
} = {
  result: undefined,
};

ws.onmessage = event => {
  setTimeout(() => {  // don't block on parsing all messages
    const result: any = JSON.parse(event.data);
    if (callbacks.result) {
      callbacks.result(result);
    }
  });
};

const connection: Connection = {
  onOpen: callback => {
    ws.onopen = callback;
  },

  send: message => {
    ws.send(JSON.stringify(message));
  },

  onResult: callback => {
    callbacks.result = callback;
  },
};

window.addEventListener('beforeunload', () => {
  ws.close();
});

export interface Connection {
    onOpen: (callback: () => void) => void;
    send: (message: ApiRequest) => void;
    onResult: (callback: (data: any) => void) => void;
}

export default connection;
