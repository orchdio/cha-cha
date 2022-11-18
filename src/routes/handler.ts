import { Request, Response } from 'express'
import { Event as SlackEvent } from '../blueprint'

// dead code for now, i guess?
async function listenForNewEvent(req: Request, res: Response) {
    try {
        const { body } = req;
        if (!body) {
            console.log("No body in cha POST event.")
        }

        if (body?.type === SlackEvent.URL_VERIFICATION) {
            console.log('URL verification event received..')
            return res.status(200).json({
                challenge: body?.challenge
            })
        }
    } catch (e) {
        console.log('Error listening for new cha event.', {
            name: e.name,
            stack: e.stack,
            message: e.message
        })
    }
}

export { listenForNewEvent }