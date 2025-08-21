import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import userRoutes from './routes/user.js'
import morgan from 'morgan'
import ticketRoutes from './routes/ticket.js'
import { serve } from 'inngest/express'
import { inngest } from './inngest/client.js'
import { onUserSignup } from './inngest/functions/on-signup.js'
import { onTicketCreated } from './inngest/functions/on-ticket-create.js'
import dotenv from "dotenv"
dotenv.config()

const app = express();
const PORT = process.env.PORT || 3000


//middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/api/auth', userRoutes)
app.use('/api/tickets', ticketRoutes)
app.use('/api/inngest', serve({
    client: inngest,
    functions: [onUserSignup, onTicketCreated]
}))


mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected ✅");
        app.listen(PORT, () => console.log(`Serever is running on port ${PORT}`))
    })
    .catch((err) => console.log("Database Error: ", err.stack));










