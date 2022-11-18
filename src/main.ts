import dotenv from 'dotenv'
dotenv.config()

import { ReplyToMessage, ReplyToSlashCommand } from './services/slack'

const PORT: string | number = process.env.PORT || 3328

import { App as SlackApp } from '@slack/bolt'

const slackApp = new SlackApp({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    token: process.env.SLACK_BOT_TOKEN
});

slackApp.event('app_mention', async ({ event, say }) => {
    await ReplyToMessage(event, say)
});

slackApp.command('/cha', ReplyToSlashCommand);


(async () => {
    await slackApp.start(PORT)
    console.log('⚡️ Bolt app is running!')
})();
