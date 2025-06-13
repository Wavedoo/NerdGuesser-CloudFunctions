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
import { FieldValue, getFirestore } from "firebase-admin/firestore";
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
    //I could add a complex system where it's like 1-6 = incomplete, 7-12 complete, 13 = failed
    guessesList: Array<number>
    completionList: Array<number>
}



//DOes this need to be async?
exports.createFirestoreDocuments = auth.user().onCreate(async (user) => {
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
        //Update on retrieving animeframegueser enabled games
        guessesList: [],
        completionList: [],
    }

    const docRef = db
        .collection("UserStatsAnime")
        .doc(user.uid);
    
    docRef.set(stats);

    logger.log("UserStatsAnime document created for ", docRef.id);
});

exports.updateDaily = onSchedule({schedule:"every day 00:00", timeZone: "America/Toronto"}, async (event) => {
    const animeGamesRef = db.collection("AnimeFrameGuesser");
    const animeListRef = db.collection("AnimeInformation").doc("FrameDays")

    //Gets the next daily game which is disabled, and the smallest day.
    //The query itself isn't a read, but will only be read when get() is called
    const newGameQuery = animeGamesRef.where("enabled", "==", false).orderBy("day","asc").limit(1);
    //Should be one read.
    const newGameSnapshot = await newGameQuery.get();
    


    if(!newGameSnapshot.empty){
        const gameDoc = newGameSnapshot.docs[0].ref
        const gameData = newGameSnapshot.docs[0].data()

        gameDoc.update({enabled: true})
        globalRef.update({day: gameData["day"]})
        animeListRef.update({
            IDs: FieldValue.arrayUnion(gameDoc.id)
        })

        logger.log("Daily game updated and added to list.")
    }else{
        logger.log("uh oh something went wrong.")
    }
});

//TODO: Handle the updating of the frame guesses
exports.deleteUserDocument = auth.user().onDelete(async (user) => {
    const docRef = db
        .collection("UserStatsAnime")
        .doc(user.uid);

    docRef.delete()

    logger.log("UserStatsAnime ", docRef.id, " document deleted.");
});