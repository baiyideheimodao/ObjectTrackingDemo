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
    ['arrow', arrow],
    ['triangle', triangle]
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



/**
 * @description 椭圆
 * @param {CanvasRenderingContext2D} context 
*/
function oval(p1, p2) {
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
    // console.log('p1', p1, p2)
}
function rectangle(p1, p2) {
    context.moveTo(...p1);
    context.rect(...p1,
        p2[0] - p1[0],
        p2[1] - p1[1]
    );
}
function arrow(p1, p2) {
    context.moveTo(...p1);
    context.lineTo(p1[0] - 5, p1[1]);
    context.lineTo(p1[0], p1[1] - 5);
    context.lineTo(p1[0] + 5, p1[1]);
    context.lineTo(p1[0], p1[1] + 5);
    context.lineTo(p1[0] - 5, p1[1]);
    context.lineTo(...p2);
    context.lineTo(p1[0] - 5, p1[1]);
    context.lineTo(...p2);
    context.lineTo(p1[0], p1[1] - 5);
    context.lineTo(...p2);
    context.lineTo(p1[0], p1[1] + 5);
    context.lineTo(...p2);
    context.lineTo(p1[0] + 5, p1[1]);
    context.fill();
    // context.
}

function triangle(p1, p2) {
    let top = [(p1[0] + p2[0]) * 0.5, 2 * p1[1] - p2[1]];
    context.moveTo(...top);
    let x = (p2[0] - p1[0]) * 0.5;
    context.lineTo(p1[0] - x, p2[1]);
    context.lineTo(p2[0] + x, p2[1]);
    context.closePath()
}