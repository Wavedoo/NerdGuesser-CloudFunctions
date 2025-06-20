import { Timestamp } from "firebase-admin/firestore";


export interface StatsAnime {
    gamesPlayed: number,
    //Updated when played
    // if gameData.isDaily == true then +1
    dailyPlayStreak: number,
    //if isDaily and won then + 1
    dailyWinStreak: number,
    longestPlayStreak: number,
    longestWinStreak: number,
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

export interface GuessDocument {
    
}
//TODO: all before > 30 days ago
export interface AnonymousAccount {
    lastActive: Timestamp
}

export interface FrameGuessesData {
    failedGuesses: number,
    firstFrameGuesses: number,
    secondFrameGuesses: number,
    thirdFrameGuesses: number,
    fourthFrameGuesses: number,
    fifthFrameGuesses: number,
    sixthFrameGuesses: number
}