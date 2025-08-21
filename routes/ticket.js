import express from 'express'
import { authenticate } from '../middlewares/auth.js'
import { createTicket, getTickets, getTicket } from '../controllers/ticket.js'


const router = express.Router();//best for writing the route in the different files and also for the mainteing large number of routes

router.get('/', authenticate, getTickets)
router.get('/:id', authenticate, getTicket)
router.post('/', authenticate, createTicket)

export default router;