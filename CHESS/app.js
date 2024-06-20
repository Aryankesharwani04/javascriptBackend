import express from "express";
import {Server} from "socket.io";
import { Chess } from "chess.js";
import http from "http";
import path from "path";
import { fileURLToPath } from 'url';

const app = express();

const server = http.createServer(app);

//Instantiate Socket.io on HTTP server
const io = new Server(server);

const chess = new Chess()

let players = {};
let playerRole = 'w';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//to use ejs templating engine below two lines are required
app.set("view engine", "ejs")
app.use(express.static(path.join(__dirname, "public")));

app.get('/', (req, res) => {
    res.render("index", { title : "Chess game" });
})

io.on("connection", (uniquesocket) => {
    console.log("Connected");
    if(!players.white){
        players.white = uniquesocket.id;
        uniquesocket.emit("playerRole", "w");
    }else{ 
        if(!players.black){
            players.black = uniquesocket.id;
            uniquesocket.emit("playerRole", "b");
        }
        else
           uniquesocket.emit("spectator");
    }

    uniquesocket.on("disconnect", () => {
        if(uniquesocket.id === players.white) delete players.white;
        else if(uniquesocket.id === players.black) delete players.black;
    })

    uniquesocket.on("move", (move) => {
        try {
            if(chess.turn() === "w" && uniquesocket.id !== players.white) return;
            if(chess.turn() === "b" && uniquesocket.id !== players.black) return;
    
            const result = chess.move(move);
            if(result){
                playerRole = chess.turn();
                io.emit("move", move)
                io.emit("boardState", chess.fen());
            }else{
                console.log("Invalid ", move);
            }
        } catch (error) {
            console.log(error);
            uniquesocket.emit("Invalid move", move);
        }
    })
});

server.listen(3000, () => {
    console.log("Listening on port 3000");
});