// js/firebase-init.js

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBBB2_DHwjdxZpMJYnTSC0BeQKCKP0xlWs", // IMPORTANT: Use your actual API Key. This one is a placeholder.
    authDomain: "xperts-auth.firebaseapp.com",
    projectId: "xperts-auth",
    storageBucket: "xperts-auth.appspot.com", // Corrected domain
    messagingSenderId: "143568403446",
    appId: "1:143568403446:web:669a8964aa88aab9b065d7",
    measurementId: "G-082839CKEM",
    // Add this line for Realtime Database
    databaseURL: "https://xperts-auth-default-rtdb.firebaseio.com"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();
