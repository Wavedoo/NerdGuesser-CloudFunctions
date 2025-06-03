/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { auth } from "firebase-functions/v1";
import { getFirestore } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/scheduler";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

initializeApp();

const db = getFirestore();

const globalRef = db.collection("other").doc("global")
//
export interface StatsAnime {
    gamesPlayed: number,
    //Updated when played
    // if gameData.isDaily == true then +1
    dailyPlayStreak: number,
    //if isDaily and won then + 1
    dailyWinStreak: number,
    //Checked and updates daily when app opened
    //If gameData.day - lastPlayed > 1 then resetDaily streak\
    //Or if daily - lastPlayed > 1 then resetDaily
    //Show lost streak alert
    lastPlayed: number,
    firstFrameGuesses: number,
    secondFrameGuesses: number,
    thirdFrameGuesses: number,
    fourthFrameGuesses: number,
    fifthFrameGuesses: number,
    sixthFrameGuesses: number,
    failedGuesses: number,
    completionList: Array<number>
}



//DOes this need to be async?
exports.createFirestoreDocuments = auth.user().onCreate(async (user) => {
    // TODO: Add prepopualted list.
    // add 0s for the amount of games called but missing from list?

    let stats: StatsAnime = {
        gamesPlayed: 0,
        dailyPlayStreak: 0,
        dailyWinStreak: 0,
        lastPlayed: -1,
        firstFrameGuesses: 0,
        secondFrameGuesses: 0,
        thirdFrameGuesses: 0,
        fourthFrameGuesses: 0,
        fifthFrameGuesses: 0,
        sixthFrameGuesses: 0,
        failedGuesses: 0,
        completionList: [],
    }

    // const docRef = await getFirestore()
    const docRef = db
        .collection("UserStatsAnime")
        .doc(user.uid);
    
    docRef.set(stats);

    logger.log("Result", docRef.id);
});

exports.updateDaily = onSchedule({schedule:"every day 01:36", timeZone: "America/Toronto"}, async (event) => {
    const animeGamesRef = db.collection("AnimeFrameGuesser");
    //Gets the next daily game which is disabled, and the smallest day.
    const newGameQuery = animeGamesRef.where("enabled", "==", false).orderBy("day","asc").limit(1);
    const newGameSnapshot = await newGameQuery.get();
    
    if(!newGameSnapshot.empty){
        const gameDoc = newGameSnapshot.docs[0].ref
        const gameDay = newGameSnapshot.docs[0].data()["day"]
        gameDoc.update({enabled: true})
        globalRef.update({day: gameDay})
        logger.log("Daily game updated.")
    }else{
        logger.log("uh oh something went wrong.")
    }
});