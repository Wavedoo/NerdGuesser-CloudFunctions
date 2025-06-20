/*
This function causes TS2315 error so I'll just comment it out
It's the line import credential I believe
*/


import { credential, firestore } from "firebase-admin"
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { projectID } from "firebase-functions/params";
var serviceAccount = require("../serviceaccount.json");

//This file is for when I want to run one-time functions.
initializeApp(/* {
  credential: credential.cert(serviceAccount)
} */
    //Emulator seting
    {projectId: 'nerdguesser'}
);
firestore().settings({
    host: 'localhost:8080',
    ssl: false
});
const db = firestore();
const gamesRef = db.collection("AnimeFrameGuesser");
const guessesRef = db.collection("UserGuessesAnime");

interface gameData {
    firstFrameGuesses: number,
    completionRate: number,
    firstGuessRate: number
}

const defaultGame: gameData = {
    firstFrameGuesses: 0,
    completionRate: 0,
    firstGuessRate: 0
} 


async function addNewFieldsToGames(){
    const games = await gamesRef.get();

    const promises: any[] = [];
    console.log("hi")
    games.forEach(doc => {
        // let mainName = doc.data()["name"]
        promises.push(doc.ref.update({
            // WARNING: BE CAREFUL NOT TO OVEWRWRITE AN IMPORTANT FIELD
            // namesList: [mainName]
            // field: fieldValue,
        }));
    });

    await Promise.all(promises).then(() => {
        console.log("ALl updated.")
    }).catch(() => {
        console.log("Failure.")
    });
}

console.log("Before the function call.")

export async function populateGames(){
    console.log("Populate games!")
    for (let i = 1; i <= 7; i++){
        console.log("Game #" + i)
        let test = {
            name: "Filler",
            day: i,
            enabled: true,
            hints: ["9.99"],
            folderName: "temp",
            firstFrameGuesses: getRandomInt(5),
            secondFrameGuesses: getRandomInt(5),
            thirdFrameGuesses: getRandomInt(5),
            fourthFrameGuesses: getRandomInt(5),
            fifthFrameGuesses: getRandomInt(5),
            sixthFrameGuesses: getRandomInt(5),
            failedGuesses: getRandomInt(5),
            totalGuesses: 0,
            successRate: 0.0,
            firstFrameRate: 0.0
        }
        let noFailSum = test.firstFrameGuesses + test.secondFrameGuesses + test.thirdFrameGuesses + test.fourthFrameGuesses + test.fifthFrameGuesses + test.sixthFrameGuesses
        let withFailSum = noFailSum + test.failedGuesses
        let success = roundIt(noFailSum / withFailSum)
        let firstRate = roundIt(test.firstFrameGuesses / withFailSum)
        test.totalGuesses = withFailSum
        test.successRate = success
        test.firstFrameRate = firstRate
        console.log("Final data: ", test)
        gamesRef.add(test).then(() => {
            console.log("then!")
        });
        console.log("hi")
    }
    for(let i = 8; i <= 10; i++){

    }
}

//const manual = require('./lib/manual');
export async function createUserGuess(num: number){
    console.log("Create a user guess")
    let id = (await gamesRef.get()).docs[0].id
    console.log("ID: ", id)

    guessesRef.add({gameId: id, guess: num})
}
function roundIt(value: number){
    return Math.round(value * 100) / 100
}
function getRandomInt(max: number) {
  return Math.round(Math.random() * max);
}
// addNewFieldsToGames().catch(console.error)

/* 
Code similiar to what broke it last time.
        promises.push(doc.ref.set({
            name: "Filler",
            day: -1,
            hints: ["9.99"],
            folderName: "temp",
            firstFrameGuesses: 0,
            secondFrameGuesses: 0,
            thirdFrameGuesses: 0,
            fourthFrameGuesses: 0,
            fifthFrameGuesses: 0,
            sixthFrameGuesses: 0,
            failedGuesses: 0,
            totalGuesses: 0,
            successRate: 0.0,
            firstFrameRate: 0.0
        }));
*/