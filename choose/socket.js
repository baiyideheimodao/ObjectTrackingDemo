const START = 0;
const END = 1;
const HALFWAY = 0.5;
let i = 0;
let point1, point2;

let draw_status = END;
let stringMessage;
let p;
let sdp;
let socket = new WebSocket('wss://rtc.haomanchat.com:5004')
let video = document.getElementsByTagName('video')[0];
const localvideo = document.createElement('video');
localvideo.autoplay = true;
localvideo.muted = true;
let width, height;
// let width = screen.width;
// let height = screen.height;
let locate;


let paintShape;
let sym;



class trackNow {
    constructor(sym, point1, point2) {
        blueprintSet.set(sym, [point1, point2]);
        this.serial = blueprintSet.size;
        let coordinate = [
            ...point1,
            point2[0] - point1[0],
            point2[1] - point1[1]
        ];
        let cap = new cv.VideoCapture(video);
        console.log(video, video.height, video.width);
        let frame = new cv.Mat(video.height, video.width, cv.CV_8UC4);
        cap.read(frame);
        console.log('coordinate:=====', coordinate);
        let trackWindow = new cv.Rect(...coordinate);
        console.log('trackWindow', trackWindow);
        let roi = frame.roi(trackWindow);
        console.log('cv====', frame, trackWindow, roi);
        let hsvRoi = new cv.Mat();
        cv.cvtColor(roi, hsvRoi, cv.COLOR_RGBA2RGB);
        cv.cvtColor(hsvRoi, hsvRoi, cv.COLOR_RGB2HSV);
        let mask = new cv.Mat();
        let lowScalar = new cv.Scalar(30, 30, 0);
        let highScalar = new cv.Scalar(180, 180, 180);
        let low = new cv.Mat(hsvRoi.rows, hsvRoi.cols, hsvRoi.type(), lowScalar);
        let high = new cv.Mat(hsvRoi.rows, hsvRoi.cols, hsvRoi.type(), highScalar);
        cv.inRange(hsvRoi, low, high, mask);
        let roiHist = new cv.Mat();
        let hsvRoiVec = new cv.MatVector();
        hsvRoiVec.push_back(hsvRoi);
        cv.calcHist(hsvRoiVec, [0], mask, roiHist, [180], [0, 180]);
        cv.normalize(roiHist, roiHist, 0, 255, cv.NORM_MINMAX);

        // delete useless mats.
        roi.delete(); hsvRoi.delete(); mask.delete(); low.delete(); high.delete(); hsvRoiVec.delete();

        // Setup the termination criteria, either 10 iteration or move by atleast 1 pt
        let termCrit = new cv.TermCriteria(cv.TERM_CRITERIA_EPS | cv.TERM_CRITERIA_COUNT, 10, 1);

        let hsv = new cv.Mat(video.height, video.width, cv.CV_8UC3);
        let hsvVec = new cv.MatVector();
        hsvVec.push_back(hsv);
        let dst = new cv.Mat();
        let trackBox = null;

        const FPS = 30;
        let processVideo = () => {
            try {
                // if (!streaming) {
                //     // clean and stop.
                //     frame.delete(); dst.delete(); hsvVec.delete(); roiHist.delete(); hsv.delete();
                //     return;
                // }
                let begin = Date.now();

                // start processing.
                cap.read(frame);
                cv.cvtColor(frame, hsv, cv.COLOR_RGBA2RGB);
                cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);
                cv.calcBackProject(hsvVec, [0], roiHist, dst, [0, 180], 1);

                // apply camshift to get the new location
                [trackBox, trackWindow] = cv.CamShift(dst, trackWindow, termCrit);
                // Draw it on image
                let pts = cv.rotatedRectPoints(trackBox);
                console.log('pts:', pts);
                point1 = Object.values(pts[0]);
                point2 = Object.values(pts[2]);
                blueprintSet.set(sym, [point1, point2]);
                let message = stringMessage.create({
                    type: 'locate',
                    shape: paintShape,
                    serial: this.serial,
                    locate: [...point1, ...point2]
                })
                let buffer = stringMessage.encode(message).finish();
                console.log(message);
                socket.send(buffer);
                // schedule the next one.
                let delay = 1000 / FPS - (Date.now() - begin);
                setTimeout(processVideo, delay);
            } catch (err) {
                console.log(err);
            }
        };
        setTimeout(processVideo, 0);

    }
}

video.autoplay = true;
socket.onopen = function () {
    protobuf.load('../frame/awesome.proto').then(function (root) {
        stringMessage = root.lookupType("awesomepackage.stringMessage");
        let chooseid = stringMessage.create({
            type: 'id',
            message: 'choose'
        })
        socket.binaryType = 'arraybuffer';
        socket.send(stringMessage.encode(chooseid).finish());
    })
}
let canvas = document.getElementById('canvas');
let context = canvas.getContext('2d');
let img = new Image();
let getpos = procedure => (evt) => {
    let x, y;
    if (procedure !== END) {
        x = evt.clientX || evt.touches[0].pageX;
        y = evt.clientY || evt.touches[0].pageY;
        if (x && y) {
            let rect = canvas.getBoundingClientRect();
            x -= rect.left;
            y -= rect.top;
        }
    }
    switch (procedure) {
        case START:
            draw_status = START;
            point1 = [x, y];
            break;
        case HALFWAY:
            //判断绘制是否结束
            if (draw_status === END) break;
            draw_status = HALFWAY;
            point2 = [x, y];
            blueprintSet.set(sym, [point1, point2]);
            // (on_off = !on_off) || oval(point1, point2);
            break;
        case END:
            draw_status = END;
            let message = stringMessage.create({
                type: 'locate',
                shape: paintShape,
                serial: blueprintSet.size,
                locate: locate = [...point1, ...point2]
            })
            let buffer = stringMessage.encode(message).finish();
            new trackNow(sym, point1, point2);
            socket.send(buffer);
            break;
        default:
            break;
    }
    return [x, y];
}

canvas.onmousedown = getpos(START)
canvas.onmousemove = getpos(HALFWAY);
canvas.onmouseup = getpos(END);

//添加触摸屏事件
canvas.addEventListener('touchstart', getpos(START), false);
canvas.addEventListener('touchend', getpos(END), false);
canvas.addEventListener('touchmove', getpos(HALFWAY), false);

//RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
if (!RTCPeerConnection) {
    alert('当前浏览器不支持webRTC，请使用chrome浏览器')
}
var configuration = { iceServers: [{
	urls: "stun:119.45.227.92:3478",
	username: "baiyideheimodao",
	credential: "zhuxingyu"
}]
};
let pc = new RTCPeerConnection(configuration);

socket.onmessage = async function (event) {
    let message = stringMessage.decode(new Uint8Array(event.data));
    switch (message.type) {
        case 'size':
            width = message.width;
            height = message.height;
            video.width = width;
            video.height = height;
            break;
        case 'sdp':
            console.log('sdp', message);
            sdp = message.offer;
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: message.message }));
            let answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log(pc.localDescription, answer);
            let answerObj = stringMessage.create({
                type: 'answer',
                answer: answer,
                message: answer.sdp
            })
            let answerBuffer = stringMessage.encode(answerObj).finish();
            socket.send(answerBuffer);
            break;
        case 'ice':
            console.log('ice', message);
            pc.addIceCandidate(message.ice);
            break;
        default:
            console.log('??', message);
            break;
    }
    // // console.log(message);
};
let remoteStream;
function takepicture(video) {
    return function () {
        context = canvas.getContext('2d');
        if (width && height) {
            canvas.width = width;
            canvas.height = height;
            context.drawImage(video, 0, 0, width, height);
            point1 && draw(blueprintSet)
            context.stroke();
        }
    }
}
pc.ontrack = event => {
    // console.log(135, event, event.streams[0]);
    try {
        video.srcObject = event.streams[0];
        remoteStream = event.streams[0];
        video.onloadedmetadata = function (e) {
            video.play();
            video.muted = true
            setInterval(takepicture(video), 1000 / 10)

        }

    } catch (error) {
        console.log(error)
    }
}



const { close } = pc;
pc.close = function () {
    video.srcObject = null;
    remoteStream.getTracks().forEach(track => {
        track.stop();
    });
    return close.apply(this, arguments)
}

let button = Array.from(
    document.getElementsByTagName('button'))
    .forEach(element => {
        element.onclick = () => {
            point1 = false;
            draw_status = START;
            paintShape = element.id;
            sym = Symbol(paintShape);
            console.log(sym, paintShape);
        }
    })

