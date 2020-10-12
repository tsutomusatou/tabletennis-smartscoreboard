// Need for node.js
// const Obniz = require('obniz');
// let obniz = new Obniz(process.env.OBNIZID);
// const { createCanvas } = require('canvas');
// const fs = require("fs");
// const readline = require("readline");
// const axios = require('axios');

const url = `your-ifttt-key`;

const imageScaleFactor = 0.2;
const outputStride = 16;
const flipHorizontal = false;
const stats = new Stats();
const contentWidth = 800;
const contentHeight = 800;

const POS_X = 12;
const POS_X_OFFSET = 60;
const NUM_POS_Y = 20;
const CURSOR_POS_Y = 21;
const INPUTNUM_POS_Y = 40;

let cursor = 0;
let inputnum = ['_', '_', '_', '_'];
let digits = 0;

let playerA = '';
let playerB = '';

let playerAaddcnt = 0;
let playerBaddcnt = 0;
let playerAsubcnt = 0;
let playerBsubcnt = 0;

let score_a = 0;  // Player Aの点数をインクリメントするための変数 
let score_b = 0;  // Player Bの点数をインクリメントするための変数
let score_a0 = 0; // Player Aの点数の7seg ledの0bitの値
let score_a1 = 0; // Player Aの点数の7seg ledの1bitの値
let score_b0 = 0; // Player Bの点数の7seg ledの0bitの値
let score_b1 = 0; // Player Bの点数の7seg ledの1bitの値
let score_a_sum = 0;
let score_b_sum = 0;
let score_a_game = 0;
let score_b_game = 0;
let reset = false;
let game_end = false;

let leftw;
let rightw;
let playerAflag = false;
let playerBflag = false;
const judgecnt = 5; // Count to judge to add a point
let updateResult = false;

bindPage();

async function bindPage() {
    const net = await posenet.load(); // posenetの呼び出し
    let video;
    try {
        video = await loadVideo(); // video属性をロード
    } catch (e) {
        console.error(e);
        return;
    }
    detectPoseInRealTime(video, net);
}

// video属性のロード
async function loadVideo() {
    const video = await setupCamera(); // カメラのセットアップ
    video.play();
    return video;
}

// カメラのセットアップ
// video属性からストリームを取得する
async function setupCamera() {
    const video = document.getElementById('video');
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
            'audio': false,
            'video': true
        });
        video.srcObject = stream;

        return new Promise(resolve => {
            video.onloadedmetadata = () => {
                resolve(video);
            };
        });
    } else {
        const errorMessage = "This browser does not support video capture, or this device does not have a camera";
        alert(errorMessage);
        return Promise.reject(errorMessage);
    }
}

// 取得したストリームをestimateSinglePose()に渡して姿勢予測を実行
// requestAnimationFrameによってフレームを再描画し続ける
function detectPoseInRealTime(video, net) {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const flipHorizontal = true; // true: since images are being fed from a webcam

    async function poseDetectionFrame() {
        stats.begin();
        let poses = [];
        const pose = await net.estimateSinglePose(video, imageScaleFactor, flipHorizontal, outputStride);
        poses.push(pose);

        ctx.clearRect(0, 0, contentWidth, contentHeight);

        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-contentWidth, 0);
        ctx.drawImage(video, 0, 0, contentWidth, contentHeight);
        ctx.restore();

        poses.forEach(({ score, keypoints }) => {
            // keypoints[9]には左手、keypoints[10]には右手の予測結果が格納されている 
            if (startMatch === true && game_end === false) {
                drawKeyPoint(keypoints[9], ctx); // 左手
                drawKeyPoint2(keypoints[10], ctx);// 右手
                judgePoint(keypoints[9], keypoints[10], ctx);
            }

        });

        stats.end();

        requestAnimationFrame(poseDetectionFrame);
    }
    poseDetectionFrame();
}

// 与えられたKeypointをcanvasに描画する
function drawKeyPoint(wrist, ctx) { //(実際は)右手
    ctx.beginPath();
    ctx.arc(wrist.position.x, wrist.position.y, 3, 0, 5 * Math.PI);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "12px Avenir";
    ctx.fillText("right x:" + wrist.position.x, 20, 20);
    ctx.fillText("right y:" + wrist.position.y, 20, 40);
}

function drawKeyPoint2(wrist, ctx) { //(実際は)左手
    ctx.beginPath();
    ctx.arc(wrist.position.x, wrist.position.y, 3, 0, 5 * Math.PI);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "12px Avenir";
    ctx.fillText("left x:" + wrist.position.x, 20, 60);
    ctx.fillText("left y:" + wrist.position.y, 20, 80);
}

async function judgePoint(left_wrist, right_wrist, ctx) {
    // lefts = left_shoulder.position.y;
    leftw = left_wrist.position.y;
    // rights = right_shoulder.position.y;
    rightw = right_wrist.position.y;
    // if (left_shoulder.position.y > left_wrist.position.y) {
    if (game_end === false) {
        if (left_wrist.position.y < 300 && left_wrist.position.x > 600) { //手を挙げている 
            playerAaddcnt++;
            playerAsubcnt = 0;
            if (playerAaddcnt === judgecnt && playerAflag) {
                score_a++;
                playerAflag = false;
                if (score_a > 9) {
                    score_a0 = 0;
                    score_a1++;
                    score_a = 0;
                } else {
                    score_a0 = score_a;
                }
                updateResult = true;
            }
        } else { //手を下ろしている
            playerAsubcnt++;
            playerAaddcnt = 0;
            if (playerAsubcnt === judgecnt) {
                playerAflag = true;
            }
        }
        // if (right_shoulder.position.y > right_wrist.position.y) {
        if (right_wrist.position.y < 300 && right_wrist.position.x < 200) { //手を挙げている
            playerBaddcnt++;
            playerBsubcnt = 0;
            if (playerBaddcnt === judgecnt && playerBflag) {
                score_b++;
                playerBflag = false;
                if (score_b > 9) {
                    score_b0 = 0;
                    score_b1++;
                    score_b = 0;
                } else {
                    score_b0 = score_b;
                }
                updateResult = true;
            }
        } else { //手を下ろしている
            playerBsubcnt++;
            playerBaddcnt = 0;
            if (playerBsubcnt === judgecnt) {
                playerBflag = true;
            }
        }

        // 7seg LEDとgoogleスプレッドシートの更新
        if (updateResult === true) {
            updateResult = false;
            update7segled();
            posttospreadsheet();
        }

        // ゲームセットの判定とゲームカウントの更新
        score_a_sum = score_a1 * 10 + score_a0;
        score_b_sum = score_b1 * 10 + score_b0;
        if ((score_a_sum >= 11) && (score_a_sum - score_b_sum >= 2)) {
            game_end = true;
            score_a_game++;
        } else if ((score_b_sum >= 11) && (score_b_sum - score_a_sum >= 2)) {
            game_end = true;
            score_b_game++;
        }

        if (game_end === true) { // game ends
            sleep(5, function () { // 5 sec wait
                // スコアのリセット
                score_a = 0;
                score_b = 0;
                score_a0 = 0;
                score_a1 = 0;
                score_b0 = 0;
                score_b1 = 0;

                // 7seg LEDとgoogleスプレッドシートの更新
                update7segled();
                posttospreadsheet();

                game_end = false; // next game starts
            });
        }

    } // end of if (game_end === false)

    // Canvasへ結果の表示
    ctx.fillStyle = "white";
    ctx.font = "12px Avenir";
    ctx.fillText("GAME POINT : A " + score_a_game + " - " + score_b_game + "B", 20, 100);
    ctx.fillText("POINT : A " + score_a1 + score_a0 + " - " + score_b1 + score_b0 + " B", 20, 120);

}


// setIntervalを使う方法
function sleep(waitSec, callbackFunc) {
    // 経過時間（秒）
    let spanedSec = 0;
    // 1秒間隔で無名関数を実行
    let id = setInterval(function () {
        spanedSec++;
        // 経過時間 >= 待機時間の場合、待機終了。
        if (spanedSec >= waitSec) {
            // タイマー停止
            clearInterval(id);

            // 完了時、コールバック関数を実行
            if (callbackFunc) callbackFunc();
        }
    }, 1000);
}


// OBNIZ
const obniz = new Obniz("");

let startMatch = false;
let gamenum;

const leddigits = [0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F];

let spi;

// 7seg LEをの表示更新
async function update7segled() {
    // while (true) {
    // 7seg LEDの値を表示を更新
    obniz.io4.output(false); //io4を0vに. io4はラッチ.
    let ret = await spi.writeWait([leddigits[score_a1], leddigits[score_a0], leddigits[score_a_game], leddigits[score_b_game], leddigits[score_b1], leddigits[score_b0]]);
    // console.log(ret.length); //=> 3
    obniz.io4.output(true); //io4を5vに

    await obniz.wait(1000);
}

obniz.onconnect = async function () {
    const canvas = document.getElementById('devcanvas');
    // const canvas = createCanvas(128, 64);
    const ctx = canvas.getContext('2d');

    drawNum();

    // 7seg LED用のpin config (SPI)
    // io0: 5V
    // io1: GND
    // io2: SCK
    // io3: MOSI
    // io4: LATCH
    obniz.io0.output(true); //io0を5vに
    obniz.io1.output(false); //io1をGNDに
    spi = obniz.getFreeSpi();
    spi.start({ mode: "master", clk: 2, mosi: 3, frequency: 1000000, drive: "3v", pull: null });

    update7segled();

    obniz.switch.onchange = function (state) {
        if (startMatch === false) { // 試合番号入力モード
            if (state === "push") {
                inputnum[digits] = cursor;
                if (digits < 4) {
                    digits++;
                }
                if (digits === 4) {
                    gamenum = 1000 * inputnum[0] + 100 * inputnum[1] + 10 * inputnum[2] + inputnum[3];
                    getPlayers();
                }
            } else if (state === "right") {
                if (cursor < 9) {
                    cursor++;
                }
            } else if (state === "left") {
                if (cursor > 0) {
                    cursor--;
                }
            }
        } else { // startMatch===true. どれかボタンが押されたら試合モードを抜けて再度試合番号入力画面へ
            playerA = '';
            playerB = '';
            startMatch = false;
        }

        if (playerA === '' && playerB === '') { // 対戦選手名を取得していない状態
            drawNum(); // 試合番号入力画面
        } else { // 試合番号から対戦選手を取得出来ている状態
            drawMatch(); // 選手名を表示
            startMatch = true;
        }
    }

    // 試合番号入力画面の描画
    async function drawNum() {
        clearCanvas();
        ctx.fillStyle = "white";
        ctx.font = "12px Avenir";
        for (let i = 0; i < 10; i++) {
            ctx.fillText(i, POS_X * (i + 1), NUM_POS_Y);
        }

        // Draw cursor
        ctx.fillText('_', POS_X * (cursor + 1), CURSOR_POS_Y);

        // Draw input number
        ctx.fillText('INPUT:', POS_X, INPUTNUM_POS_Y);
        for (let i = 0; i < 4; i++) {
            ctx.fillText(inputnum[i], POS_X_OFFSET + POS_X * i, INPUTNUM_POS_Y);
        }
        obniz.display.draw(ctx);
    }

    // 対戦選手の表示
    async function drawMatch() {
        clearCanvas();
        ctx.fillStyle = "white";
        ctx.font = "14px Avenir";

        ctx.fillText(playerA, 10, 15);
        ctx.fillText('vs', 20, 30);
        ctx.fillText(playerB, 10, 45);

        obniz.display.draw(ctx);
    }

    // 描画用キャンバスのクリア
    async function clearCanvas() {
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 64);
        ctx.lineTo(128, 64);
        ctx.lineTo(128, 0);
        ctx.fill();
        obniz.display.draw(ctx);
    }
}

// 入力された試合番号から対戦選手名の取得

//CSVファイルを読み込む関数getCSV()の定義
function getPlayers() {
    let req = new XMLHttpRequest(); // HTTPでファイルを読み込むためのXMLHttpRrequestオブジェクトを生成
    req.open("get", "PlayersTable.csv", true); // アクセスするファイルを指定
    req.send(null); // HTTPリクエストの発行

    // レスポンスが返ってきたらconvertCSVtoArray()を呼ぶ	
    req.onload = function () {
        convertCSVtoArray(req.responseText); // 渡されるのは読み込んだCSVデータ
    }
}

// 読み込んだCSVデータを二次元配列に変換する関数convertCSVtoArray()の定義
function convertCSVtoArray(str) { // 読み込んだCSVデータが文字列として渡される
    let result = []; // 最終的な二次元配列を入れるための配列
    let tmp = str.split("\n"); // 改行を区切り文字として行を要素とした配列を生成

    // 各行ごとにカンマで区切った文字列を要素とした二次元配列を生成
    for (let i = 0; i < tmp.length; ++i) {
        result[i] = tmp[i].split(',');
    }

    // obnizに入力された番号がcsvのテーブルにあれば選手名を設定
    for (let i = 0; i < tmp.length; ++i) {
        if (result[i][0] === gamenum.toString()) {
            console.log(result[i][1] + ' vs ' + result[i][2]);
            playerA = result[i][1];
            playerB = result[i][2];
        }
    }
    // 該当する試合番号が存在しない場合は再度試合番入力画面へ
    cursor = 0;
    inputnum = ['_', '_', '_', '_'];
    digits = 0;

    return;
}

const posttospreadsheet = async () => {
    console.log(gamenum);
    $.get(url, {
        // const res = await axios.post(url, {
        value1: gamenum.toString(),
        value2: score_a_game.toString() + "-" + score_b_game.toString(),
        value3: score_a1.toString() + score_a0.toString() + "-" + score_b1.toString() + score_b0.toString()
    });
}
