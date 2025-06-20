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
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/scheduler";
import { onDocumentWritten, Change, FirestoreEvent } from "firebase-functions/firestore";
import { event } from "firebase-functions/v1/analytics";
import { StatsAnime, GuessDocument, AnonymousAccount, FrameGuessesData } from "./interfaces"; 
import { firestore } from "firebase-admin";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

initializeApp();

const db = getFirestore();

const globalRef = db.collection("other").doc("global")

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
        longestPlayStreak: 0,
        longestWinStreak: 0
    }

    const docRef = db
        .collection("UserStatsAnime")
        .doc(user.uid);
    
    docRef.set(stats);

    logger.log("UserStatsAnime document created for ", docRef.id);

    //If is anonymous
    if(user.providerData.length == 0){
        const anonRef = db.collection("AnonymousAccounts").doc(user.uid)
        anonRef.set({lastActive: FieldValue.serverTimestamp })

    }
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
        globalRef.update({day: gameData["animeDay"]})
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

//TODO: Optimize?
exports.updateGameDocument = onDocumentWritten("UserGuessesAnime/{documentId}", (event) => {
    if(event.data?.after.exists == false){
        return
    }
    const documentData = event.data!!.after.data()
    const guessField = getFieldFromGuess(documentData?.guess ?? -1)
    const gameId = documentData?.gameId
    if(!gameId){
        return
    }
    try{
        const gameRef = db.collection("AnimeFrameGuesser").doc(gameId)
        db.runTransaction(async (transaction) => {
            const doc  = await transaction.get(gameRef)
            if(!doc.exists){
                throw new Error("Document does not exist")
            }
            const statsData = doc.data()!!
            
            const frameData: FrameGuessesData = {
                failedGuesses: statsData.failedGuesses,
                firstFrameGuesses: statsData.firstFrameGuesses,
                secondFrameGuesses: statsData.secondFrameGuesses,
                thirdFrameGuesses: statsData.thirdFrameGuesses,
                fourthFrameGuesses: statsData.firstFrameGuesses,
                fifthFrameGuesses: statsData.fifthFrameGuesses,
                sixthFrameGuesses: statsData.sixthFrameGuesses
            }

            logger.log("Old frame data:", frameData)
            frameData[guessField as keyof FrameGuessesData] += 1
            logger.log("New frame data:", frameData)

            const newTotal = statsData.totalGuesses + 1
            const newNum = statsData[guessField] + 1

            
            const sum = frameData.firstFrameGuesses + frameData.secondFrameGuesses + frameData.thirdFrameGuesses + frameData.fourthFrameGuesses + frameData.fifthFrameGuesses + frameData.sixthFrameGuesses
            var firstFrameRate = roundFourPlaces(frameData.firstFrameGuesses / newTotal)
            var successRate = roundFourPlaces(sum / newTotal)
            logger.log("Old firstFrameRate:", statsData.firstFrameRate)
            logger.log("Old firstFrameRate:", frameData.firstFrameGuesses / newTotal)
            logger.log("New firstFrameRate:", firstFrameRate)
            logger.log("Old successRate:", statsData.successRate)
            logger.log("New successRate:", successRate)

            transaction.update(gameRef, {
                [guessField]: newNum,
                firstFrameRate: firstFrameRate,
                successRate: successRate,
                totalGuesses: newTotal
            });
        })
    
        console.log('Transaction success!');
    } catch (e) {
        console.log('Transaction failure:', e);
    }
});

function roundFourPlaces(value: number) {
  return Math.round(value * 10000) / 10000
}
function getFieldFromGuess(guess: number): string {
    switch(guess){
        case -1:
            return "failedGuesses"
        case 1:
            return "firstFrameGuesses"
        case 2:
            return "secondFrameGuesses"
        case 3:
            return "thirdFrameGuesses"
        case 4:
            return "fourthFrameGuesses"
        case 5:
            return "fifthFrameGuesses"
        case 6:
            return "sixthFrameGuesses"
        default:
            return "failedFrameGuesses"
            
    }
}

// function 
//So the 
//What was I cooking

/*
monthly:
if proverdata.length == 0 and lastActive > 30 days ago
    delete all docs with uid = anon
if pprovierdata.length > 0 
    delete anonDocument
*/