import u from 'uWebSockets.js';
import protobuf from 'protobufjs'
import { config } from './config.js';
console.log(config)
let stringMessage = protobuf.loadSync('../frame/awesome.proto').lookupType('awesomepackage.stringMessage');
// stringMessage
let video;
let coordinate = false;
let lastF = false;
let track = false;
let websocket = new Map();
u.SSLApp({
  key_file_name:'/usr/local/nginx/conf/rtc.haomanchat.com_nginx/rtc.haomanchat.com.key',
  cert_file_name:'/usr/local/nginx/conf/rtc.haomanchat.com_nginx/rtc.haomanchat.com_bundle.pem'
})
//.addServerName("rtc.haomanchat.com")
.ws('/*', {
    //设置socket长度
    maxPayloadLength: 51200,
    open: (ws) => {
        console.log('socket open')
        console.log(ws);
    },
    /**
     * @param {WebSocket} ws
     * @param {ArrayBuffer} message 
    */
    message: async (ws, message, isBinary) => {
        message = new Uint8Array(message);
        let data = stringMessage.decode(message);
        switch (data.type) {
            case 'locate':
                coordinate = data.locate;
                console.log('data:', data);
                websocket.get('frame').send(message,isBinary);
                break;
            case 'id':
                console.log('id:',data);
                websocket.set(data.message, ws);
                break;
            case 'sdp':
                console.log('sdp')
                websocket.get('choose').send(message,isBinary);
                break;
            case 'answer':
                console.log('answer')
                websocket.get('frame').send(message,isBinary);
                break;
            case 'ice':
                console.log('ice');
                websocket.get('choose').send(message,isBinary);
                break;
            case 'size':
                websocket.get('choose').send(message,isBinary);
                break;
            default:
                break;
        }
    }
    }).get('/*', (res, req) => {
        /* It does Http as well */
        console.log(res);
        res.writeStatus('200 OK').writeHeader('IsExample', 'Yes')
            .end(video);
    }).listen(config.socketPort, (listenSocket) => {
        if (listenSocket) {
            console.log(`Listening to port ${config.socketPort}`);
        }
    });
