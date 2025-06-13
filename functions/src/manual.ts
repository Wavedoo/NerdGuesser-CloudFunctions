import { credential } from "firebase-admin"
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
var serviceAccount = require("../../serviceaccount.json");

//This file is for when I want to run one-time functions.
initializeApp({
  credential: credential.cert(serviceAccount)
});
const db = getFirestore();
const gamesRef = db.collection("AnimeFrameGuesser");

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
async function addNewFieldsToGames(){
    const games = await gamesRef.get();

    const promises: any[] = [];
    games.forEach(doc => {
        // let mainName = doc.data()["name"]
        promises.push(doc.ref.set({
            // WARNING: BE CAREFUL NOT TO OVEWRWRITE AN IMPORTANT FIELD
            // namesList: [mainName]
        }, {merge: true}));
    });

    await Promise.all(promises).then(() => {
        console.log("ALl updated.")
    }).catch(() => {
        console.log("Failure.")
    });
}

console.log("Before the function call.")
// addNewFieldsToGames().catch(console.error)