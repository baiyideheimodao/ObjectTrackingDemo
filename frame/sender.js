// const {socketHost,socketPort} = require('../config.js');
const START = 0;
const END = 1;
const HALFWAY = 0.5;
let i = 0;
let point1, point2;

let context = {};
let draw_status = END;
let p = [];
let list = new Set;
let socket = new WebSocket(`wss://rtc.haomanchat.com:5004`)
let video = document.getElementsByTagName('video')[0];
socket.binaryType = 'arraybuffer';

let symList = [];

let canvas = document.getElementById('canvas');
let width = screen.width;
let height = screen.height;
let stringMessage;
let iceMessage;

//录像质量
let recorderOptions = {
	audioBitsPerSecond: 128000,
	videoBitsPerSecond: 2500000,
	// mimeType : 'video/mp4'
}

let recorder = new MediaRecorder(canvas.captureStream(25), recorderOptions);

socket.onopen = function () {
	protobuf.load("awesome.proto").then(function (root) {
		stringMessage = root.lookupType("awesomepackage.stringMessage");
		iceMessage = root.lookupType("awesomepackage.ice");
		let frameid = stringMessage.create({
			type: 'id',
			width,
			height,
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
			// point &&
			draw(blueprintSet)
			context.stroke();
		}
	}
}

// navigator.getMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || window.navigator.mediaDevices.getUserMedia);
var configuration = { iceServers: [{
	urls: "stun:119.45.227.92:3478",
	username: "baiyideheimodao",
	credential: "zhuxingyu"
}]
};
var pc = new RTCPeerConnection(configuration);
/**
 * @param {RTCPeerConnection} PeerConnection
*/
async function sendStream(PeerConnection) {
	const localStream = await window.navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
	video.srcObject = localStream;
	video.onloadedmetadata = e => {
		width = video.width = video.videoWidth;
		height = video.height = video.videoHeight;
		console.log(video.videoHeight,video.videoWidth)
		let size = stringMessage.create({
			type:'size',
			width,
			height
		})
		socket.send(stringMessage.encode(size).finish());
		video.muted = true;
		let promise = video.play();
		if (promise !== undefined) {
			promise.catch(error => {
				console.log(error)
			}).then(() => console.log('ok'));
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
			console.log(message);
			console.log(blueprintSet.size, message.serial, symList);
			// oval(point1, point2);
			if (blueprintSet.size < message.serial) {
				symList[message.serial] = Symbol(message.shape);
			}
			blueprintSet.set(symList[message.serial], [point1, point2]);
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

let record = document.getElementsByTagName('button');
let chunks = [];
record[0].onclick = function () {
	recorder.start();
	console.log(recorder.state);
}
record[1].onclick = function () {
	console.log(recorder);
	let blob = recorder.stop();
	console.log(blob);
}

recorder.ondataavailable = function (e) {
	console.log(e);
	chunks.push(e.data);
	console.log(chunks);
	let file = new File(chunks, './1.mkv', {
		type: e.data.type
	});
	const link = document.getElementById('download');
	const downloadUrl = window.URL.createObjectURL(e.data);
	link.href = downloadUrl;
	link.download = `1.mkv`;
	// document.body.appendChild(link);///
	console.log(file);
}
