// const {socketHost,socketPort} = require('../config.js');
const START = 0;
const END = 1;
const HALFWAY = 0.5;
let i = 0;
let point1, point2;
//控制是否绘制椭圆的开关，防止出现重影
let on_off = false;
let context = {};
let draw_status = END;
let p = [];
let list = new Set;
let socket = new WebSocket(`wss://192.168.31.175:5004`)//marketing.vrmage.com:5004`)
let video = document.getElementsByTagName('video')[0];
socket.binaryType = 'arraybuffer';
/**
 * @param {CanvasRenderingContext2D} context 
*/
function oval(p1, p2) {
	console.log([...p1, ...p2]);
	// return
	context.save();
	let x = p1[0] - p2[0];
	let y = p1[1] - p2[1];
	let r = Math.sqrt(0.5);
	context.scale(x, y)
	context.arc(
		(p1[0] + p2[0]) * 0.5 / x,
		(p1[1] + p2[1]) * 0.5 / y,
		r,
		0,
		Math.PI * 2,
		true,
	)
	context.restore()
	return [...p1, ...p2];
}

let canvas = document.getElementById('canvas');
let width = 640;
let height = 480;
let stringMessage;
let iceMessage;
socket.onopen = function () {
	protobuf.load("awesome.proto").then(function (root) {
		stringMessage = root.lookupType("awesomepackage.stringMessage");
		iceMessage = root.lookupType("awesomepackage.ice");
		let frameid = stringMessage.create({
			type: 'id',
			message: 'frame'
		})
		socket.binaryType = 'arraybuffer';
		socket.send(stringMessage.encode(frameid).finish());
	})
        sendStream(pc);
	console.log('open');
}
// socket.send()
function takepicture(video) {
	return function () {
		context = canvas.getContext('2d');
		if (width && height) {
			canvas.width = width;
			canvas.height = height;
			context.drawImage(video, 0, 0, width, height);
                        point1 && oval(point1,point2);
                        context.stroke();
		}
	}
}

// navigator.getMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || window.navigator.mediaDevices.getUserMedia);
var pc = new RTCPeerConnection();
/**
 * @param {RTCPeerConnection} PeerConnection
*/
async function sendStream(PeerConnection) {
	const localStream = await window.navigator.mediaDevices.getUserMedia({ video: {facingMode:'environment'}, audio: false });
	video.srcObject = localStream;
	video.onloadedmetadata = e => {
		video.muted = true;
                let promise = video.play();
                if(promise !== undefined){
		  promise.catch(error=>{
		    console.log(error)
		}).then(()=>console.log('ok'));
		}
		setInterval(takepicture(video), 1000 / 10)
	}
	localStream.getVideoTracks().forEach(track => PeerConnection.addTrack(track, localStream));
	let offer = await PeerConnection.createOffer();
	PeerConnection.onicecandidate = event => {
		if (event.candidate) {
			console.log(event.candidate)
			let ice = iceMessage.fromObject(event.candidate);
			let iceObj = iceMessage.create({
				type: 'ice',
				ice
			})
			let iceBuffer = stringMessage.encode(iceObj).finish();
			console.log(ice, iceBuffer, stringMessage.decode(iceBuffer));
			socket.send(iceBuffer);
		} else {
			console.log("all ice End", event)
		}
	};
	await PeerConnection.setLocalDescription(offer);
	console.log('105:', PeerConnection.localDescription.sdp === offer.sdp);
	let sdp = stringMessage.create({
		type: 'sdp',
		offer: {
			type: offer.type,
			sdp: offer.sdp
		},
		message: offer.sdp
	})
	let sdpbuffer = stringMessage.encode(sdp).finish();
	console.log('sdpbuffer', stringMessage.decode(sdpbuffer));
	socket.send(sdpbuffer);

}
//sendStream(pc);
socket.onmessage = function (event) {
	let message = stringMessage.decode(new Uint8Array(event.data));
	switch (message.type) {
		case 'locate':
			p = message.locate;
			point1 = [p[0], p[1]];
			point2 = [p[2], p[3]];
			break;
		case 'answer':
			console.log('answer', message)
			console.log('local', pc.localDescription)
			// new RTCSessionDescription()
			pc.setRemoteDescription({ type: 'answer', sdp: message.message });
		default:
			break;
	}
}
// var PeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
// var SessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;

