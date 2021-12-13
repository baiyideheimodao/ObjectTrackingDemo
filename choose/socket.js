const START = 0;
const END = 1;
const HALFWAY = 0.5;
let i = 0;
let point1, point2;
//控制是否绘制椭圆的开关，防止出现重影
let on_off = false;
let draw_status = END;
let stringMessage;
let p;
let sdp;
let socket = new WebSocket('ws://localhost:5002');
let video = document.getElementsByTagName('video')[0];
const localvideo = document.createElement('video');
localvideo.autoplay = true;
localvideo.muted = true;
let width = 640;
let height = 480;
let locate;


let paintShape;
let sym;
/**
 *@description  需要绘制的图形集
*/
let blueprintSet = new Map();

/**
 * @description 绘制图形的方法集
*/
let markSet = new Map([
    ['oval', oval],
    ['rectangle', rectangle],
    ['arrow', arrow]
]);

/**
 * @param {Symbol} blueprintType
*/
let startDraw = (value, blueprintType) => {
    console.log('startDraw', value, blueprintSet);
    markSet.get(blueprintType.description)(...value);
}
/**
 * @description 绘制图形集中的所有图形
 * @param {blueprintSet} blueprint 图形集
*/
let draw = (blueprint) => {
    blueprint.forEach(startDraw)
}

class trackNow {
    constructor(sym, point1, point2) {
        blueprintSet.set(sym, [point1, point2]);
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
        function processVideo() {
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
                    locate: [...point1, ...point2]
                })
                let buffer = stringMessage.encode(message).finish();
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
    let x = evt.clientX;
    let y = evt.clientY;
    let rect = canvas.getBoundingClientRect();
    x -= rect.left;
    y -= rect.top;
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
                locate: locate = [...point1, ...point2]
            })
            let buffer = stringMessage.encode(message).finish();
            new trackNow(sym, point1, point2);
            console.log('?????', blueprintSet);
            socket.send(buffer);
            break;
        default:
            break;
    }
    return [x, y];
}
/**
 * @description 椭圆
 * @param {CanvasRenderingContext2D} context 
*/
function oval(p1, p2) {
    // console.log([...p1, ...p2]);
    // return
    context.moveTo(...p1);
    context.save();
    let x = p1[0] - p2[0];
    let y = p1[1] - p2[1];
    let r = Math.sqrt(0.5);
    context.scale(x, y);
    
    context.arc(
        (p1[0] + p2[0]) * 0.5 / x,
        (p1[1] + p2[1]) * 0.5 / y,
        r,
        Math.PI * 2.25,
        Math.PI * 0.25,
        true,
    )
    context.restore()
    console.log('p1', p1, p2)
    // return [...p1, ...p2];
}
function rectangle(p1, p2) {
    context.moveTo(...p1);
    context.rect(...p1,
        p2[0] - p1[0],
        p2[1] - p1[1]
    );
}  
function arrow(p1, p2) {
}
canvas.onmousedown = getpos(START)
canvas.onmousemove = getpos(HALFWAY);
canvas.onmouseup = getpos(END);

let pc = new RTCPeerConnection();

socket.onmessage = async function (event) {
    let message = stringMessage.decode(new Uint8Array(event.data));
    switch (message.type) {

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
            console.log(blueprintSet)
            point1 && draw(blueprintSet);
            context.stroke();
        }
    }
}
pc.ontrack = event => {
    // console.log(135, event, event.streams[0]);
    try {
        video.srcObject = event.streams[0];
        remoteStream = event.streams[0];
        console.log(video);
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
        }
    })

console.log('?????', blueprintSet);
//[{x,y},{x,y},{x,y},{x,y}]
