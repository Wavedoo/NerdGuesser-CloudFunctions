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
import { CollectionReference, FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/scheduler";
import { onDocumentWritten, Change, FirestoreEvent } from "firebase-functions/firestore";
import { event } from "firebase-functions/v1/analytics";
import { StatsAnime, GuessDocument, AnonymousAccount, FrameGuessesData } from "./interfaces"; 
import { firestore } from "firebase-admin";
import { getAuth } from "firebase-admin/auth";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

initializeApp();

const db = getFirestore();
const authentication = getAuth();

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

    logger.log("Provider data length: ", user.providerData.length)
    //If is anonymous
    if(user.providerData.length == 0){
        logger.log("Starting anonymousaccounts id creation")
        const anonRef = db.collection("AnonymousAccounts").doc(user.uid)
        logger.log("Document is: ", anonRef)
        anonRef.set({lastActive: FieldValue.serverTimestamp()}).then(() =>{
            logger.log("Successfully set AnonymousAccounts document")
        }).catch((error) =>{
            logger.error("Failed to set AnonymousAccounts document. Reason: ", error);
        });

    }
});

exports.updateDaily = onSchedule({schedule:"every day 00:00", timeZone: "America/Toronto"}, async (event) => {
    const animeGamesRef = db.collection("AnimeFrameGuesser");
    const animeListRef = db.collection("AnimeInformation").doc("FrameDays")
    const oldGameSnap =  await animeGamesRef.where("enabled", "==", true).orderBy("day", "desc").limit(1).get()
    //If the game has not been played then do not update daily
    if(!oldGameSnap.empty){
        const oldData = oldGameSnap.docs[0].data();
        if(oldData["totalGuesses"] == 0){
            return
        }
    }
    //Gets the next daily game which is disabled, and the smallest day.
    //The query itself isn't a read, but will only be read when get() is called
    const newGameQuery = animeGamesRef.where("enabled", "==", false).orderBy("day","asc").limit(1);
    //Should be one read.
    const newGameSnapshot = await newGameQuery.get();
    


    if(!newGameSnapshot.empty){
        const gameDoc = newGameSnapshot.docs[0].ref
        const gameData = newGameSnapshot.docs[0].data()

        gameDoc.update({enabled: true})
        globalRef.update({animeDay: gameData["day"]})
        animeListRef.update({
            IDs: FieldValue.arrayUnion(gameDoc.id)
        })

        logger.log("Daily game updated and added to list.")
    }else{
        logger.log("uh oh something went wrong.")
    }
});

//TODO: Add the delte extension
//Nevermind it costs too much money ($0.01 / month)
exports.deleteUserDocument = auth.user().onDelete(async (user) => {
/*     const docRef = db
        .collection("UserStatsAnime")
        .doc(user.uid);

    docRef.delete()

    logger.log("UserStatsAnime ", docRef.id, " document deleted."); */
    const userStatsAnimeCol = db.collection("UserStatsAnime")
    const userGuessesAnimeCol = db.collection("UserGuessesAnime")
    const anonymousCol = db.collection("AnonymousAccounts")
    deleteDocumentsWithUserIdDocumentId(userStatsAnimeCol, user.uid)
    deleteDocumentsWithUserIdField(userGuessesAnimeCol, user.uid)
    //If user is anonymous
    if(user.providerData.length == 0){
        deleteDocumentsWithUserIdDocumentId(anonymousCol, user.uid)
    }
    
});



//TODO: Optimize?
exports.updateGameDocument = onDocumentWritten("UserGuessesAnime/{documentId}", (event) => {
    if(event.data?.after.exists == false){
        return
    }
    const documentData = event.data!!.after.data()
    if(documentData?.complete ?? false == false){
        //Do not continue if the game is incomplete
        return
    }
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


/*
monthly:
if proverdata.length == 0 and lastActive > 30 days ago
    delete all docs with uid = anon
if pprovierdata.length > 0 
    delete anonDocument
*/
exports.deleteInactiveAnonymousAccounts = onSchedule({schedule:"every day 00:00", timeZone: "America/Toronto"}, async (event) => {
    const guestCollection = db.collection("AnonymousAccounts");
    const thirtyDaysAgoDate = new Date();
    thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 30);
    const inactiveQuerySnap = await guestCollection.where("lastActive", "<", Timestamp.fromDate(thirtyDaysAgoDate)).get()
    
    if(!inactiveQuerySnap.empty){
        inactiveQuerySnap.docs.forEach((doc) => {
            let userId = doc.id
            authentication.deleteUser(userId).then(() => {
                logger.log("Deleted anonymous account: ", userId);
            }).catch(() =>{
                logger.error("Could not delete anonymous account: ", userId);
            });
        });
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

async function deleteDocumentsWithUserIdDocumentId(collection: CollectionReference, userId: string){
    const userDoc = collection.doc(userId)
    userDoc.delete().then(() => {
        logger.log(userId + " successfully deleted in " + collection.id)
    }).catch((error) => {
        logger.error(userId + " could not be deleted in " + collection.id + "\n" + error)
    });
}

async function deleteDocumentsWithUserIdField(collection: CollectionReference, userId: string, fieldName: string = "uid"){
    const userQuerySnap = await collection.where(fieldName, "==", userId).get()

    
    if(!userQuerySnap.empty){
        let promises: Promise<any>[] = []
        userQuerySnap.docs.forEach((doc) => {
            promises.push(doc.ref.delete())
        });
        Promise.all(promises).then(() =>{
            logger.log("Successfully deleted all documents in " + collection + " where " + fieldName + " == " + userId)
        }).catch(() => {
            logger.error("Failed to delete all documents in " + collection + " where " + fieldName + " == " + userId)
        });
    }
}
// function 
//So the 
//What was I cooking