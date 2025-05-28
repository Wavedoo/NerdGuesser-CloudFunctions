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
import { auth } from "firebase-functions/v1";

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

initializeApp();

// const db = getFirestore();

export interface StatsAnime {
    gamesPlayed: number,
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
exports.createFirestoreDocuments = auth.user().onCreate(async (user, res) => {
    // TODO: Add prepopualted list.
    // add 0s for the amount of games called but missing from list?

    let stats: StatsAnime = {
        gamesPlayed: 0,
        firstFrameGuesses: 0,
        secondFrameGuesses: 0,
        thirdFrameGuesses: 0,
        fourthFrameGuesses: 0,
        fifthFrameGuesses: 0,
        sixthFrameGuesses: 0,
        failedGuesses: 0,
        completionList: []
    }

    // const docRef = await getFirestore()
    const docRef = await getFirestore()
        .collection("UserStatsAnime")
        .doc(user.uid)
    
    docRef.set(stats)

    logger.log("Result", docRef.id)
});