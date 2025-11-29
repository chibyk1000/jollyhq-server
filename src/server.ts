
import dotenv from "dotenv"
dotenv.config()
import express from "express"
import router from "./routes"
const PORT = process.env.PORT
const app = express()
app.use("/api", router)



app.listen(PORT, () => {
    console.log(`server listening on port ${PORT}`);
    
})