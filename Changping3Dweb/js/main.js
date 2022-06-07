// JavaScript source code

import * as buildingData from "./buildingData.js";


const imgHeight = 884, imgWidth = 1535, imgRate = imgHeight / imgWidth;
const scanRatio = 0.95;
const markerSize = 0.15 * imgHeight *scanRatio;
const offsetX = 0.2 * markerSize, offsetY = 0.2 * markerSize;
const markerX = 0.9 * imgRate * imgWidth + markerSize / 2 + offsetX, markerY = 0.55 * imgHeight + markerSize / 2 + offsetY;
const OX = -markerX, OY = -markerY;
const csvURL = '\\changping\\changping_campus\\progress.csv';
const colors = {
    '平面方案确定': '#C6E5E1', '投评计划批准': '#A5DBCA', '设计招标完成': '#60B2B0', '设计概算评审': '#209E9A'
    , '正在施工': '#31789B', '已经竣工': '#00406B', '其他': '#C8C8C8'}


//let sceneDiv = d3.select("body").select("#scene");
//let scene = sceneDiv.select('a-scene');
let scene = d3.select("body").select('a-scene');
let marker = scene.select("a-marker");
let today = new Date();
let nowDay = today;
let dayText;


let colName = [],items=[];

let noChangeBuildings = {};
/**
 * /
 * @param {any} item
 * @param {any} day
 */

function getColor(item, day) {
    let color = colors['其他'];
    //console.log(item);
    if (new Date(item['平面方案确定时间']) <= day) {
        color = colors['平面方案确定'];
    } else {
        //console.log(item['平面方案确定时间'],'其他');
        //return color;
    }
    if (new Date(item['投评计划批准时间']) <= day) {
        color = colors['投评计划批准'];
    } else {
        //console.log(item['投评计划批准时间'],'平面方案确定');
        //return color;
    }
    if (new Date(item['设计招标完成时间']) <= day) {
        color = colors['设计招标完成'];
    } else {
        //console.log(item['设计招标完成时间'],'投评计划批准');
        //return color;
    }
    if (new Date(item['设计概算评审时间']) <= day) {
        color = colors['设计概算评审'];
    } else {
        //console.log(item['设计概算评审时间'],'设计招标完成');
        //return color;
    }
    if (new Date(item['计划开工时间']) <= day) {
        color = colors['正在施工'];
    } else {
        //console.log(item['计划开工时间'],'设计概算评审');
        //return color;
    }
    if (new Date(item['计划竣工时间']) <= day) {
        color = colors['已经竣工'];
    } else {
        //console.log(item['计划竣工时间'],'正在施工');
        //return color;
    }
    //console.log('已经竣工');
    return color;
}
function updateColor(day) {
    for (let item of items) {
        let color = getColor(item, day);
        for (let model of item.models) {
            if (model.type == 'a-trangle') {
                model.attr('color', color);
            } else {
                model.attr('material', 'color:'+color+';');
            }
        }
    }
}
function createBuilding(building, item) {
    let model = item.entity.append(building.type);
    model.type = building.type;
    if (building.type == 'a-trangle') {
        model.attr('vertex-a', (building.ax + OX) / markerSize + ' 0 ' + (building.ay + OY) / markerSize);
        model.attr('vertex-b', (building.bx + OX) / markerSize + ' 0 ' + (building.by + OY) / markerSize);
        model.attr('vertex-c', (building.cx + OX) / markerSize + ' 0 ' + (building.cy + OY) / markerSize);
        return model;
    }


    if (building.type == 'a-box') {
        let w = building.width / markerSize;
        let h = building.height / markerSize;
        model.attr('width', w);
        model.attr('depth', h);
        model.attr('height', building.depth);
    } else if (building.type == 'a-cylinder') {
        console.log(building);
        let r = building.radius / markerSize;
        model.attr('radius', r);
        model.attr('height', building.depth);
        model.attr('theta-start',building.thetaStart);
        model.attr('theta-length',building.thetaLength);
    }
    let x = (building.centerX + OX) / markerSize;
    let y = (building.centerY + OY) / markerSize;
    model.attr('position', x + ' 0.5 ' + y);
    if (building.rotation != null) {
        model.attr('rotation', building.rotation);
    }
    item.models.push(model);
    return model;
}

function draw() {
    for (let item of items) {
        if (item.code in buildingData.buildings) {
            for (let building of buildingData.buildings[item.code]) {
                createBuilding(building, item);
            }
        } else {
            console.log('no loc:'+item);
        }
    }


    for (let building of buildingData.buildings['0']) {
        let obj = createBuilding(building, noChangeBuildings);
        obj.attr('material', 'opacity:0.3;color:black;');
    }


    console.log(today);
    updateColor(today);
}

function createAR(data) {
    console.log('ar');
    console.log(data);
    console.log(data[0]);
    for (let name in data[0]) {
        colName.push(name);
    }
    console.log(colName);

    for (let line of data) {
        let item = new Object();
        item.code = line['项目编号'];
        item.name = line['建筑名称'];
        item['平面方案确定时间'] = line['平面方案确定时间'];
        item['投评计划批准时间'] = line['投评计划批准时间'];
        item['设计招标完成时间'] = line['设计招标完成时间'];
        //item['控制价审定时间'] = line['控制价审定时间'];
        item['设计概算评审时间'] = line['设计概算评审时间'];
        item['计划开工时间'] = line['计划开工时间'];
        item['计划竣工时间'] = line['计划竣工时间'];

        item.entity = marker.append('a-entity').attr('id', item.name);
        item.models = [];

        items.push(item);
    }
    noChangeBuildings.entity = marker.append('a-entity').attr('id', 'noChangeBuildings');
    noChangeBuildings.models = [];
    draw();
}

function controlSet(ui,touchable) {
    //time control part
    {

        let slideToolControl = ui.append('div').attr('class', 'slideToolControl')
            .style('position', 'absolute').style('bottom', '20vh')
            .style('width','100vw').style('height','15vh')
            .style('background-color', 'rgba(255, 255, 255, 0.8)')
            .style('opacity','0.5')
            ;

        let startDay = new Date(2020, 0, 1);
        let endDay = new Date(2024, 0, 1);
        let pastLen = today - startDay, futureLen = endDay - today, totalLen = endDay - startDay;
        let totalDays = endDay - startDay;
        let rate = pastLen / totalLen;

        console.log(pastLen, futureLen, totalLen);
        console.log(pastLen / totalLen, futureLen / totalLen);
        console.log(pastLen / totalLen * 0.8, futureLen / totalLen * 0.8);

        //marker below  
        {
            let pastLine = slideToolControl.append('div').attr('id', 'pastLine').style('border-top', '1vh solid blue')
                .style('display', "block")
                .style('position', 'absolute').style("left", "10vw").style('bottom', '7vh')
                .style('width', pastLen / totalLen * 80 + "vw");
            let futureLine = slideToolControl.append('div').attr('id', 'futureLine').style('border-top', '1vh dotted blue')
                .style('display', "block")
                .style('position', 'absolute').style("left", (10 + pastLen / totalLen * 80) + "vw").style('bottom', '7vh')
                .style('width', futureLen / totalLen * 80 + "vw");

            let todayMark = slideToolControl.append('div').attr('id', 'todayMark').style('width', '0').style('height', '0')
                //.style('border', '5vh solid transparent').style('border-bottom-color', 'blue')
                .style('border-bottom', '4vh solid yellow')
                .style('border-left', '1.5vh solid transparent')
                .style('border-right', '1.5vh solid transparent')

                .style('position', 'absolute').style("left", "calc( " + (10 + pastLen / totalLen * 80) + "vw - 1.5vh )")
                .style('bottom', '1vh')
                ;
            let todayMarkText = slideToolControl.append('text').attr('id', "todayMarkText")
                .style('position', 'absolute')
                .style('bottom', '1vh').style("left", "calc( " + (12 + pastLen / totalLen * 80) + "vw + 1.5vh )")
                .style('height', '4vh').style('font', "2vh")
                .text('今日：' + dateToString(today));


            let startDayMark = slideToolControl.append('div').attr('id', 'startDayMark')
                .style('width', '0').style('height', '0')
                //.style('border', '5vh solid transparent').style('border-bottom-color', 'blue')
                .style('border-bottom', '4vh solid red')
                .style('border-left', '1.5vh solid transparent')
                .style('border-right', '1.5vh solid transparent')

                .style('position', 'absolute').style("left", "calc( 10vw - 1.5vh )")
                .style('bottom', '1vh')
                ;
            let startDayMarkText = slideToolControl.append('text').attr('id', "startDayMarkText")
                .style('position', 'absolute')
                .style('bottom', '1vh').style("left", "calc( 11vw + 1.5vh )")
                .style('height', '4vh').style('font', "2vh")
                .text(dateToString(startDay));


            let endDayMark = slideToolControl.append('div').attr('id', 'endDayMark')
                .style('width', '0').style('height', '0')
                //.style('border', '5vh solid transparent').style('border-bottom-color', 'blue')
                .style('border-bottom', '4vh solid red')
                .style('border-left', '1.5vh solid transparent')
                .style('border-right', '1.5vh solid transparent')

                .style('position', 'absolute').style("right", "calc( 10vw - 1.5vh )")
                .style('bottom', '1vh')
                ;
            let endDayMarkText = slideToolControl.append('text').attr('id', "endDayMarkText")
                .style('position', 'absolute')
                .style('bottom', '1vh').style("right", "calc( 11vw + 1.5vh )")
                .style('height', '4vh').style('font', "2vh")
                .text(dateToString(endDay));



        }
        if (touchable != true) {
            return;
        }

        let choosingDiv = slideToolControl.append('div').attr('id', 'choosingDiv')
            .style('position', 'absolute')
            .style("left", (10 + pastLen / totalLen * 80) + "vw")
            .style('bottom', '14vh');
        let choosingMark = choosingDiv.append('div').attr('id', 'choosingMark')
            //.style('width', '0').style('height', '0')
            //.style('border', '5vh solid transparent').style('border-bottom-color', 'blue')
            .style('border-top', '4vh solid blue')
            .style('border-left', '1.5vh solid transparent')
            .style('border-right', '1.5vh solid transparent')

            .style('position', 'absolute')
            .style("left", "-1.5vh")
            ;
        let choosingMarkText = choosingDiv.append('text').attr('id', "choosingMarkText")
            .style('position', 'absolute')
            .style("left", "2vw")
            .style('height', '4vh').style('width','40vh')
            .style('font', "2vh")
            .text(dateToString(nowDay));

        function choosingMove(targetX) {
            console.log(targetX);
            let left = 0.1 * window.innerWidth; targetX = Math.max(targetX, left);
            console.log(window.innerWidth,left,targetX);
            let right = 0.9 * window.innerWidth; targetX = Math.min(targetX, right);

            let days = (targetX - left) / totalLen * totalDays;
            choosingDiv.style('left', targetX+'px');
            nowDay = moment(startDay).add(days, 'days');
            nowDay.locale('zh-cn');
            console.log(targetX,days, totalDays, nowDay, startDay);
            choosingMarkText.text(nowDay.format('ll'));
            dayText.text("展示时间：" + nowDay.format('ll'));

            if (targetX < rate * window.innerWidth) {
                choosingMarkText.style("right", null);
                choosingMarkText.style("left", "2vh");
            } else {
                choosingMarkText.style("left", null);
                choosingMarkText.style("right", "-2vh");
                console.log('change!');
            }

            updateColor(nowDay.toDate());
        }

        var drag = d3.drag()
            .on("start", function (d) {
                console.log("开始",d,d.x);
            })
            .on("drag", function (d,i) {
                console.log("拖拽中", d, d.x);
                choosingMove(d.x);
            })
            .on("end", function (d) {
                console.log("结束", d, d.x);
            });
        choosingDiv.call(drag);
    }
}
function dateToString(date) {
    return date.getFullYear() + '年' + (date.getMonth()+1) + '月' + date.getDate() + "日";
}

function createUI() {
    let ui = d3.select('body').select('#ui');
    console.log('fullscreen', ui.requestFullscreen);
    dayText = ui.append('text').style('font', "10vh")
        .style('left', '0').style('top', '0').style('position', 'absolute');
    dayText.style('background-color', 'white');
    dayText.style('margin', '2vh');
    dayText
        .style('background-color', 'rgba(255, 255, 255, 0.8)')
        .style('padding', '1vh')
        .style('padding-left', '3vh')
        .style('padding-right', '3vh')
        ;
    dayText.text("展示时间：" + dateToString(today));
    //ui.style('position', 'absolute');
    /*
    console.log(JSON.stringify);
    console.log(navigator);
    console.log(window.navigator);
    console.log(window.navigator == navigator);
    console.log(window.navigator === navigator);
    console.log(JSON.stringify(navigator));
    console.log(navigator.xr);
    console.log(JSON.stringify(navigator.xr));
    console.log(scene);
    console.log(scene.node);
    console.log(scene.node());*/
    if (navigator.xr) {
        navigator.xr.isSessionSupported('immersive-ar')
            .then((isSupported) => {
                if (isSupported) {
                    controlSet(ui, true);
                    /*
                    dayText.text('great！');
                    navigator.xr.requestSession('immersive-ar', {
                        optionalFeatures: ['dom-overlay'],
                        domOverlay: { root: ui }
                    }).then((session) => {
                        if (session.domOverlayState) {
                            dayText.text(session.domOverlayState.type);
                        } else {
                            dayText.text("DOM overlay not supported or enabled!");
                        }

                        dayText.text('sdfajkf');
                        ui.append('text').style('font', "10vh")
                            .style('left', '0').style('top', '10vh').style('position', 'absolute')
                            .text('234adfa');
                    })*/


                } else {
                    controlSet(ui,false);
                    dayText.text('您的浏览器不支持交互');
                }
            });
    }
}


function main() {
    createUI();
    d3.csv(csvURL).then(data => {
        createAR(data);
    });
}

main();
