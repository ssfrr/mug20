# mug20

index_remote.js runs on a remote server (http://mug20.gustatory.audio).
index_pi.js runs on the Raspberry Pi on bootup to set up a local server. 
It serves index.html to a browser and uses socket.io to send messages to the browser window to play audio using the Web Audio API.
